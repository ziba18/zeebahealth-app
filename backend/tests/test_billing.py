"""The paid plan can only be changed by what the payment service says, never by what a phone sends."""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only-0123456789")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from datetime import datetime, timedelta, timezone  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Entitlement, User  # noqa: E402
from app.services import billing, rate_limit  # noqa: E402

HOOK_SECRET = "hook-secret-typed-into-the-dashboard"


@pytest.fixture()
def api(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    def db():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    monkeypatch.setattr(settings, "revenuecat_webhook_secret", HOOK_SECRET)
    monkeypatch.setattr(settings, "revenuecat_api_key", "sk_test")
    held = {}  # what the payment service "really" holds, per user id
    monkeypatch.setattr(billing, "fetch_entitlement", lambda uid: held.get(uid))
    rate_limit._hits.clear()
    app.dependency_overrides[get_db] = db
    client = TestClient(app)
    tokens = client.post("/auth/register", json={"email": "her@example.com", "password": "a-long-private-phrase-1"}).json()
    client.hdr = {"Authorization": f"Bearer {tokens['access_token']}"}
    with Session() as s:
        client.uid = s.query(User).one().id
    client.held, client.Session = held, Session
    yield client
    app.dependency_overrides.clear()


def paid(days=30):
    return {"expires_at": datetime.now(timezone.utc) + timedelta(days=days), "lifetime": False, "product_id": "plus_annual"}


def hook(api, user_id, secret=HOOK_SECRET, event_id="evt-1"):
    return api.post("/billing/revenuecat", headers={"Authorization": secret},
                    json={"event": {"id": event_id, "type": "INITIAL_PURCHASE", "app_user_id": user_id}})


def test_everyone_starts_free(api):
    assert api.get("/billing/me", headers=api.hdr).json()["plan"] == "free"


def test_the_app_cannot_give_itself_the_plan(api):
    # Nothing was bought. Whatever the phone sends, anywhere, the plan stays free.
    api.patch("/me", json={"plan": "plus", "entitlement": "plus", "expires_at": "2099-01-01"}, headers=api.hdr)
    assert api.post("/billing/refresh", json={"plan": "plus"}, headers=api.hdr).json()["plan"] == "free"
    assert api.post("/billing/me", json={"plan": "plus"}, headers=api.hdr).status_code == 405
    assert api.get("/billing/me", headers=api.hdr).json()["plan"] == "free"


def test_webhook_needs_the_secret(api):
    api.held[api.uid] = paid()
    assert hook(api, api.uid, secret="").status_code == 401
    assert hook(api, api.uid, secret="guess").status_code == 401
    assert api.get("/billing/me", headers=api.hdr).json()["plan"] == "free"


def test_a_forged_event_with_the_right_secret_still_grants_nothing(api):
    # Even if the secret leaked: the event only says "look this account up", and nothing was bought.
    assert hook(api, api.uid).status_code == 204
    assert api.get("/billing/me", headers=api.hdr).json()["plan"] == "free"


def test_real_purchase_unlocks_then_lapses_and_a_repeat_delivery_is_harmless(api):
    api.held[api.uid] = paid()
    assert hook(api, api.uid).status_code == 204
    assert hook(api, api.uid).status_code == 204  # same event id again
    assert api.get("/billing/me", headers=api.hdr).json()["plan"] == "plus"
    # The clock alone ends it, even if no further event ever arrives.
    with api.Session() as s:
        s.query(Entitlement).one().expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        s.commit()
    assert api.get("/billing/me", headers=api.hdr).json()["plan"] == "free"
    # A refund or cancellation: the service no longer holds it, the next sync removes the row.
    api.held.pop(api.uid)
    assert hook(api, api.uid, event_id="evt-2").status_code == 204
    with api.Session() as s:
        assert s.query(Entitlement).count() == 0


def test_refresh_after_buying_asks_the_service_itself(api):
    api.held[api.uid] = paid()
    assert api.post("/billing/refresh", headers=api.hdr).json()["plan"] == "plus"


def test_unknown_or_anonymous_ids_change_nothing(api):
    api.held["$RCAnonymousID:abc"] = paid()
    assert hook(api, "$RCAnonymousID:abc").status_code == 204
    with api.Session() as s:
        assert s.query(Entitlement).count() == 0


def test_billing_is_closed_until_configured(api, monkeypatch):
    monkeypatch.setattr(settings, "revenuecat_api_key", "")
    assert hook(api, api.uid).status_code == 503
    assert api.get("/billing/me", headers=api.hdr).json()["billing_enabled"] is False


def test_deleting_the_account_removes_the_plan(api):
    api.held[api.uid] = paid()
    hook(api, api.uid)
    assert api.delete("/me", headers=api.hdr).status_code == 204
    with api.Session() as s:
        assert s.query(Entitlement).count() == 0
