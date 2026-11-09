# Design sprint log (UTC)

## Foundation choice
Expo first-party packages: expo-blur (translucent tab bar), expo-haptics, react-native-reanimated/Animated, existing Icon set. Licence MIT (Expo). Why: runs in Expo Go, no third-party kit lock-in, keeps our own Burgundy & Bone look; a quick GitHub scan found no MIT RN kit that beat hand-built inset-grouped lists on our tokens, so no third-party code copied.

## Commits
- 12:25 Tab bar: BlurView (solid on web), hairline, burgundy tint, no pill, light haptic. components/zeeba/MainTabBar.tsx
- 12:26 Profile/Settings/Records: inset grouped lists (ScreenLarge grouped prop, GroupFooter, GroupSwitchRow); tabBarTranslucent token; Button press .97+haptic. GroupedRows.tsx, layout.tsx, profile/*
