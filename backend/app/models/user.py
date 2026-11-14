"""
User database model
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="owner", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="owner", cascade="all, delete-orphan")
    profile = relationship('UserProfile', uselist=False, lazy='selectin', cascade='all, delete-orphan')

    @property
    def institution(self):
        return self.profile.institution if self.profile else None

    @property
    def bio(self):
        return self.profile.bio if self.profile else None

    @property
    def research_interests(self):
        return self.profile.research_interests if self.profile else None

    @property
    def avatar_url(self):
        return self.profile.photo_data if self.profile else None
    
    def __repr__(self):
        return f"<User {self.email}>"


class UserProfile(Base):
    """A separate table allows existing accounts to gain profiles without ALTER TABLE."""
    __tablename__ = 'user_profiles'

    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    institution = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)
    research_interests = Column(String(500), nullable=True)
    # Small, re-encoded thumbnails live in the database, not ephemeral upload storage.
    photo_data = Column(Text, nullable=True)
