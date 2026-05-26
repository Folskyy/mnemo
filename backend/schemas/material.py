"""
backend/models/material.py
"""
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


class Material(SQLModel, table=True):
    __tablename__ = "materials"

    id: str = Field(primary_key=True)          # UUID gerado no upload
    filename: str
    file_path: str
    content_type: str
    chunk_count: int = 0
    char_count: int = 0
    # Futuramente: category_id: Optional[int] = Field(default=None, foreign_key="categories.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)