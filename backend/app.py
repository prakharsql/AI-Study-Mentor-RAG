from pathlib import Path
import os
import uuid
import json

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag.syllabus_processor import process_syllabus_pdf
from rag.paper_processor import process_paper_file
from rag.vector_store import (
    create_vector_store,
    load_vector_store,
    add_documents_to_store,
    DEFAULT_PERSIST_DIR,
)
from rag.retriever import retrieve_context

try:
    from langchain_ollama import ChatOllama
except ImportError:
    from langchain_community.chat_models import ChatOllama

app = FastAPI(title="AI Study Mentor API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload dirs
UPLOAD_SYLLABUS_DIR = Path("data/uploads/syllabus")
UPLOAD_PAPERS_DIR = Path("data/uploads/papers")
FILES_MANIFEST_PATH = Path("data/uploads/files_manifest.json")

SYLLABUS_ACCEPTED = {".pdf"}
PAPERS_ACCEPTED = {".pdf", ".png", ".jpg", ".jpeg", ".txt"}

# In-memory state (reload from manifest on startup)
vector_db = None
uploaded_files: list[dict] = []  # { id, name, type: syllabus|paper, status: processed|failed }


def _ensure_dirs():
    UPLOAD_SYLLABUS_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_PAPERS_DIR.mkdir(parents=True, exist_ok=True)


def _load_manifest():
    global uploaded_files
    if FILES_MANIFEST_PATH.exists():
        try:
            with open(FILES_MANIFEST_PATH) as f:
                uploaded_files = json.load(f)
        except Exception:
            uploaded_files = []


def _save_manifest():
    _ensure_dirs()
    with open(FILES_MANIFEST_PATH, "w") as f:
        json.dump(uploaded_files, f, indent=2)


def _init_vector_store():
    global vector_db
    vector_db = load_vector_store(DEFAULT_PERSIST_DIR)


@app.on_event("startup")
def startup():
    _ensure_dirs()
    _load_manifest()
    _init_vector_store()


@app.get("/")
def root():
    return {
        "message": "AI Study Mentor Backend is running 🚀",
        "endpoints": {
            "ask": "POST /ask",
            "upload_syllabus": "POST /upload/syllabus",
            "upload_papers": "POST /upload/papers",
            "files": "GET /files",
            "docs": "/docs",
        },
        "status": "OK",
    }


# ---------- File listing ----------
@app.get("/files")
def list_files():
    """Return all uploaded files with name, type, status (processed / failed)."""
    return {"files": uploaded_files}


# ---------- Upload Syllabus (PDF only) ----------
@app.post("/upload/syllabus")
async def upload_syllabus(file: UploadFile = File(...)):
    import logging
    logger = logging.getLogger(__name__)
    
    suf = Path(file.filename or "").suffix.lower()
    if suf not in SYLLABUS_ACCEPTED:
        raise HTTPException(400, f"Syllabus must be PDF. Got: {suf or 'unknown'}")
    
    _ensure_dirs()
    file_id = str(uuid.uuid4())
    safe_name = file.filename or "syllabus.pdf"
    save_path = UPLOAD_SYLLABUS_DIR / f"{file_id}{suf}"
    
    # Save file safely
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(422, "Uploaded file is empty")
        with open(save_path, "wb") as f:
            f.write(contents)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to save syllabus file {safe_name}")
        raise HTTPException(500, f"Failed to save file: {str(e)}")
    
    # Process PDF
    status = "failed"
    error_detail = None
    try:
        docs = process_syllabus_pdf(str(save_path), safe_name)
        if not docs:
            error_detail = "No documents extracted from PDF"
            status = "failed"
        else:
            try:
                global vector_db
                if vector_db is None:
                    vector_db = create_vector_store(docs, DEFAULT_PERSIST_DIR)
                else:
                    add_documents_to_store(vector_db, docs, DEFAULT_PERSIST_DIR)
                status = "processed"
            except Exception as e:
                logger.exception(f"Failed to add documents to vector store for {safe_name}")
                error_detail = f"Vector store error: {str(e)}"
                status = "failed"
    except ValueError as e:
        # Expected errors from process_syllabus_pdf
        error_detail = str(e)
        status = "failed"
    except Exception as e:
        # Unexpected errors
        logger.exception(f"Unexpected error processing syllabus {safe_name}")
        error_detail = f"Processing failed: {str(e)}"
        status = "failed"
    
    record = {
        "id": file_id,
        "name": safe_name,
        "type": "syllabus",
        "file_type": suf,
        "status": status,
    }
    if error_detail:
        record["error"] = error_detail
    
    uploaded_files.append(record)
    _save_manifest()
    
    return {
        "id": file_id,
        "name": safe_name,
        "type": "syllabus",
        "status": status,
        "error": error_detail,
    }


# ---------- Upload Previous Year Papers (PDF, PNG, JPG, JPEG, TXT) ----------
@app.post("/upload/papers")
async def upload_papers(file: UploadFile = File(...)):
    import logging
    logger = logging.getLogger(__name__)
    
    suf = Path(file.filename or "").suffix.lower()
    if suf not in PAPERS_ACCEPTED:
        raise HTTPException(
            400,
            f"Papers must be PDF, PNG, JPG, JPEG, or TXT. Got: {suf or 'unknown'}",
        )
    
    _ensure_dirs()
    file_id = str(uuid.uuid4())
    safe_name = file.filename or "paper.pdf"
    save_path = UPLOAD_PAPERS_DIR / f"{file_id}{suf}"
    
    # Save file safely
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(422, "Uploaded file is empty")
        with open(save_path, "wb") as f:
            f.write(contents)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to save paper file {safe_name}")
        raise HTTPException(500, f"Failed to save file: {str(e)}")
    
    # Process file based on type
    extra_meta = {}
    status = "failed"
    error_detail = None
    
    try:
        docs, extra_meta = process_paper_file(str(save_path), safe_name)
        
        # Check for processing errors
        if extra_meta.get("error"):
            error_detail = extra_meta["error"]
            status = "failed"
        elif not docs:
            error_detail = "No text extracted from file."
            status = "failed"
        else:
            # Add to vector store
            try:
                global vector_db
                if vector_db is None:
                    vector_db = create_vector_store(docs, DEFAULT_PERSIST_DIR)
                else:
                    add_documents_to_store(vector_db, docs, DEFAULT_PERSIST_DIR)
                status = "processed"
            except Exception as e:
                logger.exception(f"Failed to add documents to vector store for {safe_name}")
                error_detail = f"Vector store error: {str(e)}"
                status = "failed"
    except Exception as e:
        # Catch any unexpected errors
        logger.exception(f"Unexpected error processing paper {safe_name}")
        error_detail = f"Processing failed: {str(e)}"
        status = "failed"
    
    record = {
        "id": file_id,
        "name": safe_name,
        "type": "previous_year_paper",
        "file_type": suf,
        "status": status,
    }
    if extra_meta.get("year") is not None:
        record["year"] = extra_meta["year"]
    if error_detail:
        record["error"] = error_detail
    
    uploaded_files.append(record)
    _save_manifest()
    
    return {
        "id": file_id,
        "name": safe_name,
        "type": "previous_year_paper",
        "status": status,
        "error": error_detail,
    }


# ---------- Ask (Exam mentor RAG) ----------
class Question(BaseModel):
    question: str


SYSTEM_PROMPT = """You are an exam-focused AI mentor. Your role is to help students prepare for exams using ONLY the uploaded syllabus and previous year question papers. You must NOT use generic knowledge; base every answer strictly on the provided context.

When the user asks about:
- "Important topics for exam" / "What to study first" / "High priority topics"
- "Most expected questions" / "Probable questions"

You MUST analyze the retrieved context (syllabus + past papers) and respond in this EXACT format:

**Important Topics**

**High Priority:**
- Topic name — reason (frequency + syllabus weight)
  *Source: [Syllabus / Previous year papers / Both]*

**Medium Priority:**
- Topic name — reason
  *Source: [Syllabus / Previous year papers / Both]*

**Low Priority:**
- Topic name — reason
  *Source: [Syllabus / Previous year papers / Both]*

**Most Expected Questions**
- Question
  *Reason: [repetition / trend / syllabus alignment]*
  *Source: [Syllabus / Previous year papers / Both]*
- Question
  *Reason: [repetition / trend / syllabus alignment]*
  *Source: [Syllabus / Previous year papers / Both]*

IMPORTANT:
- Always mention the source (Syllabus, Previous year papers, or Both) for each topic/question
- If the context does not contain enough information for a category, say "Not enough data in uploaded documents" for that part
- Be concise and exam-oriented
- Do not hallucinate; if data is missing, say so clearly
- Prioritize topics/questions that appear in BOTH syllabus and previous year papers"""


@app.post("/ask")
def ask_question(data: Question):
    if vector_db is None:
        return {
            "answer": "Please upload your **syllabus** (PDF) and **previous year question papers** (PDF or images) using the sidebar first. I can then identify important topics and expected questions based on your materials.",
            "similarity": None,
            "importance": None,
            "documents": 0,
        }
    try:
        from langchain_core.messages import SystemMessage, HumanMessage
        model = os.getenv("OLLAMA_MODEL", "llama3.2")
        llm = ChatOllama(model=model, temperature=0.3)
        context = retrieve_context(vector_db, data.question, k=15)
        user_prompt = f"""Context from your uploaded documents:

{context}

---

User question: {data.question}

Answer using ONLY the context above. 

If the question is about important topics or expected questions:
- Analyze topic frequency across syllabus and previous year papers
- Identify questions that appear multiple times or align with syllabus topics
- Use the required format (High/Medium/Low priority topics and Most Expected Questions with reasons)
- Always mention the source (Syllabus, Previous year papers, or Both) for each item

Otherwise, answer concisely from the context. If the answer is not in the context, say so clearly."""
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]
        response = llm.invoke(messages)
        answer = response.content if hasattr(response, "content") else str(response)
        return {
            "answer": answer,
            "similarity": None,
            "importance": None,
            "documents": len(uploaded_files),
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "answer": f"Sorry, something went wrong while answering: {e!s}. Check that Ollama is running and the model is available, and that documents were processed successfully.",
            "similarity": None,
            "importance": None,
            "documents": len(uploaded_files),
        }
