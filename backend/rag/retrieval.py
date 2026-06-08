import os
import httpx

RAG_API_URL = os.getenv("RAG_API_URL", "http://rag:8000")


async def retrieve_context(query: str, n_results: int = 5) -> tuple[str, list[dict]]:
    """
    Retrieves context chunks and unique references from the external RAG API for a given query.
    Returns:
        tuple[str, list[dict]]: (context_string, references_list)
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{RAG_API_URL}/retrieve",
            json={"query": query, "n_results": n_results},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["context"], data["references"]

