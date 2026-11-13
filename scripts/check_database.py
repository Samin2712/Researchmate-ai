"""Fail fast on database configuration errors, without importing AI services or exposing passwords."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))

from sqlalchemy import text
from app.core.database import engine


async def check_database():
    async with engine.connect() as connection:
        await connection.execute(text('SELECT 1'))


async def main():
    try:
        await asyncio.wait_for(check_database(), timeout=10)
        print(f'Database preflight passed: {engine.url.get_backend_name()}.', flush=True)
        return 0
    except Exception as error:
        print(f'Database preflight failed: {engine.url.get_backend_name()} ({type(error).__name__}).', flush=True)
        if engine.url.get_backend_name() == 'postgresql':
            print('Check PostgreSQL credentials in backend/.env or RESEARCHMATE_DATABASE_URL. '
                  'For local SQLite, set DATABASE_URL=sqlite+aiosqlite:///./test.db in backend/.env.', flush=True)
        else:
            print('Check DATABASE_URL and database file permissions in backend/.env.', flush=True)
        return 1
    finally:
        await engine.dispose()


if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))
