"""Sign-up with an email and password does not confirm the address. Someone could register a
stranger's address, wait for her to arrive through Apple or Google, and then read her notes with the
password they chose. The first provider-confirmed sign-in must therefore retire that password."""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only-0123456789")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from fastapi.security import HTTPAuthorizationCredentials  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.database import Base  # noqa: E402
from app.dependencies import get_current_user  # noqa: E402
from app.models import User  # noqa: E402
from app.routers import auth as auth_router  # noqa: E402
from app.schemas.auth import LoginRequest, RegisterRequest, SocialAuthRequest  # noqa: E402
from app.services.auth import decode_claims  # noqa: E402

EMAIL = "her@example.com"
PASSWORD = "chosen-by-someone-else-1"


@pytest.fixture()
def db(monkeypatch):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    monkeypatch.setattr(auth_router, "verify_apple_identity_token", lambda *a, **k: {"sub": "apple-1", "email": EMAIL})
    return sessionmaker(bind=engine)()


def bearer(token):
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_password_set_before_the_owner_arrived_stops_working(db):
    early = auth_router.register(RegisterRequest(email=EMAIL, password=PASSWORD), db=db)
    hers = auth_router.login_with_apple(SocialAuthRequest(id_token="x.y.z"), db=db)

    user = db.query(User).one()  # still one account, now hers alone
    assert user.email_verified and user.hashed_password is None
    with pytest.raises(HTTPException) as e:
        auth_router.login(LoginRequest(email=EMAIL, password=PASSWORD), db=db)
    assert e.value.status_code == 401
    with pytest.raises(HTTPException):  # the session opened at sign-up is closed too
        get_current_user(bearer(early.access_token), db)
    assert get_current_user(bearer(hers.access_token), db).id == user.id


def test_only_the_first_confirmed_sign_in_changes_anything(db):
    auth_router.login_with_apple(SocialAuthRequest(id_token="x.y.z"), db=db)
    user = db.query(User).one()
    assert user.email_verified and user.token_version == 0
    again = auth_router.login_with_apple(SocialAuthRequest(id_token="x.y.z"), db=db)
    assert decode_claims(again.access_token) == (user.id, 0)


def test_password_sign_up_starts_unconfirmed(db):
    auth_router.register(RegisterRequest(email=EMAIL, password=PASSWORD), db=db)
    assert db.query(User).one().email_verified is False
