from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime, UTC
from pydantic import BaseModel
from typing import Optional, List

from database import get_session
from schemas import CalendarEvent, EventType, Category

router = APIRouter(prefix="/events", tags=["events"])

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: EventType
    date: datetime
    priority: int = 3
    difficulty: Optional[int] = None
    category_id: Optional[int] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[EventType] = None
    date: Optional[datetime] = None
    priority: Optional[int] = None
    difficulty: Optional[int] = None
    category_id: Optional[int] = None
    done: Optional[bool] = None

@router.get("/", response_model=List[CalendarEvent])
def get_events(db: Session = Depends(get_session)):
    statement = select(CalendarEvent).order_by(CalendarEvent.date.asc())
    results = db.exec(statement).all()
    return results

@router.post("/", response_model=CalendarEvent, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, db: Session = Depends(get_session)):
    # Validate category if provided
    if payload.category_id is not None:
        category = db.get(Category, payload.category_id)
        if not category:
            raise HTTPException(status_code=400, detail="Category not found.")
            
    # Validate priority
    if payload.priority < 1 or payload.priority > 5:
        raise HTTPException(status_code=400, detail="Priority must be between 1 and 5.")
        
    # Validate difficulty
    if payload.difficulty is not None and (payload.difficulty < 1 or payload.difficulty > 5):
        raise HTTPException(status_code=400, detail="Difficulty must be between 1 and 5.")

    event = CalendarEvent(
        title=payload.title,
        description=payload.description,
        type=payload.type,
        date=payload.date.replace(tzinfo=None), # Store as naive datetime to match SQLModel defaults
        priority=payload.priority,
        difficulty=payload.difficulty,
        category_id=payload.category_id,
        done=False
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.patch("/{event_id}", response_model=CalendarEvent)
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_session)):
    event = db.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
        
    update_data = payload.model_dump(exclude_unset=True)
    
    if "category_id" in update_data and update_data["category_id"] is not None:
        category = db.get(Category, update_data["category_id"])
        if not category:
            raise HTTPException(status_code=400, detail="Category not found.")
            
    if "priority" in update_data:
        p = update_data["priority"]
        if p < 1 or p > 5:
            raise HTTPException(status_code=400, detail="Priority must be between 1 and 5.")
            
    if "difficulty" in update_data and update_data["difficulty"] is not None:
        d = update_data["difficulty"]
        if d < 1 or d > 5:
            raise HTTPException(status_code=400, detail="Difficulty must be between 1 and 5.")

    for key, value in update_data.items():
        if key == "date" and value is not None:
            value = value.replace(tzinfo=None)
        setattr(event, key, value)
        
    event.updated_at = datetime.now(UTC).replace(tzinfo=None)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, db: Session = Depends(get_session)):
    event = db.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    db.delete(event)
    db.commit()
    return None
