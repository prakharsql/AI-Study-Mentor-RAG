# Question Analysis Pipeline — Design

Production-ready pipeline to extract, rank, and present "Most Important Questions" from uploaded previous year papers, mapped to syllabus. No change to existing upload/ask API contract.

---

## 1. Backend flow

### High-level

1. **Retrieve paper chunks**  
   Run multiple semantic queries (e.g. "previous year exam questions", "question paper section", "marks questions") against the vector store, filter by `source == "previous_year_paper"`, and merge (dedupe by file + page). No "list all" — retrieval-only.

2. **Retrieve syllabus chunks**  
   One query (e.g. "syllabus units topics modules"), filter by `source == "syllabus"`. Used for relevance scoring and topic/unit assignment.

3. **Extract questions from paper chunks**  
   Reuse `_extract_questions_from_text()` from `paper_processor`: split by "Question 1", "Q.1", "Section A", etc., keep blocks of 25–800 chars.

4. **Detect repeated questions**  
   - Normalize: lowercase, collapse whitespace, trim.  
   - Fingerprint: first N characters (e.g. 120) of normalized text.  
   - Group by fingerprint; count occurrences across chunks → **frequency**.

5. **Importance score**  
   - **Frequency (normalized):** `raw_count / max(raw_count)` over extracted questions.  
   - **Syllabus relevance:** for each question text, run similarity search against syllabus chunks; score = f(distance), e.g. `1 / (1 + distance)` averaged over top-k syllabus hits.  
   - **Combined:**  
     `importance = alpha * frequency_norm + (1 - alpha) * syllabus_relevance`  
     (e.g. `alpha = 0.5`).

6. **Group by topic/unit**  
   For each question, assign **unit** and **topic** by finding the best-matching syllabus chunk (same similarity search used for syllabus relevance). Group final list by `(unit, topic)` for "by_topic" view.

7. **Rank and cap**  
   Sort by `importance_score` descending, take top N (e.g. 15). Return structured result for LLM and/or JSON API.

### Where it lives

- **`rag/question_analyzer.py`**  
  - `analyze_important_questions(vector_db, top_n, frequency_weight)`  
  - Helpers: `_get_chunks_by_source`, `_extract_questions_from_chunks`, `_normalize_question`, `_fingerprint`, `_score_syllabus_relevance`, `_importance_score`, `_assign_topic`  
  - `build_important_questions_context(analysis, top_n)` for LLM text block  
  - `IMPORTANT_QUESTIONS_PROMPT_TEMPLATE` for Ollama

- **`app.py`**  
  - `/ask`: when the user query is "important questions" / "most expected" etc., run `analyze_important_questions`, build context, and call LLM with the prompt template.  
  - `GET /important-questions?top_n=15`: returns JSON for frontend (cards, filters).

---

## 2. LLM prompt template (Ollama)

**Purpose:** Given the **already-ranked** list of questions (with frequency, syllabus relevance, unit, topic, years), the LLM only formats and explains — no ranking.

**Template (see `IMPORTANT_QUESTIONS_PROMPT_TEMPLATE` in `question_analyzer.py`):**

- Input: `structured_questions` = one block per question with:
  - Question text (truncated)
  - Frequency, syllabus relevance, unit, topic, years
- Instructions:
  - Output "Most Important Questions for Exam" in a fixed format.
  - For each item: **Question**, **Why important** (1–2 sentences: repetition / syllabus weight / trend), **Source** (previous year papers + years; syllabus topic/unit if matched).
  - Do not add questions not in the list; max N items.

**Why this works:**  
Ranking is deterministic (frequency + syllabus relevance). The LLM only explains and formats, reducing hallucination and keeping answers tied to uploaded content.

---

## 3. Data structure for frontend

### From `GET /important-questions?top_n=15`

```json
{
  "questions": [
    {
      "text": "Explain the concept of...",
      "importance_score": 0.8723,
      "frequency": 3,
      "syllabus_relevance": 0.65,
      "unit": "Unit 3",
      "topic": "Topic 3.2",
      "years": [2022, 2023],
      "file_name": "paper_2023.pdf"
    }
  ],
  "by_topic": {
    "Unit 3 / Topic 3.2": [
      {
        "text": "...",
        "importance_score": 0.87,
        "frequency": 3,
        "years": [2022, 2023]
      }
    ],
    "Other / General": [...]
  },
  "syllabus_available": true,
  "paper_chunks_used": 28
}
```

- **questions:** Flat list, sorted by importance (for "Top 15" list or single feed).  
- **by_topic:** Same questions grouped by unit/topic (for tabs or filters).  
- **syllabus_available / paper_chunks_used:** For empty states and trust (e.g. "Based on 28 paper chunks and syllabus").

Optional: add **difficulty** later (e.g. from marks/keywords in chunk or a small classifier). Not required for v1.

---

## 4. Optional frontend UX

- **Cards:** One card per question: title = truncated `text`, body = full text, footer = badges: `years`, `unit`, `topic`, `frequency` (e.g. "Seen 3 times"), optional "Syllabus aligned".
- **Tags:** Filter or group by `unit`, `topic`, or `years` using `by_topic` and `questions[].years`.
- **Difficulty:** If you add it later, show a simple label (Easy / Medium / Hard) from marks or keyword rules.
- **Year frequency:** Show "2022, 2023" or "Appeared in 3 years" from `years`/`frequency`.
- **Empty state:** If `questions.length === 0`, show "Upload more previous year papers" and optionally `paper_chunks_used` (e.g. "We analyzed 0 paper chunks — upload papers to see important questions").

No UI code in this repo; backend is ready for the above.

---

## 5. Constraints and choices

- **No new storage:** Everything is derived from existing vector store + metadata.  
- **Retrieval-only:** We don’t scan the whole index; we use several queries and merge. Good for scale and keeps implementation simple.  
- **Reuse:** Uses `_extract_questions_from_text` and existing metadata (`source`, `year`, `unit`, `topic`, `file_name`).  
- **API:** Existing `POST /ask` and upload endpoints unchanged; only added `GET /important-questions`.  
- **Minimal deps:** Same stack (FAISS, LangChain, Ollama); no extra services.

---

## 6. Summary

| Step               | How                                                                 |
|--------------------|---------------------------------------------------------------------|
| Repeated questions | Fingerprint (normalized prefix) + count across retrieved chunks     |
| Importance score   | `alpha * norm_frequency + (1-alpha) * syllabus_relevance`           |
| Group by topic     | Assign unit/topic via best-matching syllabus chunk; group by (unit, topic) |
| LLM                | Prompt template with ranked list; LLM explains and formats only    |
| Frontend           | Use `GET /important-questions` for cards, tags, year frequency       |
