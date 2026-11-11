import hmac
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.billing import PurchaseEvent
from app.models.user import User
from app.services.billing import FREE, BillingUnavailable, billing_enabled, current_plan, sync_entitlement
from app.services.rate_limit import limit

router = APIRouter(prefix="/billing", tags=["billing"])
log = logging.getLogger(__name__)


class PlanResponse(BaseModel):
    plan: str
    expires_at: str | None = None
    billing_enabled: bool


def _plan(db: Session, user: User) -> PlanResponse:
    plan, expires = current_plan(db, user.id)
    return PlanResponse(plan=plan, expires_at=expires.isoformat() if expires else None, billing_enabled=billing_enabled())


def require_plus(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    """Put this on any endpoint that costs money to serve or belongs to the paid plan."""
    if current_plan(db, current_user.id)[0] == FREE:
        raise HTTPException(status_code=402, detail="This is part of Zeeba Health Plus")
    return current_user


@router.get("/me", response_model=PlanResponse)
def my_plan(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _plan(db, current_user)


@router.post("/refresh", response_model=PlanResponse, dependencies=[Depends(limit("billing-refresh", 10, 60))])
def refresh_my_plan(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Called by the app right after a purchase or a restore. It carries no purchase details: the
    server asks the payment service itself, so calling this can only ever tell the truth."""
    if not billing_enabled():
        return _plan(db, current_user)
    try:
        sync_entitlement(db, current_user.id)
    except BillingUnavailable:
        raise HTTPException(status_code=503, detail="We couldn't check your purchase just now. Try again in a moment.")
    return _plan(db, current_user)


@router.post("/revenuecat", status_code=204, include_in_schema=False, dependencies=[Depends(limit("billing-hook", 120, 60))])
async def revenuecat_webhook(request: Request, authorization: str = Header(default=""), db: Session = Depends(get_db)):
    """RevenueCat calls this when something changes for a customer.

    Closed unless billing is configured, and the Authorization header must equal the secret set in
    RevenueCat's dashboard (compared in constant time). Even then the body is only used to learn
    *which* account to look up; the plan itself always comes from sync_entitlement()."""
    if not billing_enabled():
        raise HTTPException(status_code=503, detail="Billing is not configured")
    if not hmac.compare_digest(authorization.encode(), settings.revenuecat_webhook_secret.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        event = (await request.json()).get("event") or {}
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid body")
    event_id, event_type = str(event.get("id") or ""), str(event.get("type") or "")[:40]
    # A purchase made before sign-in arrives under an anonymous id and is moved to the real one
    # later (TRANSFER / aliases), so every id on the event is considered; only real accounts match.
    ids = {str(i) for i in [event.get("app_user_id"), event.get("original_app_user_id"), *(event.get("aliases") or []),
                            *(event.get("transferred_to") or []), *(event.get("transferred_from") or [])] if i}
    users = db.query(User).filter(User.id.in_(ids)).all() if ids else []
    for user in users:
        if event_id:
            db.add(PurchaseEvent(id=f"{event_id}:{user.id}"[:200], user_id=user.id, event_type=event_type))
            try:
                db.commit()
            except IntegrityError:  # delivered before; syncing again is harmless and keeps us right
                db.rollback()
        try:
            sync_entitlement(db, user.id)
        except BillingUnavailable:
            # Not a 2xx, so RevenueCat sends it again later.
            raise HTTPException(status_code=503, detail="Could not confirm with the payment service")
    log.info("billing: %s for %d account(s)", event_type or "event", len(users))  # never ids or amounts
