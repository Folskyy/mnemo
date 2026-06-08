import os
import httpx
import chromadb
from fastapi import HTTPException

# Retrieve environment variables
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "ollama")
OLLAMA_PORT = os.getenv("OLLAMA_PORT", "11434")
CHROMA_HOST = os.getenv("CHROMA_HOST", "chromadb")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")


async def get_embedding(text: str) -> list[float]:
    url = f"http://{OLLAMA_HOST}:{OLLAMA_PORT}/api/embed"
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(url, json={"model": EMBED_MODEL, "input": text})
            resp.raise_for_status()
            return resp.json()["embeddings"][0]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {e}")


def get_chroma_collection(name: str = "mnemo"):
    try:
        client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        return client.get_or_create_collection(name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to ChromaDB: {e}")
