"""
Syllabus PDF processor: extract structured text, preserve units/modules/headings,
chunk logically by unit or topic.
"""
import re
import os
from pathlib import Path

from langchain_core.documents import Document
from pypdf import PdfReader
import pdfplumber


def _extract_with_structure(pdf_path: str) -> list[dict]:
    """Extract text with basic structure (headings vs body) using pdfplumber."""
    structured = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text:
                continue
            # Heuristic: lines that are short and often end without period = headings
            lines = text.split("\n")
            current_unit = None
            current_topic = None
            buffer = []
            for line in lines:
                line = line.strip()
                if not line:
                    if buffer:
                        structured.append({
                            "page": i + 1,
                            "unit": current_unit,
                            "topic": current_topic,
                            "text": "\n".join(buffer),
                        })
                        buffer = []
                    continue
                # Unit: "Unit 1", "Module 1", "1. ", "Unit I"
                unit_match = re.match(r"^(?:Unit|Module)\s*[\dIVXLCDM]+[.:]?\s*(.*)$", line, re.I)
                if unit_match:
                    if buffer:
                        structured.append({
                            "page": i + 1,
                            "unit": current_unit,
                            "topic": current_topic,
                            "text": "\n".join(buffer),
                        })
                        buffer = []
                    current_unit = unit_match.group(1).strip() or line
                    current_topic = None
                    buffer.append(line)
                    continue
                # Numbered topic: "1.1", "2.3.1"
                topic_match = re.match(r"^(\d+(?:\.\d+)*)[.:]\s+(.+)$", line)
                if topic_match and len(line) < 120:
                    if buffer:
                        structured.append({
                            "page": i + 1,
                            "unit": current_unit,
                            "topic": current_topic,
                            "text": "\n".join(buffer),
                        })
                        buffer = []
                    current_topic = topic_match.group(2).strip()
                    buffer.append(line)
                    continue
                buffer.append(line)
            if buffer:
                structured.append({
                    "page": i + 1,
                    "unit": current_unit,
                    "topic": current_topic,
                    "text": "\n".join(buffer),
                })
    return structured


def _fallback_extract(pdf_path: str) -> list[dict]:
    """Fallback: pypdf page-by-page with no structure."""
    reader = PdfReader(pdf_path)
    structured = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            structured.append({
                "page": i + 1,
                "unit": None,
                "topic": None,
                "text": text.strip(),
            })
    return structured


def _chunk_logically(structured: list[dict], max_chunk_chars: int = 800) -> list[dict]:
    """Chunk by unit/topic, splitting only when exceeding max_chunk_chars."""
    chunks = []
    for block in structured:
        text = block["text"]
        if len(text) <= max_chunk_chars:
            chunks.append(block)
            continue
        # Split by paragraphs or sentences within same unit/topic
        parts = re.split(r"\n\s*\n", text)
        current = []
        current_len = 0
        for p in parts:
            p = p.strip()
            if not p:
                continue
            if current_len + len(p) + 1 <= max_chunk_chars:
                current.append(p)
                current_len += len(p) + 1
            else:
                if current:
                    chunks.append({
                        "page": block["page"],
                        "unit": block["unit"],
                        "topic": block["topic"],
                        "text": "\n\n".join(current),
                    })
                current = [p]
                current_len = len(p)
        if current:
            chunks.append({
                "page": block["page"],
                "unit": block["unit"],
                "topic": block["topic"],
                "text": "\n\n".join(current),
            })
    return chunks


def process_syllabus_pdf(file_path: str, filename: str) -> list[Document]:
    """
    Process a syllabus PDF: extract structured text, chunk by unit/topic.
    Returns LangChain Documents with metadata: source, type, unit, topic, file_name.
    Raises exceptions for critical errors (corrupted PDF, unreadable file).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    structured = []
    try:
        # Try pdfplumber first (better structure extraction)
        structured = _extract_with_structure(file_path)
    except Exception as e:
        logger.warning(f"pdfplumber extraction failed for {filename}: {e}. Trying pypdf fallback.")
        try:
            structured = _fallback_extract(file_path)
        except Exception as e2:
            logger.error(f"Both pdfplumber and pypdf failed for {filename}: {e2}")
            raise ValueError(f"Failed to extract text from PDF: {str(e2)}. File may be corrupted or password-protected.")
    
    if not structured:
        raise ValueError(f"No text could be extracted from PDF {filename}. File may be empty or image-only.")
    
    try:
        chunks = _chunk_logically(structured)
    except Exception as e:
        logger.error(f"Chunking failed for {filename}: {e}")
        raise ValueError(f"Failed to process PDF structure: {str(e)}")
    
    documents = []
    try:
        for c in chunks:
            meta = {
                "source": "syllabus",
                "file_name": filename,
                "file_type": "pdf",
                "page": c.get("page"),
                "unit": c.get("unit"),
                "topic": c.get("topic"),
            }
            doc = Document(page_content=c["text"], metadata=meta)
            documents.append(doc)
    except Exception as e:
        logger.error(f"Document creation failed for {filename}: {e}")
        raise ValueError(f"Failed to create documents from chunks: {str(e)}")
    
    if not documents:
        raise ValueError(f"No documents created from PDF {filename}.")
    
    return documents
