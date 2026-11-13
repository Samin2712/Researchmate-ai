"""Exercise the real local API; creates a uniquely named verification account."""
import asyncio
import json
import time
from pathlib import Path

import httpx


async def main():
    api = 'http://127.0.0.1:8000/api/v1'
    email = f'connection-check-{time.time_ns()}@example.com'
    async with httpx.AsyncClient(timeout=180) as client:
        response = await client.post(f'{api}/auth/register', json={
            'email': email, 'password': 'ConnectionCheck!123', 'full_name': 'Connection verification',
        })
        assert response.status_code == 201, f'Registration failed: HTTP {response.status_code}'
        print('PASS registration: database write succeeded')
        response = await client.post(f'{api}/auth/login/json', json={'email': email, 'password': 'wrong-password'})
        assert response.status_code == 401
        response = await client.post(f'{api}/auth/login/json', json={'email': email, 'password': 'ConnectionCheck!123'})
        assert response.status_code == 200
        headers = {'Authorization': f'Bearer {response.json()["access_token"]}'}
        response = await client.get(f'{api}/auth/me', headers=headers)
        assert response.status_code == 200 and response.json()['email'] == email
        print('PASS login, wrong-password rejection, authenticated account lookup')
        response = await client.post(f'{api}/documents/upload', headers=headers, files={'file': ('invalid.txt', b'text', 'text/plain')})
        assert response.status_code == 400
        response = await client.post(f'{api}/documents/upload', headers=headers, files={'file': ('broken.pdf', b'not a real PDF', 'application/pdf')})
        assert response.status_code == 201
        broken_id = response.json()['id']
        for _ in range(20):
            broken = (await client.get(f'{api}/documents/{broken_id}', headers=headers)).json()
            if broken['status'] == 'failed':
                break
            await asyncio.sleep(1)
        assert broken['status'] == 'failed' and broken['error_message']
        assert (await client.delete(f'{api}/documents/{broken_id}', headers=headers)).status_code == 204
        print('PASS malformed PDF processing reports a recoverable failed status')
        sample = Path(__file__).resolve().parents[1] / 'backend/sample_ai_research.pdf'
        response = await client.post(f'{api}/documents/upload', headers=headers, files={'file': ('research.pdf', sample.read_bytes(), 'application/pdf')})
        assert response.status_code == 201, f'Upload failed: HTTP {response.status_code}'
        document_id = response.json()['id']
        for _ in range(120):
            response = await client.get(f'{api}/documents/{document_id}', headers=headers)
            document = response.json()
            if document['status'] in ('completed', 'failed'):
                break
            await asyncio.sleep(1)
        assert document['status'] == 'completed', f'Document processing failed: {document.get("error_message")}'
        print('PASS PDF upload, text extraction, embedding generation and vector indexing')
        response = await client.get(f'{api}/documents/{document_id}')
        assert response.status_code == 401
        events = []
        async with client.stream('POST', f'{api}/chat/stream', headers=headers, json={
            'message': 'Explain how artificial intelligence improves STEM education through adaptive learning systems, intelligent tutoring systems, automated assessment and personalized learning. Cite the relevant pages.',
            'document_ids': [document_id],
        }) as response:
            assert response.status_code == 200
            async for line in response.aiter_lines():
                if line.startswith('data: '):
                    event = json.loads(line[6:])
                    assert event['type'] != 'error', f'Stream error: {event.get("error")}'
                    events.append(event)
        assert any(event['type'] == 'complete' for event in events)
        metadata = next(event for event in events if event['type'] == 'metadata')
        assert metadata['chunks_retrieved'] > 0, 'No context retrieved: inspect document filters and SIMILARITY_THRESHOLD.'
        answer = ''.join(event.get('content', '') for event in events if event['type'] == 'answer')
        assert answer.strip()
        sources = [source for event in events if event['type'] == 'sources' for source in event['sources']]
        assert sources, 'A generated answer was returned, but no source citations were included.'
        assert all(str(source['document_id']) == str(document_id) for source in sources)
        session_id = next(event['session_id'] for event in events if event['type'] == 'session')
        response = await client.get(f'{api}/chat/sessions/{session_id}', headers=headers)
        assert response.status_code == 200
        saved = response.json()['messages']
        assert len(saved) == 2 and saved[-1]['content'] == answer and isinstance(saved[-1]['sources'], list)
        print(f'PASS real Gemini SSE answer with {len(sources)} citations and persisted history')
        assert (await client.delete(f'{api}/chat/sessions/{session_id}', headers=headers)).status_code == 204
        assert (await client.delete(f'{api}/documents/{document_id}', headers=headers)).status_code == 204
        assert (await client.get(f'{api}/documents/{document_id}', headers=headers)).status_code == 404
        print('PASS conversation/document deletion; verification paper and vectors removed')
        print('API smoke test passed. The verification account remains; the API has no account-delete endpoint.')


if __name__ == '__main__':
    asyncio.run(main())
