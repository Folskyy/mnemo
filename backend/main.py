# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import create_tables
from api.routes.materials import router as materials_router
from api.routes.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
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


@app.get("/health")
def health():
    return {"status": "ok", "app": "mnemo"}