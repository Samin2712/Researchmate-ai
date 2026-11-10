"""
Vector Store Service - ChromaDB Integration
Manages document embeddings and semantic search
"""
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions

from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorStore:
    """
    ChromaDB Vector Store for semantic search
    Stores document embeddings and retrieves relevant chunks
    """
    
    def __init__(self):
        self.client = None
        self.collection = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize ChromaDB client and collection"""
        try:
            # Configure ChromaDB client
            chroma_settings = ChromaSettings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=settings.CHROMA_PERSIST_DIR,
                anonymized_telemetry=False
            )
            
            # Initialize client
            self.client = chromadb.Client(chroma_settings)
            
            # Create or get collection
            self.collection = self.client.get_or_create_collection(
                name="research_papers",
                metadata={
                    "hnsw:space": "cosine",
                    "hnsw:construction_ef": 100,
                    "hnsw:search_ef": 100,
                }
            )
            
            logger.info(f"✅ ChromaDB initialized - Collection: research_papers")
            logger.info(f"📊 Current collection size: {self.collection.count()} documents")
        
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise
    
    def add_documents(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        ids: List[str]
    ) -> bool:
        """
        Add documents to vector store
        
        Args:
            texts: List of text chunks
            embeddings: List of embedding vectors
            metadatas: List of metadata dicts (document_id, page_number, etc.)
            ids: List of unique IDs for each chunk
        
        Returns:
            bool: Success status
        """
        try:
            if not texts or not embeddings or not metadatas or not ids:
                raise ValueError("All parameters must be non-empty lists")
            
            if not (len(texts) == len(embeddings) == len(metadatas) == len(ids)):
                raise ValueError("All lists must have the same length")
            
            # Add to collection
            self.collection.add(
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"✅ Added {len(texts)} documents to vector store")
            return True
        
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            return False
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            filters: Optional metadata filters (e.g., {"document_id": "123"})
        
        Returns:
            List of search results with text, metadata, and distance
        """
        try:
            # Build query parameters
            query_params = {
                "query_embeddings": [query_embedding],
                "n_results": top_k,
            }
            
            # Add filters if provided
            if filters:
                query_params["where"] = filters
            
            # Execute search
            results = self.collection.query(**query_params)
            
            # Format results
            formatted_results = []
            if results and results['documents'] and results['documents'][0]:
                for i in range(len(results['documents'][0])):
                    result = {
                        "text": results['documents'][0][i],
                        "metadata": results['metadatas'][0][i],
                        "distance": results['distances'][0][i],
                        "id": results['ids'][0][i]
                    }
                    formatted_results.append(result)
            
            logger.info(f"🔍 Search returned {len(formatted_results)} results")
            return formatted_results
        
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    def delete_by_document_id(self, document_id: str) -> bool:
        """
        Delete all chunks belonging to a document
        
        Args:
            document_id: Document ID to delete
        
        Returns:
            bool: Success status
        """
        try:
            # Delete all chunks with matching document_id
            self.collection.delete(
                where={"document_id": document_id}
            )
            
            logger.info(f"🗑️  Deleted all chunks for document: {document_id}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")
            return False
    
    def delete_by_ids(self, ids: List[str]) -> bool:
        """
        Delete specific chunks by IDs
        
        Args:
            ids: List of chunk IDs to delete
        
        Returns:
            bool: Success status
        """
        try:
            self.collection.delete(ids=ids)
            logger.info(f"🗑️  Deleted {len(ids)} chunks")
            return True
        
        except Exception as e:
            logger.error(f"Failed to delete chunks: {e}")
            return False
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store collection"""
        try:
            count = self.collection.count()
            return {
                "total_chunks": count,
                "collection_name": "research_papers",
                "status": "healthy"
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"status": "error", "error": str(e)}
    
    def reset_collection(self) -> bool:
        """
        Reset the entire collection (delete all documents)
        ⚠️  Use with caution!
        """
        try:
            self.client.delete_collection("research_papers")
            self._initialize_client()
            logger.warning("⚠️  Collection reset - all documents deleted")
            return True
        except Exception as e:
            logger.error(f"Failed to reset collection: {e}")
            return False


# Global vector store instance
vector_store = VectorStore()
