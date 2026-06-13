"""
Database seed helpers — default demo user and sample meetings.

Usage:
    cd backend
    python seed.py
"""

import os
import random
import string
from datetime import datetime, timedelta, timezone

from database import SessionLocal, engine
import models
from models import MeetingStatus

models.Base.metadata.create_all(bind=engine)

DEFAULT_USER_ID = 1
FRONTEND_BASE = os.getenv("FRONTEND_URL", "http://localhost:3000")

DEFAULT_USER = {
    "id": DEFAULT_USER_ID,
    "name": "Demo User",
    "email": "demo@example.com",
    "avatar_url": None,
}

# Relative offsets from `now` — past entries also get RecentMeeting rows.
MEETING_SEEDS = [
    # Past meetings (Recent Activity)
    {"title": "Daily Standup - Platform Team", "offset": timedelta(hours=-2), "kind": "past", "duration_minutes": 30},
    {"title": "Sprint 42 Retrospective", "offset": timedelta(days=-2), "kind": "past", "duration_minutes": 60},
    {"title": "1:1 Engineering Manager Sync", "offset": timedelta(days=-5), "kind": "past", "duration_minutes": 30},
    # Upcoming meetings
    {"title": "Sprint 43 Planning", "offset": timedelta(hours=3), "kind": "upcoming", "duration_minutes": 60},
    {"title": "Backlog Grooming & Refinement", "offset": timedelta(days=1), "kind": "upcoming", "duration_minutes": 45},
    {"title": "Frontend / Backend Integration Sync", "offset": timedelta(days=3), "kind": "upcoming", "duration_minutes": 60},
]


def _utc_now() -> datetime:
    """Naive UTC datetime — matches meetings router comparisons."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _generate_meeting_code(db, existing: set[str]) -> str:
    for _ in range(20):
        code = "".join(random.choices(string.digits, k=9))
        if code not in existing and not db.query(models.Meeting).filter(models.Meeting.meeting_code == code).first():
            return code
    raise RuntimeError("Could not generate a unique meeting code for seed data")


def seed_default_user(db=None) -> None:
    owns_session = db is None
    if owns_session:
        db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.id == DEFAULT_USER_ID).first()
        if existing:
            return
        db.add(models.User(**DEFAULT_USER))
        db.commit()
        print(f"Seeded default user: id={DEFAULT_USER_ID}, name={DEFAULT_USER['name']}")
    finally:
        if owns_session:
            db.close()


def seed_meetings(db=None) -> None:
    owns_session = db is None
    if owns_session:
        db = SessionLocal()
    try:
        if db.query(models.Meeting).first() is not None:
            return

        now = _utc_now()
        used_codes: set[str] = set()

        for entry in MEETING_SEEDS:
            start_time = now + entry["offset"]
            code = _generate_meeting_code(db, used_codes)
            used_codes.add(code)

            if entry["kind"] == "past":
                status = MeetingStatus.ended
            else:
                status = MeetingStatus.scheduled

            meeting = models.Meeting(
                meeting_code=code,
                title=entry["title"],
                description=None,
                host_user_id=DEFAULT_USER_ID,
                scheduled_start_time=start_time,
                duration_minutes=entry["duration_minutes"],
                status=status,
                invite_link=f"{FRONTEND_BASE}/meeting/{code}",
                created_at=start_time if entry["kind"] == "past" else now,
            )
            db.add(meeting)
            db.flush()

            if entry["kind"] == "past":
                db.add(models.RecentMeeting(
                    meeting_id=meeting.id,
                    user_id=DEFAULT_USER_ID,
                    joined_at=start_time,
                ))

        db.commit()
        print(f"Seeded {len(MEETING_SEEDS)} sample meetings (3 recent, 3 upcoming)")
    finally:
        if owns_session:
            db.close()


def seed_all() -> None:
    db = SessionLocal()
    try:
        seed_default_user(db)
        seed_meetings(db)
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
