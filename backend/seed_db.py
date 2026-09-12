import os
import string
import random
from pymongo import MongoClient
from dotenv import load_dotenv

from app.db.database import db, companies_collection

def generate_invite_code(length=8):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def migrate():
    print("Starting migration for companies collection...")
    
    # 1. Add "Initial Corp" to companies collection if it doesn't exist
    companies_collection = db["companies"]
    existing = companies_collection.find_one({"name": "Initial Corp"})
    
    if not existing:
        invite_code = generate_invite_code()
        companies_collection.insert_one({
            "name": "Initial Corp",
            "invite_code": invite_code
        })
        print(f"Created Initial Corp with invite code: {invite_code}")
    else:
        print(f"Initial Corp already exists with invite code: {existing.get('invite_code')}")

    print("Migration complete!")

if __name__ == "__main__":
    migrate()
