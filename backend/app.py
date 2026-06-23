"""
@file app.py
@description Central FastAPI backend for DDAS. Handles multi-tenant authentication, 
cryptographic file deduplication, AES-256-GCM encryption at rest, MinHash near-duplicate 
detection, DLP quarantine, and webhook integrations.
"""
import os
import shutil
import hashlib
import re
import io
import json
import asyncio
import threading
import requests
import numpy
import docx
import openpyxl
import xlrd
from typing import List, Optional
from pptx import Presentation
from striprtf.striprtf import rtf_to_text
import fitz  # PyMuPDF
from PyPDF2 import PdfReader
from datasketch import MinHash
from datetime import datetime, timedelta
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pymongo import MongoClient
from bson import ObjectId 
from passlib.context import CryptContext
from jose import jwt, JWTError
from dotenv import load_dotenv
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "super_secret_fixed_key_for_ddas"))
ALGORITHM = "HS256"
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
STORAGE_DIR = os.getenv("STORAGE_PATH", "F:/DDAS_Storage")  

if not os.path.exists(STORAGE_DIR):
    try:
        os.makedirs(STORAGE_DIR)
        print(f" Success: Created storage directory at {STORAGE_DIR}")
    except Exception as e:
        print(f" Error: Could not create directory. {e}")

# --- Cryptography Setup ---
MAGIC_HEADER = b"DDAS_ENC\x01"
master_key_env = os.getenv("ENCRYPTION_MASTER_KEY")
if master_key_env:
    master_key_bytes = bytes.fromhex(master_key_env)
else:
    # Fallback to SHA256 of SECRET_KEY for AES-256 (requires 32 bytes)
    master_key_bytes = hashlib.sha256(SECRET_KEY.encode('utf-8')).digest()

def encrypt_file_data(data: bytes) -> bytes:
    """Encrypt plain bytes using AES-256-GCM and prepend a magic header."""
    aesgcm = AESGCM(master_key_bytes)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return MAGIC_HEADER + nonce + ciphertext

def decrypt_file_data(data: bytes) -> bytes:
    """Decrypt bytes using AES-256-GCM. Expects magic header."""
    if not data.startswith(MAGIC_HEADER):
        # Fallback for old unencrypted files during migration
        return data
    nonce = data[len(MAGIC_HEADER):len(MAGIC_HEADER)+12]
    ciphertext = data[len(MAGIC_HEADER)+12:]
    aesgcm = AESGCM(master_key_bytes)
    return aesgcm.decrypt(nonce, ciphertext, None)

app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    print(f"Global Exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please contact support."}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(MONGO_URI)
db = client["ddas_db"]

users_collection = db["users"]
files_collection = db["files"]
logs_collection = db["logs"]
companies_collection = db["companies"]
settings_collection = db["settings"]

def log_activity(username: str, company: str, action: str, details: str = ""):
    """Log system activities scoped to a company."""
    try:
        logs_collection.insert_one({
            "username": username,
            "company": company,
            "action": action,
            "details": details,
            "timestamp": datetime.utcnow() + timedelta(hours=5, minutes=30)
        })
    except Exception as e:
        print(f"Failed to log activity: {e}")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def get_password_hash(password): return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Retrieve current user from JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401)
    except: raise HTTPException(status_code=401)
    user = users_collection.find_one({"username": username})
    if user is None: raise HTTPException(status_code=401)
    return user

def generate_invite_code(length=8):
    import string, random
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

# --- Webhook Integration logic ---
def trigger_webhook(company: str, event_type: str, payload: dict):
    """Fire webhooks asynchronously if enabled."""
    def _fire():
        settings = settings_collection.find_one({"company": company})
        if not settings:
            return
        events = settings.get("webhook_events", {})
        if not events.get(event_type, False):
            return
        
        message = ""
        if event_type == "upload_original":
            message = f"New document uploaded: {payload.get('filename')} by {payload.get('owner')}"
        elif event_type == "duplicate_alert":
            message = f"Duplicate blocked: {payload.get('filename')} uploaded by {payload.get('owner')} already exists."
        elif event_type == "dlp_violation":
            message = f"DLP Alert! Sensitive data found in {payload.get('filename')} uploaded by {payload.get('owner')}. Violations: {', '.join(payload.get('violations', []))}."
        
        slack_url = settings.get("slack_webhook")
        discord_url = settings.get("discord_webhook")
        teams_url = settings.get("teams_webhook")

        if slack_url:
            try: requests.post(slack_url, json={"text": message}, timeout=5)
            except: pass
        if discord_url:
            try: requests.post(discord_url, json={"content": message}, timeout=5)
            except: pass
        if teams_url:
            try: requests.post(teams_url, json={"text": message}, timeout=5)
            except: pass

    threading.Thread(target=_fire).start()

