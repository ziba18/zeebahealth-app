// Wren — Zeeba Health's mascot: a knitted hot-water bottle in brand burgundy.
// Version 3 (11 Nov 2026): redrawn with soft 3D lighting (key light, rim light, contact shadow), cream mittens
// that can wave and point, feet, glossy eyes that blink, and springy movement. Still one small vector drawing:
// gradients, a clip path and one pattern, no image files and no SVG filters, so it looks the same on iOS and web.
//
// How it moves: the drawing is split into a few stacked layers (shadow, steam, feet, arms, body, eyes, extras).
// Each layer is its own <Svg> inside an Animated.View, so every movement is a plain view transform on the
// native driver. Nothing inside the SVG is animated.
//
// Wren is comfort and company, never a clinician: Wren never names a condition or gives advice (design/BRAND.md).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, {
  Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop,
} from 'react-native-svg';
import { useReduceMotion } from './kit-parts/Sheet';
import { haptics } from '../../lib/haptics';

export type WrenMood =
  | 'idle' | 'happy' | 'listening' | 'comfort' | 'proud' | 'sleepy' // the original six
  | 'wave' | 'point' | 'thinking';

export type WrenPointAt = 'left' | 'right' | 'up' | 'down';

type Props = {
  mood?: WrenMood;
  /** Rendered width in points. Height follows the drawing (about 1.05 × width). */
  size?: number;
  /** Breathing, blinking and the other small movements (off automatically under Reduce Motion). */
  animated?: boolean;
  /** Hidden from screen readers: use when nearby text already says the same thing. */
  decorative?: boolean;
  /** With mood="point": which way the mitten points. Default right. */
  pointAt?: WrenPointAt;
  /** Tapping Wren gives a little hop and a happy face. Off by default. */
  interactive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

/** Height ÷ width of the drawing, for callers that lay Wren out by height. */
export const WREN_ASPECT = 256 / 244;

// Wren's own colours: always burgundy knit, in light and dark mode (never re-tinted).
const C = {
  hi: '#CC6386', mid: '#9A3353', base: '#7A1F3A', deep: '#531025', line: '#3F0A1A',
  bone: '#FBF0EC', boneHi: '#FFFAF7', boneLo: '#D9BDBB', boneEdge: '#C9A4A6', rib: '#E9C3C6',
  cap: '#2A161C', capHi: '#7A5863', face: '#24101A', cheek: '#F08BA3', pinkLight: '#FFB3C7',
  gold: '#FFC857',
};

const VB = { x: -22, y: -24, w: 244, h: 256 };
const VIEWBOX = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
/** A point in drawing units as a transform origin for a full-size layer. */
const origin = (x: number, y: number) => `${(((x - VB.x) / VB.w) * 100).toFixed(2)}% ${(((y - VB.y) / VB.h) * 100).toFixed(2)}%`;
const ORIGIN_FEET = origin(100, 214);
const ORIGIN_ARM_L = origin(36, 122);
const ORIGIN_ARM_R = origin(164, 122);
const ORIGIN_EYES = origin(100, 126);
const ORIGIN_TOP = origin(100, 30);

const BODY =
  'M80 58 C80 69 71 73 59 77 C40 83 29 98 28 120 C27 138 27 152 29 168 C32 191 48 205 72 205 L128 205 ' +
  'C152 205 168 191 171 168 C173 152 173 138 172 120 C171 98 160 83 141 77 C129 73 120 69 120 58 Z';
const SLEEVE = 'M-10.5 -2 C-10.5 -13 10.5 -13 10.5 -2 L8.6 27 L-8.6 27 Z';
const HEART = 'M146 176.5 C137.5 169 133 163.5 137 158 C140.5 153.8 144.6 156 146 158.8 C147.4 156 151.5 153.8 155 158 C159 163.5 154.5 169 146 176.5 Z';
const STAR = 'M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z';

type Eyes = 'open' | 'happy' | 'closed';
type Mouth = 'smile' | 'open' | 'o' | 'tiny' | 'soft';
type Extra = 'sparkles' | 'rings' | 'heart' | 'zzz';
type Pose = {
  eyes: Eyes; mouth: Mouth;
  /** Degrees each arm is lifted outward from hanging straight down. 32 rests, 92 points sideways, 148 is raised. */
  armL: number; armR: number;
  /** Arms drawn over the body (a hug). */
  front?: boolean | 'L' | 'R';
  extra?: Extra; steam?: boolean; look?: [number, number];
  /** Which arm wags (wave / point), and by how many degrees. */
  wag?: { arm: 'L' | 'R'; by: number };
  /** Rises a little with each breath. */
  lift?: number;
};

const REST = 32;
const POSES: Record<WrenMood, Pose> = {
  idle: { eyes: 'open', mouth: 'smile', armL: REST, armR: REST, steam: true },
  happy: { eyes: 'happy', mouth: 'open', armL: 62, armR: 62, steam: true, lift: 4 },
  wave: { eyes: 'open', mouth: 'open', armL: REST, armR: 146, steam: true, wag: { arm: 'R', by: 15 }, lift: 2 },
  proud: { eyes: 'happy', mouth: 'open', armL: 148, armR: 148, extra: 'sparkles', lift: 5 },
  listening: { eyes: 'open', mouth: 'o', armL: REST, armR: REST, extra: 'rings' },
  comfort: { eyes: 'closed', mouth: 'soft', armL: -24, armR: -24, front: true, extra: 'heart' },
  sleepy: { eyes: 'closed', mouth: 'tiny', armL: 26, armR: 26, extra: 'zzz' },
  point: { eyes: 'open', mouth: 'smile', armL: REST, armR: 92, steam: true, look: [1, 0], wag: { arm: 'R', by: 5 } },
  thinking: { eyes: 'open', mouth: 'tiny', armL: REST, armR: REST, look: [0.7, -1] },
};

function poseFor(mood: WrenMood, pointAt: WrenPointAt): Pose {
  const p = POSES[mood] ?? POSES.idle;
  if (mood !== 'point') return p;
  switch (pointAt) {
    case 'left': return { ...p, armL: 92, armR: REST, look: [-1, 0], wag: { arm: 'L', by: 5 } };
    case 'up': return { ...p, armR: 150, look: [0.5, -1], wag: { arm: 'R', by: 5 } };
    // Down: the left mitten comes across the front of the body and taps downward, eyes following.
    case 'down': return { ...p, armL: -5, armR: REST, front: 'L', look: [-0.3, 1], wag: { arm: 'L', by: 9 } };
    default: return p;
  }
}

const LABELS: Record<WrenMood, string> = {
  idle: 'Wren, a knitted hot-water bottle, smiling',
  happy: 'Wren, smiling with happy eyes',
  listening: 'Wren, listening',
  comfort: 'Wren, eyes closed, giving a hug',
  proud: 'Wren, arms up, proud of you',
  sleepy: 'Wren, asleep',
  wave: 'Wren, waving hello',
  point: 'Wren, pointing the way',
  thinking: 'Wren, thinking',
};

const ND = Platform.OS !== 'web';
const HIDDEN = { accessible: false, importantForAccessibility: 'no-hide-descendants' as const, accessibilityElementsHidden: true, 'aria-hidden': true };

let uid = 0;

function Layer({ children }: { children: React.ReactNode }) {
  return (
    <Svg width="100%" height="100%" viewBox={VIEWBOX} style={StyleSheet.absoluteFill}>
      {children}
    </Svg>
  );
}

const ribs = (x0: number, n: number, step: number, y1: number, y2: number) =>
  Array.from({ length: n }, (_, i) => <Path key={i} d={`M${x0 + i * step} ${y1}V${y2}`} />);

/** One arm, drawn hanging straight down from its shoulder; the layer's view rotates it. */
function ArmArt({ id, side }: { id: string; side: 'L' | 'R' }) {
  const g = `${id}a${side}`;
  return (
    <Layer>
      <Defs>
        <LinearGradient id={`${g}s`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.mid} /><Stop offset="0.5" stopColor={C.base} /><Stop offset="1" stopColor={C.deep} />
        </LinearGradient>
        <RadialGradient id={`${g}m`} cx="0.36" cy="0.28" r="0.85">
          <Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.55" stopColor={C.bone} /><Stop offset="1" stopColor={C.boneLo} />
        </RadialGradient>
        <LinearGradient id={`${g}c`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.boneLo} /><Stop offset="0.3" stopColor={C.boneHi} /><Stop offset="1" stopColor={C.boneLo} />
        </LinearGradient>
      </Defs>
      <G transform={side === 'L' ? 'translate(36 122)' : 'translate(164 122) scale(-1 1)'}>
        <Path d={SLEEVE} fill={`url(#${g}s)`} />
        <Path d={SLEEVE} fill="none" stroke={C.line} strokeOpacity={0.3} strokeWidth={1.2} />
        <Path d="M-6.4 0 L-5.4 22" fill="none" stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={3} strokeLinecap="round" />
        <Ellipse cx={9.4} cy={35.5} rx={4.6} ry={6.2} transform="rotate(-28 9.4 35.5)" fill={`url(#${g}m)`} stroke={C.boneEdge} strokeWidth={1} />
        <Ellipse cx={0} cy={40} rx={11.6} ry={12.4} fill={`url(#${g}m)`} stroke={C.boneEdge} strokeWidth={1} />
        <Path d="M-6.5 35 Q-5 31.5 -1.5 30.6" fill="none" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={2.2} strokeLinecap="round" />
        <Rect x={-10} y={23.5} width={20} height={8} rx={4} fill={`url(#${g}c)`} stroke={C.boneEdge} strokeWidth={0.9} />
        <G stroke={C.rib} strokeWidth={1.5} strokeLinecap="round">
          <Path d="M-5.4 25.6V29.6" /><Path d="M-1.8 25.6V29.6" /><Path d="M1.8 25.6V29.6" /><Path d="M5.4 25.6V29.6" />
        </G>
      </G>
    </Layer>
  );
}

function BodyArt({ id, mouth }: { id: string; mouth: Mouth }) {
  const b = `${id}b`;
  return (
    <Layer>
      <Defs>
        <RadialGradient id={`${b}body`} cx="0.34" cy="0.2" r="0.98">
          <Stop offset="0" stopColor={C.hi} /><Stop offset="0.36" stopColor={C.mid} />
          <Stop offset="0.74" stopColor={C.base} /><Stop offset="1" stopColor={C.deep} />
        </RadialGradient>
        <LinearGradient id={`${b}shade`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.5" stopColor={C.line} stopOpacity={0} /><Stop offset="1" stopColor={C.line} stopOpacity={0.5} />
        </LinearGradient>
        <LinearGradient id={`${b}rim`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0.7" stopColor={C.pinkLight} stopOpacity={0} /><Stop offset="1" stopColor={C.pinkLight} stopOpacity={0.42} />
        </LinearGradient>
        <RadialGradient id={`${b}sheen`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.46} /><Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${b}ao`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={C.line} stopOpacity={0.55} /><Stop offset="1" stopColor={C.line} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${b}bone`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.boneLo} /><Stop offset="0.28" stopColor={C.boneHi} />
          <Stop offset="0.62" stopColor={C.bone} /><Stop offset="1" stopColor={C.boneLo} />
        </LinearGradient>
        <LinearGradient id={`${b}cap`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.cap} /><Stop offset="0.32" stopColor={C.capHi} />
          <Stop offset="0.7" stopColor={C.cap} /><Stop offset="1" stopColor="#150A0E" />
        </LinearGradient>
        <RadialGradient id={`${b}cheek`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={C.cheek} stopOpacity={0.95} /><Stop offset="0.6" stopColor={C.cheek} stopOpacity={0.4} />
          <Stop offset="1" stopColor={C.cheek} stopOpacity={0} />
        </RadialGradient>
        <Pattern id={`${b}knit`} width="10" height="8" patternUnits="userSpaceOnUse">
          <Path d="M2.2 1.2 L5 6.4 L7.8 1.2" fill="none" stroke={C.line} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.27} />
          <Path d="M2.2 -0.2 L5 5 L7.8 -0.2" fill="none" stroke={C.pinkLight} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" opacity={0.22} />
        </Pattern>
        <ClipPath id={`${b}clip`}><Path d={BODY} /></ClipPath>
      </Defs>

      <Path d={BODY} fill={`url(#${b}body)`} />
      <G clipPath={`url(#${b}clip)`}>
        <Rect x={20} y={56} width={160} height={152} fill={`url(#${b}knit)`} />
        <Rect x={20} y={56} width={160} height={152} fill={`url(#${b}shade)`} />
        <Ellipse cx={100} cy={62} rx={44} ry={15} fill={`url(#${b}ao)`} />
        <Ellipse cx={70} cy={104} rx={46} ry={34} fill={`url(#${b}sheen)`} transform="rotate(-24 70 104)" />
        <Path d={BODY} fill={`url(#${b}rim)`} />
        <Path d={BODY} fill="none" stroke={`url(#${b}rim)`} strokeWidth={4.5} />
        {/* ribbed hem */}
        <Rect x={20} y={184} width={160} height={24} fill={`url(#${b}bone)`} />
        <G stroke={C.rib} strokeWidth={1.8} strokeLinecap="round">{ribs(38, 18, 7.3, 188, 202)}</G>
        <Rect x={20} y={181.5} width={160} height={4} fill={C.line} opacity={0.3} />
        <Rect x={20} y={184} width={160} height={1.6} fill="#FFFFFF" opacity={0.6} />
        <Rect x={20} y={196} width={160} height={12} fill={`url(#${b}shade)`} opacity={0.5} />
      </G>
      <Path d={BODY} fill="none" stroke={C.line} strokeOpacity={0.32} strokeWidth={1.4} />

      {/* collar + stopper */}
      <Ellipse cx={100} cy={66.5} rx={29} ry={5} fill={C.line} opacity={0.28} />
      <Rect x={73} y={43} width={54} height={23} rx={11} fill={`url(#${b}bone)`} />
      <G stroke={C.rib} strokeWidth={1.9} strokeLinecap="round">{ribs(80.5, 7, 6.5, 48, 61)}</G>
      <Rect x={73} y={43} width={54} height={23} rx={11} fill="none" stroke={C.boneLo} strokeWidth={1} />
      <Rect x={87} y={28} width={26} height={19} rx={5} fill={`url(#${b}cap)`} />
      <G stroke="#0D0508" strokeWidth={1.4} opacity={0.45}>{ribs(92.5, 4, 5, 33, 44)}</G>
      <Rect x={82} y={21} width={36} height={11} rx={5.5} fill={`url(#${b}cap)`} />
      <Rect x={88} y={23} width={14} height={2.6} rx={1.3} fill="#FFFFFF" opacity={0.5} />

      {/* stitched heart patch */}
      <G transform="rotate(9 146 164)">
        <Path d={HEART} fill={C.line} opacity={0.3} transform="translate(1.2 1.6)" />
        <Path d={HEART} fill={C.bone} />
        <Path
          d="M146 172.6 C139.8 167 137 163.2 139.6 160 C142 157.4 144.8 159.2 146 161.6 C147.2 159.2 150 157.4 152.4 160 C155 163.2 152.2 167 146 172.6 Z"
          fill="none" stroke={C.cheek} strokeWidth={1.2} strokeDasharray="2.2 1.9" strokeLinecap="round"
        />
      </G>

      {/* cheeks + mouth (eyes are their own layer so they can blink) */}
      <Ellipse cx={62} cy={143} rx={12} ry={7.5} fill={`url(#${b}cheek)`} />
      <Ellipse cx={138} cy={143} rx={12} ry={7.5} fill={`url(#${b}cheek)`} />
      {mouth === 'open' ? (
        <G>
          <Path d="M90 139 Q100 141.5 110 139 Q109 152 100 152 Q91 152 90 139 Z" fill={C.face} />
          <Path d="M94.5 148.6 Q100 144.5 105.5 148.6 Q103 151.6 100 151.6 Q97 151.6 94.5 148.6 Z" fill={C.cheek} />
        </G>
      ) : mouth === 'o' ? (
        <Ellipse cx={100} cy={144} rx={4.6} ry={5.4} fill={C.face} />
      ) : mouth === 'tiny' ? (
        <Path d="M96 143 Q100 146 104 143" fill="none" stroke={C.face} strokeWidth={3.2} strokeLinecap="round" />
      ) : mouth === 'soft' ? (
        <Path d="M93 141 Q100 147 107 141" fill="none" stroke={C.face} strokeWidth={3.4} strokeLinecap="round" />
      ) : (
        <Path d="M90 139.5 Q100 150 110 139.5" fill="none" stroke={C.face} strokeWidth={3.8} strokeLinecap="round" />
      )}
    </Layer>
  );
}

function EyesArt({ id, eyes }: { id: string; eyes: Eyes }) {
  const e = `${id}e`;
  if (eyes === 'happy') {
    return (
      <Layer>
        <G fill="none" stroke={C.face} strokeWidth={4.4} strokeLinecap="round">
          <Path d="M72 130 Q80 117 88 130" /><Path d="M112 130 Q120 117 128 130" />
        </G>
      </Layer>
    );
  }
  if (eyes === 'closed') {
    return (
      <Layer>
        <G fill="none" stroke={C.face} strokeWidth={3.8} strokeLinecap="round">
          <Path d="M72 126 Q80 133 88 126" /><Path d="M112 126 Q120 133 128 126" />
        </G>
      </Layer>
    );
  }
  return (
    <Layer>
      <Defs>
        <RadialGradient id={`${e}g`} cx="0.5" cy="0.25" r="0.8">
          <Stop offset="0" stopColor="#4A2633" /><Stop offset="1" stopColor="#15080C" />
        </RadialGradient>
      </Defs>
      {[80, 120].map((cx) => (
        <G key={cx}>
          <Ellipse cx={cx} cy={126} rx={7.6} ry={9.6} fill={`url(#${e}g)`} />
          <Ellipse cx={cx} cy={131} rx={5} ry={3.4} fill={C.mid} opacity={0.35} />
          <Circle cx={cx + 2.6} cy={122} r={3.1} fill="#FFFFFF" />
          <Circle cx={cx - 2.8} cy={130.4} r={1.4} fill="#FFFFFF" opacity={0.75} />
        </G>
      ))}
    </Layer>
  );
}

function ExtraArt({ extra }: { extra: Extra }) {
  if (extra === 'sparkles') {
    return (
      <Layer>
        <G fill={C.gold}>
          <Path d={STAR} transform="translate(-6 62)" />
          <Path d={STAR} transform="translate(206 40) scale(0.7)" />
          <Path d={STAR} transform="translate(208 176) scale(0.8)" />
        </G>
        <G fill={C.cheek}>
          <Path d={STAR} transform="translate(-10 170) scale(0.55)" />
          <Path d={STAR} transform="translate(168 2) scale(0.5)" />
        </G>
      </Layer>
    );
  }
  if (extra === 'rings') {
    return (
      <Layer>
        <G fill="none" stroke={C.mid} strokeWidth={3.4} strokeLinecap="round">
          <Path d="M194 104 Q203 116 194 128" opacity={0.85} />
          <Path d="M203 95 Q217 116 203 137" opacity={0.5} />
        </G>
      </Layer>
    );
  }
  if (extra === 'heart') {
    return (
      <Layer>
        <Path d="M100 12 C91 4 86 -2 90.5 -7.5 C94 -11.5 98.5 -9.5 100 -6.5 C101.5 -9.5 106 -11.5 109.5 -7.5 C114 -2 109 4 100 12 Z" fill={C.cheek} />
        <Path d="M93 -5 q2 -3 5 -1.5" fill="none" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.6} strokeLinecap="round" />
      </Layer>
    );
  }
  return (
    <Layer>
      <G fill="none" stroke={C.mid} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M150 44 h11 l-11 13 h11" />
        <Path d="M170 20 h8 l-8 9.5 h8" opacity={0.7} />
        <Path d="M186 2 h6 l-6 7 h6" opacity={0.45} />
      </G>
    </Layer>
  );
}

function loop(value: Animated.Value, duration: number) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]),
  );
}

