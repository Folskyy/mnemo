import os
import httpx

RAG_API_URL = os.getenv("RAG_API_URL", "http://rag:8000")


async def ingest_chunks(file_id: str, filename: str, chunks: list[dict]):
    """
    Sends document chunks to the external RAG API for embedding and storage in ChromaDB.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{RAG_API_URL}/ingest",
            json={"file_id": file_id, "filename": filename, "chunks": chunks},
        )
        resp.raise_for_status()
