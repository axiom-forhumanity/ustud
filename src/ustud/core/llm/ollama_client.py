"""Ollama client wrapper for local LLM inference."""

from ollama import chat, Client
from ollama import AsyncClient

from ustud.config import DEFAULT_LLM_MODEL


class OllamaClient:
    """Wrapper for Ollama API - runs SmolLM2 or other small models locally."""

    def __init__(self, model: str = DEFAULT_LLM_MODEL, host: str = "http://localhost:11434", timeout: float = 60.0):
        self.model = model
        self.client = Client(host=host, timeout=timeout)
        self._async_client = AsyncClient(host=host, timeout=timeout)

    def chat(self, messages: list[dict], stream: bool = False):
        """Send chat request to Ollama."""
        return self.client.chat(model=self.model, messages=messages, stream=stream)

    async def chat_async(self, messages: list[dict], stream: bool = False):
        """Async chat request."""
        return await self._async_client.chat(
            model=self.model, messages=messages, stream=stream
        )

    _BASE_TUTOR_SYSTEM = (
        "You are a teacher helping Afghan girls learn. Be clear and direct. "
        "Be kind when it fits, but avoid overdoing warmth or encouragement.\n\n"
        "LANGUAGE PRIORITY: If this message includes a section starting with \"Language:\", "
        "you MUST follow those language rules for your entire answer — same script and vocabulary "
        "the section asks for (e.g. Persian or Pashto in Arabic script). "
        "Those rules override any default. Do not mix in English sentences unless the Language "
        "section explicitly allows it.\n\n"
        "If there is no Language section, use simple English.\n\n"
        "Format your answers clearly: use SHORT paragraphs - put a blank line between each new idea. "
        "Use bullet points (* or -) on their own line for lists. Use **bold** for key terms. "
        "Never write one long block - break it up so it is easy to read."
    )

    def generate_with_context(
        self,
        prompt: str,
        context: str,
        system_prompt: str | None = None,
        learner_context: str | None = None,
        language_context: str | None = None,
        user_message_suffix: str | None = None,
        scene_instructions: str | None = None,
        context_heading: str | None = None,
        question_label: str | None = None,
    ) -> str:
        """Generate response with RAG context. Efficient for curriculum Q&A."""
        system = system_prompt or self._BASE_TUTOR_SYSTEM
        extras: list[str] = []
        if learner_context and learner_context.strip():
            extras.append(learner_context.strip())
        if scene_instructions and scene_instructions.strip():
            extras.append(scene_instructions.strip())
        if language_context and language_context.strip():
            extras.append(language_context.strip())
        if extras:
            system = f"{system}\n\n---\n\n" + "\n\n---\n\n".join(extras)
        head = (context_heading or "Use this information to help answer:\n\n").strip() + "\n\n"
        q = question_label or "Question:"
        full_prompt = f"{head}{context}\n\n---\n\n{q} {prompt}"
        if user_message_suffix and user_message_suffix.strip():
            full_prompt = f"{full_prompt}\n\n{user_message_suffix.strip()}"
        response = self.chat(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": full_prompt},
            ]
        )
        return response.message.content

    async def generate_with_context_async(
        self,
        prompt: str,
        context: str,
        system_prompt: str | None = None,
        learner_context: str | None = None,
        language_context: str | None = None,
        user_message_suffix: str | None = None,
        scene_instructions: str | None = None,
        context_heading: str | None = None,
        question_label: str | None = None,
    ) -> str:
        """Async version of generate_with_context."""
        system = system_prompt or self._BASE_TUTOR_SYSTEM
        extras: list[str] = []
        if learner_context and learner_context.strip():
            extras.append(learner_context.strip())
        if scene_instructions and scene_instructions.strip():
            extras.append(scene_instructions.strip())
        if language_context and language_context.strip():
            extras.append(language_context.strip())
        if extras:
            system = f"{system}\n\n---\n\n" + "\n\n---\n\n".join(extras)
        head = (context_heading or "Use this information to help answer:\n\n").strip() + "\n\n"
        q = question_label or "Question:"
        full_prompt = f"{head}{context}\n\n---\n\n{q} {prompt}"
        if user_message_suffix and user_message_suffix.strip():
            full_prompt = f"{full_prompt}\n\n{user_message_suffix.strip()}"
        response = await self.chat_async(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": full_prompt},
            ]
        )
        return response.message.content
