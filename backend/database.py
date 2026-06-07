from sqlmodel import SQLModel, create_engine, Session, select
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(Path(__file__).parent.parent / ".env")  # sobe um nível até a raiz

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/mnemo")

engine = create_engine(DATABASE_URL, echo=True)


def create_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


def seed_categories():
    from schemas import Category
    
    with Session(engine) as db:
        statement = select(Category)
        existing = db.exec(statement).first()
        if not existing:
            default_categories = [
                Category(name="Matemática", color="#ef4444", icon="Calculator"),
                Category(name="Programação", color="#3b82f6", icon="Code"),
                Category(name="Idiomas", color="#10b981", icon="Languages"),
                Category(name="História", color="#f59e0b", icon="BookOpen"),
                Category(name="Geral", color="#6b7280", icon="Layers"),
            ]
            for cat in default_categories:
                db.add(cat)
            db.commit()


def seed_study_sessions():
    from schemas import StudySession, Category
    from datetime import datetime, timedelta, UTC
    import random
    
    with Session(engine) as db:
        sessions = db.exec(select(StudySession)).all()
        if len(sessions) < 5:
            categories = db.exec(select(Category)).all()
            if not categories:
                return
            
            now = datetime.now(UTC)
            for _ in range(50):
                days_ago = random.randint(0, 27)
                hour = random.randint(7, 23)
                minute = random.randint(0, 59)
                
                started_at = (now - timedelta(days=days_ago)).replace(hour=hour, minute=minute, second=0, microsecond=0).replace(tzinfo=None)
                duration = random.choice([25, 45, 50, 60, 90])
                ended_at = started_at + timedelta(minutes=duration)
                prod = random.randint(2, 5) if hour < 21 else random.randint(1, 3)
                cat = random.choice(categories)
                
                session = StudySession(
                    category_id=cat.id,
                    started_at=started_at,
                    ended_at=ended_at,
                    duration_minutes=duration,
                    perceived_productivity=prod,
                    interrupted=random.choice([True, False, False]),
                    interruption_count=random.randint(0, 2)
                )
                db.add(session)
            db.commit()