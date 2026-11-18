// Entrance: fade + 14 pt rise, staggered by `index` (60 ms apart, capped at 8 so long lists don't lag): the same
// values as motion.tsx's Rise, so every card in the app arrives the same way. Plays once on mount; instant
// under Reduce Motion.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceMotion } from './Sheet';

export function FadeIn({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const reduceMotion = useReduceMotion();
  const t = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) { t.setValue(1); return; }
    const anim = Animated.timing(t, {
      toValue: 1, duration: 280, delay: Math.min(index, 8) * 60, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    });
    anim.start();
    return () => anim.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}
