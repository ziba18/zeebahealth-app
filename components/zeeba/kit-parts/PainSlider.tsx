// The app's 0–10 scale as a slider (owner, 10 Nov 2026). Research behind each choice:
//  - 0–10 numeric scale with verbal anchors at the ends only (IMMPACT core measure; "No pain" … "Worst pain
//    imaginable"). No words in between: mild/moderate/severe are labels of ours, not hers.
//  - Snaps to whole numbers and always shows the number (phone sliders are valid but suffer finger slip and
//    imprecision; a visible integer fixes both). Each step gives a selection haptic.
//  - Nothing pre-selected: no thumb until she touches it, so a default position can't anchor her answer.
//  - The track is the pain ramp of the current appearance, filled up to her number; the thumb carries the digit,
//    so colour is never the only signal. Tap anywhere on the track, or drag.
//  - VoiceOver / TalkBack: an adjustable control (swipe up/down); web: arrow keys, Home/End, Delete.
import React, { useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, radii, severityStep, space, useColors } from '../../../constants/zeebaUI';
import { haptics } from '../../../lib/haptics';
import { FieldLabel } from './FieldLabel';
import { Txt } from './Txt';

const THUMB = 34;
const TRACK_H = 10;
const HIT_H = 52;

export function PainSlider({
  value, onChange, label, showLabel = true, minLabel = 'None', maxLabel = 'Worst imaginable', readout = false, clearable = false, style,
}: {
  value: number | null | undefined;
  onChange: (n: number | null) => void;
  /** Read by screen readers; shown above as a FieldLabel unless showLabel is false. */
  label?: string;
  showLabel?: boolean;
  minLabel?: string;
  maxLabel?: string;
  /** Large "6/10" readout above the track (the Today check-in). */
  readout?: boolean;
  /** Small "Clear" link once a number is set (fields where no answer is a valid answer). */
  clearable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const v = value ?? null;
  // Refs: the responder is created once, so it reads the latest values from here.
  const live = useRef({ width, v, onChange, startX: 0 });
  live.current.width = width;
  live.current.v = v;
  live.current.onChange = onChange;

  const usable = Math.max(1, width - THUMB);
  const xOf = (n: number) => THUMB / 2 + (n / 10) * usable;
  const valueAt = (x: number) => Math.max(0, Math.min(10, Math.round(((x - THUMB / 2) / Math.max(1, live.current.width - THUMB)) * 10)));
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
        <View style={styles.readout} aria-hidden>
          {v == null ? (
            <Txt variant="secondary">Slide or tap to choose</Txt>
          ) : (
            <Txt style={[styles.readNum, { color: colors.ink }]}>
              {String(v)}<Txt style={styles.readUnit}>/10</Txt>
            </Txt>
          )}
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
        style={[styles.hit, Platform.OS === 'web' && ({ cursor: 'pointer', touchAction: 'pan-y', userSelect: 'none', outlineStyle: 'none' } as object)]}
      >
        {/* Track: the ramp, faint in full; vivid up to her number. */}
        <View pointerEvents="none" style={[styles.track, { left: THUMB / 2 - TRACK_H / 2, right: THUMB / 2 - TRACK_H / 2, backgroundColor: c.chartTrack }]}>
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
          <View key={n} pointerEvents="none" style={[styles.tick, { left: xOf(n) - 1, backgroundColor: v != null && n <= v ? 'rgba(255,255,255,0.55)' : c.borderStrong }]} />
        )) : null}
        {v != null && width > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              { left: xOf(v) - THUMB / 2, backgroundColor: c.ramp[step], borderColor: c.surface },
              dragging && { transform: [{ scale: 1.12 }] },
            ]}
          >
            <Txt style={[styles.thumbNum, { color: c.rampFg[step] }]}>{String(v)}</Txt>
          </View>
        ) : null}
      </View>
      <View style={styles.ends} aria-hidden>
        <Txt variant="caption">{`0 · ${minLabel}`}</Txt>
        <Txt variant="caption">{`${maxLabel} · 10`}</Txt>
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
  readout: { minHeight: 44, justifyContent: 'flex-end', marginBottom: space.xxs },
  readNum: { ...font.roundedBold, fontSize: 40, lineHeight: 44, fontVariant: ['tabular-nums'] },
  readUnit: { ...font.rounded, fontSize: 17, lineHeight: 22, color: colors.ink2 },
  hit: { height: HIT_H, justifyContent: 'center' },
  track: { position: 'absolute', height: TRACK_H, borderRadius: TRACK_H / 2, overflow: 'hidden', top: (HIT_H - TRACK_H) / 2 },
  tick: { position: 'absolute', width: 2, height: 4, borderRadius: 1, top: (HIT_H - 4) / 2 },
  thumb: {
    position: 'absolute', top: (HIT_H - THUMB) / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
  },
  thumbNum: { ...font.roundedBold, fontSize: 14, lineHeight: 17 },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 },
  clear: { alignSelf: 'flex-end', color: colors.accent, fontWeight: '600', paddingVertical: space.xs, paddingLeft: space.md, borderRadius: radii.pill },
});
