"""Encrypted credentials and selection belong to an authenticated account."""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class AICredential(Base):
    __tablename__ = 'ai_credentials'
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    provider = Column(String(16), primary_key=True)
    encrypted_key = Column(Text, nullable=False)
    verified_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AISelection(Base):
    __tablename__ = 'ai_selections'
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    provider = Column(String(16), nullable=False, default='default')
