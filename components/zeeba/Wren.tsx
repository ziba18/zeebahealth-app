// Wren — Zeeba Health's mascot: a knitted hot-water bottle in brand burgundy.
// Ported from the approved V2 concept G "Wren" (design sprint 29 Oct 2026, shared/mascot.js) to react-native-svg.
// Wren is comfort and company, never a clinician: Wren never names a condition or gives advice (see design/BRAND.md).
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type ViewStyle } from 'react-native';
import Svg, {
  Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop,
} from 'react-native-svg';

export type WrenMood = 'idle' | 'happy' | 'listening' | 'comfort' | 'proud' | 'sleepy';

type Props = {
  mood?: WrenMood;
  /** Rendered width in points; height follows the 140:176 drawing. */
  size?: number;
  /** Gentle breathing loop (off automatically when Reduce Motion is on). */
  animated?: boolean;
  /** Hidden from screen readers: use when nearby text already says the same thing. */
  decorative?: boolean;
  style?: ViewStyle;
};

// Wren's own colours: always burgundy knit, in light and dark mode (owner's favourite; never re-tinted).
const W = {
  body1: '#93304F',
  body2: '#7A1F3A',
  knit: '#5C1529',
  edge: '#5C1529',
  rib: '#FBF0EC',
  ribLine: '#F2C9CF',
  cap: '#22161A',
  cap2: '#5C4A4F',
  face: '#22161A',
  cheek: '#E58E9F',
  accent: '#F2C9CF',
};

const BODY =
  'M56 44 C56 50 50 53 42 55 C25 59 17 70 17 86 L17 138 C17 154 29 163 45 163 L95 163 C111 163 123 154 123 138 L123 86 C123 70 115 59 98 55 C90 53 84 50 84 44 Z';

const LABELS: Record<WrenMood, string> = {
  idle: 'Wren, a knitted hot-water bottle, smiling',
  happy: 'Wren, smiling with happy eyes',
  listening: 'Wren, listening',
  comfort: 'Wren, eyes closed, giving a hug',
  proud: 'Wren, arms up, proud of you',
  sleepy: 'Wren, asleep',
};

let uid = 0;

