from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from jwt import PyJWTError as JWTError
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, Profile
from app.schemas.auth import (
    ChangePasswordRequest, CodeRequest, ConsentRequest, ForgotPasswordRequest, LoginRequest, RegisterRequest,
    RefreshRequest, ResetPasswordRequest, SocialAuthRequest, TokenResponse, UserResponse,
)
from app.services.auth import (
    create_access_token, create_refresh_token, create_user, hash_password,
    decode_claims, decode_token, get_or_create_social_user, get_user_by_email, verify_password, verify_password_or_dummy,
)
from app.services.email_codes import issue_code, redeem_code
from app.services.mailer import mail_enabled, send_code
from app.services.password_policy import password_problem
from app.services.user_quota import check_user_quota
from app.services.rate_limit import FailureThrottle, limit
from app.services.social_auth import SocialAuthError, verify_apple_identity_token, verify_google_id_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _social_detail(e: SocialAuthError, provider: str) -> str:
    """Token-library wording stays out of the response; messages that tell the person what to do (e.g. an unconfirmed email) pass through."""
    text = str(e)
    return f"{provider} sign-in failed" if text.startswith("Invalid") else text
_auth_limit = Depends(limit("auth", 20, 60))
# 8 wrong passwords for one email in 15 minutes locks that email for the rest of the window.
_login_failures = FailureThrottle(8, 900)


def _issue_tokens_for_social_user(db: Session, email: str, display_name: str | None) -> TokenResponse:
    user = get_or_create_social_user(db, email, display_name)
    if display_name:
        profile = db.query(Profile).filter(Profile.id == user.id).first()
        if profile and not profile.display_name:
            profile.display_name = display_name
            db.commit()
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        refresh_token=create_refresh_token(user.id, user.token_version),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, dependencies=[_auth_limit])
def register(body: RegisterRequest, db: Session = Depends(get_db), background: BackgroundTasks = None):
    if get_user_by_email(db, body.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    problem = password_problem(body.password, body.email)
    if problem:
        raise HTTPException(status_code=400, detail=problem)
    user = create_user(db, body.email, body.password, body.display_name)
    if mail_enabled() and background is not None:
        background.add_task(send_code, user.email, "verify", issue_code(db, user.id, "verify"))
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        refresh_token=create_refresh_token(user.id, user.token_version),
    )


@router.post("/login", response_model=TokenResponse, dependencies=[_auth_limit])
def login(body: LoginRequest, db: Session = Depends(get_db)):
    email_key = body.email.strip().lower()
    _login_failures.check(email_key)
    user = get_user_by_email(db, body.email)
    if not verify_password_or_dummy(body.password, user.hashed_password if user else None):
        _login_failures.fail(email_key)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    _login_failures.clear(email_key)
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        refresh_token=create_refresh_token(user.id, user.token_version),
    )


@router.post("/apple", response_model=TokenResponse, dependencies=[_auth_limit])
def login_with_apple(body: SocialAuthRequest, db: Session = Depends(get_db)):
    try:
        claims = verify_apple_identity_token(
            body.id_token,
            [settings.apple_bundle_id, "host.exp.Exponent"] if settings.apple_allow_expo_go else settings.apple_bundle_id,
        )
    except SocialAuthError as e:
        raise HTTPException(status_code=401, detail=_social_detail(e, "Apple"))
    return _issue_tokens_for_social_user(db, claims["email"], body.display_name)


@router.post("/google", response_model=TokenResponse, dependencies=[_auth_limit])
def login_with_google(body: SocialAuthRequest, db: Session = Depends(get_db)):
    if not settings.google_web_client_id:
        raise HTTPException(status_code=500, detail="Google sign-in is not configured on the server")
    try:
        claims = verify_google_id_token(body.id_token, settings.google_web_client_id, body.access_token)
    except SocialAuthError as e:
        raise HTTPException(status_code=401, detail=_social_detail(e, "Google"))
    return _issue_tokens_for_social_user(db, claims["email"], body.display_name or claims.get("name"))


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id, email=user.email, email_verified=bool(user.email_verified),
        # Only password accounts need the code: Apple and Google have already confirmed theirs.
        verification_required=mail_enabled() and not user.email_verified and bool(user.hashed_password),
        health_consent_version=user.health_consent_version,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)


