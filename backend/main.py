# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import schemas  # Ensures all tables (including StudySession) are registered in SQLModel
from database import create_tables, seed_categories, seed_study_sessions
from api.routes.materials import router as materials_router
from api.routes.chat import router as chat_router
from api.routes.sessions import router as sessions_router
from api.routes.events import router as events_router
from api.routes.categories import router as categories_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    try:
        seed_categories()
        seed_study_sessions()
    except Exception as e:
        print(f"Error seeding categories/sessions: {e}")
    yield



app = FastAPI(title="Mnemo API", lifespan=lifespan)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(materials_router)
app.include_router(chat_router)
app.include_router(sessions_router)
app.include_router(events_router)
app.include_router(categories_router)


@app.get("/health")
def health():
    return {"status": "ok", "app": "mnemo"}