from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional, List

from database import get_session
from schemas import Category

router = APIRouter(prefix="/categories", tags=["categories"])

class CategoryCreate(BaseModel):
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None

@router.get("/", response_model=List[Category])
def get_categories(db: Session = Depends(get_session)):
    statement = select(Category)
    results = db.exec(statement).all()
    return results

@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_session)):
    if payload.parent_id is not None:
        parent = db.get(Category, payload.parent_id)
        if not parent:
            raise HTTPException(status_code=400, detail="Parent category not found.")

    category = Category(
        name=payload.name,
        color=payload.color,
        icon=payload.icon,
        parent_id=payload.parent_id
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
