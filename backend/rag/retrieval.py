from rag.chroma import get_embedding, get_chroma_collection

async def retrieve_context(query: str, n_results: int = 5) -> tuple[str, list[dict]]:
    """
    Retrieves context chunks and unique references from ChromaDB for a given query.
    Returns:
        tuple[str, list[dict]]: (context_string, references_list)
    """
    # 1. Embed the query message
    query_vector = await get_embedding(query)
    
    # 2. Query ChromaDB for top chunks
    collection = get_chroma_collection()
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=n_results
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
        page = meta.get("page", 1)  # Default to 1 if not specified
        if filename:
            ref_key = (filename, page)
            if ref_key not in seen:
                seen.add(ref_key)
                references.append({
                    "filename": filename,
                    "page": page
                })
                
    context = "\n---\n".join(retrieved_chunks)
    return context, references