export function Wren({
  mood = 'idle', size = 120, animated = true, decorative = false, pointAt = 'right', interactive = false, onPress, style,
}: Props) {
  const [id] = useState(() => `wren${uid++}`);
  const reduceMotion = useReduceMotion();
  const moving = animated && !reduceMotion;

  // A tap makes Wren happy for a moment.
  const [tapped, setTapped] = useState(false);
  const shown: WrenMood = tapped ? 'happy' : mood;
  const pose = useMemo(() => poseFor(shown, pointAt), [shown, pointAt]);
  const k = size / VB.w; // points per drawing unit

  const breath = useRef(new Animated.Value(0)).current;
  const wag = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const armL = useRef(new Animated.Value(moving ? REST : pose.armL)).current;
  const armR = useRef(new Animated.Value(moving ? REST : pose.armR)).current;
  const lookX = useRef(new Animated.Value(0)).current;
  const lookY = useRef(new Animated.Value(0)).current;

  // Breathing (slower asleep).
  useEffect(() => {
    if (!moving) { breath.setValue(0); return; }
    const a = loop(breath, shown === 'sleepy' ? 3200 : 2100);
    a.start();
    return () => a.stop();
  }, [moving, shown, breath]);

  // Steam, sparkles, zzz and the little heart drift on one slow loop.
  const drifting = !!pose.extra || !!pose.steam;
  useEffect(() => {
    if (!moving || !drifting) { twinkle.setValue(0.5); return; }
    const a = loop(twinkle, shown === 'proud' ? 520 : 1400);
    a.start();
    return () => a.stop();
  }, [moving, drifting, shown, twinkle]);

  // Waving / pointing wag.
  const wagBy = pose.wag?.by ?? 0;
  useEffect(() => {
    if (!moving || !wagBy) { wag.setValue(0); return; }
    wag.setValue(-1);
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(wag, { toValue: 1, duration: shown === 'wave' ? 260 : 520, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        Animated.timing(wag, { toValue: -1, duration: shown === 'wave' ? 260 : 520, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [moving, wagBy, shown, wag]);

  // Arms and eyes spring to each new pose; the body gives a small squash and stretch.
  useEffect(() => {
    const [lx, ly] = pose.look ?? [0, 0];
    if (!moving) {
      armL.setValue(pose.armL); armR.setValue(pose.armR); lookX.setValue(lx); lookY.setValue(ly); pop.setValue(0);
      return;
    }
    const spring = (v: Animated.Value, toValue: number) =>
      Animated.spring(v, { toValue, speed: 10, bounciness: 11, useNativeDriver: ND });
    pop.setValue(1);
    const a = Animated.parallel([
      spring(armL, pose.armL), spring(armR, pose.armR), spring(lookX, lx), spring(lookY, ly),
      Animated.spring(pop, { toValue: 0, speed: 9, bounciness: 16, useNativeDriver: ND }),
    ]);
    a.start();
    return () => a.stop();
  }, [moving, pose, armL, armR, lookX, lookY, pop]);

  // Blinking, at uneven intervals so it never looks mechanical.
  useEffect(() => {
    if (!moving || pose.eyes !== 'open') { blink.setValue(1); return; }
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        Animated.sequence([
          Animated.timing(blink, { toValue: 0.08, duration: 70, useNativeDriver: ND }),
          Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: ND }),
        ]).start(() => { if (alive) next(); });
      }, 2200 + Math.random() * 3200);
    };
    next();
    return () => { alive = false; clearTimeout(timer); blink.stopAnimation(); };
  }, [moving, pose.eyes, blink]);

  useEffect(() => {
    if (!tapped) return;
    const t = setTimeout(() => setTapped(false), 1100);
    return () => clearTimeout(t);
  }, [tapped]);

  const lift = pose.lift ?? 0;
  const bodyStyle = {
    transformOrigin: ORIGIN_FEET,
    transform: [
      { translateY: Animated.add(
        breath.interpolate({ inputRange: [0, 1], outputRange: [0, -lift * k] }),
        pop.interpolate({ inputRange: [0, 1], outputRange: [0, 2 * k] }),
      ) },
      { scaleX: Animated.multiply(
        breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }),
        pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }),
      ) },
      { scaleY: Animated.multiply(
        breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }),
        pop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }),
      ) },
    ],
  };
  const RANGE = [-400, 400];
  const rotL = Animated.add(armL, Animated.multiply(wag, pose.wag?.arm === 'L' ? wagBy : 0))
    .interpolate({ inputRange: RANGE, outputRange: ['-400deg', '400deg'] });
  const rotR = Animated.add(armR, Animated.multiply(wag, pose.wag?.arm === 'R' ? wagBy : 0))
    .interpolate({ inputRange: RANGE, outputRange: ['400deg', '-400deg'] });

  const armLeft = (
    <Animated.View style={[styles.layer, { transformOrigin: ORIGIN_ARM_L, transform: [{ rotate: rotL }] }]}>
      <ArmArt id={id} side="L" />
    </Animated.View>
  );
  const armRight = (
    <Animated.View style={[styles.layer, { transformOrigin: ORIGIN_ARM_R, transform: [{ rotate: rotR }] }]}>
      <ArmArt id={id} side="R" />
    </Animated.View>
  );
  const frontL = pose.front === true || pose.front === 'L';
  const frontR = pose.front === true || pose.front === 'R';

  const figure = (
    <>
      {/* contact shadow: stays on the ground, tightens when Wren squashes */}
      <Animated.View style={[styles.layer, { transformOrigin: origin(100, 219), transform: [{ scaleX: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}>
        <Layer>
          <Defs>
            <RadialGradient id={`${id}sh`} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.3} /><Stop offset="0.6" stopColor="#000000" stopOpacity={0.12} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={100} cy={219} rx={66} ry={9} fill={`url(#${id}sh)`} />
        </Layer>
      </Animated.View>

      <Animated.View style={[styles.layer, bodyStyle]}>
        {pose.steam ? (
          <Animated.View
            style={[styles.layer, {
              opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] }),
              transform: [{ translateY: twinkle.interpolate({ inputRange: [0, 1], outputRange: [2 * k, -4 * k] }) }],
            }]}
          >
            <Layer>
              <G fill="none" stroke={C.pinkLight} strokeWidth={3.4} strokeLinecap="round">
                <Path d="M86 13 C80 5 91 0 85 -10" /><Path d="M100 9 C94 0 106 -4 100 -15" /><Path d="M114 13 C108 5 119 0 113 -10" />
              </G>
            </Layer>
          </Animated.View>
        ) : null}

        <Layer>
          <Defs>
            <RadialGradient id={`${id}ft`} cx="0.4" cy="0.2" r="0.9">
              <Stop offset="0" stopColor={C.base} /><Stop offset="1" stopColor="#430B1C" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={74} cy={209} rx={18} ry={9.5} fill={`url(#${id}ft)`} />
          <Ellipse cx={126} cy={209} rx={18} ry={9.5} fill={`url(#${id}ft)`} />
          <Path d="M62 205 q8 -3.5 16 -1" fill="none" stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M114 205 q8 -3.5 16 -1" fill="none" stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={2.4} strokeLinecap="round" />
        </Layer>

        {frontL ? null : armLeft}
        {frontR ? null : armRight}
        <BodyArt id={id} mouth={pose.mouth} />
        <Animated.View
          style={[styles.layer, {
            transformOrigin: ORIGIN_EYES,
            transform: [
              { translateX: Animated.multiply(lookX, 2.6 * k) },
              { translateY: Animated.multiply(lookY, 2.2 * k) },
              { scaleY: blink },
            ],
          }]}
        >
          <EyesArt id={id} eyes={pose.eyes} />
        </Animated.View>
        {frontL ? armLeft : null}
        {frontR ? armRight : null}
      </Animated.View>

      {pose.extra ? (
        <Animated.View
          style={[styles.layer, {
            transformOrigin: pose.extra === 'heart' ? ORIGIN_TOP : '50% 50%',
            opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
            transform: [
              { translateY: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0, pose.extra === 'sparkles' ? 0 : -4 * k] }) },
              { scale: twinkle.interpolate({ inputRange: [0, 1], outputRange: pose.extra === 'rings' ? [1, 1] : [0.94, 1.06] }) },
            ],
          }]}
        >
          <ExtraArt extra={pose.extra} />
        </Animated.View>
      ) : null}
    </>
  );

  const box = [{ width: size, height: size * WREN_ASPECT }, style];
  const a11y = decorative ? HIDDEN : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: LABELS[shown] };

  if (interactive || onPress) {
    return (
      <Pressable
        style={box}
        onPress={() => { haptics.light(); setTapped(true); onPress?.(); }}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={LABELS[shown]}
        {...(decorative ? HIDDEN : null)}
      >
        {figure}
      </Pressable>
    );
  }
  return <View style={box} {...a11y}>{figure}</View>;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none' },
});

export default Wren;
