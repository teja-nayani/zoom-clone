from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from models import MeetingStatus, ParticipantRole


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Meeting
# ---------------------------------------------------------------------------

class InstantMeetingResponse(BaseModel):
    meeting_code: str
    invite_link: str


class ScheduleMeetingRequest(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_start_time: datetime
    duration_minutes: int = 30


class MeetingOut(BaseModel):
    id: int
    meeting_code: str
    title: str
    description: Optional[str] = None
    host_user_id: int
    scheduled_start_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: MeetingStatus
    invite_link: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Participant
# ---------------------------------------------------------------------------

class JoinMeetingRequest(BaseModel):
    display_name: str


class ParticipantOut(BaseModel):
    id: int
    meeting_id: int
    user_id: Optional[int] = None
    display_name: str
    role: ParticipantRole
    joined_at: datetime
    left_at: Optional[datetime] = None
    is_muted: bool
    is_video_on: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Recent Meeting
# ---------------------------------------------------------------------------

class RecentMeetingOut(BaseModel):
    id: int
    meeting_id: int
    user_id: int
    joined_at: datetime
    meeting: MeetingOut

    model_config = {"from_attributes": True}
