import os
import random
import string
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, MeetingStatus, Participant, ParticipantRole, RecentMeeting
from schemas import (
    JoinMeetingRequest,
    MeetingOut,
    ParticipantOut,
    RecentMeetingOut,
    ScheduleMeetingRequest,
)

router = APIRouter()

DEFAULT_USER_ID = 1
FRONTEND_BASE = os.getenv('FRONTEND_URL', 'http://localhost:3000')


def _generate_meeting_code(db: Session) -> str:
    """Generate a unique 9-digit numeric meeting code."""
    for _ in range(20):
        code = "".join(random.choices(string.digits, k=9))
        if not db.query(Meeting).filter(Meeting.meeting_code == code).first():
            return code
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not generate a unique meeting code. Please try again.",
    )


# ---------------------------------------------------------------------------
# POST /instant — create a live meeting immediately
# ---------------------------------------------------------------------------

@router.post("/instant", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_instant_meeting(db: Session = Depends(get_db)):
    """Create an instant meeting (status=live), register the host, return MeetingOut."""
    code = _generate_meeting_code(db)
    invite_link = f"{FRONTEND_BASE}/meeting/{code}"

    meeting = Meeting(
        meeting_code=code,
        title="Instant Meeting",
        host_user_id=DEFAULT_USER_ID,
        status=MeetingStatus.live,
        invite_link=invite_link,
    )
    db.add(meeting)
    db.flush()  # get meeting.id without full commit

    # Register the host as a participant
    db.add(Participant(
        meeting_id=meeting.id,
        user_id=DEFAULT_USER_ID,
        display_name="Demo User",
        role=ParticipantRole.host,
    ))

    # Record in recent meetings so it shows up in history
    db.add(RecentMeeting(
        meeting_id=meeting.id,
        user_id=DEFAULT_USER_ID,
    ))

    db.commit()
    db.refresh(meeting)
    return meeting


# ---------------------------------------------------------------------------
# POST /schedule — schedule a future meeting
# ---------------------------------------------------------------------------

@router.post("/schedule", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def schedule_meeting(payload: ScheduleMeetingRequest, db: Session = Depends(get_db)):
    """Save a scheduled meeting; return the full MeetingOut record."""
    code = _generate_meeting_code(db)
    invite_link = f"{FRONTEND_BASE}/meeting/{code}"

    meeting = Meeting(
        meeting_code=code,
        title=payload.title,
        description=payload.description,
        host_user_id=DEFAULT_USER_ID,
        scheduled_start_time=payload.scheduled_start_time,
        duration_minutes=payload.duration_minutes,
        status=MeetingStatus.scheduled,
        invite_link=invite_link,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


# ---------------------------------------------------------------------------
# GET /upcoming — scheduled meetings in the future for default user
# NOTE: must be defined before /{meeting_code} to avoid route shadowing
# ---------------------------------------------------------------------------

@router.get("/upcoming", response_model=List[MeetingOut])
def get_upcoming_meetings(db: Session = Depends(get_db)):
    """Return upcoming scheduled meetings hosted by the default user."""
    now = datetime.utcnow()
    return (
        db.query(Meeting)
        .filter(
            Meeting.host_user_id == DEFAULT_USER_ID,
            Meeting.status == MeetingStatus.scheduled,
            Meeting.scheduled_start_time > now,
        )
        .order_by(Meeting.scheduled_start_time.asc())
        .all()
    )


# ---------------------------------------------------------------------------
# GET /recent — last 10 meetings the default user attended
# NOTE: must be defined before /{meeting_code} to avoid route shadowing
# ---------------------------------------------------------------------------

@router.get("/recent", response_model=List[RecentMeetingOut])
def get_recent_meetings(db: Session = Depends(get_db)):
    """Return the 10 most recent meetings the default user participated in."""
    return (
        db.query(RecentMeeting)
        .filter(RecentMeeting.user_id == DEFAULT_USER_ID)
        .order_by(RecentMeeting.joined_at.desc())
        .limit(10)
        .all()
    )


# ---------------------------------------------------------------------------
# GET /{meeting_code} — look up a meeting by its code
# ---------------------------------------------------------------------------

@router.get("/{meeting_code}", response_model=MeetingOut)
def get_meeting(meeting_code: str, db: Session = Depends(get_db)):
    """Validate and return a meeting record by its code."""
    meeting = db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


# ---------------------------------------------------------------------------
# POST /{meeting_code}/join — register a participant joining
# ---------------------------------------------------------------------------

@router.post("/{meeting_code}/join", response_model=ParticipantOut, status_code=status.HTTP_201_CREATED)
def join_meeting(meeting_code: str, payload: JoinMeetingRequest, db: Session = Depends(get_db)):
    """Create a Participant record and a RecentMeeting entry for the joiner."""
    meeting = db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    if meeting.status == MeetingStatus.ended:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This meeting has already ended")

    participant = Participant(
        meeting_id=meeting.id,
        user_id=DEFAULT_USER_ID,
        display_name=payload.display_name,
        role=ParticipantRole.participant,
    )
    db.add(participant)

    db.add(RecentMeeting(
        meeting_id=meeting.id,
        user_id=DEFAULT_USER_ID,
    ))

    db.commit()
    db.refresh(participant)
    return participant
