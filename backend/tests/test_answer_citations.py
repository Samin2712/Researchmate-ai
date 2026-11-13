from app.services.rag.engine import RAGEngine


def test_combined_citations_preserve_original_source_number():
    chunks = [
        {'metadata': {'document_id': '1', 'page_number': page, 'title': 'Paper'},
         'text': 'Evidence', 'distance': 0.2}
        for page in (4, 2, 4)
    ]
    citations = RAGEngine()._extract_citations('Results [Page 4, Source 3].', chunks)
    assert len(citations) == 1
    assert citations[0]['page_number'] == 4
    assert citations[0]['source_number'] == 3
