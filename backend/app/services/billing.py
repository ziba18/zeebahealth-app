"""The paid plan. One rule: the phone is never believed about what was bought.

Apple takes the payment, RevenueCat checks Apple's receipt, and this server asks RevenueCat (with a
secret key the app never has) what the account is entitled to. That answer is the only thing ever
written to `entitlements`. The webhook is just a nudge to go and ask; its body is not trusted either.
"""
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.billing import Entitlement

FREE = "free"


class BillingUnavailable(Exception):
    pass


def billing_enabled() -> bool:
    return bool(settings.revenuecat_api_key and settings.revenuecat_webhook_secret)


def _parse_time(value) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def fetch_entitlement(user_id: str) -> dict | None:
    """Ask RevenueCat what this account holds. Returns {expires_at, product_id} or None for nothing.

    GET /v1/subscribers/{app_user_id}; the app signs in to RevenueCat with our user id, so the two match.
    """
    try:
        res = httpx.get(
            f"https://api.revenuecat.com/v1/subscribers/{user_id}",
            headers={"Authorization": f"Bearer {settings.revenuecat_api_key}"},
            timeout=10,
        )
    except httpx.HTTPError:
        raise BillingUnavailable("Could not reach the payment service")
    if res.status_code != 200:
        raise BillingUnavailable(f"The payment service answered {res.status_code}")
    try:
        held = res.json()["subscriber"]["entitlements"].get(settings.revenuecat_entitlement)
    except (KeyError, ValueError, AttributeError, TypeError):
        raise BillingUnavailable("The payment service sent something unexpected")
    if not isinstance(held, dict):
        return None
    return {"expires_at": _parse_time(held.get("expires_date")), "lifetime": not held.get("expires_date"),
            "product_id": held.get("product_identifier")}


def sync_entitlement(db: Session, user_id: str) -> str:
    """Bring `entitlements` in line with RevenueCat for one account; returns the plan now in force."""
    held = fetch_entitlement(user_id)
    row = db.query(Entitlement).filter(Entitlement.user_id == user_id).first()
    now = datetime.now(timezone.utc)
    active = bool(held) and (held["lifetime"] or (held["expires_at"] and held["expires_at"] > now))
    if not active:
        if row:
            db.delete(row)
            db.commit()
        return FREE
    if row is None:
        row = Entitlement(user_id=user_id, plan=settings.revenuecat_entitlement)
        db.add(row)
    row.plan = settings.revenuecat_entitlement
    row.expires_at = None if held["lifetime"] else held["expires_at"]
    row.product_id = held["product_id"]
    db.commit()
    return row.plan


def current_plan(db: Session, user_id: str) -> tuple[str, datetime | None]:
    """The plan from our own table, with the clock applied: a lapsed row is the free plan."""
    row = db.query(Entitlement).filter(Entitlement.user_id == user_id).first()
    if row is None:
        return FREE, None
    expires = row.expires_at
    if expires is not None:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires <= datetime.now(timezone.utc):
            return FREE, None
    return row.plan, expires
