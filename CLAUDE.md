# Zeeba Health — Claude Code Project Notes

## NAME: the app is now **Zeeba Health** (owner, 2026-11-08)
Atossa was renamed Zeeba Health ("Zeeba" only as a casual short form in copy; never "Atossa" in anything a user sees).
Repo is now private `ziba18/zeebahealth-app`, folder `~/projects/zeebahealth-app`. Older notes below still say Atossa; read them as Zeeba Health.
Identifiers (2026-11-08, new App Store listing): bundle id / Android package `com.zeebahealth.app`, Expo slug + URL scheme
`zeebahealth`, new EAS project `@zamaniziba18/zeebahealth` (id 69e41ccd-094f-4227-a786-3a2ade8834da; the old `attosa`
project and App Store app 6762570606 belong to Atossa), on-device keys `zeeba.*` / `zeeba_*`. Backend: Render service
`atossa-backend` (URL atossa-backend.onrender.com, target custom domain api.zeebahealth.com); it also serves Basket Buddy
sign-in, so never suspend it, and don't rename it in render.yaml (Blueprint would create a new service).
Folders: `components/zeeba/` (was components/atossa), `constants/zeebaUI.ts` (was atossaUI.ts).

## RED LINE: Claude usage (owner, 2026-11-02)
The agents used the owner's whole weekly limit by 1 Nov, three days before the reset, and the owner needs Claude every day.
That must never happen again. All 13 cloud routines (9 agents, watchdog, usage guard, both health checks) are disabled until
at least Thursday 5 Nov 2026. Never re-enable, fire or create a routine unless the owner says so in that conversation, and
any restart must keep a clear share of the limit for the owner. This overrides the agent schedules below.

## The app's soul (owner, 2026-10-28 — read first, applies to everything)
> There is a lot of dismissal of women's problems in healthcare, and that's why I'm building this app. The specific
> angle is advocacy, data proof, and empowering women to have their voices heard by medical professionals. Women
> frequently face medical gaslighting, where their symptoms are dismissed as "just stressed" or "hormonal". Giving
> them hard data, undeniable trend dashboards, and exportable medical proof is a powerful way to arm them. The app
> isn't just a diary, it's a data-driven medical advocate that prints out PDF reports for clinical appointments. It
> counters medical gaslighting by arming women with concrete charts, exportable logs, and numbers. The name of the
> app needs to sound completely indisputable, objective, and authoritative to contrast the "it's all in your head"
> brush-off.

Use this to judge design, copy, the privacy policy and the rename (a new name is being chosen: Atossa ≈ "a tosser" in UK
English, and the owner proposed HerData). The no-diagnosis rule below still holds: the app proves what she recorded,
never a condition ("evidence, not verdict"). The agents' copy is `agents/MISSION.md` in ziba18/atossa-hq.

## Fixed purpose (owner, 2026-11-04 — App Store 2.3 means it must not change after relaunch)
Helps women turn **any dismissed women's health symptom** (pelvic pain, heavy periods, perimenopause, fatigue and more,
not only PCOS/endo) into clear, dated evidence, and get it in front of a doctor who takes it seriously. Three pillars,
all in v1 and the store listing: **Record · Prove (charts + PDF) · Reach (share with clinician, find a specialist)**.
Never a diagnosis tool, a doctor, or a cycle/fertility predictor. Open, being researched: who pays, first market.
Full text: `agents/OWNER.md` (2026-11-04) in ziba18/atossa-hq.

## Current work: MVP pivot (branch `mvp-symptom-capture`)

**Redesign built locally (2026-10-01/02, uncommitted):** "Warm Paper, Deep Ink" —
tabs Today · Timeline · For my doctor (+ Profile/Records via avatar), new kit
(`design/KIT.md` is the reference — read it before touching UI), design-preview web
mode `npm run preview:web` (Sam seed, no login; never set its env var in EAS).
Plan/status: `design/PORT_PLAN.md`; WORKLOG 2026-10-01/02. Final agent review 9/10.
Decided 2026-10-26: Friends shares only the cycle phase (opt-in per friend, "What I share" view, API-enforced), app icon
concept A, wordmark approved, plum store frames, name stays Atossa. Still open: Expo Go device check before any TestFlight build.

**SDK 58 (2026-10-24, uncommitted):** Expo Go moved to SDK 58, so the project is now
expo 58 / RN 0.88 — see WORKLOG 2026-10-24.

