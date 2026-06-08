import os
import json
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from rag.retrieval import retrieve_context

router = APIRouter(prefix="/chat", tags=["chat"])

# Retrieve environment variables
CHAT_MODEL = os.getenv("CHAT_MODEL")
GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_PROXY_API_KEY", "")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")

if not CHAT_MODEL:
    raise RuntimeError("CHAT_MODEL environment variable is not defined.")

class MessageModel(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatPayload(BaseModel):
    message: str
    history: List[MessageModel]

async def stream_groq(prompt: str):
    if not GROQ_API_KEY:
        yield "Error: GROQ_API_KEY environment variable is not set."
        return

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
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
            async with client.stream("POST", GROQ_API_URL, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    err_content = await response.aread()
                    yield f"Error from Groq API ({response.status_code}): {err_content.decode()}"
                    return
                
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("data:"):
                        data_part = line[5:].strip()
                        if data_part == "[DONE]":
                            break
                        try:
                            data = json.loads(data_part)
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    print(content, end="", flush=True)
                                    yield content
                        except json.JSONDecodeError:
                            continue
            print() # Print a newline at the end of the stream
        except Exception as e:
            print(f"\nError streaming from Groq API: {e}")
            yield f"Error streaming from Groq API: {e}"

@router.post("")
async def chat_endpoint(payload: ChatPayload):
    # 1. Retrieve context and references using decoupled RAG module
    context, references = await retrieve_context(payload.message, n_results=5)
    
    # 3. Format the conversation history
    history_str = "\n".join([f"{msg.role}: {msg.content}" for msg in payload.history])
    
    # 4. Build prompt using template
    prompt = f"""You are a study assistant. Answer based on the user's materials.

===Retrieved context from the materials:
{context}

===Conversation history:
{history_str}

===Question: {payload.message}"""

    # print("--- PROMPT SENT TO GROQ PROXY ---")
    # print(prompt)
    # print("-----------------------------")

    async def response_generator():
        async for chunk in stream_groq(prompt):
            yield chunk
        # Yield references at the end of the stream
        ref_payload = {
            "references": references
        }
        yield f"\n\n[REFERENCES_METADATA]:{json.dumps(ref_payload)}"

    return StreamingResponse(
        response_generator(),
        media_type="text/event-stream",
        headers={"X-Content-Type-Options": "nosniff"}
    )
