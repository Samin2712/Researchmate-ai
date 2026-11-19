"""
User Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """User response schema"""
    id: int
    is_active: bool
    created_at: datetime
    auth_provider: str = 'password'
    email_verified: bool = True
    institution: Optional[str] = None
    bio: Optional[str] = None
    research_interests: Optional[str] = None
    avatar_url: Optional[str] = None
    default_explanation_mode: Optional[str] = "standard"

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    institution: Optional[str] = Field(default=None, max_length=200)
    bio: Optional[str] = Field(default=None, max_length=1000)
    research_interests: Optional[str] = Field(default=None, max_length=500)
    default_explanation_mode: Optional[str] = Field(default=None, pattern="^(standard|simple)$")


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    email: Optional[str] = None


class ForgotPassword(BaseModel):
    email: EmailStr


class NewPassword(BaseModel):
    new_password: str = Field(min_length=6, max_length=100)

    @field_validator('new_password')
    @classmethod
    def password_bytes(cls, value):
        if len(value.encode('utf-8')) > 72:
            raise ValueError('Use a password of 72 UTF-8 bytes or fewer.')
        return value


class ResetPassword(NewPassword):
    token: str = Field(min_length=32, max_length=256)


class ChangePassword(NewPassword):
    current_password: str = Field(min_length=1, max_length=100)


class GoogleLogin(BaseModel):
    credential: str = Field(min_length=1, max_length=8192)


class VerifyEmail(BaseModel):
    token: str = Field(min_length=32, max_length=256)