**SDK 57 (2026-09-25, uncommitted):** upgraded from Expo SDK 54 / RN 0.81
to SDK 57 / RN 0.86 so the app runs in the App Store Expo Go (SDK 57 only).
Test with plain `npx expo start` + QR scan. `expo-dev-client` removed.
Build 22 (SDK 54) crashes on launch on iOS 26 — see WORKLOG 2026-09-25.
User said: **no TestFlight pushes** until every page is checked in Expo Go.

Atossa is pivoting from a cycle-tracking app to a symptom-capture tool for
PCOS/endometriosis patients: turning how someone describes symptoms into a
structured, GP-ready summary. No diagnostic language anywhere in the UI —
never names a condition, gives a probability, suggests a cause, or
recommends treatment. `MVP.md` has the three-feature roadmap (status +
acceptance criteria per feature); `WORKLOG.md` is the dated, detailed log
of every decision, what was verified, and why — treat WORKLOG.md as the
source of truth for specifics, this file is just the orientation summary.

**Cleanup (2026-09-24, later):** all cycle *prediction* code is gone
(app, server, `training/`, TFLite stubs), as are `/captures`, the old
`/cycles/symptoms*` endpoints, the old hidden screens and ~23 unused npm
packages. `/chat` is deliberately kept deployed but unused. See the top
WORKLOG entry.

**One design system (2026-09-24, latest):** every screen now uses
`components/atossa/kit.tsx` + `constants/atossaUI.ts`; the old theme
(`constants/colors|theme|typography`, ThemeContext, dark mode, Fraunces)
is gone. Onboarding is name → basics → last-period → reminders, with the
MVP-breaking promises removed. See WORKLOG.

**Redesign (2026-09-24):** the app now has three tabs — Chat, Dashboard,
For my doctor — ported from a Lovable prototype; new generic `/records`
backend store. See the top WORKLOG entry. Not yet run on a device or
simulator before the TestFlight build. The Chat tab no longer uses the
`/chat` LLM (it is a fixed four-question flow).

**Status as of 2026-09-24 (before the redesign):** everything was committed and pushed —
`mvp-symptom-capture` (`d0ff597`) matches GitHub, and Render serves this
branch. Steps A–C of Feature 1's capture layer are live-verified; Step D
(voice) is code-complete but not live-verified (blocked on disk space,
see below). The chat tab now has a real `/chat` backend (see below).

### Done
- Branch + `MVP.md` + `WORKLOG.md`
- Backend: `/captures` endpoints (`POST`, `GET ?limit=10`),
  `symptom_captures` table + Alembic migration — verified live via curl
  (create, validation rejects, list ordering, auth enforcement)
- (Historical — `capture.tsx` has since been deleted.) Frontend: `app/(tabs)/chat/capture.tsx` — text-capture path verified
  live in Expo Go in the simulator (register → onboarding → save →
  persisted across remount). Voice-capture path (`lib/transcription.ts`,
  `expo-speech-recognition`) is written with full failure-mode handling
  but **not yet run** — needs a dev-client build, not Expo Go, since
  it's a native module Expo Go doesn't include.
- Out-of-roadmap additions (details in WORKLOG.md / MVP.md): Period Log
  page, and invite-only Friends cycle-phase matching (`/connections`).
- **Chat (`POST /chat`, 2026-09-24):** auth-required proxy to an
  OpenAI-compatible LLM — Groq free tier, `openai/gpt-oss-20b`,
  `reasoning_effort=low` (without it the model returns *empty* replies;
  the old default `llama-3.1-8b-instant` was retired). System prompt in
  `backend/app/services/llm.py` enforces the no-diagnosis rule **at prompt
  level only** — no server-side filter yet. Chat text therefore leaves our
  backend for Groq (a deliberate tradeoff against the earlier
  privacy-first plan; the base URL is swappable to a self-hosted model).
  `chat/index.tsx` `send()` calls it; the fake `AI_RESPONSE` is gone.
  Verified live on Render; **not** yet verified inside a TestFlight build.
- **Cold-start fix (2026-09-24):** Render's free tier sleeps after ~15 min
  idle, which made login slow. Added `GET /warmup` (wakes the process +
  opens a DB connection), `pool_pre_ping`/`pool_recycle` on the engine,
  `warmBackend()` in `lib/api.ts` called from `app/(auth)/_layout.tsx`
  on mount and on app foreground, and a GitHub Action
  (`.github/workflows/keep-backend-warm.yml`, **on `main` only** — GitHub
  runs schedules from the default branch) that pings `/warmup` every
  10 min.
