# Zeeba Health — Brand & Design System

**Version 2 · 9 Nov 2026 · owner-approved.** Supersedes "Warm Paper, Deep Ink" (Sept) and "Burgundy & Bone"
(rejected 9 Nov, rated 0/100). Source of truth for values: `constants/zeebaUI.ts`. Engineering handover: `design/HANDOVER.md`.

## 1. Positioning
**"Your symptoms, on the record."** Zeeba Health turns any dismissed women's-health symptom into dated, readable
evidence and gets it in front of a doctor. Three pillars, in every surface: **Record · Prove · Reach**.
Evidence, never a verdict: the app never names a condition, gives a probability, suggests a cause or advises treatment.

Voice: authoritative, plain, warm, UK English. Never cute, never alarmist, never "period-app pink".

## 2. Direction: Native by day, Midnight by night
One system, two appearances, chosen automatically by the iPhone's Light/Dark setting.

| | Light — **Native** | Dark — **Midnight** |
|---|---|---|
| Reference apps | Apple Health, Bevel | Oura, Visible |
| Canvas / surface | `#F2F2F7` / `#FFFFFF` | `#0A0C16` / `#141829` (tiles `#1C2136`) |
| Ink / secondary | `#000000` / `#6C6C72` | `#F4F1EC` / `#A3A8BE` |
| **Accent** (actions, selected tab, links, charts) | **Raspberry `#C81E55`** | **Peach `#FF9468`** |
| Text on accent | `#FFFFFF` (5.6:1) | `#1A0E0A` (8.7:1) |
| Period / bleeding only | Orange `#E8562A` | Mint `#8FE3C8` |
| Cards | Flat, no outline (iOS) | 1px `rgba(255,255,255,.08)` edge |

All text pairs pass WCAG AA in both appearances (checked 9 Nov). Pain scale 0–10 (always shown with the digit):
light raspberry `#F9D3DE → #93103A`; dark peach that *glows brighter* as it gets worse `#2A3050 → #FFC9AE`.

**The doctor document and PDF are always black on white paper**, in both appearances (`DOC_COLORS`, `severityColorLight`).

## 3. Type — Apple's own faces (nothing downloaded on iOS)
| Role | Face | Use |
|---|---|---|
| UI text | SF Pro (`system-ui`) | everything the app says |
| Numbers | SF Rounded (`ui-rounded`) | dashboard metrics, counts |
| Headings & statements | SF Pro bold | "Symptoms on 10 of the last 28 days." (one family for the app's voice, owner 9 Nov) |
| Her words | New York *italic* | quotes from her notes only |

Web preview stands in Newsreader for New York (desktop Chrome can't reach it). Scale = iOS text styles (Large Title
34 bold, Title 22, Headline 17 semibold, Body 17, Subheadline 15, Footnote 13), plus `statement` 28, `metric` 34.

## 4. Wren — the mascot and guide (version 3, 11 Nov 2026)
A knitted hot-water bottle: burgundy knit, bone ribbed collar and hem, cream mittens, stitched heart, small feet.
Same colours in both modes; never re-tinted. On 11 Nov the owner asked for a "much more beautiful, 3D-looking"
Wren that guides people step by step, so Wren was redrawn and now does more than comfort.

`components/zeeba/Wren.tsx`: one small vector drawing (gradients, a clip path, one pattern; no image files, no SVG
filters) lit like a soft toy: key light top left, pink rim light lower right, plum shadows, contact shadow. It is
split into stacked layers so every movement is a plain view transform: Wren breathes, blinks at uneven intervals,
springs between poses and squashes a little on each change. Still under Reduce Motion.
Moods: `idle` `happy` `wave` `proud` `point` (with `pointAt` left/right/up/down) `listening` `thinking` `comfort` `sleepy`.
Master artwork for the website: the same drawing as an SVG string generator, inlined in the site's `index.html`.
See every mood live in the design preview at `/wren-lab`.

Where Wren appears: launch screen, Welcome (waving), the intro pages (pointing at each clay icon), every onboarding
question (asking it in a speech bubble, `WrenSays` in `components/zeeba/motion.tsx`), the "You're all set"
celebration, Today's greeting, the first-run tour (pointing at one control per step), milestone celebrations, empty
states and the save toast.

Rules:
- At most one Wren per screen (a second tiny one in a toast is fine).
- **Never on For my doctor or the PDF. Never speaks medical content.**
- Wren reacts to the act of recording, never to the pain number. A hard day (8/10 or worse) gets `comfort`,
  never confetti. Wren is never sad, worried or disappointed.
- When Wren teaches, Wren points at one control and says eight words or fewer.

## 4b. Motion, clay icons and light gamification (11 Nov 2026)
- **Motion kit** `components/zeeba/motion.tsx`: `Pop`, `Rise`, `PressScale`, `Confetti`, `CountUp`,
  `ProgressSteps`, `Pulse`, `WrenSays`. Built on React Native's own `Animated`; no animation packages. Press scales
  to 0.97; interface motion under 300 ms; springs gentle for interface, playful only for Wren and celebrations.
- **Clay icons** `components/zeeba/art/ClayIcon.tsx`: twelve soft 3D vector illustrations (record, prove, reach,
  bell, calendar, lock, heart, pencil, sparkle, doctor, moon, sun) lit like Wren. For warmth in onboarding, intro,
  milestones and pillar headers; the tab bar keeps simple glyphs. Gallery: `/art-lab` in the preview.
- **Borrowed from games, on purpose** (research: `gamification` notes, WORKLOG 2026-11-11): a total that only
  goes up ("N days on your record") with one knitted stitch per recorded day; milestones celebrated once each
  (first entry, 3, 7, 14, 28 days, first report shared); an early win (the first entry is on the report at once); a
  guided first-run tour; the entry visibly flying to the report on save.
- **Refused, on purpose:** streaks and anything that counts consecutive days, anything that decays, guilt
  notifications, scores on symptoms, confetti on a pain entry, leaderboards.

## 5. iPhone feel
Floating **glass tab bar** (blur + translucent fill + hairline edge, selected tab on a soft accent lozenge, iOS 26 style) ·
Settings-style inset grouped lists · large titles that collapse into a small centred title · Apple "tinted" secondary
buttons · press-in springs + haptics · sheets with grabber. Expo first-party only (expo-blur, expo-haptics; MIT).

## 6. Sign-in (Apple HIG)
Sign in with Apple **first**, never smaller than other options; black on light, white on dark. Then Google (white, full-colour
G, its branding rules), then email. On Sign in, social buttons sit **above** the email form (no scrolling to reach them).

## 7. Copy patterns
- Hero: "How's your body today?" · First run: "Your first note takes a minute."
- Evidence statement: "Symptoms on **N of the last D days.** M of those days at 7/10 or worse."
- Comfort toast: "Saved. That sounded like a hard day." (no advice, no cause)
- Footer: "Evidence, never a diagnosis." Safety line on Today: GP, NHS 111 or 999.
- Avoid: "It's not in your head" (judges cause), "your doctor can't ignore" (promises an outcome).
