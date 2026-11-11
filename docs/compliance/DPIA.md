# Zeeba Health — Data Protection Impact Assessment (draft)

**Status: DRAFT, not signed.** Written 11 November 2026 from the code on branch `design/native-midnight`.
The owner must read it, correct anything that is wrong, fill the gaps marked **OWNER**, and sign and date it
before launch. Review it again whenever a row in section 3 changes (new provider, new kind of data, a feature
switched back on). It is not legal advice; a UK data protection solicitor should read it once before launch.

A DPIA is required here because the app stores health information (special category data) at scale-able size
(ICO: do one "before beginning any type of processing that's likely to be high risk").

## 1. Who is responsible

| | |
|---|---|
| Controller (legal name) | **OWNER: legal name of the person or company responsible.** Set it on the server as `LEGAL_CONTROLLER`; the privacy page prints it. |
| Contact for data requests | **OWNER: support mailbox.** Server `SUPPORT_EMAIL`, app `EXPO_PUBLIC_SUPPORT_EMAIL`. Today both fall back to a personal Gmail. |
| ICO registration (data protection fee) | **OWNER: registration number and renewal date.** Must be paid before launch. |
| App Store seller | The App Store record is on the coworker's team (see `store/APP_STORE.md`). The seller name shown to users must match, or be explained by, the controller above. |

## 2. What the app does and why

Women record symptoms (in their own words, with strength 0–10 and body area), period days, medicines, health
history, appointments and notes for a doctor. The app shows these back as charts and a dated summary she can
print or share as a PDF herself. It never diagnoses, scores risk or suggests treatment.

Purpose: let her keep and present an accurate record. No other use: no advertising, no sale, no research use,
no profiling, no automated decisions.

## 3. Record of processing

| Data | Whose | Where it lives | Why | Lawful basis | Kept until |
|---|---|---|---|---|---|
| Email, name, password hash (bcrypt), sign-in flags | User | Supabase Postgres, EU (Ireland) | Account | Contract, Art. 6(1)(b) | Account deleted |
| Health records (symptoms, period days, medicines, history, appointments, doctor note) | User | Supabase Postgres, EU (Ireland), table `health_records` | The service she asked for | Explicit consent, Art. 6(1)(a) + 9(2)(a) | Account deleted |
| Consent record (time, wording version) | User | Same database, `users` | Proof of consent | Legal obligation / legitimate interests | Account deleted |
| Settings (cycle length, reminder time, time zone, date of birth if given) | User | Same database, `profiles` | Run the app | Contract | Account deleted |
| Email codes (hash only, 15 minutes) | User | Same database, `email_codes` | Confirm address, reset password | Contract / security | Used, expired, or account deleted |
| Sign-in attempts per email and IP (counts) | User | Server memory only | Stop password guessing | Legitimate interests, Art. 6(1)(f) | 15 minutes; lost on restart |
| Sign-in tokens | User | Phone keychain (this device only) | Stay signed in | Contract | Sign-out |
| Chat messages (**feature off at launch**) | User | Phone only; text sent to Groq (US) for a reply | Help wording symptoms | Explicit consent (needs its own consent line before it is switched on) | Sign-out / deleted on phone |
| Onboarding step analytics (**off at launch; nothing asks for the opt-in**) | User | Mixpanel | Improve onboarding | Consent (PECR) | — |
| Paid plan (**not switched on**): plan name, expiry, product id, event type and time | User | Same database, `entitlements`, `purchase_events`; RevenueCat and Apple hold the purchase itself | Give access to what was bought | Contract | Account deleted |
| Waitlist and research answers (website, separate from the app) | Visitor | Same Supabase project, own tables | Launch updates; anonymous research | Consent | **OWNER: set a period** |

Processors: Supabase (database, EU), Render (server, **US**), Resend (code emails, US), Apple / Google (sign-in),
Expo (app updates). Groq and Mixpanel only if those features are switched on.

