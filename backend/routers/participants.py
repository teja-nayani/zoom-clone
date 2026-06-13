from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas import ParticipantOut

router = APIRouter()


@router.get("/{meeting_code}/participants", response_model=List[ParticipantOut])
def list_participants(meeting_code: str, db: Session = Depends(get_db)):
    """Return all active participants for a given meeting."""
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet")


@router.delete(
    "/{meeting_code}/participants/{participant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_participant(meeting_code: str, participant_id: int, db: Session = Depends(get_db)):
    """Host-only: remove a participant from the meeting (sets left_at)."""
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet")
