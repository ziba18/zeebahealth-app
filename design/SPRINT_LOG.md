# Design sprint log (UTC)

## Foundation choice
Expo first-party packages: expo-blur (translucent tab bar), expo-haptics, react-native-reanimated/Animated, existing Icon set. Licence MIT (Expo). Why: runs in Expo Go, no third-party kit lock-in, keeps our own Burgundy & Bone look; a quick GitHub scan found no MIT RN kit that beat hand-built inset-grouped lists on our tokens, so no third-party code copied.

## Commits
- 12:25 Tab bar: BlurView (solid on web), hairline, burgundy tint, no pill, light haptic. components/zeeba/MainTabBar.tsx
- 12:26 Profile/Settings/Records: inset grouped lists (ScreenLarge grouped prop, GroupFooter, GroupSwitchRow); tabBarTranslucent token; Button press .97+haptic. GroupedRows.tsx, layout.tsx, profile/*
- 12:26 Today: removed note-count card + 14-day strip, Wren hero slot (placeholder Wren.tsx, lead overwrites), 4 topics + More, compact week line. TodayCards.tsx, today/index.tsx
- 12:29 Switch rows: borderStrong off-track, white thumb
- 12:29 Friends + edit-profile grouped
- 12:29 Wren sleepy in Timeline/Records empty states; proud Wren in save toast. toast.tsx, RecordsList, timeline/index, CaptureSheet
- 12:30 ScreenLarge: small title fades in on translucent bar when large title scrolls away (Animated, blur on native). layout.tsx
- 12:31 KIT.md updated; grouped separators true hairline; rendered profile/settings/friends/timeline OK (headless Chrome is 500 wide min)
- 12:31 Sheets already iOS-style (28 radius, scrim, drag-dismiss); grabber now 36x5. Sheet.tsx
- 12:32 Title bar: tabBar (0.94) on web; native keeps blur over 0.72 bone. Rough-day row already selects burgundy disc + haptic + enabled burgundy Save, no change. layout.tsx
- 12:32 Row press highlight already sunken (no scale). Login/register/forgot: burgundy wordmark, sunken bg, fields in one white group. rendered /login OK
- 12:33 Onboarding: continuous burgundy progress bar, happy Wren step 4 only. Rendered OK. OnboardingScreen.tsx
