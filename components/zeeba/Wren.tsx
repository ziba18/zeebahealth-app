// Wren, the knitted hot-water bottle. Since 23 Nov 2026 (owner: "keep wren knitted everywhere") Wren is ONE
// picture: the knitted plush made in ChatGPT (design/gpt-images-2026-11-23/zeeba-gpt-10-wren-knitted.png), cut
// out from its white background. The drawn, posed Wren this replaces is in git:
//   git show 6ca38f4:components/zeeba/Wren.tsx
// The props are unchanged, so every screen keeps working. A photograph has one pose (one mitten waving, one
// down), so `mood` no longer changes the face or the arms: it only changes how Wren moves (asleep = slower
// breathing, wave = a small sway). `pointAt` is accepted and ignored.
// Rules that still hold: Wren reacts to recording, never to the pain number; never on the Doctor tab or the PDF.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, View, type ViewStyle } from 'react-native';
import { useReduceMotion } from './kit-parts/Sheet';
import { haptics } from '../../lib/haptics';

export type WrenMood =
  | 'idle' | 'happy' | 'listening' | 'comfort' | 'proud' | 'sleepy'
  | 'wave' | 'point' | 'thinking';

export type WrenPointAt = 'left' | 'right' | 'up' | 'down';

type Props = {
  mood?: WrenMood;
  /** Rendered width in points. Height follows the picture (about the same as the width). */
  size?: number;
  /** Breathing and the other small movements (off automatically under Reduce Motion). */
  animated?: boolean;
  /** Hidden from screen readers: use when nearby text already says the same thing. */
  decorative?: boolean;
  /** Kept for callers; the picture has one pose. */
  pointAt?: WrenPointAt;
  /** Tapping Wren gives a little hop. Off by default. */
  interactive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

const SOURCE = require('../../assets/wren/wren-knitted.png');

/** Height ÷ width of the picture, for callers that lay Wren out by height. */
export const WREN_ASPECT = 720 / 717;

const LABEL = 'Wren, a knitted hot-water bottle, waving';
const ND = Platform.OS !== 'web';
const HIDDEN = { accessible: false, importantForAccessibility: 'no-hide-descendants' as const, accessibilityElementsHidden: true, 'aria-hidden': true };

export function Wren({
  mood = 'idle', size = 120, animated = true, decorative = false, interactive = false, onPress, style,
}: Props) {
  const reduceMotion = useReduceMotion();
  const moving = animated && !reduceMotion;
  const breath = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const [, setTaps] = useState(0);

  // Breathing: slower asleep, a touch quicker when happy or proud.
  useEffect(() => {
    if (!moving) { breath.setValue(0); return undefined; }
    const duration = mood === 'sleepy' ? 3200 : mood === 'happy' || mood === 'proud' ? 1500 : 2100;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        Animated.timing(breath, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [moving, mood, breath]);

  const doHop = () => {
    if (!moving) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.spring(hop, { toValue: 0, friction: 4, tension: 120, useNativeDriver: ND }),
    ]).start();
  };

  // A new mood gets a small hop, so Wren still visibly answers what she did.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    doHop();
  }, [mood]); // eslint-disable-line react-hooks/exhaustive-deps

  const sway = mood === 'wave' ? 2.5 : mood === 'sleepy' ? 0 : 1;
  const figure = (
    <Animated.View
      style={{
        width: size,
        height: size * WREN_ASPECT,
        transformOrigin: '50% 100%',
        transform: [
          { translateY: Animated.add(
            breath.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.012] }),
            hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.09] }),
          ) },
          { scaleY: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) },
          { rotate: breath.interpolate({ inputRange: [0, 1], outputRange: [`-${sway}deg`, `${sway}deg`] }) },
        ],
      }}
    >
      <Image source={SOURCE} resizeMode="contain" style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
    </Animated.View>
  );

  const box = [{ width: size, height: size * WREN_ASPECT }, style];
  if (interactive || onPress) {
    return (
      <Pressable
        style={box}
        onPress={() => { haptics.light(); setTaps((n) => n + 1); doHop(); onPress?.(); }}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={LABEL}
        {...(decorative ? HIDDEN : null)}
      >
        {figure}
      </Pressable>
    );
  }
  const a11y = decorative ? HIDDEN : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: LABEL };
  return <View style={box} {...a11y}>{figure}</View>;
}

export default Wren;
