import os
import json
import httpx
import chromadb
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/chat", tags=["chat"])

# Retrieve environment variables
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "ollama")
OLLAMA_PORT = os.getenv("OLLAMA_PORT", "11434")
CHROMA_HOST = os.getenv("CHROMA_HOST", "0.0.0.0")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
CHAT_MODEL = os.getenv("CHAT_MODEL")

if not CHAT_MODEL:
    raise RuntimeError("CHAT_MODEL environment variable is not defined.\nDIr: ", os.getcwd())

class MessageModel(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatPayload(BaseModel):
    message: str
    history: List[MessageModel]

async def get_embedding(text: str) -> List[float]:
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

async def stream_ollama(prompt: str):
    url = f"http://{OLLAMA_HOST}:{OLLAMA_PORT}/api/chat"
    payload = {
        "model": CHAT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "stream": True
    }
    
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    err_content = await response.aread()
                    yield f"Error from Ollama ({response.status_code}): {err_content.decode()}"
                    return
                
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        # Extract the token/content from the message
                        content = data.get("message", {}).get("content", "")
                        if content:
                            print(content, end="", flush=True)
                            yield content
                    except json.JSONDecodeError:
                        continue
            print() # Print a newline at the end of the stream
        except Exception as e:
            print(f"\nError streaming from Ollama: {e}")
            yield f"Error streaming from Ollama: {e}"

@router.post("")
async def chat_endpoint(payload: ChatPayload):
    # 1. Embed the query message
    query_vector = await get_embedding(payload.message)
    
    # 2. Query ChromaDB for top 5 chunks
    collection = get_chroma_collection()
    try:
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=5
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query ChromaDB: {e}")
        
    retrieved_chunks = results.get("documents", [[]])[0] if results else []
    context = "\n---\n".join(retrieved_chunks)
    
    # 3. Format the conversation history
    history_str = "\n".join([f"{msg.role}: {msg.content}" for msg in payload.history])
    
    # 4. Build prompt using template
    prompt = f"""You are a study assistant. Answer based on the user's materials.

Retrieved context from the materials:
{context}

Conversation history:
{history_str}

Question: {payload.message}"""

    print("--- PROMPT SENT TO OLLAMA ---")
    print(prompt)
    print("-----------------------------")

    return StreamingResponse(
        stream_ollama(prompt),
        media_type="text/event-stream",
        headers={"X-Content-Type-Options": "nosniff"}
    )
