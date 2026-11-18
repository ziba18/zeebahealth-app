// The app's 0–10 scale as a slider (owner, 10 Nov 2026). Research behind each choice:
//  - 0–10 numeric scale with verbal anchors at the ends only (IMMPACT core measure; "No pain" … "Worst pain
//    imaginable"). No words in between: mild/moderate/severe are labels of ours, not hers.
//  - Snaps to whole numbers and always shows the number (phone sliders are valid but suffer finger slip and
//    imprecision; a visible integer fixes both). Each step gives a selection haptic.
//  - Nothing pre-selected: no thumb until she touches it, so a default position can't anchor her answer.
//  - The track is the pain ramp of the current appearance, filled up to her number; the thumb carries the digit,
//    so colour is never the only signal. Tap anywhere on the track, or drag.
//  - VoiceOver / TalkBack: an adjustable control (swipe up/down); web: arrow keys, Home/End, Delete.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, radii, severityStep, space, useColors } from '../../../constants/zeebaUI';
import { haptics } from '../../../lib/haptics';
import { Icon } from '../../ui/Icon';
import { FieldLabel } from './FieldLabel';
import { AnimatedPressable, usePressSpring } from './pressSpring';
import { useReduceMotion } from './Sheet';
import { Txt } from './Txt';

// Two sizes. `large` is Today's check-in: a thumb you can't miss, the digits printed under the track so it is
// plain where to tap, and (with `readout`) the number very big between a minus and a plus button, so the same
// answer can be given by dragging, by tapping the track, or by tapping a button (WCAG 2.5.7: never drag-only).
const SIZES = {
  regular: { thumb: 34, track: 10, hit: 52, num: 14, digits: 0 },
  large: { thumb: 46, track: 18, hit: 58, num: 19, digits: 20 },
} as const;

/** A 56 pt round minus / plus button beside the big number. */
function StepButton({ icon, label, onPress, disabled }: { icon: 'minus' | 'plus'; label: string; onPress: () => void; disabled?: boolean }) {
  const spring = usePressSpring(0.92);
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={spring.onPressIn}
      onPressOut={spring.onPressOut}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.step, spring.pressed && { backgroundColor: colors.hairline }, disabled && { opacity: 0.4 }, { transform: [{ scale: spring.scale }] }]}
    >
      <Icon name={icon} size={24} color={colors.ink} />
    </AnimatedPressable>
  );
}

