import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EmailCode(Base):
    """A six-digit code emailed to confirm an address or reset a password. One live code per
    user and purpose; only a keyed hash of the code is stored."""

    __tablename__ = "email_codes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String, nullable=False)  # 'verify' | 'reset'
    code_hash: Mapped[str] = mapped_column(String, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
