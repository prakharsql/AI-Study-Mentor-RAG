"""
Vector store with metadata support. Persist FAISS to disk and support incremental adds.
"""
import os
from pathlib import Path

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document


EMBEDDINGS_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_PERSIST_DIR = "data/vector_store"


def _get_embeddings():
    return HuggingFaceEmbeddings(model_name=EMBEDDINGS_MODEL)


def create_vector_store(documents: list[Document], persist_directory: str | None = None):
    """Create a new FAISS index from documents. Optionally save to disk."""
    if not documents:
        raise ValueError("No documents to index.")
    embeddings = _get_embeddings()
    vector_db = FAISS.from_documents(documents, embeddings)
    if persist_directory:
        Path(persist_directory).mkdir(parents=True, exist_ok=True)
        vector_db.save_local(persist_directory)
    return vector_db


def load_vector_store(persist_directory: str = DEFAULT_PERSIST_DIR) -> FAISS | None:
    """Load existing FAISS index from disk. Returns None if not found."""
    index_path = Path(persist_directory) / "index.faiss"
    if not index_path.exists():
        return None
    embeddings = _get_embeddings()
    return FAISS.load_local(
        persist_directory,
        embeddings,
        allow_dangerous_deserialization=True,
    )


def add_documents_to_store(
    vector_db: FAISS,
    documents: list[Document],
    persist_directory: str | None = None,
) -> FAISS:
    """Add new documents to existing FAISS store and optionally persist."""
    vector_db.add_documents(documents)
    if persist_directory:
        Path(persist_directory).mkdir(parents=True, exist_ok=True)
        vector_db.save_local(persist_directory)
    return vector_db


def get_or_create_empty_store(persist_directory: str = DEFAULT_PERSIST_DIR) -> tuple[FAISS | None, bool]:
    """
    Load existing store or return (None, True) indicating "empty, need create".
    Returns (vector_db, loaded_from_disk).
    """
    db = load_vector_store(persist_directory)
    return (db, db is not None)
