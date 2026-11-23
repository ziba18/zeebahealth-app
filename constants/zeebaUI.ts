// Design tokens — "Native / Midnight" (2026-11-09, owner-approved directions A + B; see design/BRAND.md).
// Light mode = Native (Apple system greys, SF Pro, raspberry accent).
// Dark mode  = Midnight (ink-navy surfaces, warm peach accent, glowing data).
// Every colour is a Light/Dark pair. On iOS the pair is a DynamicColorIOS, so static StyleSheets switch
// automatically with the phone's appearance; on web it is a CSS variable (see webThemeCss / app/_layout.tsx).
// Where a library needs a plain hex string (SVG fills, gradients, string alpha), call useColors().
import { DynamicColorIOS, Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

export type Scheme = 'light' | 'dark';

/**
 * Light mode only for now (owner, 20 Nov 2026: "keep everything in light mode for now, the dark mode is so ugly
 * and annoying"). While false, every colour is the light one on every platform, whatever the phone's setting,
 * and app.config.ts sets userInterfaceStyle 'light'. The dark palettes stay below for a later redesign: to bring
 * dark mode back, set this to true AND app.config.ts userInterfaceStyle back to 'automatic'.
 */
export const DARK_MODE_ENABLED = false;

/** Raw palettes. Contrast-checked (WCAG AA) for text pairs; see design/BRAND.md for the table. */
export const palettes = {
  // Light = "ChatGPT neutral" trial (23 Nov 2026, branch design/chatgpt-neutral; owner has not approved it yet).
  // Source: chatgpt.com light theme, opened in a browser: white page, near-black ink, grey fills, hairline
  // borders, one black main button. Colour is kept for DATA only (the pain scale, bleeding, saved, errors).
  // The raspberry values this replaces are in git: `git show 6ca38f4:constants/zeebaUI.ts`.
  light: {
    canvas: '#FFFFFF',
    surface: '#FFFFFF', // cards sit on white with a hairline edge
    raised: '#FFFFFF',
    sunken: '#F4F4F4', // input wells, pressed rows, segmented track
    hairline: '#E5E5E5', // separators
    cardBorder: 'rgba(0,0,0,0.10)',
    borderStrong: '#8F8F8F', // input + chip outlines (3.2:1)
    ink: '#0D0D0D',
    ink2: '#5D5D5D', // secondary label (6.7:1 on white)
    ink3: '#5D5D5D',
    accent: '#0D0D0D', // actions, selected tab, links: ink, not a colour
    accentPressed: '#3A3A3A',
    accentTint: '#F4F4F4',
    onAccent: '#FFFFFF',
    glow: 'rgba(0,0,0,0)', // no colour washes
    clay: '#E8562A', // PERIOD / BLEEDING only
    clayTint: '#FDE6DC',
    onClay: '#FFFFFF',
    saved: '#1E7A35',
    savedTint: '#E3F4E6',
    error: '#D70015',
    errorTint: '#FDE4E6',
    chartTrack: '#ECECEC', // empty days / chart tracks
    white: '#FFFFFF',
    scrim: 'rgba(0,0,0,0.3)',
    tabBar: 'rgba(255,255,255,0.94)',
    tabBarTranslucent: 'rgba(255,255,255,0.72)',
    glassEdge: 'rgba(0,0,0,0.10)',
  },
  dark: {
    canvas: '#0A0C16',
    surface: '#141829',
    raised: '#1C2136',
    sunken: '#1C2136',
    hairline: '#262B44',
    cardBorder: 'rgba(255,255,255,0.08)',
    borderStrong: '#5D6488',
    ink: '#F4F1EC',
    ink2: '#A3A8BE',
    ink3: '#9196AE',
    accent: '#FF9468', // warm peach (8.1:1 on surface; dark text on it 8.7:1)
    accentPressed: '#F07A4C',
    accentTint: '#3A2620',
    onAccent: '#1A0E0A',
    glow: 'rgba(255,148,104,0.22)',
    clay: '#8FE3C8', // PERIOD / BLEEDING: mint, distinct from the peach pain scale
    clayTint: '#173A33',
    onClay: '#0A0C16',
    saved: '#6FD08C',
    savedTint: '#14301F',
    error: '#FF6B6B',
    errorTint: '#3A1518',
    chartTrack: '#2A3050',
    white: '#FFFFFF',
    scrim: 'rgba(0,0,0,0.55)',
    tabBar: 'rgba(28,33,54,0.94)',
    tabBarTranslucent: 'rgba(28,33,54,0.72)',
    glassEdge: 'rgba(255,255,255,0.12)',
  },
} as const;

export type ColorToken = keyof typeof palettes.light;
type Pair = { light: string; dark: string };

// value → its Light/Dark pair, so resolveColor() can turn a dynamic colour back into hex.
const pairs = new Map<unknown, Pair>();
const webVars: [string, Pair][] = [];

function dyn(name: string, pair: Pair): string {
  if (!DARK_MODE_ENABLED) {
    pairs.set(pair.light, pair);
    return pair.light;
  }
  if (Platform.OS === 'ios') {
    const v = DynamicColorIOS(pair) as unknown as string;
    pairs.set(v, pair);
    return v;
  }
  if (Platform.OS === 'web') {
    const v = `var(--z-${name})`;
    webVars.push([name, pair]);
    pairs.set(v, pair);
    return v;
  }
  return pair.light; // Android: light only for now
}

function build<T extends Record<string, string>>(prefix: string, light: T, dark: T): { [K in keyof T]: string } {
  const out = {} as { [K in keyof T]: string };
  (Object.keys(light) as (keyof T)[]).forEach((k) => {
    out[k] = dyn(`${prefix}${String(k)}`, { light: light[k], dark: dark[k] });
  });
  return out;
}

/** Use in styles. Each value follows the phone's Light/Dark appearance by itself. */
export const colors = build('', palettes.light, palettes.dark as unknown as typeof palettes.light);

/** Pain scale 0–10 in five steps. Light: raspberry. Dark: peach that glows brighter as it gets worse. */
const rampLight = ['#F9D3DE', '#F2A0B8', '#E8628A', '#C81E55', '#93103A'] as const;
const rampDark = ['#2A3050', '#6B4436', '#C46A48', '#FF9468', '#FFC9AE'] as const;
const rampFgLight = ['#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF'] as const;
const rampFgDark = ['#F4F1EC', '#F4F1EC', '#1A0E0A', '#1A0E0A', '#1A0E0A'] as const;

export const severityRamp = rampLight.map((l, i) => dyn(`sev${i}`, { light: l, dark: rampDark[i] }));
const severityFg = rampFgLight.map((l, i) => dyn(`sevfg${i}`, { light: l, dark: rampFgDark[i] }));

/** Ramp step (0–4) for a 0–10 score. */
export function severityStep(n: number): 0 | 1 | 2 | 3 | 4 {
  const v = Math.max(0, Math.min(10, Math.round(n)));
  if (v <= 2) return 0;
  if (v <= 4) return 1;
  if (v <= 6) return 2;
  if (v <= 8) return 3;
  return 4;
}

/** Fill + legible text colour for a 0–10 score. Always shown with the digit. */
export function severityColor(n: number): { bg: string; fg: string } {
  const step = severityStep(n);
  return { bg: severityRamp[step], fg: severityFg[step] };
}

/** Light-only pain colours, as hex: for the doctor document and the PDF, which are always ink on white paper. */
export function severityColorLight(n: number): { bg: string; fg: string } {
  const step = severityStep(n);
  return { bg: rampLight[step], fg: rampFgLight[step] };
}

/** Current appearance ('light' | 'dark'). */
export function useScheme(): Scheme {
  const phone = useColorScheme();
  return DARK_MODE_ENABLED && phone === 'dark' ? 'dark' : 'light';
}

/** Turn a token value (dynamic or plain) into the hex for a scheme. */
export function resolveColor(value: string | undefined, scheme: Scheme): string | undefined {
  if (value == null) return value;
  const p = pairs.get(value);
  return p ? p[scheme] : value;
}

/** Plain hex palette for the current appearance — for SVG, gradients and string alpha. */
export function useColors() {
  const scheme = useScheme();
  const p = palettes[scheme];
  return {
    ...p,
    scheme,
    ramp: scheme === 'dark' ? rampDark : rampLight,
    rampFg: scheme === 'dark' ? rampFgDark : rampFgLight,
    resolve: (v: string | undefined) => resolveColor(v, scheme),
  };
}

/** CSS custom properties for the web preview (light + dark via prefers-color-scheme). */
export function webThemeCss(): string {
  const decl = (s: Scheme) => webVars.map(([n, p]) => `--z-${n}:${p[s]};`).join('');
  if (!DARK_MODE_ENABLED) return `:root{${decl('light')}color-scheme:light}`;
  return `:root{${decl('light')}color-scheme:light}@media (prefers-color-scheme:dark){:root{${decl('dark')}color-scheme:dark}}`;
}

// ---------- Type: Apple's own faces ----------
const SANS = Platform.select({
  ios: 'system-ui',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Inter, system-ui, sans-serif',
  default: 'sans-serif',
}) as string;
const ROUNDED = Platform.select({
  ios: 'ui-rounded',
  web: 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  default: 'sans-serif',
}) as string;
const SERIF = Platform.select({
  ios: 'ui-serif', // New York
  web: '"New York", Newsreader_400Regular, ui-serif, Georgia, serif',
  default: 'serif',
}) as string;
const SERIF_ITALIC_WEB = '"New York", Newsreader_400Regular_Italic, ui-serif, Georgia, serif';

/** Spread into a style: `...font.semibold`. Weights are real SF weights. */
export const font = {
  regular: { fontFamily: SANS, fontWeight: '400' },
  medium: { fontFamily: SANS, fontWeight: '500' },
  semibold: { fontFamily: SANS, fontWeight: '600' },
  bold: { fontFamily: SANS, fontWeight: '700' },
  rounded: { fontFamily: ROUNDED, fontWeight: '600' },
  roundedBold: { fontFamily: ROUNDED, fontWeight: '700' },
  /** New York: the app's statements ("Pain on 18 of the last 91 days"). */
  serif: { fontFamily: SERIF, fontWeight: '400' },
  /** New York italic: HER words, always. */
  serifItalic: { fontFamily: Platform.OS === 'web' ? SERIF_ITALIC_WEB : SERIF, fontStyle: 'italic', fontWeight: '400' },
} satisfies Record<string, TextStyle>;

/** Legacy family names (weight is lost — prefer `font.*`). */
export const fonts = { regular: SANS, medium: SANS, semibold: SANS, serif: SERIF, rounded: ROUNDED } as const;

export type TypeVariant =
  | 'largeTitle' | 'hero' | 'statement' | 'title' | 'quote' | 'headline'
  | 'body' | 'secondary' | 'caption' | 'numeral' | 'metric' | 'tab'
  | 'fieldLabel' | 'groupLabel' | 'section' | 'eyebrow';

/**
 * iOS text styles. Everything the app says = SF Pro; numbers = SF Rounded; ONLY her quoted words = New York italic.
 */
export const type: Record<TypeVariant, TextStyle> = {
  largeTitle: { ...font.bold, fontSize: 34, lineHeight: 41, letterSpacing: 0.37, color: colors.ink },
  /** The Today prompt. SF, like every heading: one family for the app's voice (owner, 9 Nov). */
  hero: { ...font.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.26, color: colors.ink },
  /** A data sentence above a chart ("Symptoms on 10 of the last 28 days."). */
  statement: { ...font.bold, fontSize: 26, lineHeight: 31, letterSpacing: -0.4, color: colors.ink },
  title: { ...font.bold, fontSize: 22, lineHeight: 28, letterSpacing: 0.35, color: colors.ink },
  quote: { ...font.serifItalic, fontSize: 18, lineHeight: 25, color: colors.ink },
  headline: { ...font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.41, color: colors.ink },
  body: { ...font.regular, fontSize: 17, lineHeight: 22, letterSpacing: -0.41, color: colors.ink },
  secondary: { ...font.regular, fontSize: 15, lineHeight: 20, letterSpacing: -0.24, color: colors.ink2 },
  caption: { ...font.regular, fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: colors.ink2 },
  numeral: { ...font.roundedBold, fontSize: 48, lineHeight: 52, fontVariant: ['tabular-nums'], color: colors.ink },
  /** Dashboard tile number. */
  metric: { ...font.roundedBold, fontSize: 34, lineHeight: 40, fontVariant: ['tabular-nums'], color: colors.ink },
  tab: { ...font.medium, fontSize: 10, lineHeight: 12, letterSpacing: 0.1, color: colors.ink3 },
  fieldLabel: { ...font.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  /** iOS grouped-list header: small uppercase. */
  groupLabel: { ...font.regular, fontSize: 13, lineHeight: 18, letterSpacing: -0.08, textTransform: 'uppercase', color: colors.ink2 },
  /** A section over cards ("This week"). */
  section: { ...font.bold, fontSize: 20, lineHeight: 25, letterSpacing: 0.38, color: colors.ink },
  /** Small caps label above a big number ("WORST THIS WEEK"). */
  eyebrow: { ...font.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.ink2 },
};

/** 4-pt grid. */
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 56 } as const;

export const radii = { input: 12, card: 20, tile: 20, row: 12, sheet: 28, pill: 999 } as const;

export const heights = {
  primary: 50, secondary: 44, chip: 36, addChip: 36, segmented: 32, datePill: 36, minHit: 44,
  /** Tab bar content height, excluding the bottom safe-area inset. */
  tabBar: 56,
  toast: 48,
  /** Bottom padding every ScreenLarge scroll ends with (toast + gap + 24). */
  toastClearance: 80,
} as const;

/** iOS cards are flat: no resting shadows. Only floating things (sheet, toast, the PDF paper) lift. */
export const shadows: { hero: ViewStyle; card: ViewStyle; sheet: ViewStyle; toast: ViewStyle; thumb: ViewStyle; paper: ViewStyle } = {
  hero: {},
  card: {},
  sheet: { boxShadow: '0 -8px 32px rgba(0,0,0,0.18)' },
  toast: { boxShadow: '0 8px 28px rgba(0,0,0,0.18)' },
  thumb: { boxShadow: '0 1px 3px rgba(0,0,0,0.14)' },
  paper: { boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.16)' },
};

export const motion = { fast: 200, base: 240, sheet: 260, toastMs: 3000 } as const;

export const layout = { gutter: 16, maxContentWidth: 600 } as const;

/**
 * Legacy aggregate. `UI.colors.*` keeps OLD key names (auth / onboarding / profile sub-screens)
 * mapped onto the new palette. New code should import `colors`, `type`, `space`, … directly.
 */
export const UI = {
  colors: {
    ...colors,
    background: colors.canvas,
    foreground: colors.ink,
    card: colors.surface,
    primary: colors.accent,
    primaryStrong: colors.accent,
    primaryForeground: colors.onAccent,
    secondary: colors.accentTint,
    secondaryForeground: colors.accent,
    muted: colors.sunken,
    mutedForeground: colors.ink2,
    accentForeground: colors.accent,
    destructive: colors.error,
    border: colors.hairline,
    success: colors.saved,
    successSoft: colors.savedTint,
    coralSoft: colors.errorTint,
    blueSoft: colors.accentTint,
    bleeding: colors.clay,
    bleedingLight: colors.clay,
    bleedingDark: colors.clay,
  },
  font: {
    display: fonts.serif,
    body: fonts.regular,
    medium: fonts.medium,
    semibold: fonts.semibold,
    bold: fonts.semibold,
  },
  size: { body: 17, small: 15, tiny: 13, h3: 17, h2: 22, display: 34 },
  radius: radii.input,
  minTap: heights.primary,
  gutter: layout.gutter,
  maxContentWidth: layout.maxContentWidth,
} as const;
