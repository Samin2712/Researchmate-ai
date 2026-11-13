"""Check actual API/database/vector/model state and a real LLM request, without printing secrets."""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import httpx


async def main():
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get('http://127.0.0.1:8000/health')
            response.raise_for_status()
            health = response.json()
            frontend = await client.get('http://127.0.0.1:5173')
            if frontend.status_code != 200 or 'ResearchMate' not in frontend.text:
                print('Frontend: unavailable or a different app is using port 5173.')
                return 1
            cors = await client.options('http://127.0.0.1:8000/api/v1/auth/login/json', headers={
                'Origin': 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'authorization,content-type',
            })
            if cors.headers.get('access-control-allow-origin') != 'http://127.0.0.1:5173':
                print('Frontend/API CORS: blocked. Add http://127.0.0.1:5173 to CORS_ORIGINS.')
                return 1
        print(json.dumps(health, indent=2))
        print('Frontend and API CORS: connected.')
    except (httpx.HTTPError, ValueError):
        print('API health check failed. Start the app with npm run dev, then rerun npm run doctor.')
        return 1

    from app.services.llm_service import llm_service
    try:
        answer = await llm_service.generate(
            prompt='Reply with the single word OK.', system_prompt='You are verifying API connectivity.',
            temperature=0, max_tokens=32,
        )
        if not answer.strip():
            raise ValueError('Empty provider reply')
        print('LLM: authenticated request succeeded (provider returned text).')
    except Exception as error:
        print(f'LLM: real request failed ({type(error).__name__}, code={getattr(error, "code", "unknown")}).')
        print('Check the selected provider API key, model availability, quota, and network connection in backend/.env.')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))
