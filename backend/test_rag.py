"""
Test RAG System - Phase 2
Tests vector store, embeddings, and question answering
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.embedder import embedder
from app.services.vector_store import vector_store
from app.services.chunker import chunker, Chunk
from app.services.rag.engine import rag_engine
from app.services.llm_service import llm_service


async def test_embeddings():
    """Test 1: Embedding generation"""
    print("\n" + "="*60)
    print("TEST 1: Embedding Generation")
    print("="*60)
    
    # Test query embedding
    query = "What is quantum computing?"
    print(f"\nQuery: {query}")
    
    query_embedding = embedder.embed_query(query)
    print(f"✅ Query embedding generated: dimension={len(query_embedding)}")
    
    # Test document embeddings (batch)
    documents = [
        "Quantum computers use qubits which can be in superposition.",
        "Machine learning is a subset of artificial intelligence.",
        "Deep learning uses neural networks with multiple layers."
    ]
    
    print(f"\nEmbedding {len(documents)} documents...")
    doc_embeddings = embedder.embed_documents(documents)
    print(f"✅ Document embeddings generated: {len(doc_embeddings)} vectors")
    
    return True


async def test_chunking():
    """Test 2: Text chunking"""
    print("\n" + "="*60)
    print("TEST 2: Text Chunking")
    print("="*60)
    
    sample_text = """
    Introduction
    
    Quantum computing represents a paradigm shift in computational technology. 
    Unlike classical computers that use bits (0 or 1), quantum computers use 
    quantum bits or qubits. These qubits can exist in superposition, meaning 
    they can be both 0 and 1 simultaneously.
    
    Methodology
    
    Our research implements a novel quantum algorithm for optimization problems.
    We tested this algorithm on various benchmark datasets to evaluate its 
    performance compared to classical approaches.
    
    Results
    
    The quantum algorithm showed significant speedup for certain problem sizes.
    However, the current noise levels in quantum hardware limit practical 
    applications. Further research is needed to improve error correction.
    """
    
    print(f"\nChunking sample text (length: {len(sample_text)} chars)...")
    
    chunks = chunker.chunk_text(sample_text, page_number=1)
    print(f"✅ Created {len(chunks)} chunks")
    
    for i, chunk in enumerate(chunks):
        print(f"\nChunk {i+1}:")
        print(f"  Text: {chunk.text[:100]}...")
        print(f"  Page: {chunk.page_number}, Index: {chunk.chunk_index}")
    
    stats = chunker.get_chunk_stats(chunks)
    print(f"\n📊 Chunk Statistics:")
    print(f"  Total: {stats['total_chunks']}")
    print(f"  Avg length: {stats['avg_length']} chars")
    print(f"  Avg tokens: {stats['avg_tokens']}")
    
    return True


async def test_vector_store():
    """Test 3: Vector store operations"""
    print("\n" + "="*60)
    print("TEST 3: Vector Store")
    print("="*60)
    
    # Sample documents
    texts = [
        "Quantum computers use qubits for computation.",
        "Machine learning algorithms learn from data.",
        "Neural networks are inspired by biological neurons.",
        "Quantum supremacy was achieved by Google in 2019.",
        "Deep learning has revolutionized computer vision."
    ]
    
    print(f"\nGenerating embeddings for {len(texts)} test documents...")
    embeddings = embedder.embed_documents(texts)
    
    # Prepare metadata
    metadatas = [
        {
            "document_id": "test_doc_1",
            "user_id": "test_user",
            "page_number": i+1,
            "chunk_index": i,
            "title": "Test Document",
            "authors": "Test Author",
            "year": "2024"
        }
        for i in range(len(texts))
    ]
    
    ids = [f"test_chunk_{i}" for i in range(len(texts))]
    
    # Add to vector store
    print("Adding documents to vector store...")
    success = vector_store.add_documents(
        texts=texts,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )
    
    if success:
        print("✅ Documents added to vector store")
    else:
        print("❌ Failed to add documents")
        return False
    
    # Test search
    query = "How do quantum computers work?"
    print(f"\nSearching for: '{query}'")
    
    query_embedding = embedder.embed_query(query)
    results = vector_store.search(query_embedding, top_k=3)
    
    print(f"✅ Found {len(results)} results:")
    for i, result in enumerate(results):
        print(f"\nResult {i+1}:")
        print(f"  Text: {result['text']}")
        print(f"  Distance: {result['distance']:.4f}")
        print(f"  Similarity: {(1 - result['distance']):.4f}")
    
    # Get stats
    stats = vector_store.get_collection_stats()
    print(f"\n📊 Vector Store Stats:")
    print(f"  Total chunks: {stats['total_chunks']}")
    print(f"  Status: {stats['status']}")
    
    return True


async def test_llm():
    """Test 4: LLM generation"""
    print("\n" + "="*60)
    print("TEST 4: LLM Generation")
    print("="*60)
    
    # Check provider
    provider_info = llm_service.get_provider_info()
    print(f"\nLLM Provider: {provider_info['provider']}")
    print(f"Status: {provider_info['status']}")
    print(f"Is Free: {provider_info.get('is_free', False)}")
    
    # Test simple generation
    prompt = "Explain quantum computing in one sentence."
    system_prompt = "You are a helpful science educator."
    
    print(f"\nGenerating response for: '{prompt}'")
    
    try:
        response = await llm_service.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=100
        )
        
        print(f"✅ Response generated:")
        print(f"  {response}")
        
        return True
    except Exception as e:
        print(f"❌ LLM generation failed: {e}")
        print("⚠️  Make sure you have configured GOOGLE_API_KEY in .env")
        return False


async def test_rag_system():
    """Test 5: Complete RAG system"""
    print("\n" + "="*60)
    print("TEST 5: RAG Question Answering")
    print("="*60)
    
    # We should have documents in vector store from test 3
    question = "What are qubits used for?"
    
    print(f"\nAsking: '{question}'")
    print("Retrieving context and generating answer...")
    
    try:
        response = await rag_engine.answer_question(
            question=question,
            user_id="test_user"
        )
        
        print(f"\n✅ Answer Generated:")
        print(f"\n{response['answer']}\n")
        print(f"📊 Metadata:")
        print(f"  Chunks retrieved: {response['chunks_retrieved']}")
        print(f"  Confidence: {response['confidence']}")
        print(f"  Sources: {len(response['sources'])}")
        print(f"  Provider: {response.get('provider', 'unknown')}")
        
        if response['sources']:
            print(f"\n📚 Sources:")
            for i, source in enumerate(response['sources']):
                print(f"  {i+1}. Page {source['page_number']} - {source['title']}")
        
        return True
    except Exception as e:
        print(f"❌ RAG failed: {e}")
        return False


async def cleanup():
    """Cleanup test data"""
    print("\n" + "="*60)
    print("CLEANUP: Removing test data")
    print("="*60)
    
    # Delete test chunks
    test_ids = [f"test_chunk_{i}" for i in range(5)]
    success = vector_store.delete_by_ids(test_ids)
    
    if success:
        print("✅ Test data cleaned up")
    else:
        print("⚠️  Cleanup may have failed (this is okay)")


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print(" "*20 + "RAG SYSTEM TEST SUITE - PHASE 2")
    print("="*80)
    
    tests = [
        ("Embeddings", test_embeddings),
        ("Chunking", test_chunking),
        ("Vector Store", test_vector_store),
        ("LLM", test_llm),
        ("RAG System", test_rag_system),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Cleanup
    await cleanup()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"\n📊 Overall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 All tests passed! Phase 2 is complete!")
    else:
        print("\n⚠️  Some tests failed. Check the logs above for details.")


if __name__ == "__main__":
    asyncio.run(main())