# --- DLP Logic ---
DLP_RULES = {
    "Credit Card": r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b",
    "API Key": r"(?i)(?:key|api_key|secret|token)[\s:=]+['\"]?([a-zA-Z0-9_\-]{20,})['\"]?",
    "Email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
}

def scan_text_for_dlp(text: str) -> List[str]:
    violations = []
    for rule_name, pattern in DLP_RULES.items():
        if re.search(pattern, text):
            violations.append(rule_name)
    return violations

# --- Auth Routes ---
@app.post("/register")
async def register(
    username: str = Form(...), 
    password: str = Form(...),
    company: str = Form(""),
    invite_code: str = Form(""),
    role: str = Form("employee"),
    admin_secret: str = Form("") 
):
    """Register a new user, enforcing company multi-tenancy."""
    if users_collection.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    final_role = "employee"
    target_company = company

    if role == "admin":
        if admin_secret == os.getenv("ADMIN_SECRET", "superadmin"): 
            final_role = "admin"
            # Create new company
            if companies_collection.find_one({"name": company}):
                raise HTTPException(status_code=400, detail="Company name already exists")
            new_invite = generate_invite_code()
            companies_collection.insert_one({"name": company, "invite_code": new_invite})
        else:
            raise HTTPException(status_code=403, detail="Invalid Admin Secret Key")
    else:
        # Join existing company
        comp = companies_collection.find_one({"invite_code": invite_code.upper()})
        if not comp:
            raise HTTPException(status_code=404, detail="Invalid invite code")
        target_company = comp["name"]

    users_collection.insert_one({
        "username": username, 
        "password": get_password_hash(password),
        "role": final_role,
        "company": target_company
    })
    log_activity(username, target_company, "REGISTER", f"User registered as {final_role}")
    return {"msg": f"User created successfully as {final_role}"}

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate and issue JWT token."""
    user = users_collection.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user["username"]})
    log_activity(user["username"], user.get("company", "Initial Corp"), "LOGIN", "User logged in successfully")
    return {
        "access_token": access_token, 
        "role": user.get("role", "employee"),
        "username": user["username"],
        "company": user.get("company", "Initial Corp")
    }

@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """Retrieve profile information for the logged-in user."""
    user_data = users_collection.find_one({"username": current_user["username"]}, {"password": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
        
    company = current_user.get("company", "Initial Corp")
    originals = files_collection.count_documents({"owner": current_user["username"], "company": company, "is_duplicate": False})
    duplicates = files_collection.count_documents({"owner": current_user["username"], "company": company, "is_duplicate": True})
    
    user_files = files_collection.find({"owner": current_user["username"], "company": company})
    storage_used = sum(f.get("size", 0) for f in user_files)

    def format_bytes(s):
        if s == 0: return "0 B"
        for u in ['B', 'KB', 'MB', 'GB']:
            if s < 1024: return f"{s:.1f} {u}"
            s /= 1024
        return f"{s:.1f} TB"

    return {
        "username": user_data["username"],
        "role": user_data.get("role", "employee"),
        "company": company,
        "joined_at": str(user_data["_id"].generation_time),
        "originals": originals,
        "duplicates": duplicates,
        "storage_used": format_bytes(storage_used),
        "storage_raw": storage_used
    }

@app.post("/users/change-password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Change the password of the currently authenticated user."""
    user_db = users_collection.find_one({"username": current_user["username"]})
    if not verify_password(current_password, user_db["password"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    hashed_password = get_password_hash(new_password)
    users_collection.update_one(
        {"username": current_user["username"]},
        {"$set": {"password": hashed_password}}
    )
    
    return {"msg": "Password updated successfully"}

# --- Near-Duplicate Detection via LSH ---
NEAR_DUP_THRESHOLD = 0.8   
MINHASH_NUM_PERM = 128     
TEXT_EXTRACTABLE = {
    '.txt', '.csv', '.json', '.xml', '.html', '.htm', '.md',
    '.log', '.yaml', '.yml', '.ini', '.cfg', '.toml',
    '.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.rtf'
}

def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from file for LSH and DLP analysis."""
    ext = os.path.splitext(filename.lower())[1]
    if ext not in TEXT_EXTRACTABLE: return ""
    try:
        if ext == '.pdf':
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                parts = [page.get_text("text") for page in doc if page.get_text("text").strip()]
                doc.close()
                extracted = " ".join(parts).strip()
                if extracted: return extracted
            except: pass
            pdf = PdfReader(io.BytesIO(file_bytes))
            return " ".join([p.extract_text() for p in pdf.pages if p.extract_text()])
        elif ext == '.docx':
            doc = docx.Document(io.BytesIO(file_bytes))
            parts = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text.strip(): parts.append(cell.text)
            return " ".join(parts)
        elif ext == '.xlsx':
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
            parts = [str(c) for ws in wb.worksheets for r in ws.iter_rows(values_only=True) for c in r if c is not None]
            return " ".join(parts)
        elif ext == '.xls':
            wb = xlrd.open_workbook(file_contents=file_bytes)
            parts = [str(sheet.cell_value(r, c)) for sheet in wb.sheets() for r in range(sheet.nrows) for c in range(sheet.ncols) if sheet.cell_value(r, c)]
            return " ".join(parts)
        elif ext == '.pptx':
            prs = Presentation(io.BytesIO(file_bytes))
            parts = [s.text for slide in prs.slides for s in slide.shapes if hasattr(s, 'text') and s.text.strip()]
            return " ".join(parts)
        elif ext == '.rtf':
            return rtf_to_text(file_bytes.decode('latin-1', errors='replace'))
        else:
            try: raw = file_bytes.decode('utf-8')
            except: raw = file_bytes.decode('latin-1', errors='replace')
            if ext in ('.xml', '.html', '.htm'): raw = re.sub(r'<[^>]+>', ' ', raw)
            return raw
    except:
        return ""

def build_minhash(text: str) -> MinHash | None:
    cleaned = re.sub(r'[^\w\s]', '', text.lower())
    word_set = set(cleaned.split())
    word_set.discard('')
    if not word_set: return None
    m = MinHash(num_perm=MINHASH_NUM_PERM)
    for word in word_set: m.update(word.encode('utf-8'))
    return m

def jaccard_from_stored(m: MinHash, stored_hashvalues: list) -> float:
    m2 = MinHash(num_perm=MINHASH_NUM_PERM)
    m2.hashvalues = numpy.array(stored_hashvalues, dtype='uint64')
    return m.jaccard(m2)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Uploads file, performs encryption, LSH, DLP, and multi-tenant deduplication."""
    company = current_user.get("company", "Initial Corp")
    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    final_path = os.path.join(STORAGE_DIR, file_hash)

    is_duplicate = False
    is_near_duplicate = False
    compare_file_id = None
    minhash_values = None
    similarity_score = 0.0

    text = extract_text(file_bytes, file.filename)
    dlp_violations = scan_text_for_dlp(text)
    quarantine_status = "quarantined" if dlp_violations else "safe"
    has_sensitive_content = bool(dlp_violations)

    if os.path.exists(final_path):
        # Physical exact duplicate
        is_duplicate = True
    else:
        # Encrypt and save
        encrypted_data = encrypt_file_data(file_bytes)
        with open(final_path, "wb") as f:
            f.write(encrypted_data)

    # Minhash check for near duplicates
    minhash = build_minhash(text)
    if minhash is not None:
        minhash_values = minhash.hashvalues.tolist()
        for existing in files_collection.find({"minhash_values": {"$exists": True}, "is_duplicate": False}):
            stored = existing.get("minhash_values")
            if stored and len(stored) == MINHASH_NUM_PERM:
                sim = jaccard_from_stored(minhash, stored)
                if sim >= NEAR_DUP_THRESHOLD:
                    is_near_duplicate = True
                    similarity_score = round(sim * 100, 2)
                    compare_file_id = str(existing["_id"])
                    break

    doc = {
        "filename": file.filename,
        "owner": current_user["username"],
        "company": company,
        "hash": file_hash,
        "minhash_values": minhash_values,
        "size": len(file_bytes),
        "upload_date": datetime.utcnow(),
        "is_duplicate": is_duplicate,
        "is_near_duplicate": is_near_duplicate,
        "similarity_score": similarity_score,
        "compare_file_id": compare_file_id,
        "file_path": final_path,
        "quarantine_status": quarantine_status,
        "has_sensitive_content": has_sensitive_content,
        "dlp_violations": dlp_violations
    }
    files_collection.insert_one(doc)

    # Webhooks
    if dlp_violations:
        trigger_webhook(company, "dlp_violation", {"filename": file.filename, "owner": current_user["username"], "violations": dlp_violations})
    elif is_duplicate:
        trigger_webhook(company, "duplicate_alert", {"filename": file.filename, "owner": current_user["username"]})
    else:
        trigger_webhook(company, "upload_original", {"filename": file.filename, "owner": current_user["username"]})

    log_activity(current_user["username"], company, "UPLOAD", f"Uploaded {file.filename} (Dup: {is_duplicate}, DLP: {has_sensitive_content})")
    return {
        "status": "Uploaded",
        "is_duplicate": is_duplicate,
        "is_near_duplicate": is_near_duplicate,
        "similarity_score": similarity_score,
        "quarantined": has_sensitive_content
    }

@app.get("/files")
async def get_files(current_user: dict = Depends(get_current_user)):
    """Fetch company files."""
    company = current_user.get("company", "Initial Corp")
    cursor = files_collection.find({"company": company}).sort("upload_date", -1)
    files = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        files.append(doc)
    return files

@app.get("/files/download/{file_id}")
async def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    """Decrypts and serves the file for download."""
    company = current_user.get("company", "Initial Corp")
    file_doc = files_collection.find_one({"_id": ObjectId(file_id), "company": company})
    if not file_doc: raise HTTPException(status_code=404, detail="File not found")
    
    if file_doc.get("quarantine_status") == "quarantined" and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="File is quarantined. Admin approval required.")
    
    path = file_doc.get("file_path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File missing from storage")

    with open(path, "rb") as f:
        encrypted_bytes = f.read()
    
    decrypted_bytes = decrypt_file_data(encrypted_bytes)
    
    return StreamingResponse(
        io.BytesIO(decrypted_bytes),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={file_doc['filename']}"}
    )

@app.get("/files/text/{file_id}")
async def get_file_text(file_id: str, current_user: dict = Depends(get_current_user)):
    """Returns extracted text for diff comparison."""
    file_doc = files_collection.find_one({"_id": ObjectId(file_id)})
    if not file_doc: raise HTTPException(status_code=404, detail="File not found")
    
    path = file_doc.get("file_path")
    if not path or not os.path.exists(path):
        return {"text": ""}

    with open(path, "rb") as f:
        decrypted_bytes = decrypt_file_data(f.read())
    text = extract_text(decrypted_bytes, file_doc["filename"])
    return {"text": text}

@app.get("/files/summary/{file_id}")
async def get_file_summary(file_id: str, current_user: dict = Depends(get_current_user)):
    """Generates dummy AI summary."""
    return {"summary": "This document appears to be a corporate file containing standard text. Some sections might include formatting or structured data. The AI analysis completes successfully."}

@app.delete("/files/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    """Safely delete file, preserving physical file if referenced globally."""
    company = current_user.get("company", "Initial Corp")
    file_doc = files_collection.find_one({"_id": ObjectId(file_id), "company": company})
    if not file_doc: raise HTTPException(status_code=404, detail="File not found")

    if current_user.get("role") != "admin" and file_doc["owner"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    file_hash = file_doc.get("hash")
    file_path = file_doc.get("file_path")

    files_collection.delete_one({"_id": ObjectId(file_id)})
    remaining_refs = files_collection.count_documents({"hash": file_hash})
    
    if remaining_refs == 0 and file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            log_activity(current_user["username"], company, "DELETE_PHYSICAL", f"Deleted physical file for {file_doc['filename']}")
        except Exception as e:
            pass

    log_activity(current_user["username"], company, "DELETE_FILE", f"Deleted file record {file_doc['filename']}")
    return {"msg": "File deleted successfully"}

@app.post("/files/bulk-delete")
async def bulk_delete_files(body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Bulk delete files."""
    file_ids = body.get("file_ids", [])
    count = 0
    for fid in file_ids:
        try:
            await delete_file(fid, current_user)
            count += 1
        except:
            pass
    return {"msg": "Bulk delete complete", "deleted_count": count}

@app.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Dashboard analytics."""
    company = current_user.get("company", "Initial Corp")
    all_files = list(files_collection.find({"company": company}))
    total_size = sum(f.get("size", 0) for f in all_files)
    saved_size = sum(f.get("size", 0) for f in all_files if f.get("is_duplicate"))
 
    today = datetime.utcnow().date()
    last_7_days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    activity_map = {d.strftime("%Y-%m-%d"): 0 for d in last_7_days}
    
    hoarders = {}
    dlp_counts = {}
    reclaimed_timeline_map = {d.strftime("%Y-%m-%d"): 0 for d in last_7_days}
    cumulative_before = 0
    sorted_days = sorted(reclaimed_timeline_map.keys())

    for f in all_files:
        f_date_str = ""
        if "upload_date" in f:
            if isinstance(f["upload_date"], datetime):
                f_date_str = f["upload_date"].date().strftime("%Y-%m-%d")
            else:
                f_date_str = str(f["upload_date"])[:10]
            if f_date_str in activity_map:
                activity_map[f_date_str] += 1

        if f.get("is_duplicate"):
            owner = f.get("owner", "Unknown")
            size_mb = f.get("size", 0) / (1024 * 1024)
            hoarders[owner] = hoarders.get(owner, 0) + size_mb
            
            if f_date_str in reclaimed_timeline_map:
                reclaimed_timeline_map[f_date_str] += size_mb
            elif f_date_str and f_date_str < sorted_days[0]:
                cumulative_before += size_mb

        for violation in f.get("dlp_violations", []):
            dlp_counts[violation] = dlp_counts.get(violation, 0) + 1

    chart_data = [{"day": datetime.strptime(d, "%Y-%m-%d").strftime("%a"), "files": count} 
                  for d, count in activity_map.items()]

    top_hoarders_list = [{"owner": k, "space_wasted_mb": round(v, 2)} for k, v in hoarders.items()]
    top_hoarders_list.sort(key=lambda x: x["space_wasted_mb"], reverse=True)
    top_hoarders_list = top_hoarders_list[:5]

    dlp_trends_list = [{"name": k, "value": v} for k, v in dlp_counts.items()]

    cumulative = cumulative_before
    reclaimed_timeline_list = []
    for day in sorted_days:
        cumulative += reclaimed_timeline_map[day]
        reclaimed_timeline_list.append({
            "day": datetime.strptime(day, "%Y-%m-%d").strftime("%a"),
            "reclaimed_mb": round(cumulative, 2)
        })

    def format_bytes(s):
        if s == 0: return "0 B"
        for u in ['B', 'KB', 'MB', 'GB']:
            if s < 1024: return f"{s:.1f} {u}"
            s /= 1024
        return f"{s:.1f} TB"

    return {
        "total_files": len(all_files),
        "duplicates": sum(1 for f in all_files if f.get("is_duplicate")),
        "near_duplicates": sum(1 for f in all_files if f.get("is_near_duplicate")),
        "storage_used": format_bytes(total_size - saved_size),
        "storage_saved": format_bytes(saved_size),
        "recent_activity": chart_data,
        "top_hoarders": top_hoarders_list,
        "dlp_trends": dlp_trends_list,
        "reclaimed_timeline": reclaimed_timeline_list,
        "user_role": current_user.get("role", "employee")
    }

@app.get("/admin/global-duplicates")
async def get_global_duplicates(current_user: dict = Depends(get_current_user)):
    """Admin endpoint for deduplication overview."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    pipeline = [
        {"$match": {"company": company}},
        {"$group": {
            "_id": "$hash", 
            "count": {"$sum": 1}, 
            "total_size": {"$sum": "$size"},
            "files": {"$push": {
                "filename": "$filename", "owner": "$owner", 
                "upload_date": "$upload_date", "_id": {"$toString": "$_id"}
            }}
        }},
        {"$match": {"count": {"$gt": 1}}},
        {"$sort": {"total_size": -1}}
    ]
    return list(files_collection.aggregate(pipeline))

@app.get("/admin/quarantined-files")
async def get_quarantined_files(current_user: dict = Depends(get_current_user)):
    """Admin endpoint for DLP quarantined files."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    cursor = files_collection.find({"company": company, "quarantine_status": "quarantined"})
    res = []
    for d in cursor:
        d["_id"] = str(d["_id"])
        res.append(d)
    return res

@app.post("/admin/quarantine/remediate")
async def remediate_quarantine(
    file_id: str = Form(...),
    action: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Admin endpoint to approve, purge, or redact quarantined files."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    
    file_doc = files_collection.find_one({"_id": ObjectId(file_id), "company": company})
    if not file_doc: raise HTTPException(status_code=404, detail="File not found")

    if action == "approve":
        files_collection.update_one({"_id": ObjectId(file_id)}, {"$set": {"quarantine_status": "safe", "dlp_violations": []}})
        return {"msg": "File approved."}
    elif action == "purge":
        await delete_file(file_id, current_user)
        return {"msg": "File purged."}
    elif action == "redact":
        ext = os.path.splitext(file_doc["filename"])[1].lower()
        if ext not in {'.txt', '.csv', '.json', '.xml', '.html', '.md', '.log', '.yaml', '.yml'}:
            raise HTTPException(status_code=400, detail="Only plain text files can be redacted automatically.")
        
        path = file_doc["file_path"]
        with open(path, "rb") as f:
            content_str = decrypt_file_data(f.read()).decode('utf-8', errors='replace')
        
        redacted_content = re.sub(DLP_RULES["Credit Card"], "[REDACTED_CREDIT_CARD]", content_str)
        redacted_content = re.sub(DLP_RULES["API Key"], "[REDACTED_API_KEY]", redacted_content)
        redacted_content = re.sub(DLP_RULES["Email"], "[REDACTED_EMAIL]", redacted_content)

        new_bytes = redacted_content.encode("utf-8")
        new_hash = hashlib.sha256(new_bytes).hexdigest()
        new_path = os.path.join(STORAGE_DIR, new_hash)

        if not os.path.exists(new_path):
            with open(new_path, "wb") as f:
                f.write(encrypt_file_data(new_bytes))

        old_hash = file_doc["hash"]
        files_collection.update_one(
            {"_id": ObjectId(file_id)},
            {"$set": {
                "quarantine_status": "remediated",
                "has_sensitive_content": False,
                "dlp_violations": [],
                "hash": new_hash,
                "size": len(new_bytes),
                "file_path": new_path
            }}
        )

        remaining_old_refs = files_collection.count_documents({"hash": old_hash})
        if remaining_old_refs == 0 and os.path.exists(path):
            os.remove(path)
            
        return {"msg": "File successfully redacted and restored."}
    else:
        raise HTTPException(status_code=400, detail="Invalid action.")

@app.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Admin endpoint to list all company users."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    users = list(users_collection.find({"company": company}, {"password": 0}))
    for user in users:
        user["_id"] = str(user["_id"])
        user["originals"] = files_collection.count_documents({"owner": user["username"], "company": company, "is_duplicate": False})
        user["duplicates"] = files_collection.count_documents({"owner": user["username"], "company": company, "is_duplicate": True})
    return users

@app.post("/admin/reset-password")
async def reset_password(username: str = Form(...), new_password: str = Form(...), current_user: dict = Depends(get_current_user)):
    """Admin endpoint to reset passwords."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    result = users_collection.update_one({"username": username, "company": company}, {"$set": {"password": get_password_hash(new_password)}})
    if result.matched_count == 0: raise HTTPException(status_code=404, detail="User not found")
    log_activity(current_user["username"], company, "RESET_PASSWORD", f"Reset password for {username}")
    return {"msg": f"Password for {username} updated successfully"}

@app.get("/admin/user-details/{username}")
async def get_user_details(username: str, current_user: dict = Depends(get_current_user)):
    """Admin endpoint to query user details."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    user_data = users_collection.find_one({"username": username, "company": company}, {"password": 0})
    if not user_data: raise HTTPException(status_code=404, detail="User not found")
    originals = files_collection.count_documents({"owner": username, "company": company, "is_duplicate": False})
    duplicates = files_collection.count_documents({"owner": username, "company": company, "is_duplicate": True})
    return {"username": username, "role": user_data.get("role"), "originals": originals, "duplicates": duplicates, "joined_at": str(user_data["_id"].generation_time)}

@app.delete("/admin/users/{username}")
async def delete_user(username: str, current_user: dict = Depends(get_current_user)):
    """Admin endpoint to delete a user."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    if username == current_user["username"]: raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    company = current_user.get("company", "Initial Corp")
    result = users_collection.delete_one({"username": username, "company": company})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="User not found")
    log_activity(current_user["username"], company, "DELETE_USER", f"Terminated user {username}")
    return {"msg": f"User {username} successfully removed"}

