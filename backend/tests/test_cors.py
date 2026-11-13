import pytest


@pytest.mark.asyncio
@pytest.mark.parametrize('origin', ['http://localhost:5173', 'http://127.0.0.1:5173'])
async def test_local_registration_preflight(client, origin):
    response = await client.options('/api/v1/auth/register', headers={
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
    })
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == origin


@pytest.mark.asyncio
async def test_unconfigured_origin_is_rejected(client):
    response = await client.options('/api/v1/auth/register', headers={
        'Origin': 'https://untrusted.example.com',
        'Access-Control-Request-Method': 'POST',
    })
    assert response.status_code == 400
    assert 'access-control-allow-origin' not in response.headers
