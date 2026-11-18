import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Pressable, Keyboard, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { haptics } from '../../lib/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, heights, space, type as typeScale, useColors } from '../../constants/zeebaUI';
import { useTourTarget, type TourTarget } from '../../lib/tour';
import { Icon, type IconName } from '../ui/Icon';
import { Txt, useReduceMotion } from './kit';
import { useSaveMoment } from './capture/saveMoment';

const ND = Platform.OS !== 'web';
const TOUR_TARGET: Record<string, TourTarget | null> = { today: null, timeline: 'tab-evidence', doctor: 'tab-doctor' };

/**
 * One tab: a clear, simple glyph with its word always under it. When it becomes the selected tab the glyph springs
 * (a small hop and settle); when a saved entry's chip lands on the Doctor tab it bumps. Still under Reduce Motion.
 */
function TabItem({
  name, label, icon, focused, bump, onPress,
}: { name: string; label: string; icon: IconName; focused: boolean; bump: number; onPress: () => void }) {
  const reduce = useReduceMotion();
  const pop = useRef(new Animated.Value(0)).current; // 0 rest → 1 peak → 0
  const press = useRef(new Animated.Value(1)).current;
  const was = useRef(focused);
  const target = useTourTarget(TOUR_TARGET[name]);
  const hop = (peak: number) => {
    if (reduce) return;
    pop.setValue(peak);
    Animated.spring(pop, { toValue: 0, speed: 12, bounciness: 14, useNativeDriver: ND }).start();
  };
  useEffect(() => {
    if (focused && !was.current) hop(1);
    was.current = focused;
  }, [focused]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstBump = useRef(true);
  useEffect(() => {
    if (firstBump.current) { firstBump.current = false; return; }
    if (bump) hop(1.6);
  }, [bump]); // eslint-disable-line react-hooks/exhaustive-deps
  const tint = focused ? colors.accent : colors.ink3;
  const pressTo = (v: number) => Animated.spring(press, { toValue: v, speed: 40, bounciness: 4, useNativeDriver: ND }).start();
  return (
    <Pressable
      ref={target as any}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      aria-selected={focused}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => pressTo(0.94)}
      onPressOut={() => pressTo(1)}
      style={styles.tab}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale: press }] }]}>
        <Animated.View
          style={{
            transform: [
              { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) },
            ],
          }}
        >
          <Icon name={icon} size={24} color={tint} />
        </Animated.View>
        <Txt maxFontSizeMultiplier={1.6} style={[typeScale.tab, styles.label, { color: tint }, focused && styles.labelOn]}>{label}</Txt>
      </Animated.View>
    </Pressable>
  );
}

const TABS: Record<string, { label: string; icon: IconName }> = {
  today: { label: 'Today', icon: 'sun' },
  timeline: { label: 'Evidence', icon: 'bar-chart' },
  doctor: { label: 'Doctor', icon: 'file-text' },
};
export const VISIBLE_TABS = ['today', 'timeline', 'doctor'];

/** Visible title → tab route ("from" params carry titles). */
const TAB_BY_TITLE: Record<string, string> = { Today: 'today', Evidence: 'timeline', Timeline: 'timeline', 'For my doctor': 'doctor' };

type AnyRoute = { key?: string; name: string; params?: any; state?: { key?: string; index?: number; routes?: AnyRoute[] } };

/** Profile (and its records) were opened from a tab: find which, via the `from` param. */
function profileOrigin(route: AnyRoute | undefined): string {
  const from = route?.params?.from ?? route?.params?.params?.from ?? route?.state?.routes?.[0]?.params?.from;
  return TAB_BY_TITLE[String(from ?? '')] ?? 'today';
}

/**
 * Three tabs: Lucide 24 / 1.75 stroke, 11/13 label always visible. A floating glass capsule (blur on iOS, solid on web);
 * the selected tab sits on a soft accent lozenge that slides between tabs, its glyph springs, and changing tab
 * gives a selection tick. Hidden while the keyboard is up.
 */
