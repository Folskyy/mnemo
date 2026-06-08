import os
import chromadb
import httpx
from datetime import datetime, UTC
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Mnemo RAG API")

# Environment configurations (will match backend/.env configuration)
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "ollama")
OLLAMA_PORT = os.getenv("OLLAMA_PORT", "11434")
CHROMA_HOST = os.getenv("CHROMA_HOST", "chromadb")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")


class ChunkItem(BaseModel):
    text: str
    page: int


class IngestPayload(BaseModel):
    file_id: str
    filename: str
    chunks: List[ChunkItem]


class RetrievePayload(BaseModel):
    query: str
    n_results: int = 5


def get_chroma_collection(name: str = "mnemo"):
    try:
        client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        return client.get_or_create_collection(name)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to connect to ChromaDB: {str(e)}"
        )


async def get_embedding(text: str) -> List[float]:
    url = f"http://{OLLAMA_HOST}:{OLLAMA_PORT}/api/embed"
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(url, json={"model": EMBED_MODEL, "input": text})
            resp.raise_for_status()
            return resp.json()["embeddings"][0]
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to generate embedding: {str(e)}"
            )


@app.get("/health")
def health():
    return {"status": "ok", "app": "mnemo-rag-api"}


@app.post("/ingest", status_code=201)
async def ingest(payload: IngestPayload):
    collection = get_chroma_collection()
    now = datetime.now(UTC).isoformat()

    chunk_ids, embeddings, documents, metadatas = [], [], [], []
    for i, chunk in enumerate(payload.chunks):
        chunk_ids.append(f"{payload.file_id}_chunk_{i}")
        emb = await get_embedding(chunk.text)
        embeddings.append(emb)
        documents.append(chunk.text)
        metadatas.append({
            "file_id": payload.file_id,
            "filename": payload.filename,
            "chunk_index": i,
            "total_chunks": len(payload.chunks),
            "created_at": now,
            "page": chunk.page,
        })

    try:
        collection.add(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to add documents to ChromaDB: {str(e)}"
        )

    return {
        "status": "success",
        "chunks_indexed": len(payload.chunks),
    }


@app.post("/retrieve")
async def retrieve(payload: RetrievePayload):
    query_vector = await get_embedding(payload.query)
    collection = get_chroma_collection()

    try:
        results = collection.query(
            query_embeddings=[query_vector], n_results=payload.n_results
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to query ChromaDB: {str(e)}"
        )

    retrieved_chunks = results.get("documents", [[]])[0] if results else []
    retrieved_metadatas = results.get("metadatas", [[]])[0] if results else []

    # Compile unique source references
    references = []
    seen = set()
    for meta in retrieved_metadatas:
        if not meta:
            continue
        filename = meta.get("filename")
        page = meta.get("page", 1)
        if filename:
            ref_key = (filename, page)
            if ref_key not in seen:
                seen.add(ref_key)
                references.append({"filename": filename, "page": page})

    context = "\n---\n".join(retrieved_chunks)
    return {"context": context, "references": references}


@app.delete("/documents/{file_id}")
async def delete_document(file_id: str):
    collection = get_chroma_collection()
    try:
        collection.delete(where={"file_id": file_id})
        return {"status": "success", "message": f"Document {file_id} deleted"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete from ChromaDB: {str(e)}"
        )
