from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag.document_loader import load_documents
from rag.vector_store import create_vector_store
from rag.retriever import retrieve_context
from dl.semantic_model import semantic_similarity
from ml.topic_importance import predict_importance
from langchain_ollama import ChatOllama

app = FastAPI(title="AI Study Mentor API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "AI Study Mentor Backend is running 🚀",
        "endpoints": {
            "ask": "POST /ask",
            "docs": "/docs"
        },
        "status": "OK"
    }

# Load RAG once
docs = []
docs += load_documents("data/textbooks")
docs += load_documents("data/notes")
docs += load_documents("data/pyqs")
vector_db = create_vector_store(docs)

llm = ChatOllama(model="tinyllama", temperature=0)

class Question(BaseModel):
    question: str

@app.post("/ask")
def ask_question(data: Question):
    context = retrieve_context(vector_db, data.question)

    prompt = f"""
    Answer using ONLY the context below.
    If not found, say "Not found in study material."

    Context:
    {context}

    Question:
    {data.question}
    """

    response = llm.invoke(prompt)
    answer = response.content

    similarity = semantic_similarity(data.question, answer)
    importance = predict_importance(data.question)

    return {
        "answer": answer,
        "similarity": round(similarity, 2),
        "importance": importance,
        "documents": len(docs)
    }
