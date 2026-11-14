"""Real multi-page PDFs and actual API/SQLite; no LLM is needed to save evidence."""
import hashlib
import fitz
import pytest
from sqlalchemy import select
from app.models import Document, Chunk, Collection
from app.core.config import settings
from app.services.evidence import refresh_revision
from tests.test_collections_citations import _create_test_user


@pytest.fixture
async def evidence(test_db, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, 'UPLOAD_DIR', str(tmp_path))
    user, headers = await _create_test_user(test_db)
    _, other = await _create_test_user(test_db, 'other@example.com')
    pdf = fitz.open()
    pdf.new_page().insert_text((72, 72), 'First paper page. Repeated phrase.')
    page = pdf.new_page()
    page.insert_text((72, 72), 'Unique evidence on page two.\nRepeated phrase.\nRepeated phrase.')
    pdf.new_page()  # no text/OCR
    path = tmp_path / 'fixture.pdf'
    pdf.save(path)
    pdf.close()
    doc = Document(user_id=user.id, title='Multi-page source', file_path=str(path), page_count=3)
    test_db.add(doc)
    await test_db.flush()
    chunk = Chunk(document_id=doc.id, text='Unique evidence on page two.', page_number=2, chunk_index=0)
    test_db.add(chunk)
    await test_db.commit()
    return doc, chunk, headers, other, path


async def test_evidence_security_and_provenance(client, test_db, evidence):
    doc, chunk, headers, other, path = evidence
    root = f'/api/v1/evidence/documents/{doc.id}'
    assert (await client.get(root+'/pdf')).status_code == 401
    assert (await client.get(root+'/pdf', headers=other)).status_code == 404
    assert (await client.get(root+'/pdf?token=invalid')).status_code == 401
    assert (await client.get(root+'/pdf', headers=headers)).content.startswith(b'%PDF')
    document_response = await client.get(f'/api/v1/documents/{doc.id}', headers=headers)
    assert 'file_path' not in document_response.json()
    assert (await client.get(root+'/evidence-detail', headers=other)).status_code == 404
    for query in ('page_number=4', 'page_number=0', f'page_number=1&chunk_id={chunk.id}', 'chunk_id=999'):
        assert (await client.get(root+'/evidence-detail?'+query, headers=headers)).status_code == 400
    base = dict(document_id=doc.id, chunk_id=chunk.id, page_number=2, source_quote=chunk.text)
    for data in ({**base, 'source_quote':'Invented claim'}, {**base, 'page_number':1}, {**base, 'chunk_id':999}):
        assert (await client.post('/api/v1/evidence/notes', headers=headers, json=data)).status_code == 400
    assert (await client.post('/api/v1/evidence/notes', headers=other, json=base)).status_code == 404
    # Even a tampered server-side path cannot return an arbitrary file.
    doc.file_path = str(path.parent.parent / 'outside.pdf')
    await test_db.commit()
    assert (await client.get(root+'/pdf', headers=headers)).status_code == 403


async def test_real_pdf_mapping_repetition_and_scanned_fallback(client, evidence):
    doc, chunk, headers, _, _ = evidence
    root = f'/api/v1/evidence/documents/{doc.id}/evidence-detail'
    unique = (await client.get(root, headers=headers, params={'chunk_id':chunk.id})).json()
    assert unique['page_number'] == 2 and unique['highlight_status'] == 'available'
    assert unique['source_quote'] == chunk.text
    assert unique['rects'] and 0 < unique['rects'][0]['x'] < 1
    repeated = (await client.get(root, headers=headers, params={'page_number':2, 'quote':'Repeated phrase.'})).json()
    assert repeated['highlight_status'] == 'ambiguous' and not repeated['rects']
    scan = (await client.get(root, headers=headers, params={'page_number':3})).json()
    assert scan['highlight_status'] == 'no_extractable_text' and scan['source_quote'] is None
    unknown = (await client.get(root, headers=headers)).json()
    assert unknown['highlight_status'] == 'unknown_page'
    legacy = (await client.get(root, headers=headers, params={'page_number':2,'quote':'Unique evidence...'})).json()
    assert legacy['source_quote'] == chunk.text


