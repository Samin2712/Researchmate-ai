"""
Embedding Service - Generate text embeddings
Uses sentence-transformers for local, free embeddings
"""
import logging
from typing import List, Optional
from threading import Lock
import hashlib
import pickle
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Generate embeddings using sentence-transformers
    FREE and runs locally - no API costs!
    """
    
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self._model = None
        self._model_lock = Lock()
        self.cache_dir = Path("./data/embedding_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    @property
    def model(self):
        """Load ML libraries and weights on first use, after API startup."""
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    self._load_model()
        return self._model
    
    def _load_model(self):
        """Load the embedding model"""
        try:
            from sentence_transformers import SentenceTransformer

            logger.info(f"Loading embedding model: {self.model_name}")
            model = SentenceTransformer(self.model_name)
            self._model = model
            logger.info(f"✅ Embedding model loaded successfully")
            logger.info(f"📐 Embedding dimension: {self.model.get_sentence_embedding_dimension()}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    def _get_cache_path(self, text: str) -> Path:
        """Generate cache file path for a text"""
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return self.cache_dir / f"{text_hash}.pkl"
    
    def _load_from_cache(self, text: str) -> Optional[List[float]]:
        """Load embedding from cache if available"""
        cache_path = self._get_cache_path(text)
        if cache_path.exists():
            try:
                with open(cache_path, 'rb') as f:
                    embedding = pickle.load(f)
                return embedding
            except Exception as e:
                logger.warning(f"Failed to load from cache: {e}")
        return None
    
    def _save_to_cache(self, text: str, embedding: List[float]):
        """Save embedding to cache"""
        cache_path = self._get_cache_path(text)
        try:
            with open(cache_path, 'wb') as f:
                pickle.dump(embedding, f)
        except Exception as e:
            logger.warning(f"Failed to save to cache: {e}")
    
    def embed_query(self, query: str, use_cache: bool = True) -> List[float]:
        """
        Generate embedding for a single query
        
        Args:
            query: Query text
            use_cache: Whether to use cached embeddings
        
        Returns:
            Embedding vector (list of floats)
        """
        try:
            # Check cache
            if use_cache:
                cached = self._load_from_cache(query)
                if cached is not None:
                    logger.debug("📦 Using cached embedding")
                    return cached
            
            # Generate embedding
            embedding = self.model.encode(
                query,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            
            # Convert to list
            embedding_list = embedding.tolist()
            
            # Cache it
            if use_cache:
                self._save_to_cache(query, embedding_list)
            
            logger.debug(f"✅ Generated query embedding (dim: {len(embedding_list)})")
            return embedding_list
        
        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            raise
    
    def embed_documents(
        self,
        documents: List[str],
        batch_size: int = 32,
        use_cache: bool = False
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple documents (batch processing)
        
        Args:
            documents: List of document texts
            batch_size: Batch size for processing
            use_cache: Whether to use cached embeddings
        
        Returns:
            List of embedding vectors
        """
        try:
            if not documents:
                return []
            
            embeddings = []
            
            # Process in batches
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                
                # Check cache for each document in batch
                batch_embeddings = []
                uncached_docs = []
                uncached_indices = []
                
                if use_cache:
                    for idx, doc in enumerate(batch):
                        cached = self._load_from_cache(doc)
                        if cached is not None:
                            batch_embeddings.append(cached)
                        else:
                            uncached_docs.append(doc)
                            uncached_indices.append(idx)
                else:
                    uncached_docs = batch
                    uncached_indices = list(range(len(batch)))
                
                # Generate embeddings for uncached documents
                if uncached_docs:
                    new_embeddings = self.model.encode(
                        uncached_docs,
                        convert_to_numpy=True,
                        show_progress_bar=len(uncached_docs) > 50,
                        batch_size=batch_size
                    )
                    
                    # Convert to list and cache
                    new_embeddings_list = [emb.tolist() for emb in new_embeddings]
                    
                    if use_cache:
                        for doc, emb in zip(uncached_docs, new_embeddings_list):
                            self._save_to_cache(doc, emb)
                    
                    # Merge cached and new embeddings in correct order
                    if use_cache:
                        result = [None] * len(batch)
                        cached_idx = 0
                        uncached_idx = 0
                        for j in range(len(batch)):
                            if j in uncached_indices:
                                result[j] = new_embeddings_list[uncached_idx]
                                uncached_idx += 1
                            else:
                                result[j] = batch_embeddings[cached_idx]
                                cached_idx += 1
                        batch_embeddings = result
                    else:
                        batch_embeddings = new_embeddings_list
                
                embeddings.extend(batch_embeddings)
                
                logger.info(f"📊 Processed batch {i//batch_size + 1}: {len(batch)} documents")
            
            logger.info(f"✅ Generated {len(embeddings)} document embeddings")
            return embeddings
        
        except Exception as e:
            logger.error(f"Failed to generate document embeddings: {e}")
            raise
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of the embedding vectors"""
        return self.model.get_sentence_embedding_dimension()
    
    def clear_cache(self):
        """Clear the embedding cache"""
        try:
            import shutil
            shutil.rmtree(self.cache_dir)
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            logger.info("🗑️  Embedding cache cleared")
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")


# Global embedding service instance
embedder = EmbeddingService()
