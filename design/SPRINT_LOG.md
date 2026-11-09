# Design sprint log (UTC)

## Foundation choice
Expo first-party packages: expo-blur (translucent tab bar), expo-haptics, react-native-reanimated/Animated, existing Icon set. Licence MIT (Expo). Why: runs in Expo Go, no third-party kit lock-in, keeps our own Burgundy & Bone look; a quick GitHub scan found no MIT RN kit that beat hand-built inset-grouped lists on our tokens, so no third-party code copied.

## Commits
