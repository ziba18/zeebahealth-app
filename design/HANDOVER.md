# Zeeba Health — Engineering & Design Handover

**As of 9 Nov 2026.** Read this, then `design/BRAND.md` (visual system) and `CLAUDE.md` (project rules).
Branch with all current app work: **`design/native-midnight`** (not merged, not pushed as of writing).

---

## 1. Where things stand

| Area | State |
|---|---|
| Name | **Zeeba Health** (renamed from Zeeba Health, branch `zeeba-health`; identifiers `com.zeebahealth.app`, scheme `zeebahealth`) |
| Design | **Native (light) + Midnight (dark)** — owner-approved 9 Nov. Built in the real app. |
| UX pass | Welcome, sign-in, onboarding, glass tab bar, Evidence tab, back links — done 9 Nov |
| Checks | `npx tsc --noEmit` clean · `npx expo export --platform ios` OK · backend 186 tests pass |
| Device test | **Not yet on a real iPhone.** All checks were in the web design preview. |
| Live server | Render `zeebahealth-api` serves branch `mvp-symptom-capture` (commit `3237fa8`, Apple Expo Go option ON) |

### Branch map
```
mvp-symptom-capture   ← what Render deploys (backend). Has NOT got the rename yet.
└─ zeeba-health        ← Zeeba Health → Zeeba Health rename (2 commits). Live privacy page still says "Zeeba Health" until this ships.
   └─ design/burgundy-wren   ← REJECTED palette; kept only for history. Its iOS mechanics were carried forward.
      └─ design/native-midnight  ← CURRENT. All design + UX work. Merge this (after a device check).
```

---

## 2. Design decisions and why (so they aren't relitigated)

1. **Research first, always.** The 9 Nov "Burgundy & Bone" sprint was a self-picked palette; owner rated it 0/100.
   The fix was studying real App Store screens (Bevel, Gentler Streak — Apple Design Award 2024, Visible, Oura,
   How We Feel) and presenting three directions. Owner chose **A (Native) for light, B (Midnight) for dark, with B's
   dashboards and charts in both**. Directions board: claude.ai artifact "Zeeba Health Directions".
2. **What the best apps share** (and Zeeba now does): Apple's own type and layout; ONE bold accent; numbers as the hero;
   a mascot only for feelings; a serif for the human moment.
3. **Wren stays exactly as is** in both modes — the one thing the owner loved.
4. **Tabs: Today · Evidence · Doctor.** "Timeline" became **Evidence** and opens on an Overview dashboard
   (Notes and Calendar are segments). Every tab maps to a pillar: Today = Record, Evidence = Prove, Doctor = Reach.
5. **No cycle-length questions in onboarding.** The app is not a cycle predictor; those questions meant nothing to
   perimenopause or fatigue users. Replaced by "What would you like to keep a record of?".

---

## 3. Architecture of the design system (important for anyone editing UI)

**File: `constants/zeebaUI.ts`.**

- `palettes.light` / `palettes.dark` — raw hex.
- `colors.*` — every token is a **Light/Dark pair**:
  - iOS → `DynamicColorIOS` (static `StyleSheet`s switch automatically with the phone's appearance);
  - web → `var(--z-*)` CSS variables, injected in `app/_layout.tsx` via `webThemeCss()`;
  - Android → light only (known gap).
- **Rule:** anything that is not a normal style prop needs a plain hex → use `useColors()` (or `useColors().resolve(v)`):
  SVG `fill`/`stroke`, `expo-linear-gradient` colours, string alpha like `` `${c.canvas}E6` ``. Passing a dynamic
  colour to those breaks on iOS. `Icon` already resolves its `color` prop.
- Text on an accent fill = `colors.onAccent` (never `white` — peach needs dark text). Text on period colour = `colors.onClay`.
- Doctor document/PDF: `DOC_COLORS` + `severityColorLight` in `lib/records/summary.ts` — **plain light hex, always**.
- Fonts: spread `...font.semibold` (etc.) — never `fontFamily` alone (SF needs the weight). Variants in `type.*`.
- Dashboard pieces: `components/zeeba/dash/Dash.tsx` — `Tile`, `TileRow`, `Gauge`, `MiniBars`, `SectionHeader`.
- `app.config.ts`: `userInterfaceStyle: 'automatic'`; splash has a dark variant.

---

## 4. User journeys (current)

**New user:** Welcome (Wren, 3 feature rows, Apple / Google / email) → [email: Register] →
Onboarding 1 Name (only if no real name, e.g. Apple hid it) → 2 **Focus** ("What would you like to keep a record of?";
stored on device `zeeba.focus`, `lib/focus.ts`; puts her topics first on Today) → 3 Last period (skippable) →
4 Reminder (permission primed; "Not now" easy; sets `onboarding_complete`) → **You're set** (Wren proud;
"Write my first note" opens capture) → Today.

