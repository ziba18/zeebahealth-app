"""Six-digit email codes: issue one, check one. Stored as a keyed hash, good for 15 minutes and
five tries, so the one-in-a-million guess cannot be repeated until it lands."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.email_code import EmailCode

TTL = timedelta(minutes=15)
MAX_ATTEMPTS = 5


def _hash(user_id: str, purpose: str, code: str) -> str:
    return hmac.new(settings.secret_key.encode(), f"{user_id}:{purpose}:{code}".encode(), hashlib.sha256).hexdigest()


def issue_code(db: Session, user_id: str, purpose: str) -> str:
    """Replace any earlier code for this user and purpose; returns the new code to email."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.query(EmailCode).filter(EmailCode.user_id == user_id, EmailCode.purpose == purpose).delete(synchronize_session=False)
    db.add(EmailCode(
        user_id=user_id, purpose=purpose, code_hash=_hash(user_id, purpose, code),
        expires_at=datetime.now(timezone.utc) + TTL,
    ))
    db.commit()
    return code


def redeem_code(db: Session, user_id: str, purpose: str, code: str) -> bool:
    """True once for the right code; a wrong one uses up a try, and the fifth wrong one ends the code."""
    row = db.query(EmailCode).filter(EmailCode.user_id == user_id, EmailCode.purpose == purpose).first()
    if row is None:
        return False
    expires = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc) or row.attempts >= MAX_ATTEMPTS:
        db.delete(row)
        db.commit()
        return False
    if not hmac.compare_digest(row.code_hash, _hash(user_id, purpose, code.strip())):
        row.attempts += 1
        db.commit()
        return False
    db.delete(row)
    db.commit()
    return True
