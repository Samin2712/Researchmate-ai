"""
RAG Engine Core - Question Answering with Retrieval
Combines semantic search with LLM generation
"""
import logging
import asyncio
from typing import List, Dict, Any, Optional, AsyncIterator
import re

from app.services.embedder import embedder
from app.services.vector_store import vector_store
from app.services.llm_service import llm_service
from app.core.config import settings

logger = logging.getLogger(__name__)


class RAGEngine:
    """
    Retrieval-Augmented Generation Engine
    Answers questions by retrieving relevant context and generating responses
    """
    
    def __init__(self):
        self.system_prompt = self._build_system_prompt()
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt for the LLM"""
        return """You are ResearchMate AI, an expert research assistant specializing in academic papers.

Your role is to:
1. Answer questions accurately based on the provided research paper excerpts
2. Always cite your sources using [Page X] notation
3. Distinguish between information from the papers and general knowledge
4. Admit when you don't know something or when information is not in the provided context
5. Provide clear, well-structured answers suitable for researchers

Guidelines:
- Be precise and academic in your language
- Quote relevant passages when helpful
- Explain complex concepts clearly
- Point out contradictions or uncertainties in the literature
- Suggest related research questions when appropriate

Remember: Your answers should be trustworthy, verifiable, and helpful for academic research."""
    
    async def retrieve_context(
        self,
        query: str,
        top_k: Optional[int] = None,
        user_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        similarity_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant context for a query
        
        Args:
            query: User's question
            top_k: Number of chunks to retrieve
            user_id: Filter by user's documents
            document_ids: Filter by specific documents
            similarity_threshold: Minimum similarity score
        
        Returns:
            List of relevant chunks with metadata
        """
        try:
            # Generate query embedding
            query_embedding = await asyncio.to_thread(
                embedder.embed_query,
                query
            )
            
            # Build filters
            filters = {}
            if user_id:
                filters["user_id"] = user_id
            if document_ids:
                filters["document_id"] = {'$in': [str(document_id) for document_id in document_ids]}
            
            # Search vector store
            results = await asyncio.to_thread(
                vector_store.search,
                query_embedding=query_embedding,
                top_k=top_k or settings.TOP_K_RESULTS,
                filters=filters if filters else None
            )
            
            # Filter by similarity threshold
            threshold = settings.SIMILARITY_THRESHOLD if similarity_threshold is None else similarity_threshold
            filtered_results = [
                r for r in results
                if (1 - r['distance']) >= threshold  # Convert distance to similarity
            ]
            
            logger.info(f"🔍 Retrieved {len(filtered_results)} relevant chunks (from {len(results)} total)")
            
            return filtered_results
        
        except Exception as e:
            logger.error(f"Context retrieval failed: {e}")
            return []
    
    def _format_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Format retrieved chunks into context string"""
        if not chunks:
            return "No relevant context found."
        
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            metadata = chunk['metadata']
            text = chunk['text']
            page = metadata.get('page_number', 'Unknown')
            title = metadata.get('title', 'Unknown Document')
            
            context_parts.append(
                f"[Source {i}] (Page {page} from \"{title}\")\n{text}\n"
            )
        
        return "\n".join(context_parts)
    
    def _extract_citations(self, answer: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract source citations from the answer"""
        citations = []
        
        # Find [Page X] patterns
        page_pattern = r'\[Page (\d+)\]'
        mentioned_pages = set(re.findall(page_pattern, answer))
        
        # Find [Source X] patterns
        source_pattern = r'\[Source (\d+)\]'
        mentioned_sources = set(re.findall(source_pattern, answer))
        
        # Map sources back to documents
        for i, chunk in enumerate(chunks, 1):
            metadata = chunk['metadata']
            page = metadata.get('page_number', 'Unknown')
            
            # Check if this source or page was mentioned
            if str(i) in mentioned_sources or str(page) in mentioned_pages:
                citations.append({
                    "document_id": metadata.get('document_id'),
                    "title": metadata.get('title', 'Unknown'),
                    "authors": metadata.get('authors', 'Unknown'),
                    "page_number": page,
                    "chunk_text": chunk['text'][:200] + "...",  # Preview
                    "similarity_score": round(1 - chunk['distance'], 3)
                })
        
        return citations
    
    def _calculate_confidence(self, chunks: List[Dict[str, Any]], answer: str) -> float:
        """Calculate confidence score for the answer"""
        if not chunks:
            return 0.0
        
        # Factors for confidence:
        # 1. Average similarity of retrieved chunks
        avg_similarity = sum(1 - c['distance'] for c in chunks) / len(chunks)
        
        # 2. Number of chunks above threshold
        high_quality_chunks = sum(1 for c in chunks if (1 - c['distance']) > 0.8)
        chunk_quality_score = high_quality_chunks / len(chunks)
        
        # 3. Answer contains citations (good sign)
        has_citations = '[Page' in answer or '[Source' in answer
        citation_bonus = 0.1 if has_citations else 0.0
        
        # Combine factors
        confidence = (avg_similarity * 0.6 + chunk_quality_score * 0.3) + citation_bonus
        
        return round(min(confidence, 1.0), 2)
    
    async def answer_question(
        self,
        question: str,
        user_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Answer a question using RAG
        
        Args:
            question: User's question
            user_id: User ID for filtering documents
            document_ids: Specific documents to search
            conversation_history: Previous Q&A for context
        
        Returns:
            Answer with sources and metadata
        """
        try:
            # Step 1: Retrieve relevant context
            chunks = await self.retrieve_context(
                query=question,
                user_id=user_id,
                document_ids=document_ids
            )
            
            if not chunks:
                return {
                    "answer": "I couldn't find any relevant information in the uploaded documents to answer this question. Please make sure you've uploaded the relevant research papers.",
                    "sources": [],
                    "confidence": 0.0,
                    "chunks_retrieved": 0
                }
            
            # Step 2: Format context
            context = self._format_context(chunks)
            
            # Step 3: Build prompt with conversation history
            prompt = self._build_prompt(question, context, conversation_history)
            
            # Step 4: Generate answer
            logger.info(f"💬 Generating answer for: {question[:100]}...")
            
            answer = await llm_service.generate(
                prompt=prompt,
                system_prompt=self.system_prompt,
                temperature=0.7,
                max_tokens=2000
            )
            
            # Step 5: Extract citations and calculate confidence
            citations = self._extract_citations(answer, chunks)
            confidence = self._calculate_confidence(chunks, answer)
            
            logger.info(f"✅ Answer generated with {len(citations)} citations (confidence: {confidence})")
            
            return {
                "answer": answer,
                "sources": citations,
                "confidence": confidence,
                "chunks_retrieved": len(chunks),
                "provider": llm_service.get_provider_info()['provider']
            }
        
        except Exception as e:
            logger.error(f"Failed to answer question: {e}")
            return {
                "answer": f"I encountered an error while processing your question: {str(e)}",
                "sources": [],
                "confidence": 0.0,
                "chunks_retrieved": 0,
                "error": str(e)
            }
    
    async def stream_answer(
        self,
        question: str,
        user_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Answer a question with streaming response
        
        Yields chunks of the answer as they're generated
        """
        try:
            # Step 1: Retrieve context
            chunks = await self.retrieve_context(
                query=question,
                user_id=user_id,
                document_ids=document_ids
            )
            
            # Send metadata first
            yield {
                "type": "metadata",
                "chunks_retrieved": len(chunks),
                "confidence": self._calculate_confidence(chunks, "") if chunks else 0.0
            }
            
            if not chunks:
                yield {
                    "type": "answer",
                    "content": "I couldn't find any relevant information in the uploaded documents.",
                    "done": True
                }
                return
            
            # Step 2: Format context and build prompt
            context = self._format_context(chunks)
            prompt = self._build_prompt(question, context, conversation_history)
            
            # Step 3: Stream answer
            full_answer = ""
            async for chunk in llm_service.stream_generate(
                prompt=prompt,
                system_prompt=self.system_prompt,
                temperature=0.7,
                max_tokens=2000
            ):
                full_answer += chunk
                yield {
                    "type": "answer",
                    "content": chunk,
                    "done": False
                }
            
            # Step 4: Send final metadata with citations
            citations = self._extract_citations(full_answer, chunks)
            yield {
                "type": "answer",
                "content": "",
                "done": True
            }
            
            yield {
                "type": "sources",
                "sources": citations,
                "confidence": self._calculate_confidence(chunks, full_answer)
            }
        
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            yield {
                "type": "error",
                "error": str(e)
            }
    
    def _build_prompt(
        self,
        question: str,
        context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Build the complete prompt for the LLM"""
        prompt_parts = []
        
        # Add conversation history if available
        if conversation_history:
            prompt_parts.append("Previous conversation:")
            for entry in conversation_history[-3:]:  # Last 3 exchanges
                prompt_parts.append(f"Q: {entry.get('question', '')}")
                prompt_parts.append(f"A: {entry.get('answer', '')}\n")
        
        # Add context
        prompt_parts.append("Context from research papers:")
        prompt_parts.append(context)
        prompt_parts.append("")
        
        # Add current question
        prompt_parts.append(f"Question: {question}")
        prompt_parts.append("")
        prompt_parts.append("Instructions:")
        prompt_parts.append("- Answer the question based on the provided context")
        prompt_parts.append("- Cite sources using [Page X] notation")
        prompt_parts.append("- If the context doesn't contain the answer, say so clearly")
        prompt_parts.append("- Be accurate and academic in your response")
        prompt_parts.append("")
        prompt_parts.append("Answer:")
        
        return "\n".join(prompt_parts)


# Global RAG engine instance
rag_engine = RAGEngine()