- TestFlight: build 19 (v1.1.0) queued with `--auto-submit` on
  2026-09-24 — check `eas build:list` / App Store Connect for the outcome.
  **Build 20 (the redesign, commit `89ad606`) was queued the same day**
  (build `a9057a19-c91a-40cb-892a-53ceb02ceaeb`, submission scheduled) —
  check its outcome the same way.
- A temporary entry point (clipboard icon next to the profile avatar in
  the chat header) routes to the capture screen for testing. Step E
  replaces this with the real integration.

### Not done yet
- **Step D live verification** — blocked on disk space (see below).
  Once there's room, retry with a **direct `xcodebuild` call**, not
  `npx expo run:ios` — that's broken on this Mac (Expo CLI's devicectl
  JSON parsing doesn't match this Xcode version, 26.4.1, and
  misclassifies the simulator as a physical device, demanding code
  signing that will never be there). Working command:
  ```
  xcrun simctl boot "iPhone 17 Pro"   # or whatever's available
  xcrun simctl list devices booted    # get the UDID
  cd ios && xcodebuild -workspace Atossa.xcworkspace -scheme Atossa \
    -configuration Debug -sdk iphonesimulator -derivedDataPath build \
    -destination 'platform=iOS Simulator,id=<UDID>' build
  ```
  Then `xcrun simctl install booted ios/build/Build/Products/Debug-iphonesimulator/Atossa.app`
  and launch it, with Metro running (`npx expo start`) alongside.
  **Delete `ios/build` after** — it's ~3GB of derived data and this
  Mac has very little headroom.
- **Step E** (partly done): the fake `AI_RESPONSE` / analysing animation
  is already stripped and `send()` is wired to `/chat`. Still to do: wire
  real voice/text entry points in `app/(tabs)/chat/index.tsx` into the
  capture screen, replacing the temporary header clipboard icon; consider
  a server-side check on chat replies (swap in a safe fallback if one
  names a condition).
- `main` has only the keep-warm workflow; the MVP branch has all app work.
  Merge into `main` when the MVP is ready.
- Features 2 (Missing Piece Questions) and 3 (Next Step Tracker) are
  explicitly out of scope until Feature 1 is fully done — don't start
  them early.

### Local dev environment facts
- Backend: `cd backend && source .venv/bin/activate && uvicorn app.main:app --port 8000`.
  Postgres is hosted on a Supabase project (ref `xdczqwbetzpmneazszcu`,
  org "ziba18's Org") used purely as free DB hosting — the app itself
  never talks to Supabase directly, only to this FastAPI backend.
- `.env` (root) and `backend/.env` are gitignored and already populated
  from a prior session — don't need to be recreated. `backend/.env` also
  has `LLM_API_KEY` (Groq). Never print or commit it.
- **Deploy:** Render service `atossa-backend`
  (`https://atossa-backend.onrender.com`, id `srv-dap3bj6gekts73fkupn0`)
  auto-deploys the `mvp-symptom-capture` branch; blueprint in
  `render.yaml`. `LLM_API_KEY` must be set as a variable **on the service**
  — a Render Environment Group only counts if it's *linked* to the service
  (the `atossa` group isn't; it's unused). The app's TestFlight build uses
  `EXPO_PUBLIC_API_URL` from the EAS `production` env.
- Build/submit: `eas build --platform ios --profile production
  --auto-submit` (the App Store Connect API key is already on EAS).
  **EAS builds are limited on the free plan (~15 iOS/month)** — for
  JS-only changes use `eas update --channel production --environment production --message "..."`
  (`--environment` is required since SDK 55)
  instead (expo-updates added 2026-09-24, `runtimeVersion` = fingerprint,
  channels = profile names). Only builds made after that commit receive
  updates; build 22 and earlier do not.
- **Disk space is tight on this Mac** — check `df -h /` before any
  native build. Clean up `ios/build` and `android/` derived-data
  directories after testing; don't leave them lying around.
- Test accounts created during dev/testing are cleaned up after each
  session (see WORKLOG.md for the SQL/Python cleanup pattern used).



