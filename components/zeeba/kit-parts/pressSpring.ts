// Shared iOS-style press-in: scale to 0.97 with a quick spring, back on release. Web-safe.
import { useRef, useState } from 'react';
import { Animated, Platform, Pressable } from 'react-native';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function usePressSpring(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const run = (v: number) =>
    Animated.spring(scale, { toValue: v, speed: 40, bounciness: 4, useNativeDriver: Platform.OS !== 'web' }).start();
  return {
    scale,
    pressed,
    onPressIn: () => { setPressed(true); run(to); },
    onPressOut: () => { setPressed(false); run(1); },
  };
}
