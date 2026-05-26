from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import Field, Relationship, SQLModel

from .material import Material  # Import from materials sub-module to avoid duplicate definition

# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class EventType(str, Enum):
    EXAM = "exam"
    DEADLINE = "deadline"
    GOAL = "goal"
    REVISION = "revision"
    OTHER = "other"


class MaterialType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    LINK = "link"
    NOTE = "note"


class ExperimentType(str, Enum):
    SESSION_DURATION = "session_duration"
    TIME_OF_DAY = "time_of_day"
    BREAK_FREQUENCY = "break_frequency"
    REVIEW_STYLE = "review_style"
    OTHER = "other"


# ──────────────────────────────────────────────
# Category — hierarquia livre com auto-referência
# ──────────────────────────────────────────────

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    sessions: list["StudySession"] = Relationship(back_populates="category")
    events: list["CalendarEvent"] = Relationship(back_populates="category")


# ──────────────────────────────────────────────
# StudySession — sessões com timer
# ──────────────────────────────────────────────

class StudySession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")

    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    perceived_productivity: Optional[int] = None  # 1 a 5
    notes: Optional[str] = None
    interrupted: bool = Field(default=False)
    interruption_count: int = Field(default=0)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    category: Optional[Category] = Relationship(back_populates="sessions")


# ──────────────────────────────────────────────
# CalendarEvent — provas, metas, entregas
# ──────────────────────────────────────────────

class CalendarEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")

    title: str
    description: Optional[str] = None
    type: EventType
    date: datetime
    priority: int = Field(default=3)    # 1 (baixa) a 5 (alta)
    difficulty: Optional[int] = None    # 1 a 5
    done: bool = Field(default=False)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    category: Optional[Category] = Relationship(back_populates="events")


# ──────────────────────────────────────────────
# Experiment — experimentos de método opt-in
# ──────────────────────────────────────────────

class Experiment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    title: str
    description: str
    type: ExperimentType
    active: bool = Field(default=False)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    result: Optional[str] = None    # avaliação do usuário ao fim
    kept: Optional[bool] = None     # usuário manteve a mudança?

    created_at: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────────
# UserProfile — preferências e configurações
# ──────────────────────────────────────────────

class UserProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # JSON string: { "mon": 120, "tue": 90, ... } em minutos
    weekly_availability: str = Field(default="{}")
    experiments_enabled: bool = Field(default=False)
    preferred_session_minutes: int = Field(default=25)
    ollama_model: str = Field(default="llama3")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