export function MainTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const active = state.routes[state.index] as AnyRoute | undefined;
  // On Profile (not a tab) keep the tab it came from tinted, so you are never "nowhere" (V18).
  const activeName = active && !VISIBLE_TABS.includes(active.name) ? profileOrigin(active) : active?.name;
  const routes = state.routes.filter((r) => VISIBLE_TABS.includes(r.name));

  /**
   * Land on the tab's ROOT, always (UX #6). A detail pushed into a tab from elsewhere (Today →
   * Timeline entry) can be the only route in that tab's stack, so popToTop can't remove it and
   * a later tap reopened a stale "This note isn't here any more". Reset the nested stack instead.
   * Returns false when the stack is already at its root (nothing to do).
   */
  const needsReset = (route: AnyRoute) => {
    const nested = route.state;
    if (!nested?.key || !nested.routes) return false;
    const top = nested.routes[nested.index ?? 0];
    return !(nested.routes.length === 1 && top?.name === 'index');
  };
  const resetToRoot = (route: AnyRoute) => {
    // = CommonActions.reset(...) aimed at the tab's own stack (expo-router vendors react-navigation).
    descriptors[route.key!].navigation.dispatch({ type: 'RESET', payload: { index: 0, routes: [{ name: 'index' }] }, target: route.state!.key } as any);
  };

  const c = useColors();
  const reduce = useReduceMotion();
  const bump = useSaveMoment((st) => st.bump);
  // The selected tab's lozenge slides between tabs with a gentle spring.
  const [barW, setBarW] = useState(0);
  const index = Math.max(0, routes.findIndex((r) => r.name === activeName));
  const slide = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    if (reduce) { slide.setValue(index); return; }
    Animated.spring(slide, { toValue: index, stiffness: 320, damping: 30, mass: 1, useNativeDriver: ND }).start();
  }, [index, reduce, slide]);
  const tabW = barW > 0 ? (barW - 10) / routes.length : 0; // 10 = the bar's padding and 1 px edge, both sides

  if (keyboard) return null;

  return (
    <View role="navigation" aria-label="Main" style={[styles.dock, { paddingBottom: Math.max(insets.bottom - 6, space.sm) }]}>
      {/* Content fades out under the floating bar instead of ending on a hard line. */}
      <LinearGradient colors={[`${c.canvas}00`, c.canvas]} style={styles.fade} />
      <View style={[styles.bar, Platform.OS === 'web' && styles.barSolid]} accessibilityRole="tablist" onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        {Platform.OS === 'web' ? null : <BlurView intensity={70} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />}
        {tabW > 0 ? (
          <Animated.View
            aria-hidden
            style={[styles.selected, { width: tabW, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, tabW] }) }] }]}
          />
        ) : null}
        {routes.map((route) => {
          const focused = activeName === route.name;
          const isCurrent = active?.name === route.name;
          const tab = TABS[route.name];
          return (
            <TabItem
              key={route.key}
              name={route.name}
              label={tab.label}
              icon={tab.icon}
              focused={focused}
              bump={route.name === 'doctor' ? bump : 0}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }) as {
                  defaultPrevented: boolean; preventDefault?: () => void;
                };
                if (event.defaultPrevented) return;
                const r = route as AnyRoute;
                // Exactly ONE mechanism moves the stack (review 2, N2). The nested native stack also
                // hears 'tabPress' and, on the next frame, pops to top when it is focused and deeper
                // than its root. Running our RESET as well left that POP_TO_TOP with nothing to pop
                // ("not handled by any navigator" → dev LogBox eating taps). So when we reset, we
                // first preventDefault the event, which the stack checks before popping.
                if (needsReset(r)) {
                  event.preventDefault?.();
                  resetToRoot(r);
                }
                if (!isCurrent) { haptics.selection(); navigateToTab(route.key); }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A floating glass capsule (iOS 26 / Liquid Glass feel): blur + translucent fill + a hairline edge.
  dock: { paddingHorizontal: space.md, paddingTop: space.xxs, backgroundColor: colors.canvas },
  // 12 pt: short enough never to wash over a pinned footer button (the Doctor tab's share bar).
  fade: { position: 'absolute', left: 0, right: 0, top: -12, height: 12, pointerEvents: 'none' },
  bar: {
    flexDirection: 'row', borderRadius: 32, overflow: 'hidden', padding: 4,
    borderWidth: 1, borderColor: colors.glassEdge, backgroundColor: colors.tabBarTranslucent,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  barSolid: { backgroundColor: colors.tabBar },
  // The selected tab sits on a soft accent lozenge, like iOS 26's tab bar.
  selected: { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: 26, backgroundColor: colors.accentTint },
  // Selected = burgundy tint + heavier label, so state never rests on colour alone (WCAG 1.4.1).
  label: { fontSize: 11, lineHeight: 13 },
  labelOn: { fontWeight: '700' },
  tabInner: { alignItems: 'center', gap: 2, zIndex: 1 },
  tab: { flex: 1, height: heights.tabBar - 4, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2, borderRadius: 26 },
});
