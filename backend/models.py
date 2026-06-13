import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class MeetingStatus(str, enum.Enum):
    scheduled = "scheduled"
    live = "live"
    ended = "ended"


class ParticipantRole(str, enum.Enum):
    host = "host"
    participant = "participant"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meetings_hosted = relationship("Meeting", back_populates="host")
    participations = relationship("Participant", back_populates="user")
    recent_meetings = relationship("RecentMeeting", back_populates="user")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    meeting_code = Column(String(20), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    host_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_start_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    status = Column(Enum(MeetingStatus), default=MeetingStatus.scheduled, nullable=False)
    invite_link = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    host = relationship("User", back_populates="meetings_hosted")
    participants = relationship("Participant", back_populates="meeting")
    recent_meetings = relationship("RecentMeeting", back_populates="meeting")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    display_name = Column(String(255), nullable=False)
    role = Column(Enum(ParticipantRole), default=ParticipantRole.participant, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    left_at = Column(DateTime, nullable=True)
    is_muted = Column(Boolean, default=False, nullable=False)
    is_video_on = Column(Boolean, default=True, nullable=False)

    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User", back_populates="participations")


class RecentMeeting(Base):
    __tablename__ = "recent_meetings"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="recent_meetings")
    user = relationship("User", back_populates="recent_meetings")
