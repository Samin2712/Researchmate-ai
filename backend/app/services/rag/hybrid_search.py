"""
Advanced RAG Features - Hybrid Search & Re-ranking
Combines semantic search with keyword matching (BM25)
"""
import logging
import asyncio
from typing import List, Dict, Any, Optional
from collections import Counter
import math
import re

logger = logging.getLogger(__name__)


class BM25Scorer:
    """
    BM25 (Best Matching 25) algorithm for keyword-based ranking
    Industry standard for text search
    """
    
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        """
        Args:
            k1: Term frequency saturation parameter (1.2-2.0)
            b: Length normalization parameter (0.5-1.0)
        """
        self.k1 = k1
        self.b = b
        self.avg_doc_length = 0
        self.doc_lengths = []
        self.doc_freqs = []
        self.idf_cache = {}
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization (can be improved with nltk/spacy)"""
        text = text.lower()
        # Remove punctuation and split
        words = re.findall(r'\b\w+\b', text)
        return words
    
    def _calculate_idf(self, term: str, num_docs: int, doc_freqs: List[Counter]) -> float:
        """Calculate Inverse Document Frequency"""
        if term in self.idf_cache:
            return self.idf_cache[term]
        
        # Count documents containing the term
        doc_count = sum(1 for df in doc_freqs if term in df)
        
        if doc_count == 0:
            return 0.0
        
        # IDF formula: log((N - df + 0.5) / (df + 0.5) + 1)
        idf = math.log((num_docs - doc_count + 0.5) / (doc_count + 0.5) + 1)
        self.idf_cache[term] = idf
        return idf
    
    def fit(self, documents: List[str]):
        """Pre-process documents for scoring"""
        self.doc_lengths = []
        self.doc_freqs = []
        
        for doc in documents:
            tokens = self._tokenize(doc)
            self.doc_lengths.append(len(tokens))
            self.doc_freqs.append(Counter(tokens))
        
        self.avg_doc_length = sum(self.doc_lengths) / len(self.doc_lengths) if self.doc_lengths else 0
    
    def score(self, query: str, doc_index: int) -> float:
        """Calculate BM25 score for a query-document pair"""
        if doc_index >= len(self.doc_freqs):
            return 0.0
        
        query_terms = self._tokenize(query)
        doc_freq = self.doc_freqs[doc_index]
        doc_length = self.doc_lengths[doc_index]
        
        score = 0.0
        for term in query_terms:
            if term not in doc_freq:
                continue
            
            # Term frequency in document
            tf = doc_freq[term]
            
            # IDF for the term
            idf = self._calculate_idf(term, len(self.doc_freqs), self.doc_freqs)
            
            # Length normalization
            norm = 1 - self.b + self.b * (doc_length / self.avg_doc_length)
            
            # BM25 formula
            term_score = idf * (tf * (self.k1 + 1)) / (tf + self.k1 * norm)
            score += term_score
        
        return score
    
    def score_all(self, query: str) -> List[float]:
        """Score all documents for a query"""
        return [self.score(query, i) for i in range(len(self.doc_freqs))]


class HybridSearcher:
    """
    Hybrid search combining:
    1. Semantic search (vector similarity)
    2. Keyword search (BM25)
    3. Optional re-ranking
    """
    
    def __init__(self, semantic_weight: float = 0.7, keyword_weight: float = 0.3):
        """
        Args:
            semantic_weight: Weight for semantic similarity (0-1)
            keyword_weight: Weight for keyword matching (0-1)
        """
        self.semantic_weight = semantic_weight
        self.keyword_weight = keyword_weight
        self.bm25 = BM25Scorer()
    
    def hybrid_search(
        self,
        query: str,
        semantic_results: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Combine semantic and keyword search results
        
        Args:
            query: Search query
            semantic_results: Results from vector search
            top_k: Number of final results
        
        Returns:
            Re-ranked results
        """
        if not semantic_results:
            return []
        
        try:
            # Extract documents for BM25
            documents = [r['text'] for r in semantic_results]
            
            # Fit BM25 on these documents
            self.bm25.fit(documents)
            
            # Get BM25 scores
            bm25_scores = self.bm25.score_all(query)
            
            # Normalize scores to 0-1 range
            semantic_scores = [1 - r['distance'] for r in semantic_results]
            
            # Normalize BM25 scores
            max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1
            normalized_bm25 = [score / max_bm25 for score in bm25_scores]
            
            # Combine scores
            combined_results = []
            for i, result in enumerate(semantic_results):
                hybrid_score = (
                    self.semantic_weight * semantic_scores[i] +
                    self.keyword_weight * normalized_bm25[i]
                )
                
                result_copy = result.copy()
                result_copy['hybrid_score'] = hybrid_score
                result_copy['bm25_score'] = normalized_bm25[i]
                result_copy['semantic_score'] = semantic_scores[i]
                combined_results.append(result_copy)
            
            # Sort by hybrid score
            combined_results.sort(key=lambda x: x['hybrid_score'], reverse=True)
            
            logger.info(f"🔀 Hybrid search: combined semantic + keyword ranking")
            
            return combined_results[:top_k]
        
        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            return semantic_results[:top_k]
    
    def rerank_with_query_expansion(
        self,
        query: str,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Re-rank results using query expansion
        Expands query with synonyms and related terms
        """
        # Simple query expansion (can be enhanced with word embeddings)
        expanded_terms = self._expand_query(query)
        
        # Re-score with expanded query
        expanded_query = query + " " + " ".join(expanded_terms)
        
        return self.hybrid_search(expanded_query, results)
    
    def _expand_query(self, query: str) -> List[str]:
        """
        Expand query with related terms
        (Simplified version - can be enhanced with WordNet, embeddings, etc.)
        """
        # Common research paper synonyms
        expansions = {
            "method": ["approach", "technique", "methodology"],
            "result": ["finding", "outcome", "conclusion"],
            "study": ["research", "investigation", "analysis"],
            "model": ["framework", "architecture", "system"],
            "data": ["dataset", "information", "evidence"],
        }
        
        query_lower = query.lower()
        expanded = []
        
        for term, synonyms in expansions.items():
            if term in query_lower:
                expanded.extend(synonyms)
        
        return expanded[:3]  # Limit expansion


class QueryOptimizer:
    """
    Optimize queries for better retrieval
    """
    
    @staticmethod
    def detect_question_type(question: str) -> str:
        """Detect the type of question"""
        question_lower = question.lower()
        
        if any(word in question_lower for word in ["what", "define", "explain"]):
            return "definition"
        elif any(word in question_lower for word in ["how", "process", "method"]):
            return "process"
        elif any(word in question_lower for word in ["why", "reason", "cause"]):
            return "causal"
        elif any(word in question_lower for word in ["compare", "difference", "versus"]):
            return "comparison"
        elif any(word in question_lower for word in ["when", "timeline", "history"]):
            return "temporal"
        else:
            return "general"
    
    @staticmethod
    def extract_key_entities(question: str) -> List[str]:
        """
        Extract key entities from question
        (Simplified - can be enhanced with NER)
        """
        # Remove question words
        question_words = ["what", "how", "why", "when", "where", "who", "which"]
        words = question.lower().split()
        
        # Filter out common words and question words
        key_terms = [
            word for word in words
            if len(word) > 3 and word not in question_words
        ]
        
        return key_terms[:5]  # Top 5 key terms
    
    @staticmethod
    def optimize_query(question: str) -> str:
        """
        Optimize query for better retrieval
        """
        # Extract key entities
        entities = QueryOptimizer.extract_key_entities(question)
        
        # Detect question type
        q_type = QueryOptimizer.detect_question_type(question)
        
        # Build optimized query
        optimized = question
        
        # Add emphasis on key entities (simple version)
        if entities:
            optimized += " " + " ".join(entities)
        
        return optimized


# Convenience functions for external use
def hybrid_search(query: str, semantic_results: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
    """Perform hybrid search"""
    searcher = HybridSearcher()
    return searcher.hybrid_search(query, semantic_results, top_k)


def optimize_query(question: str) -> str:
    """Optimize a query"""
    return QueryOptimizer.optimize_query(question)


def detect_question_type(question: str) -> str:
    """Detect question type"""
    return QueryOptimizer.detect_question_type(question)
