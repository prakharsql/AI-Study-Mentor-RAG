"""
Previous year papers processor: PDF text extraction + OCR for images (PNG/JPG/JPEG) + TXT support.
Identifies repeated questions, topics, and question patterns.
Uses pypdf first, pdfplumber fallback for PDFs; centralized OCR utility for images.
"""
import re
import logging
from pathlib import Path

from langchain_core.documents import Document
from pypdf import PdfReader
from rag.ocr_utils import extract_text_from_image, HAS_OCR

logger = logging.getLogger(__name__)

# Optional: pdfplumber for better PDF text extraction when pypdf fails
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False


def _extract_year_from_text(text: str) -> int | None:
    """Try to detect exam year from text (e.g. 2023, 2022, 'Dec 2023')."""
    # Year in range 1990-2030
    years = re.findall(r"\b(19[9]\d|20[0-2]\d|2030)\b", text[:3000])
    return int(years[0]) if years else None


def _extract_year_from_filename(filename: str) -> int | None:
    """Try to get year from filename (e.g. paper_2023.pdf)."""
    years = re.findall(r"(19[9]\d|20[0-2]\d|2030)", filename)
    return int(years[0]) if years else None


def _extract_questions_from_text(text: str) -> list[str]:
    """
    Heuristic: split by common question patterns (Q1, 1., (a), etc.)
    and return non-empty question-like blocks.
    """
    # Split by "Question 1", "Q.1", "1.", "(a)", "Section A" etc.
    parts = re.split(
        r"\n\s*(?:Question\s*\d+|Q\.?\s*\d+|^\d+[.)]\s*(?=[A-Z])|Section\s+[A-Z])\s*",
        text,
        flags=re.MULTILINE | re.IGNORECASE,
    )
    questions = []
    for p in parts:
        p = p.strip()
        if len(p) < 30:
            continue
        # Single line often = question number line only
        if "\n" not in p and len(p) < 80:
            continue
        questions.append(p[:2000])  # cap length
    return questions


def _extract_pdf_text_pypdf(file_path: str) -> tuple[str, list[str]]:
    """Extract full text and per-page text using pypdf. Returns (full_text, page_texts)."""
    full_text = ""
    page_texts = []
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            try:
                t = page.extract_text()
            except Exception:
                t = None
            t = (t or "").strip()
            if t:
                full_text += t + "\n"
                page_texts.append(t)
    except Exception as e:
        logger.warning(f"pypdf extraction failed: {e}")
        return "", []
    return full_text.strip(), page_texts


def _extract_pdf_text_pdfplumber(file_path: str) -> tuple[str, list[str]]:
    """Extract full text and per-page text using pdfplumber. Returns (full_text, page_texts)."""
    if not HAS_PDFPLUMBER:
        return "", []
    full_text = ""
    page_texts = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = (page.extract_text() or "").strip()
                if t:
                    full_text += t + "\n"
                    page_texts.append(t)
    except Exception as e:
        logger.warning("pdfplumber extraction failed: %s", e)
    return full_text.strip(), page_texts


def process_pdf_paper(file_path: str, filename: str) -> tuple[list[Document], dict]:
    """Extract text from PDF paper; use pdfplumber if pypdf yields no text. Returns (documents, {year?, error?})."""
    try:
        # Try pypdf first
        full_text, page_texts = _extract_pdf_text_pypdf(file_path)
        
        # If no text, try pdfplumber
        if not full_text and HAS_PDFPLUMBER:
            logger.info(f"No text from pypdf for {filename}, trying pdfplumber")
            full_text, page_texts = _extract_pdf_text_pdfplumber(file_path)
        
        # If still no text, return error (don't add placeholder - let backend handle it)
        if not full_text:
            return [], {"error": "No text could be extracted from PDF. File may be scanned/image-only or corrupted."}
        
        # Process extracted text
        year = _extract_year_from_text(full_text) or _extract_year_from_filename(filename)
        extra = {"year": year} if year else {}
        questions = _extract_questions_from_text(full_text)
        documents = []
        
        for i, pt in enumerate(page_texts):
            if not pt.strip():
                continue
            meta = {
                "source": "previous_year_paper",
                "file_name": filename,
                "file_type": "pdf",
                "year": year,
                "page": i + 1,
            }
            documents.append(Document(page_content=pt.strip(), metadata=meta))
        
        if questions:
            summary = "Previous year questions (extracted):\n\n" + "\n---\n".join(questions[:50])
            meta = {
                "source": "previous_year_paper",
                "file_name": filename,
                "file_type": "pdf",
                "year": year,
                "page": None,
                "content_type": "question_list",
            }
            documents.append(Document(page_content=summary[:8000], metadata=meta))
        
        return documents, extra
        
    except Exception as e:
        logger.exception(f"process_pdf_paper failed for {filename}: {e}")
        return [], {"error": f"PDF processing failed: {str(e)}. File may be corrupted or password-protected."}