@app.get("/admin/logs")
async def get_activity_logs(current_user: dict = Depends(get_current_user)):
    """Admin endpoint to fetch audit logs."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    cursor = logs_collection.find({"company": company}).sort("timestamp", -1).limit(100)
    logs = []
    for log in cursor:
        log["_id"] = str(log["_id"])
        logs.append(log)
    return logs

@app.get("/admin/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Get webhook settings."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    settings = settings_collection.find_one({"company": company}, {"_id": 0})
    if not settings:
        return {"webhook_events": {"upload_original": True, "duplicate_alert": True, "dlp_violation": True}}
    return settings

@app.post("/admin/settings")
async def save_settings(
    slack_webhook: str = Form(""),
    discord_webhook: str = Form(""),
    teams_webhook: str = Form(""),
    upload_original: str = Form("true"),
    duplicate_alert: str = Form("true"),
    dlp_violation: str = Form("true"),
    current_user: dict = Depends(get_current_user)
):
    """Save webhook settings."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    events = {
        "upload_original": upload_original.lower() == "true",
        "duplicate_alert": duplicate_alert.lower() == "true",
        "dlp_violation": dlp_violation.lower() == "true"
    }
    settings_collection.update_one(
        {"company": company},
        {"$set": {
            "slack_webhook": slack_webhook,
            "discord_webhook": discord_webhook,
            "teams_webhook": teams_webhook,
            "webhook_events": events
        }},
        upsert=True
    )
    return {"msg": "Settings saved"}

@app.post("/admin/settings/test")
async def test_settings(
    slack_webhook: str = Form(""),
    discord_webhook: str = Form(""),
    teams_webhook: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Test webhook integrations."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    message = "DDAS Integration Check: This is a test alert from your security dashboard."
    
    def _fire():
        if slack_webhook:
            try: requests.post(slack_webhook, json={"text": message}, timeout=5)
            except: pass
        if discord_webhook:
            try: requests.post(discord_webhook, json={"content": message}, timeout=5)
            except: pass
        if teams_webhook:
            try: requests.post(teams_webhook, json={"text": message}, timeout=5)
            except: pass
            
    threading.Thread(target=_fire).start()
    return {"msg": "Test dispatched"}

@app.get("/admin/invite-code")
async def get_invite_code(current_user: dict = Depends(get_current_user)):
    """Fetch the invite code for the current company."""
    if current_user.get("role") != "admin": raise HTTPException(status_code=403, detail="Admins Only")
    company = current_user.get("company", "Initial Corp")
    comp = companies_collection.find_one({"name": company})
    if comp:
        return {"invite_code": comp.get("invite_code", "UNKNOWN")}
    return {"invite_code": "UNKNOWN"}