// Motion kit (11 Nov 2026): the small set of moving pieces every screen shares, so the app moves in one voice.
// Built on React Native's own Animated (no extra packages). Everything here stands still under Reduce Motion.
//
//   Pop            scale 0.9 → 1 with a fade, once on mount
//   Rise           fade + short rise, staggered by `index`
//   PressScale     a Pressable that springs to 0.97, with a haptic
//   Confetti       a one-off celebration burst (milestones only, never for a symptom entry)
//   CountUp        a number that counts up to its value
//   ProgressSteps  segmented progress for onboarding
//   Pulse          a soft halo behind the one thing to tap next
//   WrenSays       Wren with a speech bubble
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, Platform, StyleSheet, View,
  type AccessibilityRole, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { colors, radii, space } from '../../constants/zeebaUI';
import { haptics } from '../../lib/haptics';
import { useReduceMotion } from './kit-parts/Sheet';
import { AnimatedPressable, usePressSpring } from './kit-parts/pressSpring';
import { Txt, type TxtVariant } from './kit-parts/Txt';
import { Wren, type WrenMood, type WrenPointAt } from './Wren';

export { useReduceMotion };

const ND = Platform.OS !== 'web';
const OUT = Easing.out(Easing.cubic);

/** Scale 0.9 → 1 with a fade, once on mount. For things that arrive: a card, a tick, a bubble. */
export function Pop({
  delay = 0, from = 0.9, style, children,
}: { delay?: number; from?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { t.setValue(1); o.setValue(1); return; }
    const a = Animated.parallel([
      Animated.spring(t, { toValue: 1, delay, speed: 14, bounciness: 7, useNativeDriver: ND }),
      Animated.timing(o, { toValue: 1, delay, duration: 160, easing: OUT, useNativeDriver: ND }),
    ]);
    a.start();
    return () => a.stop();
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[style, { opacity: o, transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Fade + rise, staggered by `index` (60 ms apart, capped so long lists never lag). */
export function Rise({
  index = 0, delay = 0, distance = 14, style, children,
}: { index?: number; delay?: number; distance?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { t.setValue(1); return; }
    const a = Animated.timing(t, {
      toValue: 1, duration: 280, delay: delay + Math.min(index, 8) * 60, easing: OUT, useNativeDriver: ND,
    });
    a.start();
    return () => a.stop();
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** A Pressable that presses in with a spring. Use for cards and big choices; `Button` already has its own. */
export function PressScale({
  onPress, to = 0.97, haptic = 'light', disabled, style, children, hitSlop,
  accessibilityRole = 'button', accessibilityLabel, accessibilityHint, accessibilityState, testID,
}: {
  onPress?: () => void;
  to?: number;
  haptic?: 'selection' | 'light' | 'none';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  hitSlop?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean; expanded?: boolean };
  testID?: string;
}) {
  const press = usePressSpring(to);
  return (
    <AnimatedPressable
      onPress={() => {
        if (haptic === 'selection') haptics.selection();
        else if (haptic === 'light') haptics.light();
        onPress?.();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: disabled || accessibilityState?.disabled }}
      testID={testID}
      style={[style, { transform: [{ scale: press.scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

// Fixed celebration colours (brand raspberry and peach, Wren's pink, a warm gold, the mint from dark mode).
const CONFETTI = ['#C81E55', '#FF9468', '#FFC857', '#F08BA3', '#8FE3C8', '#7A1F3A'];
type Piece = { dx: number; peak: number; fall: number; spin: number; size: number; color: string; round: boolean; delay: number };

/**
 * A single celebration burst. Mount it over the area to cover (it fills its parent and ignores touches) and
 * bump `fire` to play it. For milestones of the record only: never for a symptom entry.
 */
export function Confetti({ fire, count = 36, originY = 0.36 }: { fire: number; count?: number; originY?: number }) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  const [run, setRun] = useState(0);
  const pieces = useMemo<Piece[]>(
    () => Array.from({ length: count }, (_, i) => {
      const angle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.15;
      const power = 110 + Math.random() * 150;
      return {
        dx: Math.cos(angle) * power * 1.15,
        peak: Math.sin(angle) * power - 40,
        fall: 180 + Math.random() * 220,
        spin: (Math.random() - 0.5) * 1080,
        size: 7 + Math.random() * 7,
        color: CONFETTI[i % CONFETTI.length],
        round: i % 3 === 0,
        delay: Math.random() * 0.08,
      };
    }),
    [run, count], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!fire || reduce) return;
    setRun(fire);
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration: 1700, easing: Easing.linear, useNativeDriver: ND });
    a.start(() => setRun(0));
    return () => a.stop();
  }, [fire, reduce, t]);

  if (!run || reduce) return null;
  return (
    <View style={styles.confetti} accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden>
      {pieces.map((p, i) => {
        const d = p.delay;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', left: '50%', top: `${originY * 100}%`,
              width: p.size, height: p.round ? p.size : p.size * 0.5, borderRadius: p.round ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity: t.interpolate({ inputRange: [0, d + 0.02, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, d, 0.45, 1], outputRange: [0, 0, p.dx * 0.82, p.dx] }) },
                { translateY: t.interpolate({ inputRange: [0, d, 0.32, 1], outputRange: [0, 0, p.peak, p.peak + p.fall] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/** A number that counts up to `value` (once, and again whenever the value changes). */
export function CountUp({
  value, duration = 650, from, format, variant = 'metric', color, style,
}: {
  value: number; duration?: number; from?: number; format?: (n: number) => string;
  variant?: TxtVariant; color?: string; style?: StyleProp<TextStyle>;
}) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(reduce ? value : (from ?? 0));
  const last = useRef(from ?? 0);
  useEffect(() => {
    if (reduce || !Number.isFinite(value)) { setShown(value); last.current = value; return; }
    const start = last.current;
    const v = new Animated.Value(0);
    const id = v.addListener(({ value: p }) => setShown(Math.round(start + (value - start) * p)));
    const a = Animated.timing(v, { toValue: 1, duration, easing: OUT, useNativeDriver: false });
    a.start(() => { setShown(value); last.current = value; });
    return () => { a.stop(); v.removeListener(id); last.current = value; };
  }, [value, reduce, duration]);
  return (
    <Txt variant={variant} color={color} style={style} accessibilityLabel={format ? format(value) : String(value)}>
      {format ? format(shown) : String(shown)}
    </Txt>
  );
}

function Segment({ state }: { state: 'done' | 'current' | 'todo' }) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(state === 'done' ? 1 : 0)).current;
  useEffect(() => {
    const to = state === 'todo' ? 0 : 1;
    if (reduce) { t.setValue(to); return; }
    const a = Animated.spring(t, { toValue: to, speed: 10, bounciness: 4, useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [state, reduce, t]);
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, { transformOrigin: 'left center', transform: [{ scaleX: t }] }]} />
    </View>
  );
}

/** Segmented progress: one segment per step; the current one fills with a spring. `current` starts at 1. */
export function ProgressSteps({ total, current, style }: { total: number; current: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[styles.steps, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      {Array.from({ length: total }, (_, i) => (
        <Segment key={i} state={i + 1 < current ? 'done' : i + 1 === current ? 'current' : 'todo'} />
      ))}
    </View>
  );
}

/** A soft halo that breathes behind its child: "tap this next". One per screen at most. */
export function Pulse({
  active = true, color = colors.accent, radius = radii.pill, style, children,
}: { active?: boolean; color?: string; radius?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || reduce) { t.setValue(0); return; }
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1500, easing: OUT, useNativeDriver: ND }),
        Animated.delay(500),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [active, reduce, t]);
  return (
    <View style={style}>
      {active && !reduce ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, {
            pointerEvents: 'none', borderRadius: radius, backgroundColor: color,
            opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
            transform: [
              { scaleX: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) },
              { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.38] }) },
            ],
          }]}
        />
      ) : null}
      {children}
    </View>
  );
}

/**
 * Wren with a speech bubble. Wren is decorative here (the bubble's text is what a screen reader reads).
 * `side="left"`: Wren on the left, bubble to the right (question screens, Today's greeting).
 * `side="top"`: Wren above, bubble below, centred (welcome and celebration moments).
 * The bubble pops in again each time `text` changes. Wren never says anything medical.
 */
export function WrenSays({
  text, mood = 'idle', pointAt, size = 88, side = 'left', textVariant = 'headline', header = false,
  onWrenPress, bubbleStyle, style, children,
}: {
  text: string;
  mood?: WrenMood;
  pointAt?: WrenPointAt;
  size?: number;
  side?: 'left' | 'top';
  textVariant?: TxtVariant;
  /** Mark the bubble's text as the screen's heading. */
  header?: boolean;
  onWrenPress?: () => void;
  bubbleStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const left = side === 'left';
  return (
    <View style={[left ? styles.saysRow : styles.saysCol, style]}>
      <Wren mood={mood} pointAt={pointAt} size={size} decorative interactive={!onWrenPress} onPress={onWrenPress} />
      <Pop key={text} from={0.92} style={left ? styles.bubbleWrapLeft : styles.bubbleWrapTop}>
        <View style={[styles.tail, left ? styles.tailLeft : styles.tailTop]} />
        <View style={[styles.bubble, bubbleStyle]}>
          <Txt variant={textVariant} accessibilityRole={header ? 'header' : undefined}>{text}</Txt>
          {children}
        </View>
      </Pop>
    </View>
  );
}

const styles = StyleSheet.create({
  confetti: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 50 },
  steps: { flexDirection: 'row', gap: 6, height: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.sunken, overflow: 'hidden' },
  segmentFill: { flex: 1, borderRadius: 3, backgroundColor: colors.accent },
  saysRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  saysCol: { alignItems: 'center', gap: space.sm },
  bubbleWrapLeft: { flex: 1, minWidth: 0, justifyContent: 'center' },
  bubbleWrapTop: { alignSelf: 'stretch', alignItems: 'center' },
  bubble: {
    backgroundColor: colors.surface, borderRadius: 22, paddingVertical: space.sm + 2, paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, gap: space.xs,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.08)',
  },
  tail: {
    position: 'absolute', width: 16, height: 16, borderRadius: 3, backgroundColor: colors.surface,
    borderColor: colors.hairline, transform: [{ rotate: '45deg' }],
  },
  tailLeft: { left: -6, top: '50%', marginTop: -8, borderLeftWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  tailTop: { top: -6, alignSelf: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth },
});
