"""
Question analysis pipeline: extract, rank, and group important questions from
uploaded previous year papers, mapped to syllabus.

Reuses: vector store retrieval, existing metadata (source, year, topic, unit).
No new storage; retrieval-based.
"""
import re
import logging
from collections import defaultdict

from langchain_community.vectorstores import FAISS

from rag.paper_processor import _extract_questions_from_text

logger = logging.getLogger(__name__)

# --- Constants ---
PAPER_QUERIES = [
    "previous year exam questions",
    "question paper section",
    "marks questions",
]
SYLLABUS_QUERY = "syllabus units topics modules"
MAX_PAPER_CHUNKS = 40
MAX_SYLLABUS_CHUNKS = 25
MIN_QUESTION_LEN = 25
MAX_QUESTION_LEN = 800
NORMALIZE_FINGERPRINT_LEN = 120
FREQUENCY_WEIGHT = 0.5   # alpha: importance = alpha * norm_freq + (1-alpha) * norm_syllabus


def _get_chunks_by_source(vector_db: FAISS, source: str, query: str, k: int) -> list:
    """Retrieve chunks filtered by metadata source. Returns list of (doc, score)."""
    try:
        docs_with_scores = vector_db.similarity_search_with_score(query, k=k * 2)
        filtered = [
            (doc, score)
            for doc, score in docs_with_scores
            if doc.metadata.get("source") == source
        ][:k]
        return filtered
    except Exception as e:
        logger.warning(f"Retrieval for source={source} failed: {e}")
        return []


def _normalize_question(text: str) -> str:
    """Normalize for dedup: lowercase, collapse whitespace, strip."""
    if not text or len(text) < MIN_QUESTION_LEN:
        return ""
    t = re.sub(r"\s+", " ", text.lower().strip())
    return t[:MAX_QUESTION_LEN]


def _fingerprint(text: str) -> str:
    """Stable fingerprint for grouping similar questions (same idea, different wording)."""
    n = _normalize_question(text)
    if len(n) <= NORMALIZE_FINGERPRINT_LEN:
        return n
    return n[:NORMALIZE_FINGERPRINT_LEN]


def _extract_questions_from_chunks(docs_with_scores: list) -> list[dict]:
    """
    From retrieved paper chunks, extract question strings and attach metadata.
    Returns list of { "text", "normalized", "fingerprint", "year", "file_name", "raw_count" }.
    """
    seen_fp: dict[str, dict] = {}
    for doc, _ in docs_with_scores:
        content = (doc.page_content or "").strip()
        if not content:
            continue
        meta = doc.metadata or {}
        years = meta.get("year")
        file_name = meta.get("file_name", "")
        questions = _extract_questions_from_text(content)
        for q in questions:
            if len(q) < MIN_QUESTION_LEN or len(q) > MAX_QUESTION_LEN:
                continue
            fp = _fingerprint(q)
            if not fp:
                continue
            norm = _normalize_question(q)
            if fp in seen_fp:
                seen_fp[fp]["raw_count"] += 1
                if years is not None and years not in seen_fp[fp].get("years", []):
                    seen_fp[fp].setdefault("years", []).append(years)
            else:
                seen_fp[fp] = {
                    "text": q.strip(),
                    "normalized": norm,
                    "fingerprint": fp,
                    "year": years,
                    "file_name": file_name,
                    "years": [years] if years is not None else [],
                    "raw_count": 1,
                }
    return list(seen_fp.values())


def _score_syllabus_relevance(
    vector_db: FAISS,
    question_text: str,
    syllabus_docs: list,
    top_k: int = 3,
) -> float:
    """
    Score how well a question aligns with syllabus (0..1).
    Uses retrieval: question vs syllabus chunks; score = 1 - normalized_distance.
    """
    if not syllabus_docs:
        return 0.0
    try:
        # Retrieve syllabus chunks most similar to this question
        docs = vector_db.similarity_search_with_score(
            question_text,
            k=top_k * 2,
        )
        syllabus_only = [(d, s) for d, s in docs if d.metadata.get("source") == "syllabus"][:top_k]
        if not syllabus_only:
            return 0.0
        # FAISS returns L2 distance; lower = more similar. Normalize to 0-1 (1 = best).
        scores = [1.0 / (1.0 + s) for _, s in syllabus_only]
        return sum(scores) / len(scores) if scores else 0.0
    except Exception as e:
        logger.debug(f"syllabus relevance failed for question: {e}")
        return 0.0


def _importance_score(
    frequency_norm: float,
    syllabus_relevance: float,
    alpha: float = FREQUENCY_WEIGHT,
) -> float:
    """Combine frequency and syllabus relevance into single score."""
    return alpha * frequency_norm + (1.0 - alpha) * syllabus_relevance


def _assign_topic(vector_db: FAISS, question_text: str) -> tuple[str | None, str | None]:
    """
    Assign unit/topic from syllabus by finding best-matching syllabus chunk.
    Returns (unit, topic).
    """
    try:
        docs = vector_db.similarity_search(question_text, k=5)
        for d in docs:
            if d.metadata.get("source") != "syllabus":
                continue
            unit = d.metadata.get("unit")
            topic = d.metadata.get("topic")
            if unit or topic:
                return (unit, topic)
    except Exception:
        pass
    return (None, None)


