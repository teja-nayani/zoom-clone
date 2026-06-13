"""
Run once to seed the database with the default demo user.

Usage:
    cd backend
    python seed.py
"""

from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)

DEFAULT_USER = {
    "id": 1,
    "name": "Demo User",
    "email": "demo@example.com",
    "avatar_url": None,
}


def seed():
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.id == DEFAULT_USER["id"]).first()
        if existing:
            print("Default user already exists — skipping seed.")
            return

        user = models.User(**DEFAULT_USER)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Seeded default user: id={user.id}, name={user.name}, email={user.email}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