### Agent team — 7 cloud routines (2026-10-19)
The app was pulled from the App Store; the owner wants a full team working around the clock.
Seven routines run in Anthropic's cloud (laptop can be off). **Back to back (owner, 2026-10-26):** all six
workers fire every hour 23:00–07:00 UTC (= UK time in winter) and in 2-hour day blocks 07–09, 11–13, 15–17, 19–21
(cron `0 0-8,11,12,15,16,19,20,23 * * *`), each a 45-minute session held open by `agents/bin/clock.sh`
(a session ends as soon as the model replies without a tool call; before this, runs lasted 1–5 min). Each agent keeps a
≥25-task `BACKLOG.md`; the PM runs at :40 in the same hours, adds ≥5 tasks per agent each run, and writes reports at
06:40/08:40/12:40/16:40/20:40 (5 a day since 2026-10-26). **Owner goal (2026-10-26, Claude Max plan): first paying customers by 2026-11-26** — see OWNER.md. 8th agent Research writer `trig_01Nsj99CZsS93yJFSkG59yqF` works on the dissertation in private repo `ziba18/atossa-research`. All Sonnet 5.5. Usage guard `trig_01VtWrXkGHcRSGaiEv1rU2nj` (07:50/15:50) pauses all 7 if a run hits a
plan limit. RULE 0 in RULES.md: no payments or free trials, ever.
Their shared office is the **private repo `ziba18/atossa-hq`**, branch **`claude/agents-hq`**
(moved there 2026-10-20 because this app repo is public; local clone `~/projects/atossa-hq`): `agents/README.md`, `RULES.md`, `CONTEXT.md`, `OWNER.md` (owner approvals/answers —
the only way to authorise outward actions), `bin/push.sh`, and one folder per agent with
`CHARTER.md` (edit to change the job), `STATE.md`, `log/`. Daily reports by the PM:
`agents/reports/YYYY-MM-DD-{morning,evening}.md` (06:40 and 19:40 UTC) + a Google Doc in Drive folder
"Atossa Agents". Code changes only on `claude/<agent>-*` branches **in this (public) repo** for review — agents never push to
`main`/`mvp-symptom-capture`, never deploy, never post/message/spend. Routine IDs: Data
`trig_01VSCYE3DLGUf9bHJ3vMMtFe`, AI Brain `trig_011hE271Ypq4Y3vBBXHykv8c`, Safety
`trig_014WdTMMf85x26Q9wZUDQJ1t`, Finance `trig_013YCD2yE9RfHBxNBXntpNos`, Marketing
`trig_019DKEPVZSKVNwEqFtU8Q7CB`, Design `trig_01MoabdY1SRHc6Tj1eC1RG2d`, PM
`trig_01Ju1pFcLkez7B5u4rUWe5wY`. Usage: check claude.ai/settings/usage; "usage credits" auto-spend is
OFF — keep it off. Default env network access = **Full** (2026-10-19). Video = Kling **web free
credits only** (API is paid); voice = ElevenLabs free plan. Manage at https://claude.ai/code/routines. See WORKLOG 2026-10-19.

### Daily cloud health check (2026-10-16)
Routine "Atossa daily health check (5am)" (`trig_01SdCbNC4eBveA7ZgyXLBPxD`,
https://claude.ai/code/routines/trig_01SdCbNC4eBveA7ZgyXLBPxD) runs every day at 05:00 **UTC** in
Anthropic's cloud (independent of the laptop): read-only typecheck + iOS bundle + backend import
check on `mvp-symptom-capture`, wakes Render (`/warmup`, `/docs`, `/basket-buddy/auth/apple`) and
runs `select 1` on Supabase via the MCP connector. Read its reports in the run history at
claude.ai/code/routines. Commands are listed in WORKLOG 2026-10-16. Basket Buddy has its own routine. Both
share the Render backend, which also serves `/basket-buddy/auth/{apple,google}` (see
`backend/app/routers/basket_buddy.py`).

## Reference stack: "$30K/month app" video (saved 2026-10-15)
From https://www.youtube.com/watch?v=P4QodeA_lQ0 (Starter Story, Benji Chen). Cursor IDE +
Claude Code (Max) for code; Figma designs first, then fed to Claude Code; Supabase backend;
**Superwall** (paywall A/B tests), **Mixpanel** (onboarding funnel analytics), **Loops**
(win-back emails to churned users); GoDaddy domain; Apple Developer account. Growth: UGC
creators -> TikTok -> Meta paid ads. Atossa already uses Claude Code and Supabase (Postgres
behind FastAPI, kept deliberately). Superwall/Mixpanel/Loops are not yet adopted — each needs
a user-created account/key, and analytics on health data needs App Store privacy-label changes.

### Separate, paused thread (unrelated to the MVP work)
Transferring the app's App Store Connect listing from the coworker's
Apple Developer account to the user's own — paused, user needs to enroll
in the Apple Developer Program (Individual is sufficient, confirmed via
Apple's docs — no Organization/D-U-N-S needed) before this can continue.
