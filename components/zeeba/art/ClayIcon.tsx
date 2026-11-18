// ClayIcon — small soft-3D illustrations that sit beside Wren (onboarding, welcome, Today).
// Hand-drawn SVG: gradients, clip paths and plain shapes only (no filters, no images), so they look the same on
// iOS and web. One light for the whole family, as on Wren: key light from the top left, pink rim light on the
// lower right, plum shadows rather than black, a soft contact shadow, hard highlights only on glossy parts.
// Colours are fixed (never the app's dynamic tokens) and chosen to read on the light and the dark canvas.
import { useState, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

export type ClayIconName =
  | 'record' | 'prove' | 'reach' | 'bell' | 'calendar' | 'lock'
  | 'heart' | 'pencil' | 'sparkle' | 'doctor' | 'moon' | 'sun';

// Each material as [highlight, lit side, local colour, shadow side].
const T = {
  burg: ['#CC6386', '#9A3353', '#7A1F3A', '#4B0D21'],
  rasp: ['#FFA3BD', '#EE5384', '#CB2259', '#8C1140'],
  bone: ['#FFFFFF', '#FBF0EC', '#EBD5D2', '#C7A3A8'],
  gold: ['#FFF0B8', '#FFD166', '#F6A93B', '#C4702B'],
  moon: ['#FFFBE6', '#FFE9A6', '#F9C861', '#C98B3A'],
  peach: ['#FFD9C7', '#FFAE8E', '#F58463', '#C25A48'],
  teal: ['#A5E3D8', '#5EBFB3', '#2F958F', '#1D6168'],
  wood: ['#FFEEDB', '#F5D3AB', '#E0AC7E', '#B37F58'],
} as const;
type Tone = keyof typeof T;
const INK = '#4A0B28'; // ambient occlusion: deep plum, never black
const GROUND = '#0B0308'; // contact shadow: dark enough to vanish on the dark canvas instead of glowing
const PINK = '#FFB3C7'; // rim light
const HIDDEN = { accessible: false, importantForAccessibility: 'no-hide-descendants' as const, accessibilityElementsHidden: true, 'aria-hidden': true };

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${2 * r - w}` +
  `a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const star = (cx: number, cy: number, R: number, k = 0.24) => {
  const p = R * k;
  return `M${cx} ${cy - R}Q${cx + p} ${cy - p} ${cx + R} ${cy}Q${cx + p} ${cy + p} ${cx} ${cy + R}Q${cx - p} ${cy + p} ${cx - R} ${cy}Q${cx - p} ${cy - p} ${cx} ${cy - R}Z`;
};
const HEART = 'M50 85C24 64 11 48 11 33C11 20 21 11 32 11C40 11 46 15 50 22C54 15 60 11 68 11C79 11 89 20 89 33C89 48 76 64 50 85Z';
const CRESCENT = 'M51 12A36 36 0 1 0 82.8 62.9A30 30 0 1 1 51 12Z';
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r: number) => `${(50 + Math.sin(a) * r).toFixed(1)} ${(47 - Math.cos(a) * r).toFixed(1)}`;
  return `M${p(30.5)}L${p(34.5)}`;
}).join('');

type VolProps = {
  id: string;
  /** Unique within the icon. */
  k: string;
  d: string;
  t: Tone;
  /** How the form is lit: r = rounded blob, x = upright cylinder, y = lying cylinder, d = flat face. */
  g?: 'r' | 'x' | 'y' | 'd';
  /** Rim-light width (0 = none). */
  rim?: number;
  /** Rounds sharp corners by inflating the shape this much. */
  puff?: number;
  children?: ReactNode;
};

