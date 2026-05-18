from typing import Dict, Any, AsyncGenerator, List, Optional
from groq import Groq
from app.core.config import settings


class GenerationService:
    DOCUMENT_REFUSAL = "I don't have enough information from the provided documents."

    def __init__(self):
        # ✅ Validate API key early
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is missing in environment variables")

        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL

    # ---------------------------------------
    # 1. System Prompt (STRICT CONTROL)
    # ---------------------------------------
    def system_prompt(self) -> str:
        """
        Strong grounding to prevent hallucination.
        """
        return (
            "You are a retrieval-augmented AI assistant.\n"
            "You MUST answer ONLY using the provided context.\n\n"
            "RULES:\n"
            "- Do NOT use outside knowledge\n"
            "- If answer is missing, say exactly:\n"
            f"\"{self.DOCUMENT_REFUSAL}\"\n"
            "- Be concise and factual\n"
        )

    def fallback_system_prompt(self) -> str:
        """
        General assistant mode used only when uploaded documents cannot answer.
        """
        return (
            "You are a helpful general-purpose AI assistant.\n"
            "Answer the user's question using your general knowledge.\n"
            "Be clear, useful, and concise.\n"
            "If the question needs current or private information you do not have, "
            "say what you cannot verify and explain how the user can check it."
        )

    def _history_messages(self, chat_history: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, str]]:
        messages = []

        for item in (chat_history or [])[-12:]:
            role = item.get("role")
            content = item.get("content", "").strip()

            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})

        return messages

    # ---------------------------------------
    # 2. User Prompt (CLEAN INPUT)
    # ---------------------------------------
    def user_prompt(self, query: str, context: str) -> str:
        """
        Clean separation of context and question.
        """
        return f"""
CONTEXT:
{context}

QUESTION:
{query}
""".strip()

    # ---------------------------------------
    # 3. Generate Response (CORE FIX)
    # ---------------------------------------
    def generate(
        self,
        query: str,
        context: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Calls Groq LLM using structured messages.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt()},
                    *self._history_messages(chat_history),
                    {"role": "user", "content": self.user_prompt(query, context)}
                ],
                temperature=0.1,   # ✅ Lower = more factual
                max_tokens=500
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            raise RuntimeError(f"Groq API error: {str(e)}")

    def generate_fallback(
        self,
        query: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Calls Groq LLM as a normal assistant without document-only grounding.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.fallback_system_prompt()},
                    *self._history_messages(chat_history),
                    {"role": "user", "content": query}
                ],
                temperature=0.3,
                max_tokens=500
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            raise RuntimeError(f"Groq API fallback error: {str(e)}")

    # ---------------------------------------
    # 4. Structured Response
    # ---------------------------------------
    def generate_response(
        self,
        query: str,
        context: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        API-friendly structured output.
        """

        answer = self.generate(query, context, chat_history)

        return {
            "query": query,
            "answer": answer,
            "context_used": bool(context and context.strip()),
        }

    # ---------------------------------------
    # 5. Streaming Response (FIXED + INSIDE CLASS)
    # ---------------------------------------
    async def stream_generate(
        self,
        query: str,
        context: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Streams response tokens from Groq.
        """

        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt()},
                    *self._history_messages(chat_history),
                    {"role": "user", "content": self.user_prompt(query, context)}
                ],
                temperature=0.1,
                stream=True
            )

            for chunk in stream:
                delta = chunk.choices[0].delta

                if delta and delta.content:
                    yield delta.content

        except Exception as e:
            yield f"[ERROR]: {str(e)}"

    async def stream_fallback(
        self,
        query: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Streams a normal assistant response without document-only grounding.
        """

        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.fallback_system_prompt()},
                    *self._history_messages(chat_history),
                    {"role": "user", "content": query}
                ],
                temperature=0.3,
                stream=True
            )

            for chunk in stream:
                delta = chunk.choices[0].delta

                if delta and delta.content:
                    yield delta.content

        except Exception as e:
            yield f"[ERROR]: {str(e)}"
