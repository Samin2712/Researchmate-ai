"""
Test authentication endpoints
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.core.security import get_password_hash


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration"""
    user_data = {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User"
    }
    
    response = await client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    assert "id" in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_db: AsyncSession):
    """Test registration with duplicate email fails"""
    # Create user first
    user = User(
        email="existing@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Existing User"
    )
    test_db.add(user)
    await test_db.commit()
    
    # Try to register with same email
    user_data = {
        "email": "existing@example.com",
        "password": "newpassword123",
        "full_name": "New User"
    }
    
    response = await client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_db: AsyncSession):
    """Test successful login"""
    # Create user
    user = User(
        email="login@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Login User"
    )
    test_db.add(user)
    await test_db.commit()
    
    # Login
    login_data = {
        "email": "login@example.com",
        "password": "password123"
    }
    
    response = await client.post("/api/v1/auth/login/json", json=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_db: AsyncSession):
    """Test login with wrong password"""
    # Create user
    user = User(
        email="user@example.com",
        hashed_password=get_password_hash("correctpassword"),
        full_name="Test User"
    )
    test_db.add(user)
    await test_db.commit()
    
    # Try login with wrong password
    login_data = {
        "email": "user@example.com",
        "password": "wrongpassword"
    }
    
    response = await client.post("/api/v1/auth/login/json", json=login_data)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, test_db: AsyncSession):
    """Test getting current user info"""
    # Create user
    user = User(
        email="current@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Current User"
    )
    test_db.add(user)
    await test_db.commit()
    
    # Login
    login_data = {
        "email": "current@example.com",
        "password": "password123"
    }
    
    response = await client.post("/api/v1/auth/login/json", json=login_data)
    token = response.json()["access_token"]
    
    # Get current user
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "current@example.com"
    assert data["full_name"] == "Current User"