def process_image_paper(file_path: str, filename: str) -> tuple[list[Document], dict]:
    """OCR image (PNG/JPG/JPEG) to extract text using centralized OCR utility. Returns (documents, {year?, error?})."""
    text, error_msg = extract_text_from_image(file_path)
    
    if error_msg:
        logger.warning(f"Image OCR failed for {filename}: {error_msg}")
        # Return error in extra_meta so backend can report it
        return [], {"error": error_msg}
    
    if not text:
        return [], {"error": "OCR extracted no text from image."}
    
    year = _extract_year_from_text(text) or _extract_year_from_filename(filename)
    questions = _extract_questions_from_text(text)
    documents = []
    extra = {"year": year} if year else {}
    meta = {
        "source": "previous_year_paper",
        "file_name": filename,
        "file_type": "image",
        "year": year,
        "page": 1,
    }
    documents.append(Document(page_content=text[:8000], metadata=meta))
    if questions:
        summary = "Previous year questions (from image):\n\n" + "\n---\n".join(questions[:50])
        meta_summary = {**meta, "content_type": "question_list"}
        documents.append(Document(page_content=summary[:8000], metadata=meta_summary))
    return documents, extra


def process_txt_paper(file_path: str, filename: str) -> tuple[list[Document], dict]:
    """Read text file directly. Returns (documents, {year?})."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read().strip()
    except Exception as e:
        logger.exception(f"Failed to read TXT file {filename}: {e}")
        return [], {"error": f"Failed to read file: {str(e)}"}
    
    if not text:
        return [], {"error": "Text file is empty."}
    
    year = _extract_year_from_text(text) or _extract_year_from_filename(filename)
    questions = _extract_questions_from_text(text)
    documents = []
    extra = {"year": year} if year else {}
    meta = {
        "source": "previous_year_paper",
        "file_name": filename,
        "file_type": "txt",
        "year": year,
        "page": 1,
    }
    documents.append(Document(page_content=text[:8000], metadata=meta))
    if questions:
        summary = "Previous year questions (from text file):\n\n" + "\n---\n".join(questions[:50])
        meta_summary = {**meta, "content_type": "question_list"}
        documents.append(Document(page_content=summary[:8000], metadata=meta_summary))
    return documents, extra


def process_paper_file(file_path: str, filename: str) -> tuple[list[Document], dict]:
    """Dispatch to PDF, image, or TXT processor by extension. Returns (documents, extra_meta e.g. {year, error?})."""
    try:
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return process_pdf_paper(file_path, filename)
        if ext in (".png", ".jpg", ".jpeg"):
            return process_image_paper(file_path, filename)
        if ext == ".txt":
            return process_txt_paper(file_path, filename)
        return [], {"error": f"Unsupported file type: {ext}"}
    except Exception as e:
        logger.exception("process_paper_file failed: %s", e)
        # Return one doc so backend can still add to store and not 500
        ext = Path(filename).suffix.lower()
        meta = {"source": "previous_year_paper", "file_name": filename, "file_type": ext.replace(".", "") or "unknown", "page": 1}
        doc = Document(
            page_content=f"[Previous year paper: {filename}. Processing error: {e!s}.]",
            metadata=meta,
        )
        return [doc], {"error": str(e)}