/** One lit volume: local colour and form shadow in one gradient, then details, rim light and edge highlight inside its silhouette. */
function Vol({ id, k, d, t, g = 'r', rim = 4.5, puff, children }: VolProps) {
  const [hi, mid, base, deep] = T[t];
  const u = `${id}${k}`;
  const stops = g === 'x'
    ? [[0, base], [0.28, hi], [0.6, mid], [1, deep]] as const
    : [[0, hi], [0.36, mid], [0.76, base], [1, deep]] as const;
  const s = stops.map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />);
  return (
    <G>
      <Defs>
        {g === 'r' ? (
          <RadialGradient id={`${u}f`} cx="0.32" cy="0.24" r="0.95">{s}</RadialGradient>
        ) : (
          <LinearGradient id={`${u}f`} x1="0" y1="0" x2={g === 'y' ? '0' : '1'} y2={g === 'x' ? '0' : '1'}>{s}</LinearGradient>
        )}
        <ClipPath id={`${u}c`}><Path d={d} /></ClipPath>
      </Defs>
      <Path d={d} fill={`url(#${u}f)`} stroke={puff ? `url(#${u}f)` : undefined} strokeWidth={puff} strokeLinejoin="round" />
      <G clipPath={`url(#${u}c)`}>
        {children}
        {rim ? <Path d={d} fill={`url(#${id}rim)`} fillOpacity={0.5} stroke={`url(#${id}rim)`} strokeWidth={rim * 0.7} /> : null}
        <Path d={d} fill="none" stroke={`url(#${id}hl)`} strokeWidth={2.4} />
      </G>
      {puff ? null : <Path d={d} fill="none" stroke={deep} strokeOpacity={0.28} strokeWidth={0.6} />}
    </G>
  );
}

/** A round tube or rod along a path (one stroke per tone, each nudged toward the light). */
function Tube({ d, t, w }: { d: string; t: Tone; w: number }) {
  const [hi, mid, base, deep] = T[t];
  const o = (n: number) => `translate(${-w * n} ${-w * n})`;
  return (
    <G fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} stroke={deep} strokeWidth={w} />
      <Path d={d} stroke={base} strokeWidth={w * 0.8} transform={o(0.06)} />
      <Path d={d} stroke={mid} strokeWidth={w * 0.52} transform={o(0.13)} />
      <Path d={d} stroke={hi} strokeWidth={w * 0.17} transform={o(0.24)} />
    </G>
  );
}

const Shadow = ({ id, cx = 50, y = 89, rx = 28 }: { id: string; cx?: number; y?: number; rx?: number }) => (
  <G>
    <Ellipse cx={cx} cy={y} rx={rx * 1.2} ry={5.5} fill={`url(#${id}sh)`} opacity={0.55} />
    <Ellipse cx={cx} cy={y} rx={rx * 0.8} ry={3.2} fill={`url(#${id}sh)`} />
  </G>
);
/** Soft matte sheen. */
const Sheen = ({ id, cx, cy, rx, ry, rot = -24, o = 1 }: { id: string; cx: number; cy: number; rx: number; ry: number; rot?: number; o?: number }) => (
  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}gl)`} opacity={o} transform={`rotate(${rot} ${cx} ${cy})`} />
);
/** Soft dark blob where two forms meet. */
const Ao = ({ id, cx, cy, rx, ry, o = 1 }: { id: string; cx: number; cy: number; rx: number; ry: number; o?: number }) => (
  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}ao)`} opacity={o} />
);
/** Small hard highlight for glossy parts. */
const Spec = ({ d, w = 2.6, o = 0.85 }: { d: string; w?: number; o?: number }) => (
  <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={o} strokeWidth={w} strokeLinecap="round" />
);

const BARS = [[10, 55, 'teal'], [38.5, 37, 'gold'], [67, 16, 'rasp']] as const;

