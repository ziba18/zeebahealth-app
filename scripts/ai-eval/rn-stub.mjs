// Test-only stand-in for 'react-native' (2026-11-18): lib/records/summary.ts reads colours from
// constants/zeebaUI.ts, which imports react-native; Node cannot load RN's Flow source. Just enough for those
// imports to resolve; tests never render.
export const Platform = { OS: 'web', select: (o) => (o.web ?? o.default) };
export const DynamicColorIOS = (o) => o.light;
export const useColorScheme = () => 'light';
export const StyleSheet = { create: (s) => s, hairlineWidth: 1 };
export default { Platform, DynamicColorIOS, useColorScheme, StyleSheet };