def analyze_important_questions(
    vector_db: FAISS,
    top_n: int = 15,
    frequency_weight: float = FREQUENCY_WEIGHT,
) -> dict:
    """
    Full pipeline: retrieve paper + syllabus chunks, extract questions,
    score by frequency + syllabus relevance, group by topic.

    Returns structure suitable for LLM prompt + optional JSON API.
    """
    # 1) Retrieve paper chunks (multiple queries to cover question-heavy content)
    all_paper_chunks = []
    seen_ids = set()
    for q in PAPER_QUERIES:
        chunks = _get_chunks_by_source(
            vector_db, "previous_year_paper", q, k=MAX_PAPER_CHUNKS // len(PAPER_QUERIES)
        )
        for doc, score in chunks:
            key = (doc.metadata.get("file_name"), doc.metadata.get("page"), id(doc.page_content))
            if key in seen_ids:
                continue
            seen_ids.add(key)
            all_paper_chunks.append((doc, score))

    # 2) Retrieve syllabus chunks
    syllabus_chunks = _get_chunks_by_source(
        vector_db, "syllabus", SYLLABUS_QUERY, k=MAX_SYLLABUS_CHUNKS
    )

    # 3) Extract and dedupe questions
    question_list = _extract_questions_from_chunks(all_paper_chunks)
    if not question_list:
        return {
            "questions": [],
            "by_topic": {},
            "syllabus_available": len(syllabus_chunks) > 0,
            "paper_chunks_used": len(all_paper_chunks),
        }

    # 4) Frequency: raw_count normalized to 0-1
    max_count = max(q["raw_count"] for q in question_list) or 1
    for q in question_list:
        q["frequency_norm"] = q["raw_count"] / max_count

    # 5) Syllabus relevance per question
    for q in question_list:
        q["syllabus_relevance"] = _score_syllabus_relevance(
            vector_db, q["text"], syllabus_chunks, top_k=3
        )

    # 6) Importance score and topic
    for q in question_list:
        q["importance_score"] = _importance_score(
            q["frequency_norm"],
            q["syllabus_relevance"],
            alpha=frequency_weight,
        )
        unit, topic = _assign_topic(vector_db, q["text"])
        q["unit"] = unit
        q["topic"] = topic

    # 7) Rank and take top_n
    question_list.sort(key=lambda x: x["importance_score"], reverse=True)
    top = question_list[:top_n]

    # 8) Group by topic for display
    by_topic = defaultdict(list)
    for q in top:
        key = (q.get("unit") or "Other", q.get("topic") or "General")
        by_topic[key].append(q)

    return {
        "questions": top,
        "by_topic": dict(by_topic),
        "syllabus_available": len(syllabus_chunks) > 0,
        "paper_chunks_used": len(all_paper_chunks),
    }


# --- LLM prompt template (for /ask or dedicated endpoint) ---
IMPORTANT_QUESTIONS_PROMPT_TEMPLATE = """You are an exam-focused AI mentor. Use ONLY the analyzed data below.

**Analyzed data (ranked by importance: frequency in past papers + syllabus alignment):**

{structured_questions}

**Instructions:**
- Output the top important questions in this EXACT format:
**Most Important Questions for Exam**

1. **Question:** [exact or summarized question]
   **Why important:** [1–2 sentences: repetition across years / syllabus weight / trend]
   **Source:** Previous year papers (years if known) + Syllabus topic/unit if matched

2. **Question:** ...
   **Why important:** ...
   **Source:** ...

- If a question appeared in multiple years, say so (e.g. "Appeared in 2022, 2023").
- If a question maps to a syllabus unit/topic, mention it (e.g. "Maps to Unit 3: Topic X").
- Give at most {top_n} questions. Be concise. Do not add questions not in the list above.
- If no questions were extracted, say: "No questions could be extracted from the uploaded papers. Upload more previous year papers."
"""


def build_important_questions_context(analysis: dict, top_n: int = 10) -> str:
    """
    Turn analysis result into a text block for the LLM.
    Used when user asks for "most important questions" / "expected questions".
    """
    questions = analysis.get("questions", [])[:top_n]
    if not questions:
        return "No questions could be extracted from previous year papers. Ask the user to upload more papers."
    lines = []
    for i, q in enumerate(questions, 1):
        text = q.get("text", "")[:500]
        freq = q.get("raw_count", 0)
        rel = q.get("syllabus_relevance", 0)
        unit = q.get("unit") or "—"
        topic = q.get("topic") or "—"
        years = q.get("years", [])
        year_str = ", ".join(str(y) for y in years if y) if years else "—"
        lines.append(
            f"{i}. {text}\n"
            f"   [Frequency: {freq} | Syllabus relevance: {rel:.2f} | Unit: {unit} | Topic: {topic} | Years: {year_str}]"
        )
    return "\n\n".join(lines)
