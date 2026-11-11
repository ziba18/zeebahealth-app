from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Entitlement(Base):
    """What an account has paid for, as last read from RevenueCat by this server.

    Deliberately its own table with no endpoint that writes to it from the app: nothing the phone
    sends can change a plan. No row, or a row whose time has passed, means the free plan."""

    __tablename__ = "entitlements"

    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    plan: Mapped[str] = mapped_column(String, nullable=False)  # the RevenueCat entitlement id, e.g. 'plus'
    # Null with lifetime=True means it never runs out (a one-off purchase).
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    product_id: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class PurchaseEvent(Base):
    """One row per RevenueCat webhook event id, so a repeated delivery is recognised. Type and time only."""

    __tablename__ = "purchase_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # RevenueCat's event id
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
