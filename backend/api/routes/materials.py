"""
backend/api/routes/materials.py
POST /materials — upload + ingestão RAG em uma única chamada
"""

import os
import uuid
import httpx
import pymupdf as fitz  # pymupdf
import chromadb

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session
from datetime import datetime, UTC
from database import get_session
from schemas.material import Material

router = APIRouter(prefix="/materials", tags=["materials"])

CHROMA_UPLOAD_DIR = os.getenv("CHROMA_UPLOAD_DIR", "/app/data/documents")
CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "localhost")
OLLAMA_PORT = os.getenv("OLLAMA_PORT", "11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
CHUNK_SIZE = 800
CHUNK_OVERLAP = 80


# ── helpers ───────────────────────────────────────────────────────────────────

def extract_text(path: str, content_type: str) -> str:
    if content_type == "application/pdf":
        doc = fitz.open(path)
        return "\n".join(page.get_text() for page in doc)
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + size].strip())
        start += size - overlap
    return [c for c in chunks if c]


async def get_embedding(text: str) -> list[float]:
    url = f"http://{OLLAMA_HOST}:{OLLAMA_PORT}/api/embed"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json={"model": EMBED_MODEL, "input": text})
        resp.raise_for_status()
        return resp.json()["embeddings"][0]


def get_chroma_collection(name: str = "mnemo"):
    client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
    return client.get_or_create_collection(name)


# ── gambiarras ────────────────────────────────────────────────────────────────

# ── endpoint ──────────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def upload_material(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    # Futuramente: category_id: int | None = Form(None)
):
    if file.content_type not in {"application/pdf", "text/plain"}:
        raise HTTPException(400, f"Tipo não suportado: {file.content_type}")

    # 1. Salvar em disco
    os.makedirs(CHROMA_UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    ext = ".pdf" if file.content_type == "application/pdf" else ".txt"
    file_path = os.path.join(CHROMA_UPLOAD_DIR, f"{file_id}{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # 2. Extrair texto
    try:
        text = extract_text(file_path, file.content_type)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(422, f"Falha ao extrair texto: {e}")

    if not text.strip():
        raise HTTPException(422, "Documento sem texto extraível.")

    # 3. Chunking
    chunks = chunk_text(text)

    # 4. Embeddings + indexação no ChromaDB
    collection = get_chroma_collection()
    now = datetime.now(UTC).isoformat()

    chunk_ids, embeddings, documents, metadatas = [], [], [], []
    for i, chunk in enumerate(chunks):
        chunk_ids.append(f"{file_id}_chunk_{i}")
        embeddings.append(await get_embedding(chunk))
        documents.append(chunk)
        metadatas.append({
            "file_id": file_id,
            "filename": file.filename,
            "chunk_index": i,
            "total_chunks": len(chunks),
            "created_at": now,
        })
    
    collection.add(ids=chunk_ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

    # 5. Salvar metadata no Postgres
    material = Material(
        id=file_id,
        filename=file.filename,
        file_path=file_path,
        content_type=file.content_type,
        chunk_count=len(chunks),
        char_count=len(text),
        created_at=datetime.now(UTC),
    )
    session.add(material)
    session.commit()

    return {
        "id": file_id,
        "filename": file.filename,
        "chunks_indexed": len(chunks),
        "chars_extracted": len(text),
        "status": "indexed",
    }