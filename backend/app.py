import os
import shutil
import hashlib
import io
from datetime import datetime, timedelta
from fastapi.responses import FileResponse 
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pymongo import MongoClient
from bson import ObjectId 
from passlib.context import CryptContext
from jose import jwt, JWTError
from dotenv import load_dotenv
from bson import ObjectId


load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_fixed_key_for_ddas")
ALGORITHM = "HS256"
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")


STORAGE_DIR = "F:/DDAS_Storage"  


if not os.path.exists(STORAGE_DIR):
    try:
        os.makedirs(STORAGE_DIR)
        print(f" Success: Created storage directory at {STORAGE_DIR}")
    except Exception as e:
        print(f" Error: Could not create directory. {e}")

app = FastAPI()


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
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401)
    except: raise HTTPException(status_code=401)
    user = users_collection.find_one({"username": username})
    if user is None: raise HTTPException(status_code=401)
    return user



@app.post("/register")
async def register(
    username: str = Form(...), 
    password: str = Form(...),
    role: str = Form("employee"),
    admin_secret: str = Form("") 
):
    if users_collection.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    final_role = "employee"
    if role == "admin":
        if admin_secret == "DDAS_2025_SECURE": 
            final_role = "admin"
        else:
            raise HTTPException(status_code=403, detail="Invalid Admin Secret Key")

    users_collection.insert_one({
        "username": username, 
        "password": get_password_hash(password),
        "role": final_role 
    })
    return {"msg": f"User created successfully as {final_role}"}

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_collection.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user["username"]})
    return {
        "access_token": access_token, 
        "role": user.get("role", "employee"),
        "username": user["username"]
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    temp_path = os.path.join(STORAGE_DIR, f"temp_{file.filename}")
    sha256_hash = hashlib.sha256()
    
    try:
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024) 
                if not chunk:
                    break
                buffer.write(chunk)
                sha256_hash.update(chunk)
        
        file_hash = sha256_hash.hexdigest()
        final_path = os.path.join(STORAGE_DIR, file_hash)

        if os.path.exists(final_path):
            is_duplicate = True
            os.remove(temp_path)
        else:
            is_duplicate = False
            shutil.move(temp_path, final_path)

        files_collection.insert_one({
            "filename": file.filename,
            "owner": current_user["username"],
            "hash": file_hash,
            "size": os.path.getsize(final_path),
            "upload_date": datetime.utcnow(),
            "is_duplicate": is_duplicate,
            "file_path": final_path 
        })
        
        return {"status": "Uploaded", "is_duplicate": is_duplicate}

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/files")
async def get_files(current_user: dict = Depends(get_current_user)):
    cursor = files_collection.find({}).sort("upload_date", -1)
    files = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if "content" in doc: del doc["content"]
        files.append(doc)
    return files

@app.get("/files/download/{file_id}")
async def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_doc = files_collection.find_one({"_id": ObjectId(file_id)})
    if not file_doc: raise HTTPException(status_code=404, detail="File record not found")
    
    path = file_doc.get("file_path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File missing from storage")

    return FileResponse(path, filename=file_doc["filename"])

@app.delete("/files/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_doc = files_collection.find_one({"_id": ObjectId(file_id)})
    if not file_doc: raise HTTPException(status_code=404, detail="File not found")

    if current_user.get("role") != "admin" and file_doc["owner"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    files_collection.delete_one({"_id": ObjectId(file_id)})
    return {"msg": "File record deleted"}


@app.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    all_files = list(files_collection.find({}))
    total_size = sum(f.get("size", 0) for f in all_files)
    saved_size = sum(f.get("size", 0) for f in all_files if f.get("is_duplicate"))

 
    today = datetime.utcnow().date()
    last_7_days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    activity_map = {d.strftime("%Y-%m-%d"): 0 for d in last_7_days}

    for f in all_files:
        if "upload_date" in f:
            if isinstance(f["upload_date"], datetime):
                f_date = f["upload_date"].date().strftime("%Y-%m-%d")
            else:
                f_date = str(f["upload_date"])[:10]
            if f_date in activity_map:
                activity_map[f_date] += 1

    chart_data = [{"day": datetime.strptime(d, "%Y-%m-%d").strftime("%a"), "files": count} 
                  for d, count in activity_map.items()]

    def format_bytes(s):
        if s == 0: return "0 B"
        for u in ['B', 'KB', 'MB', 'GB']:
            if s < 1024: return f"{s:.1f} {u}"
            s /= 1024
        return f"{s:.1f} TB"

    return {
        "total_files": len(all_files),
        "duplicates": sum(1 for f in all_files if f.get("is_duplicate")),
        "storage_used": format_bytes(total_size),
        "storage_saved": format_bytes(saved_size),
        "recent_activity": chart_data,
        "user_role": current_user.get("role", "employee")
    }


@app.get("/admin/global-duplicates")
async def get_global_duplicates(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access Denied: Admins Only")
    
    pipeline = [
        {
            "$group": {
                "_id": "$hash", 
                "count": {"$sum": 1}, 
                "total_size": {"$sum": "$size"},
                "files": {
                    "$push": {
                        "filename": "$filename", 
                        "owner": "$owner", 
                        "upload_date": "$upload_date", 
                        "_id": {"$toString": "$_id"}
                    }
                }
            }
        },
        {"$match": {"count": {"$gt": 1}}},
        {"$sort": {"total_size": -1}}
    ]
    return list(files_collection.aggregate(pipeline))




@app.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    

    users_cursor = users_collection.find({}, {"password": 0})
    users = list(users_cursor)
    
    for user in users:
        user["_id"] = str(user["_id"])
        
        user["originals"] = files_collection.count_documents({"owner": user["username"], "is_duplicate": False})
        user["duplicates"] = files_collection.count_documents({"owner": user["username"], "is_duplicate": True})
        
    return users


@app.post("/admin/reset-password")
async def reset_password(
    username: str = Form(...), 
    new_password: str = Form(...), 
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

 
    hashed_password = get_password_hash(new_password)

    result = users_collection.update_one(
        {"username": username},
        {"$set": {"password": hashed_password}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"msg": f"Password for {username} updated successfully"}


@app.get("/admin/user-details/{username}")
async def get_user_details(username: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user_data = users_collection.find_one({"username": username}, {"password": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    
    originals = files_collection.count_documents({"owner": username, "is_duplicate": False})
    duplicates = files_collection.count_documents({"owner": username, "is_duplicate": True})
    
    return {
        "username": username,
        "role": user_data.get("role"),
        "originals": originals,
        "duplicates": duplicates,
        "joined_at": str(user_data["_id"].generation_time)
    }


@app.delete("/admin/users/{username}")
async def delete_user(username: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if username == current_user["username"]:
        raise HTTPException(status_code=400, detail="Safety Lock: You cannot delete your own admin account")

    result = users_collection.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"msg": f"User {username} successfully removed"}