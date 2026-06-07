# backend/api/routes/sessions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, UTC, timedelta
from pydantic import BaseModel
from typing import Optional, List

from database import get_session
from schemas import StudySession, Category

router = APIRouter(prefix="/sessions", tags=["sessions"])

class SessionCreate(BaseModel):
    study_time: int          # in seconds
    pause_time: int          # in seconds
    productivity_level: int  # 1 to 5
    category_id: Optional[int] = None

@router.post("/", status_code=201)
def create_study_session(payload: SessionCreate, db: Session = Depends(get_session)):
    if payload.productivity_level < 1 or payload.productivity_level > 5:
        raise HTTPException(status_code=400, detail="Productivity level must be between 1 and 5.")

    # Validate category if provided
    if payload.category_id is not None:
        category = db.get(Category, payload.category_id)
        if not category:
            raise HTTPException(status_code=400, detail="Category not found.")

    duration_min = max(1, payload.study_time // 60)
    total_seconds = payload.study_time + payload.pause_time
    
    now = datetime.now(UTC)
    started_at = datetime.fromtimestamp(now.timestamp() - total_seconds, UTC)
    
    session = StudySession(
        category_id=payload.category_id,
        started_at=started_at.replace(tzinfo=None),
        ended_at=now.replace(tzinfo=None),
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
        "category_id": session.category_id,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "duration_minutes": session.duration_minutes,
        "perceived_productivity": session.perceived_productivity,
        "status": "created"
    }

@router.get("/insights")
def get_sessions_insights(db: Session = Depends(get_session)):
    sessions = db.exec(select(StudySession)).all()
    categories = db.exec(select(Category)).all()
    cat_map = {c.id: c for c in categories}
    
    # 1. Weekly hours
    dow_names = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    dow_minutes = {i: 0 for i in range(7)}
    
    # 2. Category aggregation
    cat_minutes = {}
    
    # 3. Hourly productivity ranges
    ranges = {
        "Madrugada (00h-06h)": {"total_productivity": 0, "count": 0},
        "Manhã (06h-12h)": {"total_productivity": 0, "count": 0},
        "Tarde (12h-18h)": {"total_productivity": 0, "count": 0},
        "Noite (18h-00h)": {"total_productivity": 0, "count": 0},
    }
    
    # 4. Consistency heatmap of the last 28 days
    now = datetime.now(UTC)
    today_date = now.date()
    heatmap_dates = [today_date - timedelta(days=i) for i in range(27, -1, -1)]
    heatmap_data = {d: {"count": 0, "minutes": 0} for d in heatmap_dates}
    twenty_eight_days_ago = today_date - timedelta(days=27)
    
    for s in sessions:
        # Check day of the week (0=Sunday, 1=Monday, ..., 6=Saturday)
        # weekday(): 0=Monday, ..., 6=Sunday. Map to: 0=Sunday, ..., 6=Saturday
        py_weekday = s.started_at.weekday()
        dow = (py_weekday + 1) % 7
        dow_minutes[dow] += s.duration_minutes or 0
        
        # Category aggregation
        cat_id = s.category_id
        duration = s.duration_minutes or 0
        if cat_id not in cat_minutes:
            cat_minutes[cat_id] = 0
        cat_minutes[cat_id] += duration
        
        # Productivity by hour range
        if s.perceived_productivity is not None:
            hour = s.started_at.hour
            if 0 <= hour < 6:
                key = "Madrugada (00h-06h)"
            elif 6 <= hour < 12:
                key = "Manhã (06h-12h)"
            elif 12 <= hour < 18:
                key = "Tarde (12h-18h)"
            else:
                key = "Noite (18h-00h)"
            ranges[key]["total_productivity"] += s.perceived_productivity
            ranges[key]["count"] += 1
            
        # Heatmap
        s_date = s.started_at.date()
        if s_date >= twenty_eight_days_ago and s_date in heatmap_data:
            heatmap_data[s_date]["count"] += 1
            heatmap_data[s_date]["minutes"] += s.duration_minutes or 0
            
    # Format weekly data
    hours_per_day = []
    for i in range(7):
        hours_per_day.append({
            "dow": i,
            "name": dow_names[i],
            "total_minutes": dow_minutes[i]
        })
        
    # Format category data
    category_donut = []
    for cat_id, duration in cat_minutes.items():
        if cat_id is not None and cat_id in cat_map:
            category_donut.append({
                "category_id": cat_id,
                "name": cat_map[cat_id].name,
                "color": cat_map[cat_id].color or "#6b7280",
                "total_minutes": duration
            })
        else:
            if duration > 0:
                category_donut.append({
                    "category_id": None,
                    "name": "Sem categoria",
                    "color": "#94a3b8",
                    "total_minutes": duration
                })
                
    # Format heatmap data
    consistency_heatmap = []
    for d in heatmap_dates:
        h_info = heatmap_data[d]
        consistency_heatmap.append({
            "date": d.isoformat(),
            "count": h_info["count"],
            "minutes": h_info["minutes"],
            "active": h_info["count"] > 0
        })
        
    # Format productivity range data
    productivity_by_hour = []
    for range_name, data in ranges.items():
        avg_prod = round(data["total_productivity"] / data["count"], 2) if data["count"] > 0 else 0
        productivity_by_hour.append({
            "range": range_name,
            "avg_productivity": avg_prod,
            "session_count": data["count"]
        })
        
    return {
        "hours_per_day": hours_per_day,
        "category_donut": category_donut,
        "consistency_heatmap": consistency_heatmap,
        "productivity_by_hour": productivity_by_hour
    }

