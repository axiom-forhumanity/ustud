"""Translator - English to Dari (Persian) and Pashto. Uses transformers + caching, Ollama fallback."""

import hashlib
import re
from pathlib import Path

from ustud.config import MODELS_DIR, DB_PATH
from ustud import db as db_module


def _text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _chunk_text(text: str, max_chars: int = 400) -> list[str]:
    """Split text into chunks for translation (by paragraphs or sentences)."""
    if len(text) <= max_chars:
        return [text] if text.strip() else []
    chunks = []
    paras = re.split(r"\n\n+", text)
    current = ""
    for p in paras:
        if len(current) + len(p) + 2 <= max_chars:
            current = (current + "\n\n" + p).strip() if current else p
        else:
            if current:
                chunks.append(current)
            current = p
    if current:
        chunks.append(current)
    return chunks


class Translator:
    """
    Offline translation: English <-> Dari (Persian fa).
    Pashto: glossary fallback when no model available.
    """

    def __init__(self, ollama_client=None):
        self._model = None
        self._tokenizer = None
        self._ollama = ollama_client  # Fallback when transformers not available

    def _load_model(self):
        """Lazy-load MT5 translation model. Returns False if transformers not installed."""
        if self._model is not None:
            return self._model is not False
        try:
            from transformers import MT5ForConditionalGeneration, MT5Tokenizer

            model_name = "persiannlp/mt5-base-parsinlu-translation_en_fa"
            cache_dir = str(MODELS_DIR / "mt5_en_fa")
            self._tokenizer = MT5Tokenizer.from_pretrained(model_name, cache_dir=cache_dir)
            self._model = MT5ForConditionalGeneration.from_pretrained(model_name, cache_dir=cache_dir)
            return True
        except ImportError:
            self._model = False
            return False
        except Exception:
            self._model = False
            return False

    async def _translate_via_ollama(self, text: str, target: str) -> str | None:
        """Use Ollama to translate. Chunks long text. Returns None if Ollama unavailable."""
        if not self._ollama:
            return None
        lang_name = "Dari (Afghan Persian)" if target == "fa" else "Pashto"
        chunks = _chunk_text(text, max_chars=350)
        results = []
        for chunk in chunks:
            try:
                prompt = (
                    f"You are a translator. Translate the following English text to {lang_name}. "
                    f"Reply with ONLY the {lang_name} translation. No English, no explanation, no quotes.\n\n{chunk}"
                )
                response = await self._ollama.chat_async(
                    messages=[{"role": "user", "content": prompt}]
                )
                result = (response.message.content or "").strip()
                # Strip common LLM prefixes (e.g. "Here is the translation:\n\n")
                for prefix in ("here is the translation:", "the translation is:", "translation:"):
                    if result.lower().startswith(prefix):
                        result = result[len(prefix):].strip()
                if result:
                    results.append(result)
                else:
                    results.append(chunk)
            except Exception:
                results.append(chunk)
        return "\n\n".join(results) if results else None

    async def translate_to_dari(self, text: str, use_cache: bool = True) -> str:
        """Translate English to Dari (Afghan Persian). Uses MT5, then Ollama fallback."""
        if not text or not text.strip():
            return text

        if use_cache:
            cached = await db_module.get_cached_translation(DB_PATH, _text_hash(text), "en_fa")
            if cached:
                return cached

        # Try MT5 first
        if self._load_model():
            try:
                chunks = _chunk_text(text, max_chars=400)
                results = []
                for chunk in chunks:
                    inputs = self._tokenizer(chunk, return_tensors="pt", truncation=True, max_length=512)
                    outputs = self._model.generate(**inputs, max_length=512)
                    results.append(self._tokenizer.decode(outputs[0], skip_special_tokens=True))
                result = "\n\n".join(results)
                if use_cache:
                    await db_module.cache_translation(DB_PATH, _text_hash(text), "en_fa", result)
                return result
            except Exception:
                pass

        # Fallback: Ollama
        ollama_result = await self._translate_via_ollama(text, "fa")
        if ollama_result:
            if use_cache:
                await db_module.cache_translation(DB_PATH, _text_hash(text), "en_fa", ollama_result)
            return ollama_result

        return text

    async def translate_to_pashto(self, text: str) -> str:
        """
        Pashto: try Ollama first, then glossary for common terms.
        """
        ollama_result = await self._translate_via_ollama(text, "ps")
        if ollama_result:
            return ollama_result
        # Minimal glossary for common learning terms
        glossary = {
            "hello": "سلام",
            "thank you": "مننه",
            "yes": "هو",
            "no": "نه",
            "good": "ښه",
            "learn": "زده کول",
            "lesson": "درس",
            "math": "ریاضی",
            "science": "ساینس",
        }
        lower = text.lower().strip()
        if lower in glossary:
            return glossary[lower]
        return f"{text} [Pashto: Try enabling Ollama for full translation]"

    async def translate(self, text: str, target: str = "fa", use_cache: bool = True) -> str:
        """Translate to target language: 'fa' (Dari) or 'ps' (Pashto)."""
        if target == "ps":
            return await self.translate_to_pashto(text)
        return await self.translate_to_dari(text, use_cache=use_cache)