**OWNER, before launch:** accept each processor's data processing agreement (Supabase, Render, Resend) and keep a
copy. Render and Resend are in the US, so the agreement must include the UK transfer terms (UK addendum to the
standard contractual clauses, or the UK–US data bridge if the provider is certified). The privacy page says these
safeguards exist; that sentence is only true once the agreements are accepted.

## 4. Is it necessary and proportionate?

- Only what she types is collected. No location, contacts, advertising ID, health-kit data or device fingerprint.
- Voice notes are turned into text on the phone; audio never leaves it.
- Photos attached in chat stay on the phone.
- Date of birth is optional.
- She can export everything (`GET /me/export`) and delete everything (Profile → Delete account), immediately.
- Under 16s: the consent screen asks her to confirm she is 16 or over. There is no age check beyond that.

## 5. Risks and what is in place

| # | Risk to the person | Likelihood / severity | In place | Left over |
|---|---|---|---|---|
| 1 | Someone else reads her records through the API | Low / severe | Every query is filtered by the signed-in account; tests cover it. Tokens expire (1 h access, 30 d refresh) and are cancelled on password change, reset, or "sign out everywhere". | Low |
| 2 | Account taken over through an unconfirmed email | Low / severe | Password accounts confirm the address by emailed code once email is set up; the first Apple/Google sign-in removes an unconfirmed password; reset codes are hashed, 15 minutes, five tries. | Low once `RESEND_API_KEY` is set. **Until then password accounts are unconfirmed.** |
| 3 | Password guessing | Medium / severe | bcrypt, common-password blocklist, 8 wrong tries locks the email for 15 minutes, per-IP limits. | Limits live in one server's memory: fine for one server, must move to a shared store before a second server is added. |
| 4 | Database reached directly, bypassing the API | Low / severe | Supabase's public API roles have row level security on with no policies **and** no table privileges; the database password is only on the server. Encrypted in transit (TLS) and at rest (provider disk encryption). | Records are not encrypted with a key the provider cannot see. Consider field-level encryption later. |
| 5 | Someone picks up her unlocked phone | Medium / high | Optional app lock (Face ID / Touch ID / passcode); a plain cover hides the app in the app switcher; chats and the last PDF are removed at sign-out. | App lock is off by default. |
| 6 | A provider is breached or misuses data | Low / severe | Few providers; health records only at Supabase (EU) and passing through Render. | Agreements not yet accepted (section 3). |
| 7 | Health information sent to an AI provider | — | Chat is off in launch builds (`EXPO_PUBLIC_CHAT_ENABLED` unset). | Before switching on: Groq agreement with zero retention, a separate consent line, App Store privacy label update. |
| 8 | Sharing with friends exposes period dates | — | Friends is off in the app and on the server. | Do not switch on until invites need a confirmed email. |
| 9 | She believes the app gave medical advice | Low / high | No diagnosis anywhere; urgent-symptom wording points to 999/111; terms and consent screen say it is not a medical service. | Keep marketing claims inside this line (MHRA: a symptom diary is not a device; interpretation can make it one). |
| 10 | Records lost | Low / medium | Provider backups. | **OWNER: confirm the Supabase plan's backup retention**; the free plan's is limited. |
| 11 | The service is unavailable when she needs her record | Medium / low | Offline outbox for notes; she can export a PDF in advance. | Render's free plan sleeps when idle. |

## 6. If something goes wrong

A personal data breach that is likely to risk people's rights must be reported to the ICO within 72 hours of
becoming aware of it, and to the people affected if the risk is high. **OWNER: decide who watches the support
mailbox and Render/Supabase alerts, and write the steps down here** (who decides, where the logs are, how to
force everyone to sign in again: bump `token_version` for all users; how to rotate `SECRET_KEY` and the database
password).

## 7. Sign-off

| | Name | Date |
|---|---|---|
| Prepared by | Claude Code (draft from the codebase) | 2026-11-11 |
| Reviewed and accepted by controller | **OWNER** | |
| Next review | Before any row in section 3 changes, or 12 months | |
