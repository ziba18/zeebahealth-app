"""Launch checks: consent before health data, email codes, paging, and what is switched off."""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only-0123456789")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import EmailCode, User  # noqa: E402
from app.routers import auth as auth_router  # noqa: E402
from app.services import email_codes, rate_limit  # noqa: E402

EMAIL, PASSWORD = "her@example.com", "a-long-private-phrase-1"


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

    sent = []
    monkeypatch.setattr(auth_router, "send_code", lambda to, purpose, code: sent.append((to, purpose, code)))
    monkeypatch.setattr(auth_router, "mail_enabled", lambda: True)
    rate_limit._hits.clear()
    app.dependency_overrides[get_db] = db
    client = TestClient(app)
    client.sent, client.Session = sent, Session
    yield client
    app.dependency_overrides.clear()


def sign_up(api):
    tokens = api.post("/auth/register", json={"email": EMAIL, "password": PASSWORD}).json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_health_records_wait_for_consent(api):
    auth = sign_up(api)
    note = {"kind": "symptom", "data": {"text": "cramps"}}
    assert api.post("/records", json=note, headers=auth).status_code == 403
    me = api.post("/auth/consent", json={"version": "2026-11"}, headers=auth).json()
    assert me["health_consent_version"] == "2026-11"
    assert api.post("/records", json=note, headers=auth).status_code == 201
    with api.Session() as db:
        assert db.query(User).one().health_consent_at is not None


def test_sign_up_emails_a_code_and_the_code_confirms_the_address(api):
    auth = sign_up(api)
    (to, purpose, code), = api.sent
    assert (to, purpose) == (EMAIL, "verify") and len(code) == 6
    assert api.get("/auth/me", headers=auth).json()["verification_required"] is True
    wrong = "000000" if code != "000000" else "111111"
    assert api.post("/auth/verify-email", json={"code": wrong}, headers=auth).status_code == 400
    me = api.post("/auth/verify-email", json={"code": code}, headers=auth).json()
    assert me["email_verified"] is True and me["verification_required"] is False


def test_forgot_password_says_the_same_for_any_address_and_reset_ends_old_sessions(api):
    old = sign_up(api)
    api.sent.clear()
    assert api.post("/auth/forgot-password", json={"email": "nobody@example.com"}).status_code == 204
    assert api.sent == []
    assert api.post("/auth/forgot-password", json={"email": EMAIL}).status_code == 204
    (_, purpose, code), = api.sent
    assert purpose == "reset"
    done = api.post("/auth/reset-password", json={"email": EMAIL, "code": code, "new_password": "another-private-phrase-2"})
    assert done.status_code == 200
    assert api.get("/auth/me", headers=old).status_code == 401
    assert api.post("/auth/login", json={"email": EMAIL, "password": PASSWORD}).status_code == 401
    assert api.post("/auth/login", json={"email": EMAIL, "password": "another-private-phrase-2"}).status_code == 200
    # A code works once.
    again = api.post("/auth/reset-password", json={"email": EMAIL, "code": code, "new_password": "third-private-phrase-3"})
    assert again.status_code == 400


def test_a_code_dies_after_five_wrong_tries(api):
    sign_up(api)
    with api.Session() as db:
        user = db.query(User).one()
        code = email_codes.issue_code(db, user.id, "reset")
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(email_codes.MAX_ATTEMPTS):
            assert not email_codes.redeem_code(db, user.id, "reset", wrong)
        assert not email_codes.redeem_code(db, user.id, "reset", code)
        assert db.query(EmailCode).filter(EmailCode.purpose == "reset").count() == 0


def test_only_a_hash_of_the_code_is_stored(api):
    sign_up(api)
    (_, _, code), = api.sent
    with api.Session() as db:
        assert code not in db.query(EmailCode).one().code_hash


def test_records_come_in_pages(api):
    auth = sign_up(api)
    api.post("/auth/consent", json={"version": "2026-11"}, headers=auth)
    for i in range(5):
        api.post("/records", json={"kind": "symptom", "data": {"n": i}}, headers=auth)
    seen, after = [], None
    while True:
        page = api.get("/records", params={"limit": 2, **({"after": after} if after else {})}, headers=auth).json()
        seen += [r["data"]["n"] for r in page["records"]]
        after = page["next_cursor"]
        if not after:
            break
    assert seen == [0, 1, 2, 3, 4]


def test_friends_and_api_docs_are_off_by_default(api):
    assert settings.friends_enabled is False and settings.api_docs is False
    assert api.get("/docs").status_code == 404
    assert api.get("/openapi.json").status_code == 404
    assert api.get("/connections/friends").status_code == 404


def test_privacy_page_states_the_basis_and_the_rights(api):
    page = api.get("/privacy").text
    for phrase in ("explicit consent", "data controller", "Information", "ico.org.uk", "withdraw"):
        assert phrase in page
    assert "{controller}" not in page and "{email}" not in page
