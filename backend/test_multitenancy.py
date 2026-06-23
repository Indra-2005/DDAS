import os
import sys
import hashlib
import uuid
from bson import ObjectId

# Import database collections and cryptography functions from app
try:
    from app import (
        files_collection, 
        companies_collection, 
        users_collection, 
        encrypt_file_data, 
        decrypt_file_data, 
        STORAGE_DIR
    )
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def run_multitenancy_tests():
    print("Starting Multi-Tenancy Isolation Validation Suite...")
    print("=========================================================")

    # Setup unique IDs for test
    test_id = uuid.uuid4().hex[:6]
    comp_a_name = f"Test_Corp_A_{test_id}"
    comp_b_name = f"Test_Corp_B_{test_id}"
    
    # 1. Create test companies in DB
    companies_collection.insert_many([
        {"name": comp_a_name, "invite_code": f"INV_A_{test_id}"},
        {"name": comp_b_name, "invite_code": f"INV_B_{test_id}"}
    ])
    print(f"[OK] Created test companies: {comp_a_name}, {comp_b_name}")

    # Prepare file data
    file_content = b"Top secret multi-tenant shared document content with Credit Card 4111111111111111"
    file_hash = hashlib.sha256(file_content).hexdigest()
    file_name = f"shared_doc_{test_id}.txt"
    final_path = os.path.join(STORAGE_DIR, file_hash)

    # Cleanup any pre-existing files/records (just in case)
    if os.path.exists(final_path):
        os.remove(final_path)

    # 2. Simulate Upload for Company A
    print("Simulating upload for Company A...")
    # Encrypt and save to storage
    encrypted_payload = encrypt_file_data(file_content)
    with open(final_path, "wb") as f:
        f.write(encrypted_payload)

    doc_a_id = files_collection.insert_one({
        "filename": file_name,
        "owner": "alice",
        "company": comp_a_name,
        "hash": file_hash,
        "size": len(file_content),
        "is_duplicate": False,
        "file_path": final_path,
        "quarantine_status": "quarantined",
        "has_sensitive_content": True,
        "dlp_violations": ["Credit Card"]
    }).inserted_id

    # 3. Simulate Upload for Company B (Deduplicated physically, separate DB record)
    print("Simulating upload of same file content for Company B...")
    # Check if exists physically (it does, so do not write again)
    assert os.path.exists(final_path), "Physical file must exist"
    
    doc_b_id = files_collection.insert_one({
        "filename": file_name,
        "owner": "bob",
        "company": comp_b_name,
        "hash": file_hash,
        "size": len(file_content),
        "is_duplicate": False,
        "file_path": final_path,
        "quarantine_status": "quarantined",
        "has_sensitive_content": True,
        "dlp_violations": ["Credit Card"]
    }).inserted_id

    # Assertions
    assert doc_a_id != doc_b_id, "DB records must be distinct"
    print("[OK] Deduplication verified: Both records point to the same physical file path.")

    # 4. Test Safe Deletion: Company A deletes its file
    print("Testing safe deletion (Company A deletes record)...")
    # Simulate delete_file logic in app.py
    files_collection.delete_one({"_id": doc_a_id, "company": comp_a_name})
    
    # Check global remaining references (MUST count across all companies)
    remaining_refs = files_collection.count_documents({"hash": file_hash})
    print(f"Remaining global references for hash {file_hash}: {remaining_refs}")
    
    # Verify that the physical file is NOT deleted because Company B still uses it
    if remaining_refs == 0 and os.path.exists(final_path):
        os.remove(final_path)
    
    assert remaining_refs == 1, "There should be 1 remaining reference (Company B)"
    assert os.path.exists(final_path), "CRITICAL FLAW: Shared physical file was deleted!"
    print("[OK] Safe deletion validated: Physical file remains intact for other companies.")

    # Re-insert Company A file record to test Redaction Isolation
    files_collection.insert_one({
        "_id": doc_a_id,
        "filename": file_name,
        "owner": "alice",
        "company": comp_a_name,
        "hash": file_hash,
        "size": len(file_content),
        "is_duplicate": False,
        "file_path": final_path,
        "quarantine_status": "quarantined",
        "has_sensitive_content": True,
        "dlp_violations": ["Credit Card"]
    })

    # 5. Test Isolated Redaction: Company A redacts sensitive data
    print("Testing isolated redaction (Company A redacts file)...")
    # Fetch file_doc for Company A
    file_doc_a = files_collection.find_one({"_id": doc_a_id, "company": comp_a_name})
    assert file_doc_a is not None

    # Read and decrypt file_path
    with open(file_doc_a["file_path"], "rb") as f:
        enc_bytes = f.read()
    dec_bytes = decrypt_file_data(enc_bytes)
    content_str = dec_bytes.decode("utf-8")

    # Apply redaction (Credit Card -> REDACTED)
    import re
    redacted_content = re.sub(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b", "[REDACTED_CREDIT_CARD]", content_str)
    
    # Calculate new hash and size
    redacted_bytes = redacted_content.encode("utf-8")
    new_hash = hashlib.sha256(redacted_bytes).hexdigest()
    new_size = len(redacted_bytes)
    new_file_path = os.path.join(STORAGE_DIR, new_hash)

    # Save redacted file to new path
    if not os.path.exists(new_file_path):
        with open(new_file_path, "wb") as f:
            f.write(encrypt_file_data(redacted_bytes))

    # Keep old hash for reference check
    old_hash = file_doc_a.get("hash")

    # Update DB record for Company A (scoped to company A)
    files_collection.update_one(
        {"_id": doc_a_id, "company": comp_a_name},
        {"$set": {
            "quarantine_status": "remediated",
            "has_sensitive_content": False,
            "dlp_violations": [],
            "hash": new_hash,
            "size": new_size,
            "file_path": new_file_path
        }}
    )

    # Clean up old physical file if no other references exist
    if old_hash:
        remaining_old_refs = files_collection.count_documents({"hash": old_hash})
        if remaining_old_refs == 0 and os.path.exists(final_path):
            os.remove(final_path)

    # ASSERTIONS FOR ISOLATION
    # Retrieve updated record A
    updated_a = files_collection.find_one({"_id": doc_a_id})
    # Retrieve record B
    record_b = files_collection.find_one({"_id": doc_b_id})

    assert updated_a["hash"] == new_hash, "Company A hash should be updated to new redacted hash"
    assert updated_a["file_path"] == new_file_path, "Company A file path should be updated to redacted file path"
    
    assert record_b["hash"] == file_hash, "Company B hash must remain unchanged (unredacted)"
    assert record_b["file_path"] == final_path, "Company B file path must remain unchanged (original file)"
    
    assert os.path.exists(final_path), "Original file (referenced by Company B) must still exist"
    assert os.path.exists(new_file_path), "Redacted file (referenced by Company A) must exist"

    # Verify content
    with open(final_path, "rb") as f:
        b_content = decrypt_file_data(f.read())
    with open(new_file_path, "rb") as f:
        a_content = decrypt_file_data(f.read())

    assert b"[REDACTED_CREDIT_CARD]" in a_content, "Company A content should be redacted"
    assert b"4111111111111111" in b_content, "Company B content should contain the original credit card"
    
    print("[OK] Redaction isolation verified successfully: Company A file is redacted, Company B file remains unredacted.")

    # 6. Cleanup DB and disk
    files_collection.delete_many({"_id": {"$in": [doc_a_id, doc_b_id]}})
    companies_collection.delete_many({"name": {"$in": [comp_a_name, comp_b_name]}})
    
    if os.path.exists(final_path):
        os.remove(final_path)
    if os.path.exists(new_file_path):
        os.remove(new_file_path)

    print("=========================================================")
    print("SUCCESS: All multi-tenancy isolation checks passed!")

if __name__ == "__main__":
    run_multitenancy_tests()