**Returning:** Welcome → "I already have an account" → Sign in (Apple/Google above email) → Today.

Routing after sign-in: `lib/authRouting.ts` (`routeAfterSignIn`). Onboarding step file `basics.tsx` now holds the Focus
step (route name kept to avoid breaking links); it still PATCHes default cycle/period values the server requires.

**Back links:** detail pages take a `from` label (`components/zeeba/timeline/navigation.ts`, whitelisted). Tab title
maps live in three places — keep them in sync: `MainTabBar.tsx` `TAB_BY_TITLE`, `kit-parts/layout.tsx` `TAB_TITLES`,
`profile/index.tsx` `TAB_ROUTES`. All 35 navigation links were audited against the route list on 9 Nov.

---

## 5. Sign-in facts (do not re-learn these the hard way)

| Provider | Installed app (TestFlight/App Store) | Expo Go |
|---|---|---|
| Email | works | works |
| Apple | native `AppleAuthenticationButton` | Apple-styled button → works **only because** server env `APPLE_ALLOW_EXPO_GO=true` accepts audience `host.exp.Exponent`. Creates separate test accounts (different Apple `sub`). |
| Google | `@react-native-google-signin` (native) | **Cannot work** (native module not in Expo Go). Button explains this. |

- Server code: `backend/app/services/social_auth.py` (`verify_apple_identity_token` accepts a list),
  `backend/app/config.py` (`apple_allow_expo_go`, default False), `routers/auth.py`.
- **Before App Store launch: delete `APPLE_ALLOW_EXPO_GO` on Render** (Dashboard → zeebahealth-api → Environment).
- Live `apple_bundle_id` is `com.zeebahealth.app` (rename deployed 9 Nov, `583b4e7`).

---

## 6. Deploy & test

- **App (Expo Go):** `git checkout design/native-midnight && npx expo start` → scan QR. Test Light and Dark
  (iOS Settings → Display & Brightness). Owner rule: check every page in Expo Go before any TestFlight build.
- **Web design preview (no login, sample patient Sam):** `npm run preview:web`. Never set its env var in EAS.
  Do not run with `CI=1` (disables reload). Headless renders: Chrome `--blink-settings=preferredColorScheme=0` for dark,
  `--force-prefers-reduced-motion` so FadeIn content shows.
- **Backend:** Render auto-deploys `mvp-symptom-capture`. Env vars only via the dashboard (Blueprint managed — never
  rename the service in `render.yaml`; it also serves Basket Buddy sign-in, never suspend it).
- **Never** open the iOS Simulator (owner rule). Don't add a `Co-Authored-By: Claude` trailer to commits.

---

## 6b. Rename completed (9 Nov 2026)
The app is Zeeba Health everywhere (owner: no trace of the old name). Done and verified:
server code + live privacy/terms pages (deploy `583b4e7`), Apple audience `com.zeebahealth.app`, repo text + file/folder
names, all URLs → `api.zeebahealth.com`, Render service renamed `zeebahealth-api` (+ `render.yaml`), GitHub description,
six old GitHub repos renamed (`zeeba-hq`, `zeeba-research`, `zeeba-data` — archived; `zeeba-womens-health-guide`,
`zeeba-privacy-legacy`, `zeeba-webapp-legacy`), local archive `~/projects/_archive-zeeba/`, website support link published,
stale local `ios/` deleted. GitHub redirects the old repo URLs.
Unavoidable: Render's internal `*.onrender.com` hostname is fixed at creation (nothing uses it; apps use
api.zeebahealth.com — check Basket Buddy before ever removing it) and git history keeps old commit messages.
Optional tidy-ups: delete the unused Render Environment Group and the old EAS project on expo.dev.

## 7. Open items, in priority order

1. **Device check in Expo Go** (both appearances): native Apple button, blur, haptics, New York/SF Rounded rendering.
2. **For my doctor** has the new colours/type but not the full redesign (bright paper preview on top, "What I was told
   before" card from her history). Concepts are in the directions board.
3. ~~Ship the rename to the server~~ — done 9 Nov (`583b4e7`). Remaining old-name items: §6b.
4. GitHub repo stays **public** (owner, 9 Nov); description updated to Zeeba Health.
8. App Store Connect: record created (Apple ID 6832575398) — remaining steps in `store/APP_STORE.md`. Not submitted.
5. App icon: concepts A/B/C (Wren on bone / bone Wren on burgundy / monogram) — owner to choose.
6. Android dark mode (currently light only).
7. Remove `APPLE_ALLOW_EXPO_GO` before launch (see §5).
