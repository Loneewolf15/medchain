import os
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User
from app.security import hash_password

def seed_user():
    db = SessionLocal()
    try:
        # Check if test user exists
        existing = db.query(User).filter(User.email == "admin@medchain.com").first()
        if not existing:
            user = User(
                email="admin@medchain.com",
                hashed_password=hash_password("admin"),
                full_name="Test Admin",
                role="admin"
            )
            db.add(user)
            db.commit()
            print("Test user created successfully!")
        else:
            print("Test user already exists.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_user()
