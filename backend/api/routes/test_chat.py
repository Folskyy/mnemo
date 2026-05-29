# backend/api/routes/test_chat.py
import pytest
import respx
import httpx
import os
import sys

# Add backend directory to Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Mock chromadb to prevent ImportError during tests
import sys
from unittest.mock import MagicMock
sys.modules['chromadb'] = MagicMock()

# Set environment variables for tests
os.environ["GROQ_API_KEY"] = "test-key"
os.environ["GROQ_API_URL"] = "https://api.groq.com/openai/v1/chat/completions"
os.environ["CHAT_MODEL"] = "llama3-8b-8192"

from api.routes.chat import stream_groq

@pytest.mark.asyncio
@respx.mock
async def test_stream_groq_success():
    mock_url = "https://api.groq.com/openai/v1/chat/completions"
    
    # Simulate streamed SSE response
    stream_content = (
        b'data: {"choices": [{"delta": {"content": "Hello"}}]}\n\n'
        b'data: {"choices": [{"delta": {"content": " world"}}]}\n\n'
        b'data: [DONE]\n\n'
    )
    
    respx.post(mock_url).mock(return_value=httpx.Response(
        status_code=200,
        content=stream_content,
        headers={"Content-Type": "text/event-stream"}
    ))
    
    chunks = []
    async for chunk in stream_groq("Test prompt"):
        chunks.append(chunk)
        
    assert chunks == ["Hello", " world"]

@pytest.mark.asyncio
@respx.mock
async def test_stream_groq_error():
    mock_url = "https://api.groq.com/openai/v1/chat/completions"
    
    respx.post(mock_url).mock(return_value=httpx.Response(
        status_code=401,
        content=b"Unauthorized access"
    ))
    
    chunks = []
    async for chunk in stream_groq("Test prompt"):
        chunks.append(chunk)
        
    assert len(chunks) == 1
    assert "Error from Groq API (401)" in chunks[0]
