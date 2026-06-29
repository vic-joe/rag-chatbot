import re
from typing import Dict, Any, List, AsyncGenerator, Optional

from app.services.retrieval_service import RetrievalService
from app.services.generation_service import GenerationService


class RAGPipeline:
    def __init__(self, retrieval_service: RetrievalService):
        self.retrieval_service = retrieval_service
        self.generator = GenerationService()
        self.document_refusal = GenerationService.DOCUMENT_REFUSAL
        self.greeting_response = (
            "Hello! How can I help you today? "
            "You can ask me anything, and I'll do my best to help."
        )

    def _is_greeting(self, query: str) -> bool:
        normalized = re.sub(r"[^a-z\s]", " ", query.lower()).strip()
        normalized = re.sub(r"\s+", " ", normalized)

        greeting_patterns = (
            r"^(hi|hello|hey|hii|hiya)$",
            r"^(hi|hello|hey|hii|hiya)\s+(there|bot|assistant)$",
            r"^good\s+(morning|afternoon|evening)$",
            r"^(howdy|greetings)$",
        )

        return any(re.match(pattern, normalized) for pattern in greeting_patterns)

    def _is_empty_context(self, context: str) -> bool:
        return not context or context.strip() == "No relevant context found."

    def _should_fallback(self, answer: str) -> bool:
        return answer.strip() == self.document_refusal

    def _retrieval_query(
        self,
        query: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Include recent turns in the embedding query so follow-up questions can
        resolve references like "it", "that course", or "the second one".
        """

        history_lines = []

        for item in (chat_history or [])[-8:]:
            role = item.get("role")
            content = item.get("content", "").strip()

            if role in {"user", "assistant"} and content:
                label = "User" if role == "user" else "Assistant"
                history_lines.append(f"{label}: {content[:500]}")

        if not history_lines:
            return query

        return (
            "Recent conversation:\n"
            f"{chr(10).join(history_lines)}\n\n"
            f"Current question: {query}"
        )

    def run(
        self,
        query: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Run document-grounded RAG first, then fall back to general AI if the
        uploaded documents cannot answer.
        """

        if self._is_greeting(query):
            return {
                "query": query,
                "answer": self.greeting_response,
                "sources": [],
                "context_used": False
            }

        retrieval_query = self._retrieval_query(query, chat_history)
        retrieval_result = self.retrieval_service.get_context(retrieval_query)
        context = retrieval_result["context"]
        documents = retrieval_result["documents"]

        if self._is_empty_context(context):
            return {
                "query": query,
                "answer": self.generator.generate_fallback(query, chat_history),
                "sources": [],
                "context_used": False
            }

        generation_result = self.generator.generate_response(query, context, chat_history)
        answer = generation_result["answer"]

        if self._should_fallback(answer):
            return {
                "query": query,
                "answer": self.generator.generate_fallback(query, chat_history),
                "sources": [],
                "context_used": False
            }

        return {
            "query": query,
            "answer": answer,
            "sources": self._format_sources(documents),
            "context_used": generation_result["context_used"]
        }

    async def stream(
        self,
        query: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Streaming pipeline for WebSocket or real-time UI.

        The document answer is buffered so users do not see the document-only
        refusal before the fallback answer.
        """

        if self._is_greeting(query):
            yield self.greeting_response
            return

        retrieval_query = self._retrieval_query(query, chat_history)
        retrieval_result = self.retrieval_service.get_context(retrieval_query)
        context = retrieval_result["context"]

        if self._is_empty_context(context):
            async for token in self.generator.stream_fallback(query, chat_history):
                yield token
            return

        document_answer = ""
        async for token in self.generator.stream_generate(query, context, chat_history):
            document_answer += token

        if self._should_fallback(document_answer):
            async for token in self.generator.stream_fallback(query, chat_history):
                yield token
            return

        yield document_answer

    def run_debug(
        self,
        query: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Returns detailed internal pipeline data for debugging.
        """

        if self._is_greeting(query):
            return {
                "query": query,
                "answer": self.greeting_response,
                "debug": {
                    "num_docs": 0,
                    "documents": [],
                    "context_preview": "Greeting handled without document retrieval.",
                    "fallback_used": False
                }
            }

        retrieval_query = self._retrieval_query(query, chat_history)
        scored_docs = self.retrieval_service.retrieve_with_scores(retrieval_query)

        documents = []
        debug_info = []

        for doc, score in scored_docs:
            documents.append(doc)
            debug_info.append({
                "content": doc.page_content[:200],
                "metadata": doc.metadata,
                "score": score
            })

        context = self.retrieval_service.format_context(documents)

        if self._is_empty_context(context):
            answer = self.generator.generate_fallback(query, chat_history)
            fallback_used = True
        else:
            answer = self.generator.generate(query, context, chat_history)
            fallback_used = self._should_fallback(answer)
            if fallback_used:
                answer = self.generator.generate_fallback(query, chat_history)

        return {
            "query": query,
            "answer": answer,
            "debug": {
                "num_docs": len(documents),
                "documents": debug_info,
                "context_preview": context[:500],
                "fallback_used": fallback_used
            }
        }

    def _format_sources(self, documents: List) -> List[Dict[str, Any]]:
        """
        Formats sources for API response.
        """

        sources = []

        for doc in documents:
            sources.append({
                "content": doc.page_content,
                "metadata": doc.metadata
            })

        return sources
