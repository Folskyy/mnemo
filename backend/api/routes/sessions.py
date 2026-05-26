# backend/api/routes/sessions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from datetime import datetime, UTC
from pydantic import BaseModel

from database import get_session
from schemas import StudySession

router = APIRouter(prefix="/sessions", tags=["sessions"])

class SessionCreate(BaseModel):
    study_time: int          # in seconds
    pause_time: int          # in seconds
    productivity_level: int  # 1 to 5

@router.post("/", status_code=201)
def create_study_session(payload: SessionCreate, db: Session = Depends(get_session)):
    if payload.productivity_level < 1 or payload.productivity_level > 5:
        raise HTTPException(status_code=400, detail="Productivity level must be between 1 and 5.")

    duration_min = max(1, payload.study_time // 60)
    total_seconds = payload.study_time + payload.pause_time
    
    now = datetime.now(UTC)
    started_at = datetime.fromtimestamp(now.timestamp() - total_seconds, UTC)
    
    session = StudySession(
        started_at=started_at,
        ended_at=now,
        duration_minutes=duration_min,
        perceived_productivity=payload.productivity_level,
        interrupted=False,
        interruption_count=0
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "id": session.id,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "duration_minutes": session.duration_minutes,
        "perceived_productivity": session.perceived_productivity,
        "status": "created"
    }
