"""
backend/api/routes/materials.py
POST /materials — upload + ingestão RAG em uma única chamada
"""

import os
import uuid
import pymupdf as fitz  # pymupdf

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session
from datetime import datetime, UTC
from database import get_session
from schemas.material import Material
from rag.chroma import get_embedding, get_chroma_collection

router = APIRouter(prefix="/materials", tags=["materials"])

CHROMA_UPLOAD_DIR = os.getenv("CHROMA_UPLOAD_DIR", "/app/data/documents")
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

# ── endpoint ──────────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def upload_material(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    # Futuramente: category_id: int | None = Form(None)
):
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    
    # Supported extensions
    supported_extensions = {".pdf", ".docx", ".txt"}
    
    # Fallback checks based on content type
    is_docx_mime = file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    is_pdf_mime = file.content_type == "application/pdf"
    is_txt_mime = file.content_type == "text/plain"
    
    if ext not in supported_extensions:
        if is_pdf_mime:
            ext = ".pdf"
        elif is_docx_mime:
            ext = ".docx"
        elif is_txt_mime:
            ext = ".txt"
        else:
            raise HTTPException(400, f"Tipo de arquivo não suportado: {file.content_type or ext}. Envie PDF, DOCX ou TXT.")

    # 1. Salvar em disco
    os.makedirs(CHROMA_UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_path = os.path.join(CHROMA_UPLOAD_DIR, f"{file_id}{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # 2. Extrair texto usando os parsers dedicados
    pages = []
    try:
        if ext == ".pdf":
            from parsers.pdf import parse_pdf
            pages = parse_pdf(file_path)
        elif ext == ".docx":
            from parsers.docx import parse_docx
            text = parse_docx(file_path)
            pages = [text]
        else:  # .txt
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            pages = [text]
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(422, f"Falha ao extrair texto: {e}")

    total_chars = sum(len(p) for p in pages)
    if total_chars == 0 or not any(p.strip() for p in pages):
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(422, "Documento sem texto extraível.")

    # 3. Chunking page by page
    chunks_info = []
    for page_idx, page_text in enumerate(pages, start=1):
        if not page_text.strip():
            continue
        page_chunks = chunk_text(page_text)
        for chunk in page_chunks:
            chunks_info.append({
                "text": chunk,
                "page": page_idx
            })

    if not chunks_info:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(422, "Falha ao gerar trechos do documento.")

    # 4. Embeddings + indexação no ChromaDB
    collection = get_chroma_collection()
    now = datetime.now(UTC).isoformat()

    chunk_ids, embeddings, documents, metadatas = [], [], [], []
    for i, chunk_data in enumerate(chunks_info):
        chunk_ids.append(f"{file_id}_chunk_{i}")
        embeddings.append(await get_embedding(chunk_data["text"]))
        documents.append(chunk_data["text"])
        metadatas.append({
            "file_id": file_id,
            "filename": file.filename,
            "chunk_index": i,
            "total_chunks": len(chunks_info),
            "created_at": now,
            "page": chunk_data["page"],
        })
    
    collection.add(ids=chunk_ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

    # 5. Salvar metadata no Postgres
    material = Material(
        id=file_id,
        filename=file.filename,
        file_path=file_path,
        content_type=file.content_type,
        chunk_count=len(chunks_info),
        char_count=total_chars,
        created_at=datetime.now(UTC),
    )
    session.add(material)
    session.commit()

    return {
        "id": file_id,
        "filename": file.filename,
        "chunks_indexed": len(chunks_info),
        "chars_extracted": total_chars,
        "status": "indexed",
    }