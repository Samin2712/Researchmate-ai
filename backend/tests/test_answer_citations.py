from app.services.rag.engine import RAGEngine
import pytest


@pytest.mark.parametrize('marker', ['[Page 4, Source 3]', '[Source 3, Page 4]', '[source 3, page 4]'])
def test_combined_citations_preserve_original_source_number(marker):
    chunks = [
        {'metadata': {'document_id': '1', 'page_number': page, 'title': 'Paper'},
         'text': 'Evidence', 'distance': 0.2}
        for page in (4, 2, 4)
    ]
    citations = RAGEngine()._extract_citations(f'Results {marker}.', chunks)
    assert len(citations) == 1
    assert citations[0]['page_number'] == 4
    assert citations[0]['source_number'] == 3