const ART: Record<ClayIconName, (id: string) => ReactNode> = {
  // A chunky studio microphone, tipped in its cradle.
  record: (id) => (
    <>
      <Shadow id={id} rx={26} />
      <Vol id={id} k="b" t="burg" g="x" d="M27 80C27 73 73 73 73 80V83C73 90.5 27 90.5 27 83Z">
        <Ellipse cx={50} cy={79} rx={21.5} ry={4} fill="#FFFFFF" opacity={0.16} />
      </Vol>
      <Vol id={id} k="s" t="gold" g="x" rim={0} d={rr(45, 62, 10, 17, 2)} />
      <Ao id={id} cx={50} cy={78.6} rx={9} ry={2.4} />
      <G transform="rotate(10 50 66)">
        <Tube d="M27 35C27 58 38 66 50 66C62 66 73 58 73 35" t="gold" w={5.6} />
        <Vol id={id} k="h" t="rasp" d="M34 27C34 4 66 4 66 27V41C66 64 34 64 34 41Z">
          <Sheen id={id} cx={43} cy={24} rx={9} ry={15} rot={-14} />
          {[21, 29, 37].map((y) => (
            <G key={y} strokeLinecap="round">
              <Path d={`M42 ${y}H59`} stroke={T.rasp[3]} strokeOpacity={0.6} strokeWidth={3.2} />
              <Path d={`M42 ${y + 1.9}H59`} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1.1} />
            </G>
          ))}
          <Path d="M30 45H70V51H30Z" fill={T.gold[1]} />
          <Path d="M30 45H46V51H30Z" fill={T.gold[0]} opacity={0.7} />
          <Path d="M56 45H70V51H56Z" fill={T.gold[3]} opacity={0.55} />
          <Path d="M30 51.6H70" stroke={INK} strokeOpacity={0.3} strokeWidth={1.4} />
        </Vol>
        <Spec d="M39.4 21C40 16 42.6 13 46 11.8" />
      </G>
    </>
  ),

  // Three rounded bars rising.
  prove: (id) => (
    <>
      <Shadow id={id} rx={40} y={87} />
      {BARS.map(([x, y, t], i) => (
        <Vol key={t} id={id} k={`b${i}`} t={t} d={rr(x, y, 23, 86 - y, 9)}>
          {i ? <Ao id={id} cx={x - 3} cy={90} rx={13} ry={(86 - BARS[i - 1][1]) * 0.95} /> : null}
          <Sheen id={id} cx={x + 8} cy={y + 10} rx={7} ry={Math.min(14, (86 - y) * 0.3)} rot={0} />
          <Circle cx={x + 7.4} cy={y + 7.2} r={2} fill="#FFFFFF" opacity={0.8} />
        </Vol>
      ))}
    </>
  ),

  // A sheet of paper with lines and a round tick badge.
  reach: (id) => (
    <>
      <Shadow id={id} rx={30} cx={51} />
      <G transform="rotate(-7 46 46)">
        <Path d="M29 12H57L71 26V72Q71 80 63 80H29Q21 80 21 72V20Q21 12 29 12Z" fill={T.bone[3]} transform="translate(1.6 2.2)" />
        <Vol id={id} k="p" t="bone" g="d" rim={0} d="M28 9H56L70 23V69Q70 77 62 77H28Q20 77 20 69V17Q20 9 28 9Z">
          <Path d="M27 22H43" stroke={T.rasp[1]} strokeWidth={5} strokeLinecap="round" />
          <G stroke="#D2A9B4" strokeWidth={4.2} strokeLinecap="round">
            <Path d="M27 34H62" /><Path d="M27 44H62" /><Path d="M27 54H50" /><Path d="M27 64H42" />
          </G>
          <Ao id={id} cx={62} cy={24} rx={12} ry={7} o={0.5} />
          <Ao id={id} cx={67.5} cy={73} rx={22} ry={22} o={0.75} />
        </Vol>
        <Path d="M56 9V18Q56 23 61 23H70Z" fill={T.bone[2]} stroke={T.bone[3]} strokeWidth={0.7} strokeLinejoin="round" />
        <Path d="M57 11V18Q57 22 61 22" fill="none" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.2} />
      </G>
      <Vol id={id} k="t" t="teal" d={circ(68, 67, 17)}>
        <Sheen id={id} cx={61} cy={59} rx={10} ry={7} />
      </Vol>
      <Path d="M59.5 67.5L65.5 73.5L77 61" fill="none" stroke={T.teal[3]} strokeOpacity={0.55} strokeWidth={5.4} strokeLinecap="round" strokeLinejoin="round" transform="translate(0.9 1.3)" />
      <Path d="M59.5 67.5L65.5 73.5L77 61" fill="none" stroke="#FFFFFF" strokeWidth={5.4} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // A bell with a clapper, mid-ring.
  bell: (id) => (
    <>
      <Shadow id={id} rx={27} />
      <G transform="rotate(-10 50 50)">
        <Vol id={id} k="c" t="rasp" d={circ(53, 81.5, 7.6)} rim={3} />
        <Vol id={id} k="k" t="gold" d={circ(50, 14.5, 6.2)} rim={0} />
        <Vol id={id} k="b" t="gold" d="M50 16C35 16 29 29 29 44C29 57 26 63 17 69.5C12.5 73 14.5 79.5 20 79.5H80C85.5 79.5 87.5 73 83 69.5C74 63 71 57 71 44C71 29 65 16 50 16Z">
          <Ao id={id} cx={50} cy={18} rx={10} ry={4} o={0.5} />
          <Sheen id={id} cx={40} cy={40} rx={10} ry={21} rot={-12} />
          <Path d="M10 70.4H90V82H10Z" fill={T.gold[0]} opacity={0.42} />
          <Path d="M16 70.2H84" stroke={T.gold[3]} strokeOpacity={0.55} strokeWidth={1.5} />
          <Path d="M21 73.6H58" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={1.7} strokeLinecap="round" />
        </Vol>
        <Spec d="M36 43C36.4 34.5 39.4 28 44.6 24.8" />
      </G>
    </>
  ),

  // A tear-off calendar block with one day marked.
  calendar: (id) => (
    <>
      <Shadow id={id} rx={32} y={90} />
      <Path d={rr(17, 28, 66, 60, 12)} fill={T.bone[3]} />
      <Path d="M22 82.5H78" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1} />
      <Vol id={id} k="f" t="bone" g="d" rim={0} d={rr(17, 20, 66, 62, 12)}>
        <Defs>
          <LinearGradient id={`${id}hd`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={T.rasp[1]} /><Stop offset="1" stopColor={T.rasp[3]} />
          </LinearGradient>
        </Defs>
        <Path d="M10 14H90V41H10Z" fill={`url(#${id}hd)`} />
        <Path d="M17 23.5C30 20.5 44 21 58 21.5" fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M10 42.2H90" stroke={INK} strokeOpacity={0.22} strokeWidth={2.4} />
        <G fill="#E2C3CB">
          {[25, 38.5, 52, 65.5].map((x) => <Path key={x} d={rr(x, 47, 9.5, 9.5, 3)} />)}
          {[25, 38.5, 65.5].map((x) => <Path key={x} d={rr(x, 62, 9.5, 9.5, 3)} />)}
        </G>
      </Vol>
      <Vol id={id} k="d" t="rasp" d={circ(56.7, 66.7, 8.2)} rim={3}>
        <Sheen id={id} cx={54} cy={63.5} rx={5} ry={3.4} />
      </Vol>
      {[35, 65].map((x) => (
        <G key={x}>
          <Ellipse cx={x} cy={27} rx={5} ry={3.4} fill={T.rasp[3]} />
          <Vol id={id} k={`r${x}`} t="gold" g="x" rim={0} d={rr(x - 3.6, 12, 7.2, 16, 3.6)} />
        </G>
      ))}
    </>
  ),

  // A padlock.
  lock: (id) => (
    <>
      <Shadow id={id} rx={30} y={90} />
      <Tube d="M33 50V34C33 12 67 12 67 34V50" t="gold" w={9.5} />
      <Ao id={id} cx={50} cy={43} rx={26} ry={5} o={0.7} />
      <Vol id={id} k="b" t="rasp" d={rr(19, 42, 62, 46, 15)}>
        <Sheen id={id} cx={37} cy={56} rx={18} ry={12} />
        <Path d="M50 53.5A7 7 0 0 1 54 66.3L56 76Q50 78.6 44 76L46 66.3A7 7 0 0 1 50 53.5Z" fill={T.rasp[0]} opacity={0.55} transform="translate(1.3 1.5)" />
        <Path d="M50 53.5A7 7 0 0 1 54 66.3L56 76Q50 78.6 44 76L46 66.3A7 7 0 0 1 50 53.5Z" fill={T.burg[3]} />
      </Vol>
      <Spec d="M27.5 57C27.8 51.5 30.5 48.6 35.5 48.2" />
    </>
  ),

  // A puffy heart.
  heart: (id) => (
    <>
      <Shadow id={id} rx={17} y={91} />
      <G transform="rotate(-7 50 50)">
        <Vol id={id} k="h" t="rasp" d={HEART} rim={7}>
          <Sheen id={id} cx={33} cy={32} rx={19} ry={14} rot={-32} />
          <Ao id={id} cx={50} cy={19} rx={7} ry={11} o={0.45} />
          <Ao id={id} cx={79} cy={75} rx={36} ry={36} o={0.7} />
          <Sheen id={id} cx={68} cy={26} rx={10} ry={6} rot={24} o={0.4} />
        </Vol>
        <Spec d="M21.5 35C21 27 25.5 21.5 32 20.4" w={3.4} />
        <Circle cx={21.8} cy={42.4} r={1.9} fill="#FFFFFF" opacity={0.8} />
      </G>
    </>
  ),

  // A short fat pencil, writing.
  pencil: (id) => (
    <>
      <Shadow id={id} rx={25} cx={47} y={90} />
      <Path d="M20 86.5q7 -5.5 13 0t13 0" fill="none" stroke={T.rasp[1]} strokeWidth={3.4} strokeLinecap="round" />
      <G transform="translate(3 6) rotate(-45 50 50)">
        <Vol id={id} k="e" t="peach" g="y" d="M74 38H80Q88 38 88 46V54Q88 62 80 62H74Z" />
        <Vol id={id} k="w" t="wood" g="y" rim={0} d="M33 38L15 46.4Q10 50 15 53.6L33 62Z">
          <Path d="M21.5 40V60L8 60V40Z" fill={T.burg[2]} />
          <Path d="M21.5 43.4L14 46.6" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={1.6} strokeLinecap="round" />
        </Vol>
        <Vol id={id} k="b" t="gold" g="y" d={rr(32, 38, 36, 24, 1.5)}>
          <Path d="M30 38H70V45.6H30Z" fill="#FFFFFF" opacity={0.3} />
          <Path d="M30 54.6H70V62H30Z" fill={T.gold[3]} opacity={0.5} />
          <Path d="M32 38q3.4 4 0 8t0 8t0 8" fill="none" stroke={T.wood[3]} strokeOpacity={0.5} strokeWidth={1.6} />
        </Vol>
        <Vol id={id} k="f" t="bone" g="y" rim={0} d={rr(66, 37, 9.5, 26, 2)}>
          <Path d="M69 37V63M72.6 37V63" stroke={T.bone[3]} strokeWidth={1.3} />
        </Vol>
      </G>
    </>
  ),

  // A four-point star with a small companion.
  sparkle: (id) => (
    <>
      <Shadow id={id} rx={18} cx={45} y={92} />
      <Vol id={id} k="s" t="gold" d={star(45, 51, 34, 0.29)} puff={4} rim={6}>
        <Path d="M45 51L45 12L10 51Z" fill="#FFFFFF" opacity={0.3} />
        <Path d="M45 51L45 90L80 51Z" fill={T.gold[3]} opacity={0.3} />
        <Sheen id={id} cx={40} cy={45} rx={13} ry={10} />
      </Vol>
      <Circle cx={39.5} cy={44} r={2.6} fill="#FFFFFF" opacity={0.9} />
      <Vol id={id} k="c" t="rasp" d={star(80, 19, 13, 0.29)} puff={2.4} rim={3}>
        <Path d="M80 19V4L66 19Z" fill="#FFFFFF" opacity={0.3} />
      </Vol>
      <Vol id={id} k="m" t="peach" d={star(84, 76, 6.5, 0.29)} puff={1.6} rim={2} />
    </>
  ),

  // A stethoscope.
  doctor: (id) => (
    <>
      <Shadow id={id} rx={30} cx={54} y={91} />
      <Tube d="M42 52C42 74 46 84.5 60 84.5C72 84.5 77 76 77 60" t="rasp" w={8.4} />
      <Tube d="M27.5 18C22 37 28 50 42 52.5C56 50 62 37 56.5 18" t="gold" w={6} />
      <Vol id={id} k="j" t="gold" d={circ(42, 53.5, 5.8)} rim={2} />
      <Vol id={id} k="l" t="burg" d={circ(28.4, 14.6, 6.2)} rim={2.6} />
      <Vol id={id} k="r" t="burg" d={circ(55.6, 14.6, 6.2)} rim={2.6} />
      <Ao id={id} cx={78.6} cy={50.4} rx={17} ry={17} o={0.5} />
      <Vol id={id} k="o" t="gold" d={circ(77, 47.5, 15.5)} />
      <Ao id={id} cx={77.6} cy={48.4} rx={11.6} ry={11.6} o={0.5} />
      <Vol id={id} k="i" t="bone" d={circ(77, 47.5, 10)} rim={0}>
        <Sheen id={id} cx={74} cy={44} rx={6.5} ry={4.4} />
      </Vol>
      <Spec d="M65.6 44C66.6 39.6 69.4 36.6 73.4 35.4" w={2} o={0.8} />
    </>
  ),

  // A crescent moon with two small stars.
  moon: (id) => (
    <>
      <Shadow id={id} rx={22} cx={46} y={92} />
      <G transform="rotate(-12 50 48)">
        <Vol id={id} k="m" t="moon" d={CRESCENT} puff={3.4} rim={3}>
          <Sheen id={id} cx={30} cy={34} rx={13} ry={18} rot={20} />
          <G fill={T.moon[3]} opacity={0.36}>
            <Ellipse cx={27} cy={56} rx={5.4} ry={4.6} /><Ellipse cx={40} cy={72} rx={4} ry={3.2} /><Ellipse cx={34} cy={24.5} rx={3} ry={2.6} />
          </G>
          <G fill="none" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.1} strokeLinecap="round">
            <Path d="M24.4 61.4Q28.6 63 32 59" /><Path d="M37.4 75.2Q41 76.6 43.6 73.6" />
          </G>
        </Vol>
      </G>
      <Vol id={id} k="a" t="gold" d={star(69, 33, 8.5, 0.29)} puff={1.8} rim={2} />
      <Vol id={id} k="b" t="rasp" d={star(82, 52, 5, 0.29)} puff={1.4} rim={0} />
    </>
  ),

  // A sun with stubby rays.
  sun: (id) => (
    <>
      <Shadow id={id} rx={22} y={93} />
      <Tube d={SUN_RAYS} t="peach" w={10} />
      <Vol id={id} k="d" t="gold" d={circ(50, 47, 22.5)} rim={5.5}>
        <Sheen id={id} cx={42} cy={38} rx={13} ry={9.5} />
      </Vol>
      <Spec d="M33.6 44.5C34.2 37.6 38 33 44 31.4" w={3} />
    </>
  ),
};

let uid = 0;

/** A small soft-3D illustration. Decorative: always hidden from screen readers, so pair it with a word. */
export function ClayIcon({ name, size = 64, style }: { name: ClayIconName; size?: number; style?: ViewStyle }) {
  const [id] = useState(() => `clay${uid++}`);
  return (
    <View style={[{ width: size, height: size, pointerEvents: 'none' }, style]} {...HIDDEN}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`${id}sh`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={GROUND} stopOpacity={0.36} /><Stop offset="0.55" stopColor={GROUND} stopOpacity={0.13} />
            <Stop offset="1" stopColor={GROUND} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}ao`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={INK} stopOpacity={0.5} /><Stop offset="1" stopColor={INK} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}gl`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} /><Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`${id}rim`} x1="0.3" y1="0.3" x2="0.95" y2="0.95">
            <Stop offset="0.4" stopColor={PINK} stopOpacity={0} /><Stop offset="1" stopColor={PINK} stopOpacity={0.85} />
          </LinearGradient>
          <LinearGradient id={`${id}hl`} x1="0.08" y1="0.04" x2="0.6" y2="0.66">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.7} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {ART[name](id)}
      </Svg>
    </View>
  );
}

export default ClayIcon;
