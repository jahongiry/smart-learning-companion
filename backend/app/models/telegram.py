"""Additive Telegram tables; no changes to existing accounts or learning records."""
from datetime import datetime
import uuid

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class TelegramConnection(Base):
    __tablename__ = 'telegram_connections'
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), primary_key=True)
    chat_id: Mapped[int | None] = mapped_column(BigInteger, unique=True)
    username: Mapped[str | None] = mapped_column(String(100))
    link_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    link_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pending_chat_id: Mapped[int | None] = mapped_column(BigInteger)
    pending_username: Mapped[str | None] = mapped_column(String(100))
    daily_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    timezone: Mapped[str] = mapped_column(String(100), default='Australia/Sydney')
    daily_time: Mapped[str] = mapped_column(String(5), default='18:00')
    next_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    quota_day: Mapped[str] = mapped_column(String(10), default='')
    question_count: Mapped[int] = mapped_column(Integer, default=0)


class TelegramUpdate(Base):
    __tablename__ = 'telegram_updates'
    update_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    replies: Mapped[list | None] = mapped_column(JSON)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default='pending', index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TelegramDaily(Base):
    __tablename__ = 'telegram_daily'
    __table_args__ = (UniqueConstraint('user_id', 'local_day', name='uq_telegram_daily_day'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger)
    local_day: Mapped[str] = mapped_column(String(10))
    content: Mapped[dict | None] = mapped_column(JSON)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default='pending', index=True)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    attempt_id: Mapped[int | None] = mapped_column(ForeignKey('quiz_attempts.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
