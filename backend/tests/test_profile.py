import base64
from io import BytesIO

import pytest
from PIL import Image


async def account(client, email='profile@example.com'):
    response = await client.post('/api/v1/auth/register', json={
        'email': email, 'password': 'password123', 'full_name': 'Researcher',
    })
    assert response.status_code == 201
    login = await client.post('/api/v1/auth/login/json', json={
        'email': email, 'password': 'password123',
    })
    return {'Authorization': f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_profile_and_photo_survive_new_login_and_are_private(client):
    headers = await account(client)
    updated = await client.patch('/api/v1/auth/me', headers=headers, json={
        'full_name': 'Ada Researcher', 'institution': 'STEM Lab',
        'bio': 'Studying language models', 'research_interests': 'NLP',
    })
    assert updated.status_code == 200, updated.text
    image = BytesIO()
    Image.new('RGB', (512, 512), 'green').save(image, 'PNG')
    photo = await client.post('/api/v1/auth/me/photo', headers=headers,
                              files={'file': ('photo.png', image.getvalue(), 'image/png')})
    assert photo.status_code == 200, photo.text
    uri = photo.json()['avatar_url']
    thumbnail = Image.open(BytesIO(base64.b64decode(uri.split(',')[1])))
    assert thumbnail.size == (256, 256)
    login = await client.post('/api/v1/auth/login/json', json={
        'email': 'PROFILE@example.com', 'password': 'password123',
    })
    assert login.status_code == 200
    restored = await client.get('/api/v1/auth/me', headers={
        'Authorization': f"Bearer {login.json()['access_token']}",
    })
    assert restored.json()['institution'] == 'STEM Lab'
    assert restored.json()['full_name'] == 'Ada Researcher'
    assert restored.json()['avatar_url'] == uri
    other_headers = await account(client, 'other@example.com')
    other = await client.get('/api/v1/auth/me', headers=other_headers)
    assert other.json()['avatar_url'] is None
    assert other.json()['institution'] is None
    removed = await client.delete('/api/v1/auth/me/photo', headers=headers)
    assert removed.status_code == 200
    assert removed.json()['avatar_url'] is None


@pytest.mark.asyncio
async def test_profile_requires_login_and_rejects_invalid_photos(client):
    response = await client.patch('/api/v1/auth/me', json={'full_name': 'Somebody'})
    assert response.status_code == 401
    headers = await account(client)
    for data in (b'<svg>unsafe</svg>', b'x' * (2 * 1024 * 1024 + 1)):
        response = await client.post('/api/v1/auth/me/photo', headers=headers,
                                     files={'file': ('fake.png', data, 'image/png')})
        assert response.status_code == 400
    response = await client.patch('/api/v1/auth/me', headers=headers, json={'full_name': '   '})
    assert response.status_code == 422