@router.post("/consent", response_model=UserResponse, dependencies=[_auth_limit])
def give_health_consent(body: ConsentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Record explicit consent to store health information. The time is the server's, not the phone's.
    Consent is withdrawn by deleting the account (DELETE /me), which removes everything stored."""
    current_user.health_consent_at = datetime.now(timezone.utc)
    current_user.health_consent_version = body.version
    db.commit()
    return _user_response(current_user)


_GENERIC_CODE_ERROR = "That code is not right or has run out. Ask for a new one."


@router.post("/verify-email/resend", status_code=status.HTTP_204_NO_CONTENT, dependencies=[_auth_limit])
def resend_verification(background: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.email_verified:
        return
    if not mail_enabled():
        raise HTTPException(status_code=503, detail="Email is not set up on the server yet")
    check_user_quota("mail-hour", current_user.id, 5, 3600)
    background.add_task(send_code, current_user.email, "verify", issue_code(db, current_user.id, "verify"))


@router.post("/verify-email", response_model=UserResponse, dependencies=[_auth_limit])
def verify_email(body: CodeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.email_verified:
        if not redeem_code(db, current_user.id, "verify", body.code):
            raise HTTPException(status_code=400, detail=_GENERIC_CODE_ERROR)
        current_user.email_verified = True
        db.commit()
    return _user_response(current_user)


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT, dependencies=[_auth_limit])
def forgot_password(body: ForgotPasswordRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Email a reset code if the address has an account. The answer is the same either way, and the
    email goes out after the response, so neither the reply nor its timing says who has an account."""
    if not mail_enabled():
        raise HTTPException(status_code=503, detail="Password reset by email is not set up yet")
    email = body.email.strip().lower()
    check_user_quota("reset-hour", email, 5, 3600)
    user = get_user_by_email(db, email)
    if user and user.is_active:
        background.add_task(send_code, user.email, "reset", issue_code(db, user.id, "reset"))


@router.post("/reset-password", response_model=TokenResponse, dependencies=[_auth_limit])
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, body.email)
    problem = password_problem(body.new_password, body.email)
    if problem:
        raise HTTPException(status_code=400, detail=problem)
    if not user or not user.is_active or not redeem_code(db, user.id, "reset", body.code):
        raise HTTPException(status_code=400, detail=_GENERIC_CODE_ERROR)
    user.hashed_password = hash_password(body.new_password)
    user.email_verified = True  # the code proves she can read this inbox
    user.token_version += 1     # every earlier session ends, wherever it was opened
    db.commit()
    _login_failures.clear(user.email)
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        refresh_token=create_refresh_token(user.id, user.token_version),
    )


@router.post("/refresh", response_model=TokenResponse, dependencies=[Depends(limit("refresh", 30, 60))])
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        user_id, version = decode_claims(body.refresh_token, "refresh")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active or user.token_version != version:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    return TokenResponse(
        access_token=create_access_token(user_id, user.token_version),
        refresh_token=create_refresh_token(user_id, user.token_version),
    )


@router.post("/change-password", response_model=TokenResponse, dependencies=[_auth_limit])
def change_password(body: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Accounts created through Apple/Google have no password to change.
    if not current_user.hashed_password or not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    problem = password_problem(body.new_password, current_user.email)
    if problem:
        raise HTTPException(status_code=400, detail=problem)
    if body.new_password == body.current_password:
        raise HTTPException(status_code=400, detail="Choose a different password")
    current_user.hashed_password = hash_password(body.new_password)
    current_user.token_version += 1  # every other signed-in device must sign in again
    db.commit()
    # This device keeps its session: hand back tokens for the new version.
    return TokenResponse(
        access_token=create_access_token(current_user.id, current_user.token_version),
        refresh_token=create_refresh_token(current_user.id, current_user.token_version),
    )


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT, dependencies=[_auth_limit])
def logout_all(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Sign this account out everywhere (all access and refresh tokens issued so far stop working)."""
    current_user.token_version += 1
    db.commit()
