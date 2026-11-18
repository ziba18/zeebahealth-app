// The guided tour's picture: a dimmed screen with a spotlight on ONE control, Wren standing next to it and
// pointing, a bubble of eight words or fewer, and two big buttons ("Skip tour" is always there, so nobody is
// ever trapped). Steps and memory live in lib/tour.ts. Mounted once in the tabs layout.
//
// How it is drawn: a full-window Modal (so its coordinates are the window's, the same ones measureInWindow gives
// on iPhone and on web); the dim is one SVG path with a rounded hole cut out of it (even-odd fill), which moves
// from one target to the next. Under Reduce Motion the hole jumps and nothing loops.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, space } from '../../../constants/zeebaUI';
import { TOUR_STEPS, endTour, measureTarget, nextTourStep, useTour, type Rect } from '../../../lib/tour';
import { todayKey } from '../../../lib/records/dates';
import { useRecordsStore } from '../../../stores/recordsStore';
import { Button } from '../kit-parts/controls';
import { useReduceMotion } from '../kit-parts/Sheet';
import { Txt } from '../kit-parts/Txt';
import { Pop } from '../motion';
import { Wren, WREN_ASPECT } from '../Wren';

const ND = Platform.OS !== 'web';
const DIM = 'rgba(8,10,22,0.66)';
const WREN = 96;
const GUTTER = 16;

