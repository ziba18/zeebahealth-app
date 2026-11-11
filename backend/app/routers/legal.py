"""Public privacy policy and terms pages.

Served as plain HTML so there is one public URL for each (the App Store listing needs a
privacy policy URL, and the app links here). Keep them true to what the app actually does:
update this file whenever the app starts collecting or sharing something new.
"""
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.config import settings

router = APIRouter(tags=["legal"])

EFFECTIVE_DATE = "11 November 2026"

# Colours from the app's "Warm Paper, Deep Ink" palette (constants/zeebaUI.ts).
_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · Zeeba Health</title>
<style>
  body {{ margin: 0; background: #F7F3EE; color: #1F1B18;
         font: 17px/1.55 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; }}
  main {{ max-width: 680px; margin: 0 auto; padding: 32px 16px 64px; }}
  .brand {{ color: #5A534D; font-weight: 600; }}
  h1 {{ font-family: Georgia, "Times New Roman", serif; font-weight: 400; font-size: 34px;
        line-height: 1.2; margin: 24px 0 4px; }}
  h2 {{ font-size: 19px; margin: 32px 0 8px; }}
  .meta {{ color: #5A534D; font-size: 15px; margin: 0 0 24px; }}
  li {{ margin: 6px 0; }}
  a {{ color: #1F1B18; }}
  hr {{ border: 0; border-top: 1px solid #E2DAD0; margin: 40px 0 16px; }}
</style>
</head>
<body><main>
<div class="brand">Zeeba Health</div>
<h1>{title}</h1>
<p class="meta">Effective {date}</p>
{body}
<hr>
<p class="meta">Questions? Email <a href="mailto:{email}">{email}</a>.</p>
</main></body>
</html>"""

_PRIVACY = """
<p>Zeeba Health helps you put your symptoms into words and bring a clear summary to your doctor.
What you record is sensitive health information, so this page explains plainly what we
store, why, who else handles it, and how to delete it.</p>

<h2>Who is responsible</h2>
<p>{controller} is the data controller: the one responsible for your information under UK data
protection law. You can reach us at <a href="mailto:{email}">{email}</a>.</p>

<h2>What we store</h2>
<ul>
  <li><strong>Your account:</strong> your email address and name. If you sign up with an
  email and password, we store your password only in hashed form, never as plain text. If you
  use Sign in with Apple or Google, we receive your email address (and your name, if you share
  it) from them; we never see your Apple or Google password.</li>
  <li><strong>What you record in the app:</strong> symptoms in your own words, period days,
  appointments, medicines, health history and notes for your doctor.</li>
  <li><strong>Your settings:</strong> your usual cycle and period length, when your last period
  started, time zone, and reminder preferences.</li>
  <li><strong>Your consent:</strong> the date and time you agreed to us storing your health
  information, and which wording you saw.</li>
</ul>

<h2>Why we are allowed to</h2>
<ul>
  <li><strong>Your health information</strong> (symptoms, period days, medicines, health history
  and notes) is stored only with your <strong>explicit consent</strong>, which the app asks for
  before you record anything (UK GDPR Article 6(1)(a) and Article 9(2)(a)). You can withdraw it at
  any time by deleting your account, which deletes the information too.</li>
  <li><strong>Your account details and settings</strong> are used because we need them to provide
  the app you signed up for (Article 6(1)(b)).</li>
  <li><strong>Keeping the service secure</strong>, such as limiting repeated sign-in attempts, is
  in our legitimate interests and yours (Article 6(1)(f)).</li>
</ul>

<h2>How we use it</h2>
<ul>
  <li>To run the app for you: keeping you signed in, saving what you record, and building your
  summary for your doctor.</li>
  <li>To email you a code when you confirm your address or reset your password. These are the
  only emails the app sends.</li>
  <li>Reminders are scheduled on your phone; we don't send them from our servers.</li>
  <li>If you use voice input, your speech is turned into text on your phone by Apple's speech
  recognition. We don't receive audio recordings.</li>
</ul>
<p>We don't sell your information, show you ads, or use it for advertising. We don't track
you across other apps or websites. Nothing in the app makes decisions about you automatically,
and it never tells you what condition you might have.</p>

<h2>Who can see it</h2>
<ul>
  <li><strong>You.</strong> Your records are private to your account.</li>
  <li><strong>Your doctor</strong>, only if you choose to show or share your summary yourself.</li>
  <li><strong>Our service providers</strong>, which store and run things for us and may not use
  your information for anything else: Render (runs our server, in the United States), Supabase
  (hosts our database, in the European Union, Ireland), Resend (sends the sign-in code emails,
  in the United States; it receives your email address and the code, nothing else), Apple and
  Google (only if you sign in with them), Groq (if you use the chat on Today, your messages are sent to Groq's AI model to
  write a reply; attached photos and files stay on your phone), Mixpanel (product analytics:
  which setup steps you finish, with a random app ID, your device type and app version, never
  your name, email, symptoms or notes), and Expo (delivers app updates, and receives standard technical details such as
  your device type and IP address when the app checks for an update).</li>
</ul>
<p>Some of these providers are outside the UK. Where they are, the information is covered by
the safeguards UK law requires for international transfers (an adequacy decision, or standard
contractual clauses with the UK addendum).</p>
<p>We will disclose information if the law requires us to.</p>

<h2>How it is protected</h2>
<p>Information travels between the app and our server over encrypted connections (HTTPS).
Your sign-in is kept in your phone's secure storage. Only the account that created a record
can read it through the app. You can also lock the app with Face ID, Touch ID or your
passcode (Profile &rarr; App lock).</p>

<h2>Keeping and deleting your information</h2>
<p>We keep your information for as long as you have an account. You can delete your account
at any time in the app: <strong>Profile &rarr; Delete account</strong>. That permanently
deletes your account and everything you've saved, straight away. Copies can remain in our
providers' backups for a short time before they are overwritten.</p>

<h2>Your rights</h2>
<p>Under UK data protection law you can ask us for a copy of your information, ask us to
correct it, delete it, or limit how we use it, receive it in a form you can take elsewhere,
and withdraw your consent at any time. Email us and we will answer within one month. If you
are unhappy with how we have handled your information, you can complain to the Information
Commissioner's Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>.</p>

<h2>Children</h2>
<p>Zeeba Health is not meant for children under 16, and we don't knowingly collect their
information. The app asks you to confirm you are 16 or over before you record anything.</p>

<h2>Changes</h2>
<p>If we change what we collect or how we use it, we'll update this page and its date, and
tell you in the app before the change affects you.</p>
"""

_TERMS = """
<p>These terms apply when you use the Zeeba Health app. By creating an account, you agree to them.</p>

<h2>What Zeeba Health is, and isn't</h2>
<p>Zeeba Health helps you record your symptoms in your own words and prepare a summary to take to
a doctor. <strong>It is not a medical service.</strong> It doesn't diagnose conditions, give
medical advice, or recommend treatment, and it doesn't replace a doctor. If you are worried
about your health, talk to a doctor. In an emergency, call your local emergency number.</p>

<h2>Your account</h2>
<ul>
  <li>Give a real email address you can use, and keep your password to yourself.</li>
  <li>You're responsible for what happens under your account.</li>
  <li>You can delete your account at any time in the app (Profile &rarr; Delete account).</li>
</ul>

<h2>Your information</h2>
<p>What you record belongs to you. You let us store and process it only to run the app for
you, as described in our <a href="/privacy">privacy policy</a>.</p>

<h2>Using Zeeba Health fairly</h2>
<p>Don't use Zeeba Health to harm others, to invite people who don't want to be contacted, to try
to get into other people's accounts, or to disrupt the service.</p>

<h2>The service</h2>
<p>Zeeba Health is provided as it is, while we keep improving it. We do our best to keep it running
and your information safe, but we can't promise it will always be available or free of
errors, so please keep your own note of anything important. We may change or stop parts of
the app; if we ever shut it down, we'll give you notice so you can save what you need. We may
suspend accounts that break these terms.</p>

<h2>Limits</h2>
<p>As far as the law allows, we aren't liable for indirect losses, or for decisions made
based on what's recorded in the app. Nothing in these terms limits rights you have under
consumer law, and nothing excludes liability for death or personal injury caused by our
negligence, or for fraud.</p>

<h2>Changes</h2>
<p>If we change these terms, we'll update this page and its date, and tell you in the app
before a significant change takes effect.</p>
"""


def _render(title: str, body: str) -> HTMLResponse:
    body = body.replace("{controller}", settings.legal_controller).replace("{email}", settings.support_email)
    return HTMLResponse(_PAGE.format(title=title, body=body, date=EFFECTIVE_DATE, email=settings.support_email))


@router.get("/privacy", response_class=HTMLResponse, include_in_schema=False)
def privacy_policy():
    return _render("Privacy policy", _PRIVACY)


@router.get("/terms", response_class=HTMLResponse, include_in_schema=False)
def terms_of_service():
    return _render("Terms of use", _TERMS)
