"""Isolated upload browser harness; never use as a production start command.

Uses the existing harness's real auth, PDF parser, SQL persistence, and processing.
Only external embeddings/generation are deterministic. No email is sent.
"""
from contextlib import asynccontextmanager
import os

from browser_server import app
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User

original_lifespan = app.router.lifespan_context


@asynccontextmanager
async def upload_lifespan(application):
    async with original_lifespan(application):
        async with AsyncSessionLocal() as db:
            db.add(User(email='upload-browser@example.com',
                        hashed_password=get_password_hash('UploadBrowser!123'),
                        full_name='Upload Browser Researcher', is_active=True))
            await db.commit()
        yield


app.router.lifespan_context = upload_lifespan

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=int(os.getenv('BROWSER_API_PORT', '8013')))
