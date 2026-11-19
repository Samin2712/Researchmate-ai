"""Regression: hosted processing survives restarts without importing ML libraries."""
import os
from pathlib import Path
import subprocess
import sys


def test_hosted_pdf_and_profile_survive_process_restart(tmp_path):
    setup = r'''
import importlib.abc
import sys
class BlockML(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in {'torch', 'sentence_transformers', 'chromadb'}:
            raise AssertionError('Hosted deployment loaded ML: ' + fullname)
sys.meta_path.insert(0, BlockML())
from fastapi.testclient import TestClient
from app.main import app
from app.services.embedder import embedder
from unittest.mock import AsyncMock
import app.api.v1.auth as auth_api
auth_api.send_verification_email = AsyncMock(return_value='test-message')
embedder._embed_remote = lambda texts, task: [[1.0] + [0.0] * 767 for _ in texts]
'''
    first = setup + r'''
import fitz
from io import BytesIO
from PIL import Image
with TestClient(app) as client:
    assert client.post('/api/v1/auth/register', json={'email': 'durable@example.com', 'password': 'password123', 'full_name': 'Ada'}).status_code == 201
    assert client.post('/api/v1/auth/verify-email', json={'token': auth_api.send_verification_email.call_args.args[1]}).status_code == 200
    token = client.post('/api/v1/auth/login/json', json={'email': 'durable@example.com', 'password': 'password123'}).json()['access_token']
    headers = {'Authorization': 'Bearer ' + token}
    assert client.patch('/api/v1/auth/me', headers=headers, json={'full_name': 'Ada Researcher', 'institution': 'STEM Lab'}).status_code == 200
    photo = BytesIO()
    Image.new('RGB', (32, 32), 'blue').save(photo, 'PNG')
    assert client.post('/api/v1/auth/me/photo', headers=headers, files={'file': ('photo.png', photo.getvalue(), 'image/png')}).status_code == 200
    pdf = fitz.open()
    page = pdf.new_page()
    page.insert_text((72, 72), 'Abstract\nThis research studies language learning. Our method uses a neural network to classify sentences.\nThe experiment shows that training improves sentence classification accuracy.')
    response = client.post('/api/v1/documents/upload', headers=headers, files={'file': ('research.pdf', pdf.tobytes(), 'application/pdf')})
    assert response.status_code == 201, response.text
    papers = client.get('/api/v1/documents', headers=headers).json()['documents']
    assert papers[0]['status'] == 'completed', papers
    evidence = client.post('/api/v1/evidence/notes', headers=headers, json={
        'document_id': papers[0]['id'], 'page_number': 1,
        'source_quote': 'This research studies language learning.', 'note': 'Persistent evidence note',
    })
    assert evidence.status_code == 201, evidence.text
    # Create an interrupted task to verify recovery on the next startup.
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.document import Document, DocumentStatus
    async def interrupt():
        async with AsyncSessionLocal() as db:
            db.add(Document(user_id=1, title='Interrupted', file_path='missing.pdf', status=DocumentStatus.PROCESSING))
            await db.commit()
    asyncio.run(interrupt())
'''
    second = setup + r'''
with TestClient(app) as client:
    assert client.get('/health/live').status_code == 200
    login = client.post('/api/v1/auth/login/json', json={'email': 'DURABLE@example.com', 'password': 'password123'})
    assert login.status_code == 200, login.text
    headers = {'Authorization': 'Bearer ' + login.json()['access_token']}
    user = client.get('/api/v1/auth/me', headers=headers).json()
    assert user['full_name'] == 'Ada Researcher'
    assert user['institution'] == 'STEM Lab'
    assert user['avatar_url'].startswith('data:image/jpeg;base64,')
    papers = client.get('/api/v1/documents', headers=headers).json()['documents']
    interrupted = next(p for p in papers if p['title'] == 'Interrupted')
    assert interrupted['status'] == 'failed', papers
    assert 'server restart' in interrupted['error_message']
    completed = next(p for p in papers if p['status'] == 'completed')
    notes = client.get('/api/v1/evidence/notes', headers=headers).json()['items']
    assert notes[0]['note'] == 'Persistent evidence note'
    assert notes[0]['source_quote'] == 'This research studies language learning.'
    assert client.get('/api/v1/evidence/documents/' + str(completed['id']) + '/pdf', headers=headers).content.startswith(b'%PDF')
    from app.services.vector_store import vector_store
    results = vector_store.search([1.0] + [0.0] * 767, filters={'user_id': '1', 'document_id': {'$in': [str(completed['id'])]}})
    assert results and 'language learning' in results[0]['text']
    assert vector_store.search([1.0] + [0.0] * 767, filters={'user_id': '999'}) == []
    response = client.post('/api/v1/documents/' + str(interrupted['id']) + '/retry', headers=headers)
    assert response.status_code == 409
    assert 'upload' in response.json()['detail']
'''
    env = {**os.environ,
           'DATABASE_URL': 'sqlite+aiosqlite:///' + (tmp_path / 'durable.db').as_posix(),
           'UPLOAD_DIR': str(tmp_path / 'uploads'), 'LOG_FILE': str(tmp_path / 'app.log'),
           'EMBEDDING_PROVIDER': 'gemini', 'VECTOR_STORE_MODE': 'database', 'DEBUG': 'false'}
    env.update(GMAIL_CLIENT_ID='test-client', GMAIL_CLIENT_SECRET='test-secret', GMAIL_REFRESH_TOKEN='test-token', FRONTEND_URL='http://localhost:5173')
    for script in (first, second):
        result = subprocess.run([sys.executable, '-c', script], env=env,
                                cwd=Path(__file__).resolve().parents[1],
                                capture_output=True, text=True, timeout=60)
        assert result.returncode == 0, result.stdout + result.stderr