export function Wren({ mood = 'idle', size = 120, animated = true, decorative = false, style }: Props) {
  const [id] = useState(() => `wren${uid++}`);
  const [reduceMotion, setReduceMotion] = useState(false);
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!animated || reduceMotion) {
      breath.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: mood === 'sleepy' ? 3200 : 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: mood === 'sleepy' ? 3200 : 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, reduceMotion, mood, breath]);

  const scaleY = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] });
  const scaleX = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] });
  const lift = breath.interpolate({ inputRange: [0, 1], outputRange: [0, mood === 'happy' || mood === 'proud' ? -3 : 0] });

  const eyesOpen = mood === 'idle' || mood === 'listening';
  const eyesHappy = mood === 'happy' || mood === 'proud';
  const eyesClosed = mood === 'comfort' || mood === 'sleepy';
  const armsUp = mood === 'proud';
  const armsHug = mood === 'comfort';

  return (
    <View
      style={[{ width: size, height: (size * 176) / 140 }, style]}
      {...(decorative
        ? { accessible: false, importantForAccessibility: 'no-hide-descendants' as const, accessibilityElementsHidden: true, 'aria-hidden': true }
        : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: LABELS[mood] })}
    >
      <Animated.View style={{ flex: 1, transform: [{ translateY: lift }, { scaleX }, { scaleY }] }}>
        <Svg width="100%" height="100%" viewBox="-8 -14 156 194">
          <Defs>
            <LinearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={W.body1} />
              <Stop offset="1" stopColor={W.body2} />
            </LinearGradient>
            <RadialGradient id={`${id}h`} cx="0.3" cy="0.25" r="0.7">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
              <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={W.knit} stopOpacity={0.22} />
              <Stop offset="0.18" stopColor={W.knit} stopOpacity={0} />
              <Stop offset="0.82" stopColor={W.knit} stopOpacity={0} />
              <Stop offset="1" stopColor={W.knit} stopOpacity={0.26} />
            </LinearGradient>
            <Pattern id={`${id}k`} width="7" height="6" patternUnits="userSpaceOnUse">
              <Path d="M.5 .5 L3.5 4.5 L6.5 .5" fill="none" stroke={W.knit} strokeWidth={1.1} strokeLinecap="round" opacity={0.3} />
            </Pattern>
            <LinearGradient id={`${id}cap`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={W.cap} />
              <Stop offset="0.45" stopColor={W.cap2} />
              <Stop offset="1" stopColor={W.cap} />
            </LinearGradient>
            <RadialGradient id={`${id}b`} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={W.cheek} stopOpacity={0.85} />
              <Stop offset="1" stopColor={W.cheek} stopOpacity={0} />
            </RadialGradient>
            <ClipPath id={`${id}clip`}>
              <Path d={BODY} />
            </ClipPath>
          </Defs>

          {/* steam: warmth, only when awake and content */}
          {(mood === 'idle' || mood === 'happy' || mood === 'comfort') && (
            <G fill="none" stroke={W.accent} strokeWidth={2.6} strokeLinecap="round" opacity={0.8}>
              <Path d="M60 10 C55 4 64 -1 59 -8" />
              <Path d="M70 7 C65 0 75 -4 70 -12" />
              <Path d="M80 10 C75 4 84 -1 79 -8" />
            </G>
          )}

          <Ellipse cx="70" cy="170" rx="44" ry="4.5" fill="#000000" opacity={0.08} />

          {/* arms */}
          <G transform={`rotate(${armsUp ? -34 : armsHug ? -22 : 0} 30 112)`}>
            <Path d="M24 104 C12 106 6 118 10 127 C13 133 21 132 25 126 C28 121 29 113 30 108Z" fill={W.body2} />
            <Path d="M11 124 C14 129 19 129 22 126" fill="none" stroke={W.rib} strokeWidth={3} strokeLinecap="round" />
          </G>
          <G transform={`rotate(${armsUp ? 34 : armsHug ? 22 : 0} 110 112)`}>
            <Path d="M116 104 C128 106 134 118 130 127 C127 133 119 132 115 126 C112 121 111 113 110 108Z" fill={W.body2} />
            <Path d="M129 124 C126 129 121 129 118 126" fill="none" stroke={W.rib} strokeWidth={3} strokeLinecap="round" />
          </G>

          {/* body */}
          <Path d={BODY} fill={`url(#${id}c)`} />
          <G clipPath={`url(#${id}clip)`}>
            <Rect x="0" y="40" width="140" height="130" fill={`url(#${id}k)`} />
            <Rect x="0" y="40" width="140" height="130" fill={`url(#${id}s)`} />
            <Rect x="10" y="148" width="120" height="20" fill={W.rib} />
            <G stroke={W.ribLine} strokeWidth={1.4} strokeLinecap="round">
              {Array.from({ length: 17 }, (_, i) => (
                <Path key={i} d={`M${22 + i * 6} 150v12`} />
              ))}
            </G>
            <Ellipse cx="50" cy="78" rx="38" ry="30" fill={`url(#${id}h)`} />
          </G>
          <Path d={BODY} fill="none" stroke={W.edge} strokeOpacity={0.35} strokeWidth={1.4} />

          {/* neck + cap */}
          <Rect x="46" y="34" width="48" height="18" rx="9" fill={W.rib} />
          <G stroke={W.ribLine} strokeWidth={1.6} strokeLinecap="round">
            {[52, 58, 64, 70, 76, 82, 88].map((x) => (
              <Path key={x} d={`M${x} 38v10`} />
            ))}
          </G>
          <Rect x="57" y="17" width="26" height="20" rx="5" fill={`url(#${id}cap)`} />
          <G stroke={W.cap} strokeWidth={1.3} opacity={0.5}>
            {[62, 67, 72, 77].map((x) => (
              <Path key={x} d={`M${x} 21v12`} />
            ))}
          </G>
          <Rect x="54" y="13" width="32" height="7" rx="3.5" fill={W.cap2} />
          <Rect x="58" y="14.4" width="14" height="2" rx="1" fill="#FFFFFF" opacity={0.35} />

          {/* stitched heart patch */}
          <Path d="M101 131 C95 126 92 122 95 118.5 C97.5 116 100 117.5 101 119 C102 117.5 104.5 116 107 118.5 C110 122 107 126 101 131Z" fill={W.rib} />
          <Path
            d="M101 128 C96.5 124 95 121.5 96.8 119.6 C98.5 118 100.2 119.2 101 120.6 C101.8 119.2 103.5 118 105.2 119.6 C107 121.5 105.5 124 101 128Z"
            fill="none" stroke={W.cheek} strokeWidth={0.9} strokeDasharray="1.6 1.4"
          />

          {/* face */}
          {eyesOpen && (
            <G fill={W.face}>
              <Ellipse cx="57" cy="96" rx="4.6" ry="5.8" />
              <Ellipse cx="83" cy="96" rx="4.6" ry="5.8" />
              <Circle cx="58.8" cy="93.8" r="1.7" fill="#FFFFFF" />
              <Circle cx="84.8" cy="93.8" r="1.7" fill="#FFFFFF" />
            </G>
          )}
          {eyesHappy && (
            <G fill="none" stroke={W.face} strokeWidth={3.2} strokeLinecap="round">
              <Path d="M52 98 Q57 90.5 62 98" />
              <Path d="M78 98 Q83 90.5 88 98" />
            </G>
          )}
          {eyesClosed && (
            <G fill="none" stroke={W.face} strokeWidth={2.8} strokeLinecap="round">
              <Path d="M52 96 Q57 100.5 62 96" />
              <Path d="M78 96 Q83 100.5 88 96" />
            </G>
          )}
          <Ellipse cx="46" cy="107" rx="9" ry="6" fill={`url(#${id}b)`} />
          <Ellipse cx="94" cy="107" rx="9" ry="6" fill={`url(#${id}b)`} />
          {mood === 'listening' ? (
            <Ellipse cx="70" cy="108.5" rx="3.4" ry="4" fill={W.face} />
          ) : mood === 'sleepy' ? (
            <Path d="M67 108 Q70 110 73 108" fill="none" stroke={W.face} strokeWidth={2.4} strokeLinecap="round" />
          ) : (
            <Path d="M64 106 Q70 112 76 106" fill="none" stroke={W.face} strokeWidth={2.6} strokeLinecap="round" />
          )}

          {/* listening rings */}
          {mood === 'listening' && (
            <G fill="none" stroke="#7A1F3A" strokeWidth={2.4} strokeLinecap="round" opacity={0.7}>
              <Path d="M128 84 Q134 92 128 100" />
              <Path d="M134 78 Q143 92 134 106" />
            </G>
          )}
          {/* proud sparkles */}
          {mood === 'proud' && (
            <G fill={W.cheek}>
              <Path d="M12 46 l3.4 8 8 3.4 -8 3.4 -3.4 8 -3.4 -8 -8 -3.4 8 -3.4z" />
              <Path d="M124 28 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" />
              <Path d="M128 142 l2.8 6.4 6.4 2.8 -6.4 2.8 -2.8 6.4 -2.8 -6.4 -6.4 -2.8 6.4 -2.8z" />
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

export default Wren;
