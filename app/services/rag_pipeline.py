import re
from typing import Dict, Any, List, AsyncGenerator

from app.services.retrieval_service import RetrievalService
from app.services.generation_service import GenerationService


class RAGPipeline:
    def __init__(self, retrieval_service: RetrievalService):
        self.retrieval_service = retrieval_service
        self.generator = GenerationService()
        self.greeting_response = (
            "Hello! How can I help you today? "
            "You can ask me questions about the uploaded documents."
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

    # ---------------------------------------
    # 1. Standard RAG Execution (IMPROVED)
    # ---------------------------------------
    def run(self, query: str) -> Dict[str, Any]:
        """
        Full RAG flow:
        1. Retrieve documents
        2. Format context
        3. Generate grounded answer
        """

        if self._is_greeting(query):
            return {
                "query": query,
                "answer": self.greeting_response,
                "sources": [],
                "context_used": False
            }

        retrieval_result = self.retrieval_service.get_context(query)

        context = retrieval_result["context"]
        documents = retrieval_result["documents"]

        # ✅ Guard: empty context handling
        if not context or context.strip() == "No relevant context found.":
            return {
                "query": query,
                "answer": "I don't have enough information from the provided documents.",
                "sources": [],
                "context_used": False
            }

        generation_result = self.generator.generate_response(query, context)

        return {
            "query": query,
            "answer": generation_result["answer"],
            "sources": self._format_sources(documents),
            "context_used": generation_result["context_used"]
        }

    # ---------------------------------------
    # 2. Streaming RAG (NEW - IMPORTANT)
    # ---------------------------------------
    async def stream(self, query: str) -> AsyncGenerator[str, None]:
        """
        Streaming RAG pipeline for WebSocket or real-time UI.
        """

        if self._is_greeting(query):
            yield self.greeting_response
            return

        retrieval_result = self.retrieval_service.get_context(query)

        context = retrieval_result["context"]

        # ✅ Guard for empty context
        if not context or context.strip() == "No relevant context found.":
            yield "I don't have enough information from the provided documents."
            return

        async for token in self.generator.stream_generate(query, context):
            yield token

    # ---------------------------------------
    # 3. Debug Mode (VERY IMPORTANT)
    # ---------------------------------------
    def run_debug(self, query: str) -> Dict[str, Any]:
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
                    "context_preview": "Greeting handled without document retrieval."
                }
            }

        scored_docs = self.retrieval_service.retrieve_with_scores(query)

        documents = []
        debug_info = []

        for doc, score in scored_docs:
            documents.append(doc)
            debug_info.append({
                "content": doc.page_content[:200],  # truncate
                "metadata": doc.metadata,
                "score": score
            })

        context = self.retrieval_service.format_context(documents)

        answer = self.generator.generate(query, context)

        return {
            "query": query,
            "answer": answer,
            "debug": {
                "num_docs": len(documents),
                "documents": debug_info,
                "context_preview": context[:500]
            }
        }

    # ---------------------------------------
    # 4. Source Formatter (CLEANER OUTPUT)
    # ---------------------------------------
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
