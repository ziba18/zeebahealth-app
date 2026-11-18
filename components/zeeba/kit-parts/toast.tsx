import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { font, colors, fonts, heights, layout, motion, radii, shadows, space } from '../../../constants/zeebaUI';
import { Icon } from '../../ui/Icon';
import { Txt } from './Txt';
import { Wren, type WrenMood } from '../Wren';

interface ToastState {
  message: string | null;
  /** Bumps on every show so the same text shown twice still restarts the timer/animation. */
  seq: number;
  /** Show a small Wren (proud / comfort) instead of the check (a saved moment). */
  mood: WrenMood | null;
}

const useToastStore = create<ToastState>(() => ({ message: null, seq: 0, mood: null }));
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Show the one app toast ("Saved. 13 notes ready for your doctor."). A new toast replaces the
 * previous one. Auto-dismisses after 3 s (longer for long messages). System status only — never health content.
 */
export function showToast(message: string, opts?: { proud?: boolean; mood?: WrenMood }): void {
  if (timer) clearTimeout(timer);
  useToastStore.setState((s) => ({ message, seq: s.seq + 1, mood: opts?.mood ?? (opts?.proud ? 'proud' : null) }));
  AccessibilityInfo.announceForAccessibility?.(message);
  // 3 s for the short "Saved." lines; longer messages stay ~70 ms per character so they can be read.
  timer = setTimeout(dismissToast, Math.max(motion.toastMs, message.length * 70));
}

/** Hide the toast now. Sheets call this when they open so it never sits over them. */
export function dismissToast(): void {
  if (timer) { clearTimeout(timer); timer = null; }
  if (useToastStore.getState().message !== null) useToastStore.setState({ message: null });
}

/** Reduce Motion, read here directly (Sheet.tsx imports this file, so importing its hook back would be a cycle). */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (alive) setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

/** Mounted once in app/_layout.tsx, after the navigator. */
export function ToastHost() {
  const { message, seq, mood } = useToastStore();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  const rise = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!message) return;
    const nd = Platform.OS !== 'web';
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: nd }).start();
    // Rises into place and settles with a small spring; a plain fade under Reduce Motion.
    if (reduceMotion) { rise.setValue(1); return; }
    rise.setValue(0);
    Animated.spring(rise, { toValue: 1, speed: 16, bounciness: 6, useNativeDriver: nd }).start();
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!message) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      {/* Full-width row that centres the toast under the content column on wide windows / iPad
          (review 3, #3: absolute left/right ignored alignSelf and pinned it to the far left). */}
      {/* Clear of the floating tab bar: its dock is 66 pt plus the bottom inset (see MainTabBar). */}
      <View style={[styles.row, { bottom: 66 + Math.max(insets.bottom - 6, space.sm) + space.xs }]}>
        <Animated.View
          style={[styles.toast, {
            opacity,
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          }]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Pressable onPress={dismissToast} accessibilityLabel={`${message} Dismiss`} style={styles.inner}>
            {mood ? <Wren mood={mood} size={46} decorative /> : <Icon name="check-circle" size={22} color={colors.saved} />}
            <Txt style={styles.text}>{message}</Txt>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // box-none MUST live in StyleSheet.create: RN-web only compiles it (self none, children auto)
  // for static styles; as an inline style it becomes invalid CSS and the full-screen layer ate
  // every tap for the toast's 3 s (review 2, N1 — the "dead tap after Log bleeding Save").
  layer: { zIndex: 1000, elevation: 1000, pointerEvents: 'box-none' },
  // Same box-none rule: the row spans the screen but only the toast takes touches.
  row: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: layout.gutter, pointerEvents: 'box-none' },
  toast: {
    width: '100%',
    maxWidth: layout.maxContentWidth - layout.gutter * 2,
    // Floats clear of the canvas (V28): its own shadow + a faint saved-green edge.
    backgroundColor: colors.savedTint, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder,
    ...shadows.toast,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, minHeight: 56 },
  text: { flex: 1, ...font.medium, fontSize: 15, lineHeight: 20, color: colors.saved },
});
