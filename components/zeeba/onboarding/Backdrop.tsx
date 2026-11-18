// The calm moving background behind the first-run screens: three very soft glows that drift slowly.
// Each glow is one SVG radial gradient inside an Animated.View, moved with plain transforms. They stand still
// under Reduce Motion. Colours are plain hex from useColors() (SVG cannot take the dynamic tokens).
import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useColors } from '../../../constants/zeebaUI';
import { useReduceMotion } from '../motion';

const ND = Platform.OS !== 'web';
const EASE = Easing.inOut(Easing.sin);

function Glow({ id, size, color, opacity }: { id: string; size: number; color: string; opacity: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.42} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill={`url(#${id})`} />
    </Svg>
  );
}

/** A soft pool of light for Wren or a picture to stand on, so it lifts off the moving background. */
export function Halo({ size }: { size: number }) {
  const c = useColors();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const dark = c.scheme === 'dark';
  return (
    <View style={{ position: 'absolute', width: size, height: size, alignSelf: 'center', pointerEvents: 'none' }} aria-hidden>
      <Glow id={`${uid}h`} size={size} color={dark ? '#FFB08A' : '#FFFFFF'} opacity={dark ? 0.2 : 0.95} />
    </View>
  );
}

/**
 * `strength`: 'full' for the welcome and celebration screens, 'soft' for screens with a form or a question
 * (one faint glow at the top, so the content stays the loudest thing).
 */
export function GlowBackdrop({ strength = 'full' }: { strength?: 'full' | 'soft' }) {
  const c = useColors();
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) { a.setValue(0.5); b.setValue(0.5); return; }
    const loop = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: EASE, useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: EASE, useNativeDriver: ND }),
    ]));
    const la = loop(a, 9000);
    const lb = loop(b, 13000);
    la.start(); lb.start();
    return () => { la.stop(); lb.stop(); };
  }, [reduce, a, b]);

  const dark = c.scheme === 'dark';
  const w = Math.min(width, 600);
  const k = strength === 'soft' ? 0.55 : 1;
  const big = w * 1.25;
  const mid = w * 1.05;
  const move = (v: Animated.Value, x: number, y: number, s = 1.1) => ({
    transform: [
      { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-x, x] }) },
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, -y] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, s] }) },
    ],
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden>
      <Animated.View style={[styles.blob, { left: -big * 0.38, top: -big * 0.42 }, move(a, 18, 14)]}>
        <Glow id={`${uid}a`} size={big} color={dark ? '#C81E55' : '#E8628A'} opacity={(dark ? 0.34 : 0.30) * k} />
      </Animated.View>
      {strength === 'full' ? (
        <>
          <Animated.View style={[styles.blob, { left: w - mid * 0.56, top: height * 0.22 }, move(b, -22, 20, 1.14)]}>
            <Glow id={`${uid}b`} size={mid} color={dark ? '#FF9468' : '#FFB08A'} opacity={dark ? 0.2 : 0.3} />
          </Animated.View>
          <Animated.View style={[styles.blob, { left: -mid * 0.5, top: height * 0.56 }, move(a, 24, -16, 1.08)]}>
            <Glow id={`${uid}c`} size={mid} color={dark ? '#5B5FD6' : '#F9B4C6'} opacity={dark ? 0.16 : 0.26} />
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', pointerEvents: 'none' },
  blob: { position: 'absolute' },
});
