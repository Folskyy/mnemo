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


from unittest.mock import AsyncMock, MagicMock, patch
from api.routes.chat import chat_endpoint, ChatPayload, MessageModel

@pytest.mark.asyncio
@respx.mock
async def test_chat_endpoint_references():
    mock_url = "https://api.groq.com/openai/v1/chat/completions"
    
    stream_content = (
        b'data: {"choices": [{"delta": {"content": "According to the PDF, yes."}}]}\n\n'
        b'data: [DONE]\n\n'
    )
    respx.post(mock_url).mock(return_value=httpx.Response(
        status_code=200,
        content=stream_content,
        headers={"Content-Type": "text/event-stream"}
    ))

    mock_collection = MagicMock()
    mock_collection.query.return_value = {
        "documents": [["This is chunk content 1", "This is chunk content 2"]],
        "metadatas": [[
            {"filename": "document.pdf", "page": 3},
            {"filename": "document.pdf", "page": 3},  # Duplicate
        ]]
    }

    with patch("rag.retrieval.get_embedding", new_callable=AsyncMock) as mock_embed, \
         patch("rag.retrieval.get_chroma_collection", return_value=mock_collection):
        
        mock_embed.return_value = [0.1, 0.2, 0.3]
        
        payload = ChatPayload(
            message="Is it true?",
            history=[MessageModel(role="user", content="Hello")]
        )
        
        response = await chat_endpoint(payload)
        
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
            
        full_response = "".join(chunks)
        assert "According to the PDF, yes." in full_response
        assert "[REFERENCES_METADATA]:" in full_response
        assert '"filename": "document.pdf"' in full_response
        assert '"page": 3' in full_response

