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
    evidence_notes = relationship("EvidenceNote", back_populates="owner", cascade="all, delete-orphan")
    analysis_runs = relationship("AnalysisRun", back_populates="user", cascade="all, delete-orphan")
    profile = relationship('UserProfile', uselist=False, lazy='selectin', cascade='all, delete-orphan')
    auth = relationship('UserAuth', uselist=False, lazy='selectin', cascade='all, delete-orphan')
    email_verification = relationship('EmailVerification', uselist=False, lazy='selectin', cascade='all, delete-orphan')

    @property
    def email_verified(self):
        # Legacy accounts keep access; all new password registrations get a pending row.
        return self.auth_provider == 'google' or self.email_verification is None or self.email_verification.verified_at is not None

    @property
    def auth_provider(self):
        return self.auth.provider if self.auth else 'password'

    @property
    def session_version(self):
        return self.auth.session_version if self.auth else 0

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

    @property
    def default_explanation_mode(self):
        return (
            self.profile.default_explanation_mode
            if self.profile and self.profile.default_explanation_mode
            else "standard"
        )

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
    default_explanation_mode = Column(String(32), nullable=True, default="standard", server_default="standard")


class UserAuth(Base):
    """Optional auth metadata preserves all legacy password accounts unchanged."""
    __tablename__ = 'user_auth'
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    provider = Column(String(16), nullable=False, default='password')
    google_sub = Column(String(255), unique=True, nullable=True)
    session_version = Column(Integer, nullable=False, default=0)


class PasswordReset(Base):
    __tablename__ = 'password_resets'
    token_hash = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)


class AuthRateLimit(Base):
    __tablename__ = 'auth_rate_limits'
    key = Column(String(100), primary_key=True)
    attempts = Column(Integer, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)


class EmailVerification(Base):
    __tablename__ = 'email_verifications'
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    token_hash = Column(String(64), unique=True, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
