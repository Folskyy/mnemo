# backend/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from database import create_tables  # import absoluto


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(title="Mnemo API", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "app": "mnemo"}