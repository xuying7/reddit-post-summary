import datetime
import uuid
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(320), unique=True, index=True, nullable=False)  # Max email length per RFC
    name = Column(String(255))
    provider = Column(String(50), index=True, nullable=False)  # short provider name
    provider_account_id = Column(String(191), unique=True, index=True, nullable=False)  # 191 to be index-friendly with utf8mb4
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    chat_histories = relationship("ChatHistory", back_populates="user")
    parameter_histories = relationship("ParameterHistory", back_populates="user")

class ChatHistory(Base):
    __tablename__ = "chat_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parameter_history_id = Column(Integer, ForeignKey("parameter_histories.id"), nullable=True, index=True)
    message = Column(Text, nullable=False)
    response = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_histories")
    parameter_session = relationship("ParameterHistory", back_populates="chat_entries")

class ParameterHistory(Base):
    __tablename__ = "parameter_histories"

    id = Column(Integer, primary_key=True, index=True)
    session_uuid = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parameters = Column(Text) # Store parameters as JSON string or use JSONB if supported
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    title = Column(String(255), nullable=True) # e.g., "r/uft - bird course"

    user = relationship("User", back_populates="parameter_histories")
    # Relationship to associated chat history entries
    chat_entries = relationship("ChatHistory", back_populates="parameter_session", cascade="all, delete-orphan") 