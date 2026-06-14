"""Normalize and trim reading/RAG context so smaller LLMs see cleaner, tighter snippets."""

from __future__ import annotations

import re

_SOFT_HYPHEN = "\u00ad"


def normalize_snippet_text(text: str) -> str:
    """Fix common PDF extraction noise; cheap and model-agnostic."""
    if not text or not text.strip():
        return text
    t = text.replace(_SOFT_HYPHEN, "")
    t = re.sub(r"-\s*\n\s*", "", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    t = re.sub(r"[ \t\r\f\v]+", " ", t)
    t = re.sub(r" *\n *", "\n", t)
    return t.strip()


def _tokenize_for_overlap(s: str) -> set[str]:
    return {m.group(0).lower() for m in re.finditer(r"[\w']+", s, re.UNICODE) if len(m.group(0)) >= 3}


def _split_sentences(text: str) -> list[str]:
    if not text:
        return []
    parts = re.split(r"(?<=[.!?؟።་])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _user_message_useful_for_bias(message: str) -> bool:
    m = (message or "").lower().strip()
    if len(m) < 8:
        return False
    if len(m) < 22:
        short = ("hello", "hi ", "hey", "thanks", "thank you", "bye", "good morning")
        if any(m.startswith(s) for s in short):
            return False
    return True


def compress_context_by_query(text: str, user_message: str, max_chars: int) -> str:
    """
    Extractive, query-biased compression: include all sentences that overlap the question
    (in document order), then add earlier non-matching sentences from the start until the
    character budget. Helps small models see the most relevant lines without a second LLM call.
    """
    if len(text) <= max_chars:
        return text
    terms = _tokenize_for_overlap(user_message)
    sents = _split_sentences(text)
    if not sents:
        return text[: max_chars - 1] + "…"
    if not terms:
        return text[: max_chars - 1] + "…"

    matching: list[tuple[int, str]] = []
    nonmatch: list[tuple[int, str]] = []
    for i, s in enumerate(sents):
        st = _tokenize_for_overlap(s)
        if st & terms:
            matching.append((i, s))
        else:
            nonmatch.append((i, s))

    ordered: list[tuple[int, str]] = list(matching) + list(nonmatch)

    out_parts: list[str] = []
    length = 0
    for _i, s in ordered:
        if length + len(s) + 2 > max_chars:
            break
        out_parts.append(s)
        length += len(s) + 2
    out = " ".join(out_parts)
    if not out.strip():
        return text[: max_chars - 1] + "…"
    if len(out) > max_chars:
        return out[: max_chars - 1] + "…"
    return out


def preprocess_chat_context(
    text: str,
    user_message: str,
    *,
    max_chars: int,
    query_biased_trim: bool,
) -> str:
    """
    1) Normalize PDF-style noise.
    2) If still over budget and query_biased_trim, prefer sentences overlapping the user question.
    3) Else hard-truncate at max_chars.
    """
    t = normalize_snippet_text(text)
    if len(t) <= max_chars:
        return t
    if query_biased_trim and _user_message_useful_for_bias(user_message):
        t2 = compress_context_by_query(t, user_message, max_chars)
        if len(t2) <= max_chars and len(t2) >= min(120, max_chars // 4):
            return t2
    return t[: max_chars - 1] + "…"
