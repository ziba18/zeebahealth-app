"""Sign-in emails, sent through Resend (https://resend.com/docs/api-reference/emails/send-email).

Only two messages exist: a code to confirm an email address and a code to reset a password. The
email carries the code and nothing about the person's health. Without RESEND_API_KEY nothing is sent.
"""
import logging

import httpx

from app.config import settings

log = logging.getLogger(__name__)

_SUBJECT = {"verify": "Your Zeeba Health code", "reset": "Reset your Zeeba Health password"}
_LEAD = {
    "verify": "Enter this code in the app to confirm your email address:",
    "reset": "Enter this code in the app to choose a new password:",
}


def mail_enabled() -> bool:
    return bool(settings.resend_api_key)


def send_code(to: str, purpose: str, code: str) -> None:
    """Best effort: a failed send is logged (never the address or the code) and the person asks again."""
    if not mail_enabled():
        return
    text = (
        f"{_LEAD[purpose]}\n\n    {code}\n\n"
        "It works for 15 minutes. If you didn't ask for this, you can ignore this email; "
        "nobody can get into your account without the code.\n\nZeeba Health"
    )
    try:
        res = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.mail_from, "to": [to], "subject": _SUBJECT[purpose], "text": text},
            timeout=10,
        )
        if res.status_code >= 300:
            log.warning("mail: provider answered %s for a %s code", res.status_code, purpose)
    except httpx.HTTPError:
        log.warning("mail: could not reach the provider for a %s code", purpose)