export function PainSlider({
  value, onChange, label, showLabel = true, minLabel = 'None', maxLabel = 'Worst imaginable', readout = false, clearable = false, style,
  size = 'regular',
}: {
  value: number | null | undefined;
  onChange: (n: number | null) => void;
  /** Read by screen readers; shown above as a FieldLabel unless showLabel is false. */
  label?: string;
  showLabel?: boolean;
  minLabel?: string;
  maxLabel?: string;
  /** Large "6/10" readout above the track, between a minus and a plus button (the Today check-in). */
  readout?: boolean;
  /** `large`: bigger thumb and track, digits under the track (the Today check-in). */
  size?: 'regular' | 'large';
  /** Small "Clear" link once a number is set (fields where no answer is a valid answer). */
  clearable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const reduce = useReduceMotion();
  const D = SIZES[size];
  const THUMB = D.thumb;
  const TRACK_H = D.track;
  const HIT_H = D.hit;
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const v = value ?? null;
  // Refs: the responder is created once, so it reads the latest values from here.
  const live = useRef({ width, v, onChange, startX: 0, thumb: THUMB as number });
  live.current.thumb = THUMB;
  live.current.width = width;
  live.current.v = v;
  live.current.onChange = onChange;

  const usable = Math.max(1, width - THUMB);
  const xOf = (n: number) => THUMB / 2 + (n / 10) * usable;
  const valueAt = (x: number) => Math.max(0, Math.min(10, Math.round(((x - live.current.thumb / 2) / Math.max(1, live.current.width - live.current.thumb)) * 10)));
  // Each new number lands with a small pop (thumb and readout), so every step is felt and seen.
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    if (reduce || v == null) return undefined;
    pop.setValue(1.14);
    const a = Animated.spring(pop, { toValue: 1, speed: 28, bounciness: 9, useNativeDriver: Platform.OS !== 'web' });
    a.start();
    return () => a.stop();
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (n: number | null) => {
    if (n === live.current.v) return;
    live.current.v = n;
    haptics.selection();
    live.current.onChange(n);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Only claim a move that is mostly sideways, so the page still scrolls under a vertical swipe.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        live.current.startX = e.nativeEvent.locationX;
        setDragging(true);
        set(valueAt(live.current.startX));
      },
      onPanResponderMove: (_, g) => set(valueAt(live.current.startX + g.dx)),
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;

  const step = v == null ? 0 : severityStep(v);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  const onA11y = (name: string) => {
    if (name === 'increment') set(v == null ? 0 : Math.min(10, v + 1));
    if (name === 'decrement') set(v == null ? 0 : Math.max(0, v - 1));
  };
  const webKeys = Platform.OS === 'web' ? ({
    tabIndex: 0,
    onKeyDown: (e: { key: string; preventDefault: () => void }) => {
      const map: Record<string, () => void> = {
        ArrowRight: () => onA11y('increment'), ArrowUp: () => onA11y('increment'),
        ArrowLeft: () => onA11y('decrement'), ArrowDown: () => onA11y('decrement'),
        Home: () => set(0), End: () => set(10), Delete: () => set(null), Backspace: () => set(null),
      };
      if (map[e.key]) { e.preventDefault(); map[e.key](); }
    },
  } as object) : {};

  const name = label ?? 'Strength from 0 to 10';
  return (
    <View style={style}>
      {label && showLabel ? <FieldLabel label={label} /> : null}
      {readout ? (
        <View style={styles.readoutRow}>
          <StepButton icon="minus" label={`${name}: one lower`} disabled={v === 0} onPress={() => onA11y('decrement')} />
          <View style={styles.readout} aria-hidden>
            {v == null ? (
              <View style={styles.readEmpty}>
                <Txt style={styles.readHint}>0 to 10</Txt>
                <Txt variant="caption">Slide, or tap a number</Txt>
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: pop }] }}>
                <Txt style={styles.readNum}>
                  {String(v)}<Txt style={styles.readUnit}>/10</Txt>
                </Txt>
              </Animated.View>
            )}
          </View>
          <StepButton icon="plus" label={`${name}: one higher`} disabled={v === 10} onPress={() => onA11y('increment')} />
        </View>
      ) : null}
      <View
        onLayout={onLayout}
        {...responder.panHandlers}
        {...webKeys}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={name}
        accessibilityValue={{ min: 0, max: 10, now: v ?? undefined, text: v == null ? 'Not chosen' : `${v} out of 10` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onA11y(e.nativeEvent.actionName)}
        style={[styles.hit, { height: HIT_H + D.digits }, Platform.OS === 'web' && ({ cursor: 'pointer', touchAction: 'pan-y', userSelect: 'none', outlineStyle: 'none' } as object)]}
      >
        {/* Track: the ramp, faint in full; vivid up to her number. */}
        <View pointerEvents="none" style={[styles.track, { height: TRACK_H, borderRadius: TRACK_H / 2, top: (HIT_H - TRACK_H) / 2, left: THUMB / 2 - TRACK_H / 2, right: THUMB / 2 - TRACK_H / 2, backgroundColor: c.chartTrack }]}>
          {width > 0 ? (
            <>
              <LinearGradient colors={c.ramp} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[StyleSheet.absoluteFill, { opacity: 0.28 }]} />
              {v != null ? (
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: xOf(v) - THUMB / 2 + TRACK_H / 2, overflow: 'hidden', borderRadius: TRACK_H / 2 }}>
                  <LinearGradient colors={c.ramp} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: usable + TRACK_H, height: '100%' }} />
                </View>
              ) : null}
            </>
          ) : null}
        </View>
        {/* Step ticks, so it reads as 11 whole numbers rather than a continuous line. */}
        {width > 0 ? Array.from({ length: 11 }, (_, n) => (
          <View key={n} pointerEvents="none" style={[styles.tick, { top: (HIT_H - 4) / 2, left: xOf(n) - 1, backgroundColor: v != null && n <= v ? 'rgba(255,255,255,0.55)' : c.borderStrong }]} />
        )) : null}
        {/* Large: the digits under the track, the chosen one in ink. Tapping a digit works: it is part of the track's hit area. */}
        {D.digits && width > 0 ? Array.from({ length: 11 }, (_, n) => (
          <View key={`d${n}`} pointerEvents="none" style={[styles.digit, { top: HIT_H - 6, left: xOf(n) - 14 }]}>
            <Txt style={[styles.digitText, v === n && styles.digitOn]}>{String(n)}</Txt>
          </View>
        )) : null}
        {v != null && width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              { top: (HIT_H - THUMB) / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2, left: xOf(v) - THUMB / 2, backgroundColor: c.ramp[step], borderColor: c.surface },
              { transform: [{ scale: dragging ? Animated.multiply(pop, 1.1) : pop }] },
            ]}
          >
            <Txt style={[styles.thumbNum, { color: c.rampFg[step], fontSize: D.num, lineHeight: D.num + 3 }]}>{String(v)}</Txt>
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.ends} aria-hidden>
        <Txt variant="caption">{D.digits ? minLabel : `0 · ${minLabel}`}</Txt>
        <Txt variant="caption">{D.digits ? maxLabel : `${maxLabel} · 10`}</Txt>
      </View>
      {clearable && v != null ? (
        <Txt
          variant="caption"
          accessibilityRole="button"
          accessibilityLabel={`Clear ${name}`}
          onPress={() => set(null)}
          style={styles.clear}
        >
          Clear
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  readoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  readout: { flex: 1, height: 70, alignItems: 'center', justifyContent: 'center' },
  readNum: { ...font.roundedBold, fontSize: 64, lineHeight: 70, fontVariant: ['tabular-nums'], color: colors.ink },
  readEmpty: { alignItems: 'center', gap: 2 },
  readHint: { ...font.roundedBold, fontSize: 28, lineHeight: 34, color: colors.ink3, opacity: 0.55 },
  readUnit: { ...font.rounded, fontSize: 22, lineHeight: 28, color: colors.ink2 },
  step: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  hit: { justifyContent: 'center' },
  track: { position: 'absolute', overflow: 'hidden' },
  tick: { position: 'absolute', width: 2, height: 4, borderRadius: 1 },
  digit: { position: 'absolute', width: 28, alignItems: 'center' },
  digitText: { ...font.rounded, fontSize: 13, lineHeight: 16, color: colors.ink2, fontVariant: ['tabular-nums'] },
  digitOn: { ...font.roundedBold, color: colors.ink },
  thumb: {
    position: 'absolute',
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.18)',
  },
  thumbNum: { ...font.roundedBold },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  clear: { alignSelf: 'flex-end', color: colors.accent, fontWeight: '600', paddingVertical: space.xs, paddingLeft: space.md, borderRadius: radii.pill },
});
