"""The API must bind without importing or downloading the ML stack."""
import os
from pathlib import Path
import subprocess
import sys


def test_api_starts_without_ml_dependencies(tmp_path):
    script = r'''
import importlib.abc
import sys

class BlockML(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in {'torch', 'sentence_transformers', 'chromadb'}:
            raise AssertionError('ML loaded during API startup: ' + fullname)

sys.meta_path.insert(0, BlockML())
from fastapi.testclient import TestClient
from app.main import app

with TestClient(app) as client:
    assert client.get('/').status_code == 200
    assert client.get('/openapi.json').status_code == 200
    response = client.options('/api/v1/auth/register', headers={
        'Origin': 'https://researchmate-frontend.onrender.com',
        'Access-Control-Request-Method': 'POST',
    })
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == 'https://researchmate-frontend.onrender.com'
'''
    env = {
        **os.environ,
        'DATABASE_URL': 'sqlite+aiosqlite:///' + (tmp_path / 'startup.db').as_posix(),
        'UPLOAD_DIR': str(tmp_path / 'uploads'),
        'LOG_FILE': str(tmp_path / 'startup.log'),
        'CORS_ORIGINS': 'https://researchmate-frontend.onrender.com',
        'DEBUG': 'false',
    }
    result = subprocess.run(
        [sys.executable, '-c', script],
        cwd=Path(__file__).resolve().parents[1],
        env=env, capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr
