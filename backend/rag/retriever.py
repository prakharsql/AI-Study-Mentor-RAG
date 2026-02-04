"""
RAG retriever: semantic search over vector store with metadata.
"""
from langchain_community.vectorstores import FAISS


def retrieve_context(
    vector_db: FAISS,
    query: str,
    k: int = 8,
    source_filter: str | None = None,
) -> str:
    """
    Retrieve top-k relevant chunks. Optionally filter by source (syllabus | previous_year_paper).
    Returns concatenated page_content for LLM context.
    """
    docs = vector_db.similarity_search(query, k=k * 2 if source_filter else k)
    if source_filter:
        docs = [d for d in docs if d.metadata.get("source") == source_filter][:k]
    return "\n\n---\n\n".join([(d.page_content or "").strip() for d in docs if (d.page_content or "").strip()])


def retrieve_documents(
    vector_db: FAISS,
    query: str,
    k: int = 10,
) -> list:
    """Retrieve top-k documents with metadata (for analysis)."""
    return vector_db.similarity_search_with_score(query, k=k)
