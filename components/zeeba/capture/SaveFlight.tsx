// The chip that flies from a saved entry to the Doctor tab (see saveMoment.ts). Mounted once in the tabs layout,
// above the screens and the tab bar; it never takes a touch. Under Reduce Motion there is no flight at all.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, font, radii, severityColor } from '../../../constants/zeebaUI';
import { measureTarget, type Measurable } from '../../../lib/tour';
import { Icon } from '../../ui/Icon';
import { useReduceMotion } from '../kit-parts/Sheet';
import { Txt } from '../kit-parts/Txt';
import { flightDone, useSaveMoment } from './saveMoment';

const ND = Platform.OS !== 'web';
const CHIP_W = 64;
const CHIP_H = 34;

type Path = { id: number; x0: number; y0: number; dx: number; dy: number; value: number | null };

export function SaveFlight() {
  const flight = useSaveMoment((s) => s.flight);
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const host = useRef<Measurable | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flight) return undefined;
    if (reduce) { flightDone(false); return undefined; }
    let alive = true;
    let anim: Animated.CompositeAnimation | null = null;
    (async () => {
      const to = await measureTarget('tab-doctor');
      // This layer may not start at the window's corner (iPad, wide web): work in its own coordinates.
      const origin = await new Promise<{ x: number; y: number }>((resolve) => {
        const node = host.current;
        if (!node?.measureInWindow) { resolve({ x: 0, y: 0 }); return; }
        node.measureInWindow((x, y) => resolve({ x: x || 0, y: y || 0 }));
        setTimeout(() => resolve({ x: 0, y: 0 }), 300);
      });
      if (!alive) return;
      if (!to) { flightDone(false); return; }
      const from = flight.from ?? { x: origin.x + width / 2 - CHIP_W / 2, y: origin.y + height * 0.56, w: CHIP_W, h: CHIP_H };
      const x0 = from.x + from.w / 2 - origin.x;
      const y0 = from.y + from.h / 2 - origin.y;
      const x1 = to.x + to.w / 2 - origin.x;
      const y1 = to.y + to.h / 2 - origin.y - 6;
      setPath({ id: flight.id, x0, y0, dx: x1 - x0, dy: y1 - y0, value: flight.value });
      t.setValue(0);
      anim = Animated.timing(t, { toValue: 1, duration: 720, easing: Easing.bezier(0.45, 0, 0.3, 1), useNativeDriver: ND });
      anim.start(({ finished }) => {
        if (!alive) return;
        setPath(null);
        flightDone(finished);
      });
    })();
    return () => { alive = false; anim?.stop(); };
  }, [flight?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sev = path?.value != null ? severityColor(path.value) : null;
  return (
    <View ref={((node: unknown) => { host.current = node as Measurable | null; }) as any} style={styles.layer} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {path ? (
        <Animated.View
          style={[
            styles.chip,
            { left: path.x0 - CHIP_W / 2, top: path.y0 - CHIP_H / 2, backgroundColor: sev ? sev.bg : colors.accent },
            {
              opacity: t.interpolate({ inputRange: [0, 0.08, 0.86, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, path.dx] }) },
                // Lifts a little first, then drops into the tab: reads as a throw, not a slide.
                { translateY: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, -34, path.dy] }) },
                { scale: t.interpolate({ inputRange: [0, 0.18, 0.7, 1], outputRange: [0.9, 1.1, 0.9, 0.5] }) },
              ],
            },
          ]}
        >
          {path.value != null ? (
            <Txt style={[styles.num, { color: sev!.fg }]}>{`${path.value}/10`}</Txt>
          ) : (
            <Icon name="pencil" size={18} color={colors.onAccent} />
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // box-none must live in StyleSheet.create on web (see toast.tsx).
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 900, pointerEvents: 'none' },
  chip: {
    position: 'absolute', width: CHIP_W, height: CHIP_H, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface, boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.20)',
  },
  num: { ...font.roundedBold, fontSize: 16, lineHeight: 20, fontVariant: ['tabular-nums'] },
});
