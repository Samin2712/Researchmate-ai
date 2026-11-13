from contextlib import asynccontextmanager
from unittest.mock import Mock

import pytest

from app.models.document import Chunk, Document, DocumentStatus
from app.services.rag.engine import RAGEngine
from app.services.embedder import embedder


@pytest.mark.asyncio
async def test_summary_reads_selected_owned_paper_across_pages(test_db, monkeypatch):
    from app.core import database

    for doc_id, owner, status in [(101, 1, DocumentStatus.COMPLETED),
                                  (102, 2, DocumentStatus.COMPLETED),
                                  (103, 1, DocumentStatus.PROCESSING)]:
        test_db.add(Document(id=doc_id, user_id=owner, title='Paper',
                             file_path='paper.pdf', status=status))
        test_db.add_all([Chunk(document_id=doc_id, text=f'Passage {index}',
                               chunk_index=index, page_number=index + 1)
                         for index in range(20)])
    await test_db.commit()

    @asynccontextmanager
    async def session():
        yield test_db

    monkeypatch.setattr(database, 'AsyncSessionLocal', session)
    embedding = Mock(side_effect=AssertionError('Summary must not require embeddings'))
    monkeypatch.setattr(embedder, 'embed_query', embedding)
    engine = RAGEngine()
    chunks = await engine.retrieve_context('Summarize this paper in simple English.',
                                           user_id='1', document_ids=['101', '102', '103'])
    assert len(chunks) == 12
    assert {chunk['metadata']['document_id'] for chunk in chunks} == {'101'}
    assert chunks[0]['metadata']['page_number'] == 1
    assert chunks[-1]['metadata']['page_number'] == 20
    embedding.assert_not_called()
    assert await engine.retrieve_context('Summarize this paper', user_id='2',
                                          document_ids=['101']) == []


@pytest.mark.asyncio
async def test_search_failure_is_reported_as_error(monkeypatch):
    monkeypatch.setattr(embedder, 'embed_query', Mock(side_effect=RuntimeError('Unavailable')))
    engine = RAGEngine()
    answer = await engine.answer_question('How were emoticons collected?', user_id='1')
    assert 'retrieval failed' in answer['error']
    events = [event async for event in engine.stream_answer('How were emoticons collected?', user_id='1')]
    assert events[0]['type'] == 'error'


@pytest.mark.parametrize('question', ['Summarize this paper', 'Give an overview', 'A summary please'])
def test_overview_intent(question):
    assert RAGEngine._is_summary_request(question)


def test_specific_question_uses_search():
    assert not RAGEngine._is_summary_request('How were emoticons collected?')