async def test_notebook_crud_export_stale_delete_and_durable_pdf(client, test_db, evidence):
    doc, chunk, headers, other, path = evidence
    quote = chunk.text
    created = await client.post('/api/v1/evidence/notes', headers=headers, json={
        'document_id':doc.id, 'chunk_id':chunk.id, 'source_quote':quote,
        'title':'বাংলা গবেষণা', 'note':'ব্যক্তিগত নোট',
    })
    assert created.status_code == 201, created.text
    note = created.json()
    assert note['page_number'] == 2 and note['source_quote'] == quote
    assert note['content_hash'] == hashlib.sha256(path.read_bytes()).hexdigest()
    url = '/api/v1/evidence/notes/'+str(note['id'])
    for method in ('get', 'patch', 'delete'):
        args = {'json': {'note':'intrusion'}} if method == 'patch' else {}
        assert (await getattr(client,method)(url,headers=other,**args)).status_code == 404
    assert (await client.patch(url,headers=headers,json={'note':'Edited বাংলা', 'title':None, 'collection_id':None})).json()['title'] is None
    assert (await client.get(url,headers=headers)).json()['source_quote'] == quote
    exported = await client.post('/api/v1/evidence/notes/export', headers=headers, json={'note_ids':[note['id']]})
    assert 'Edited বাংলা' in exported.text and '> '+quote in exported.text and 'Page 2' in exported.text
    assert (await client.post('/api/v1/evidence/notes/export', headers=other, json={'note_ids':[note['id']]})).status_code == 404
    # Original PDF survives losing the host filesystem.
    original = path.read_bytes()
    path.unlink()
    assert (await client.get(f'/api/v1/evidence/documents/{doc.id}/pdf',headers=headers)).content == original
    modified = fitz.open(stream=original, filetype='pdf')
    modified[0].insert_text((72,200),'Changed content')
    modified.save(path)
    modified.close()
    await refresh_revision(test_db, doc)
    await test_db.commit()
    listed = (await client.get('/api/v1/evidence/notes', headers=headers)).json()
    assert listed['items'][0]['is_stale'] == 1
    # Delete document via ORM just like the production route. Snapshot remains.
    await test_db.delete(doc)
    await test_db.commit()
    test_db.expire_all()
    retained = (await client.get(url,headers=headers)).json()
    assert retained['document_id'] is None and retained['source_quote'] == quote
    assert (await client.delete(url,headers=headers)).status_code == 204
    assert (await client.get(url,headers=headers)).status_code == 404


async def test_collection_filters_pagination_and_nullable_updates(client, test_db, evidence):
    doc, chunk, headers, other, _ = evidence
    foreign_collection = (await client.post('/api/v1/collections', headers=other, json={'name':'Private'})).json()['id']
    owned_collection = (await client.post('/api/v1/collections', headers=headers, json={'name':'Review'})).json()['id']
    base = {'document_id':doc.id,'chunk_id':chunk.id,'source_quote':chunk.text,'title':'Find this evidence'}
    assert (await client.post('/api/v1/evidence/notes', headers=headers, json={**base,'collection_id':foreign_collection})).status_code == 404
    note = (await client.post('/api/v1/evidence/notes', headers=headers, json={**base,'collection_id':owned_collection})).json()
    url = '/api/v1/evidence/notes/'+str(note['id'])
    assert (await client.patch(url, headers=headers, json={'collection_id':foreign_collection})).status_code == 404
    filtered = await client.get('/api/v1/evidence/notes', headers=headers, params={'collection_id':owned_collection,'search':'Find','page_size':1})
    assert filtered.json()['total'] == 1 and len(filtered.json()['items']) == 1
    assert (await client.get('/api/v1/evidence/notes?page_size=101',headers=headers)).status_code == 400
    assert (await client.get('/api/v1/evidence/notes?page=0',headers=headers)).status_code == 400
    assert (await client.patch(url,headers=headers,json={'note':None,'title':None,'tags':[], 'collection_id':None})).json()['collection_id'] is None
    retained = (await client.get(url,headers=headers)).json()
    assert retained['source_quote'] == chunk.text and retained['title'] is None
