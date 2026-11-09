# Zeeba Health — Brand (v1, 2026-11-09)

Replaces the colour section of the "Warm Paper, Deep Ink" kit. `design/KIT.md` still governs components and spacing.
Source of truth for values: `constants/zeebaUI.ts`.

## Positioning in one line
**Your symptoms, on the record.** Zeeba Health turns what a woman's body is doing into dated, readable evidence for her
doctor. It counters "it's just stress" with counts, charts and her own words. Evidence, never a verdict.

## Personality
| We are | We are not |
|---|---|
| Authoritative, precise, calm | Clinical-cold, alarmist |
| Warm, on her side | Cute, babyish, "period-app pink" |
| Plain-spoken (UK English) | Jargon, medical labels, diagnoses |

## Palette — "Burgundy & Bone"
All text pairs pass WCAG AA (ratios on canvas / white).

| Token | Hex | Role |
|---|---|---|
| `burgundy` | `#7A1F3A` | Brand + every action (buttons, links, selected tab). White on it 10:1 |
| `burgundyPressed` | `#5C1529` | Pressed state |
| `burgundyTint` | `#F6E6EA` | Selected chips, segments, soft washes |
| `blush` | `#F2C9CF` | Wren and illustration only, never text |
| `canvas` (bone) | `#FBF7F4` | App background |
| `surface` | `#FFFFFF` | Cards, sheets, PDF |
| `sunken` | `#F3ECE8` | Grouped-list background, input wells |
| `ink` | `#22161A` | Text, 16.5:1 |
| `ink2` / `ink3` | `#5C4A4F` / `#6A585D` | Secondary 7.7:1 / labels 6.2:1 |
| `clay` | `#B04A2E` | Bleeding only (orange-red, so it never reads as the brand) |
| `saved` / `error` | `#2E6A4F` / `#A12A2A` | System states only |

Severity ramp (0–10, always shown with the digit): `#F4DEE4 #E0AEBB #A9566F #8E3050 #5A1229`.

## Type
Inter for everything the app says (upright, 400/500/600). Instrument Serif Italic **only** for her own words (quotes),
so her voice is visibly different from the app's. The wordmark is Inter 600, burgundy, tight tracking: upright = authoritative.

## Wren
A knitted hot-water bottle in brand burgundy with a bone ribbed collar and a stitched heart. Comfort and company.
`components/zeeba/Wren.tsx`, moods: idle, happy, listening, comfort, proud, sleepy. Breathes gently; still when Reduce Motion is on.
Rules: Wren appears on welcome, the capture hero, empty states and "saved" moments, at most once per screen.
**Wren never appears on the doctor PDF or the For my doctor page** (that page must look clinical-grade), never speaks
medical content, never names a condition and never gives advice.

## iPhone feel
Expo first-party only (MIT): expo-blur tab bar, expo-haptics on tab change and primary actions, inset grouped lists
(Settings-app style), large titles, sheets with a grabber. Everything also renders in the web preview (solid fallbacks).

## Welcome copy (owner to choose; A is in the build)
- **A — "Your symptoms, on the record."** Log what your body is doing, in your own words. Zeeba Health turns it into dated
  evidence your doctor can read in a minute. Steps: Record · Prove · Reach. Footer: "Evidence, not a diagnosis."
- **B — "Be heard. Bring the proof."** Every symptom, dated and in your words, turned into a clear report for your next appointment.
- **C — "Don't just say it. Show it."** Turn weeks of symptoms into one page of dates, numbers and your own words.
- Avoid: "It's not in your head" (implies a verdict on the cause, breaks the no-diagnosis rule), "your doctor can't
  ignore" (promises an outcome we can't control).
