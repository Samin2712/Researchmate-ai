"""
Simple API test script
"""
import asyncio
import httpx
import sys
import os
import subprocess
import time


async def test_api():
    """Test basic API endpoints"""
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30.0) as client:
        # Test health endpoint
        print("Testing health endpoint...")
        response = await client.get("/")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print()
        
        # Test detailed health
        print("Testing /health endpoint...")
        response = await client.get("/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print()
        
        # Test register
        print("Testing user registration...")
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        response = await client.post("/api/v1/auth/register", json=user_data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print()
        
        # Test login
        print("Testing user login...")
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        response = await client.post("/api/v1/auth/login/json", json=login_data)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        token = data.get("access_token")
        print()
        
        # Test get current user
        if token:
            print("Testing get current user...")
            headers = {"Authorization": f"Bearer {token}"}
            response = await client.get("/api/v1/auth/me", headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
            print()


if __name__ == "__main__":
    # Ensure we're using the correct environment
    os.environ["CORS_ORIGINS"] = '["http://localhost:5173","http://localhost:3000"]'
    
    # Start server in background
    print("Starting FastAPI server...")
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for server to start
    print("Waiting for server to be ready...")
    time.sleep(10)  # Increased wait time
    
    try:
        # Run tests
        asyncio.run(test_api())
        print("\n✅ All Phase 1 API tests passed!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Stop server
        print("\nStopping server...")
        process.terminate()
        process.wait()