const holePath = (W: number, H: number, r: Rect, rad: number) => {
  const R = Math.max(0, Math.min(rad, r.w / 2, r.h / 2));
  const x = r.x; const y = r.y; const w = r.w; const h = r.h;
  return (
    `M0 0H${W}V${H}H0Z` +
    `M${x + R} ${y}H${x + w - R}A${R} ${R} 0 0 1 ${x + w} ${y + R}V${y + h - R}A${R} ${R} 0 0 1 ${x + w - R} ${y + h}` +
    `H${x + R}A${R} ${R} 0 0 1 ${x} ${y + h - R}V${y + R}A${R} ${R} 0 0 1 ${x + R} ${y}Z`
  );
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function TourOverlay() {
  const step = useTour((s) => s.step);
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  // Today's first step reads differently once today is already on the record (the slider is put away then).
  const doneToday = useRecordsStore((s) => s.records.symptom.some((r) => r.data.date === todayKey()));

  const [hole, setHole] = useState<Rect | null>(null); // where the spotlight is drawn now
  const [shown, setShown] = useState<number | null>(null); // the step whose words are on screen
  const from = useRef<Rect | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  // Find the step's target, then glide the spotlight to it.
  useEffect(() => {
    if (step === null) { setHole(null); setShown(null); from.current = null; fade.setValue(0); return undefined; }
    let alive = true;
    let anim: Animated.CompositeAnimation | null = null;
    const meta = TOUR_STEPS[step];
    (async () => {
      // A couple of tries: the screen may still be settling when the tour opens.
      let r: Rect | null = null;
      for (let i = 0; i < 4 && !r && alive; i++) {
        r = await measureTarget(meta.target);
        if (!r) await new Promise((res) => setTimeout(res, 120));
      }
      if (!alive) return;
      if (!r) { nextTourStep(); return; } // nothing to point at: move on rather than point at nothing
      const to: Rect = { x: r.x - meta.pad, y: r.y - meta.pad, w: r.w + meta.pad * 2, h: r.h + meta.pad * 2 };
      const start = from.current;
      from.current = to;
      setShown(step);
      if (!start || reduce) {
        setHole(to);
        Animated.timing(fade, { toValue: 1, duration: reduce ? 0 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
        return;
      }
      const t = new Animated.Value(0);
      const id = t.addListener(({ value }) => {
        if (alive) setHole({ x: lerp(start.x, to.x, value), y: lerp(start.y, to.y, value), w: lerp(start.w, to.w, value), h: lerp(start.h, to.h, value) });
      });
      anim = Animated.timing(t, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false });
      anim.start(() => { t.removeListener(id); if (alive) setHole(to); });
    })();
    return () => { alive = false; anim?.stop(); };
  }, [step, W, H, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  // A slow ring around the spotlight: "this one".
  useEffect(() => {
    if (step === null || reduce) { ring.setValue(0); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
      Animated.delay(400),
    ]));
    loop.start();
    return () => loop.stop();
  }, [step, reduce, ring]);

  if (step === null) return null;
  const meta = shown != null ? TOUR_STEPS[shown] : null;
  const target = from.current; // the step's resting place (the hole may still be gliding to it)
  const last = shown === TOUR_STEPS.length - 1;
  const text = meta ? (shown === 0 && doneToday ? 'This is where you record each day.' : meta.text) : '';

  // Wren stands between the bubble and the target, on whichever side has more room, and points at the target.
  let callout: React.ReactNode = null;
  if (meta && target && hole) {
    const wrenH = WREN * WREN_ASPECT;
    const spaceBelow = H - insets.bottom - (target.y + target.h);
    const spaceAbove = target.y - insets.top;
    const below = spaceBelow >= wrenH + 150 || spaceBelow >= spaceAbove;
    const wrenLeft = Math.max(GUTTER, Math.min(W - GUTTER - WREN, target.x + target.w / 2 - WREN / 2));
    const wren = (
      <View style={{ marginLeft: wrenLeft - GUTTER, width: WREN }}>
        <Wren mood="point" pointAt={below ? 'up' : 'down'} size={WREN} decorative />
      </View>
    );
    const tailLeft = Math.max(26, Math.min(W - GUTTER * 2 - 42, wrenLeft - GUTTER + WREN / 2 - 8));
    const bubble = (
      <Pop key={shown} from={0.94}>
        <View style={[styles.tail, below ? { top: -7 } : { bottom: -7 }, { left: tailLeft }]} />
        <View style={styles.bubble} accessibilityLiveRegion="polite">
          <Txt variant="title" accessibilityRole="header" style={styles.words}>{text}</Txt>
          <View style={styles.dots} accessible accessibilityLabel={`Step ${shown! + 1} of ${TOUR_STEPS.length}`}>
            {TOUR_STEPS.map((_, i) => <View key={i} style={[styles.dot, i === shown && styles.dotOn]} />)}
          </View>
          <View style={styles.buttons}>
            {last ? null : <Button label="Skip tour" variant="text" onPress={endTour} style={styles.skip} />}
            <Button label={last ? 'Done' : 'Next'} onPress={last ? endTour : nextTourStep} style={styles.next} />
          </View>
        </View>
      </Pop>
    );
    callout = (
      <View
        style={[
          styles.callout,
          below ? { top: Math.min(target.y + target.h + 6, H - insets.bottom - 300) } : { bottom: Math.min(H - target.y + 6, H - insets.top - 300) },
        ]}
      >
        {below ? <>{wren}{bubble}</> : <>{bubble}{wren}</>}
      </View>
    );
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={endTour} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} accessibilityViewIsModal>
        {/* The dim takes every touch, so nothing underneath can be pressed by mistake. */}
        <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true}>
          {hole && meta ? (
            <Svg width={W} height={H} aria-hidden>
              <Path d={holePath(W, H, hole, meta.radius)} fill={DIM} fillRule="evenodd" />
            </Svg>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />
          )}
        </View>
        {hole && meta ? (
          <>
            <View aria-hidden style={[styles.ring, { left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: Math.min(meta.radius, hole.h / 2) }]} />
            {reduce ? null : (
              <Animated.View
                aria-hidden
                style={[styles.ring, {
                  left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: Math.min(meta.radius, hole.h / 2),
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                  transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
                }]}
              />
            )}
          </>
        ) : null}
        {callout}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 2.5, borderColor: '#FFFFFF', pointerEvents: 'none' },
  callout: { position: 'absolute', left: 0, right: 0, paddingHorizontal: GUTTER, gap: 4, pointerEvents: 'box-none' },
  bubble: {
    backgroundColor: colors.surface, borderRadius: 26, padding: space.md, gap: space.sm,
    borderWidth: 1, borderColor: colors.cardBorder, boxShadow: '0 2px 6px rgba(0,0,0,0.12), 0 16px 40px rgba(0,0,0,0.28)',
    maxWidth: 480, width: '100%', alignSelf: 'center',
  },
  tail: { position: 'absolute', width: 16, height: 16, borderRadius: 3, backgroundColor: colors.surface, transform: [{ rotate: '45deg' }] },
  words: { fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.hairline },
  dotOn: { width: 22, backgroundColor: colors.accent },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xxs },
  skip: { minHeight: 52, paddingHorizontal: space.md },
  next: { flex: 1, minHeight: 52 },
  _: { borderRadius: radii.pill },
});
