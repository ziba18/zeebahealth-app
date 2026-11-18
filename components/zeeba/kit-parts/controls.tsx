import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle, type ScrollViewInstance } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { font, colors, fonts, heights, layout, radii, shadows, space, useColors } from '../../../constants/zeebaUI';
import { AnimatedPressable, usePressSpring } from './pressSpring';
import { haptics } from '../../../lib/haptics';
import { formatRelativeDay } from '../../../lib/records/format';
import { Icon, type IconName } from '../../ui/Icon';
import { Txt } from './Txt';

// Sizes for this audience (11 Nov 2026 review): the same as the first-run screens, so the app is one app.
// Main buttons 56, every other button 48, chips 44 inside a 48 touch area, segmented control 40 inside 48.
const SIZE = { primary: 56, secondary: 48, text: 48, chip: 44, segmented: 40, icon: 48 } as const;

// ---- Button -------------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'destructive' | 'destructiveOutline';

/**
 * primary — 56, accent fill. One per screen/sheet.
 * secondary — 48, soft accent tint, accent text.
 * text — 48, accent text, no fill (links such as "Type instead", "Add more").
 * destructive — 48 text-style button in error red ("Delete note" on a note, "Delete entry" on other records). Confirm with ConfirmCard.
 * destructiveOutline — 48 outline in error red; ConfirmCard's confirm action (N21).
 * Disabled primary = sunken fill + ink2 text (still readable, clearly inactive).
 */
export function Button({
  label, onPress, variant = 'primary', icon, disabled, loading, style, accessibilityLabel, accessibilityHint, align = 'center',
  small,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Text/destructive buttons often sit left-aligned under content. */
  align?: 'center' | 'start';
  /** Text variant only: a quieter 15/500 label (e.g. "Type instead" under the hero mic). */
  small?: boolean;
}) {
  const inactive = disabled || loading;
  const spring = usePressSpring(0.97);
  const pressed = spring.pressed && !inactive;
  const solid = variant === 'primary' || variant === 'secondary' || variant === 'destructiveOutline';
  const fg =
    variant === 'primary' ? (inactive ? colors.ink2 : colors.onAccent)
    : variant === 'secondary' ? (inactive ? colors.ink3 : colors.accent)
    : variant === 'destructive' || variant === 'destructiveOutline' ? colors.error
    : colors.accent;
  return (
    <AnimatedPressable
      onPress={() => { if (variant === 'primary') haptics.light(); onPress(); }}
      onPressIn={spring.onPressIn}
      onPressOut={spring.onPressOut}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.btnBase,
        variant === 'primary' && [styles.primary, { backgroundColor: inactive ? colors.sunken : pressed ? colors.accentPressed : colors.accent }, !inactive && styles.primaryLift],
        variant === 'secondary' && [styles.secondary, { backgroundColor: inactive ? colors.sunken : colors.accentTint, opacity: pressed ? 0.8 : 1 }],
        variant === 'destructiveOutline' && [styles.secondary, { borderColor: colors.error, backgroundColor: pressed ? colors.errorTint : 'transparent', opacity: inactive ? 0.5 : 1 }],
        (variant === 'text' || variant === 'destructive') && [styles.textBtn, { opacity: inactive ? 0.5 : pressed ? 0.6 : 1 }],
        align === 'start' && { justifyContent: 'flex-start', alignSelf: 'flex-start', paddingHorizontal: 0 },
        style,
        // The filled and tinted buttons press in with a spring (0.97); text links only dim.
        solid && { transform: [{ scale: spring.scale }] },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Txt
        variant="headline"
        color={fg}
        style={[{ textAlign: 'center', flexShrink: 1 }, small && { ...font.medium, fontSize: 15, lineHeight: 20 }]}
      >
        {label}
      </Txt>
    </AnimatedPressable>
  );
}

/**
 * 48×48 icon-only button. Interactive glyphs are ink (or pass `color`). `filled` (plum circle)
 * is deprecated for header "+" — use `AddButton` (review 1, V16: one add treatment).
 */
export function IconButton({
  icon, onPress, label, filled, color, size = 24,
}: { icon: IconName; onPress: () => void; label: string; filled?: boolean; color?: string; size?: 20 | 24 | 32 }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconBtn,
        filled && { backgroundColor: pressed ? colors.accentPressed : colors.accent },
        !filled && pressed && { backgroundColor: colors.sunken },
      ]}
    >
      <Icon name={icon} size={size} color={color ?? (filled ? colors.onAccent : colors.ink)} />
    </Pressable>
  );
}

/**
 * THE header "add" affordance (Evidence, every records list): a soft pill with a plus AND the word "Add"
 * (an icon alone is a guess for someone new to phones). 44 tall inside a 48 touch area. `label` is the full
 * spoken name ("Add a note"). Hide it while an EmptyState shows its own primary for the same action.
 */
export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const spring = usePressSpring(0.97);
  return (
    <AnimatedPressable
      onPress={() => { haptics.selection(); onPress(); }}
      onPressIn={spring.onPressIn}
      onPressOut={spring.onPressOut}
      hitSlop={2}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.addPill, spring.pressed && { opacity: 0.8 }, { transform: [{ scale: spring.scale }] }]}
    >
      <Icon name="plus" size={20} color={colors.accent} />
      <Txt maxFontSizeMultiplier={1.4} style={styles.addPillText}>Add</Txt>
    </AnimatedPressable>
  );
}

// ---- Chips --------------------------------------------------------------------------------

/**
 * 44-tall pill. Outline borderStrong; selected = plumTint + 2px plum border + plum 600 text.
 * `ghost` is for the always-offered non-answers: "Not sure", "It varies", "Skip".
 */
export function Chip({
  label, selected = false, onPress, ghost, disabled, accessibilityRole = 'button', style,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  ghost?: boolean;
  disabled?: boolean;
  accessibilityRole?: 'button' | 'radio' | 'checkbox';
  style?: StyleProp<ViewStyle>;
}) {
  const spring = usePressSpring();
  return (
    <AnimatedPressable
      onPressIn={spring.onPressIn}
      onPressOut={spring.onPressOut}
      onPress={() => { haptics.selection(); onPress(); }}
      disabled={disabled}
      hitSlop={{ top: 2, bottom: 2 }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityState={accessibilityRole === 'button' ? { selected, disabled } : { checked: selected, disabled }}
      // RN-web doesn't derive aria-* from accessibilityState for these roles (review 1, UX #20).
      {...(accessibilityRole === 'button' ? { 'aria-pressed': selected } : { 'aria-checked': selected })}
      aria-disabled={disabled || undefined}
      style={[
        styles.chip,
        ghost && !selected && styles.chipGhost,
        selected && styles.chipSelected,
        spring.pressed && !selected && { backgroundColor: colors.sunken },
        { transform: [{ scale: spring.scale }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Txt
        maxFontSizeMultiplier={1.6}
        style={[styles.chipText, ghost && !selected && { color: colors.ink2 }, selected && styles.chipTextSelected]}
      >
        {label}
      </Txt>
    </AnimatedPressable>
  );
}

export type ChipOption = string | { value: string; label?: string; ghost?: boolean };
const optValue = (o: ChipOption) => (typeof o === 'string' ? o : o.value);
const optLabel = (o: ChipOption) => (typeof o === 'string' ? o : o.label ?? o.value);
const DEFAULT_GHOSTS = ['Not sure', 'It varies', 'Skip'];

type ChipGroupProps = {
  options: ChipOption[];
  /** Horizontal scroll row (filters) instead of wrapping. Scrolls the selected chip into view. */
  scroll?: boolean;
  /**
   * With `scroll`: bleed the row to the screen edges (cancels the 20 gutter) and fade the right
   * edge into `fadeColor` (default canvas). Use for every chip scroller on a screen.
   */
  bleed?: boolean;
  fadeColor?: string;
  /** Values rendered as ghost chips. Defaults to Not sure / It varies / Skip. */
  ghosts?: string[];
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
} & (
  | { mode?: 'single'; value: string | null; onChange: (v: string | null) => void; allowDeselect?: boolean }
  | {
      mode: 'multi'; value: string[]; onChange: (v: string[]) => void;
      /** Values that clear every other selection when chosen (and are cleared by any other). Default: the ghosts. */
      exclusive?: string[];
    }
);

/** A set of Chips, single- or multi-select. Selection haptic is built into Chip. */
export function ChipGroup(props: ChipGroupProps) {
  const cc = useColors();
  const ghosts = props.ghosts ?? DEFAULT_GHOSTS;
  const isMulti = props.mode === 'multi';
  const isSelected = (v: string) => (isMulti ? (props.value as string[]).includes(v) : props.value === v);

  const toggle = (v: string) => {
    if (props.mode === 'multi') {
      const exclusive = props.exclusive ?? ghosts;
      const cur = props.value;
      if (cur.includes(v)) props.onChange(cur.filter((x) => x !== v));
      else if (exclusive.includes(v)) props.onChange([v]);
      else props.onChange([...cur.filter((x) => !exclusive.includes(x)), v]);
    } else {
      const p = props as Extract<ChipGroupProps, { mode?: 'single' }>;
      if (p.value === v) { if (p.allowDeselect) p.onChange(null); }
      else p.onChange(v);
    }
  };

  // Scroll the (first) selected chip into view in scroll rows.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const xs = useRef<Record<string, { x: number; w: number }>>({});
  const viewW = useRef(0);
  const firstSelected = isMulti ? (props.value as string[])[0] : (props.value as string | null);
  const reveal = (v: string | null | undefined, animated: boolean) => {
    const at = v ? xs.current[v] : undefined;
    if (!at || !viewW.current) return;
    const pad = props.bleed ? layout.gutter : 0;
    const x = Math.max(0, at.x - pad - (viewW.current - at.w) / 2);
    scrollRef.current?.scrollTo({ x, animated });
  };
  useEffect(() => { if (props.scroll) reveal(firstSelected, true); }, [firstSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const chips = props.options.map((o) => {
    const v = optValue(o);
    const ghost = typeof o === 'object' && o.ghost !== undefined ? o.ghost : ghosts.includes(v);
    return (
      <View
        key={v}
        onLayout={props.scroll ? (e) => {
          const { x, width } = e.nativeEvent.layout;
          xs.current[v] = { x, w: width };
          if (v === firstSelected) reveal(v, false);
        } : undefined}
      >
        <Chip
          label={optLabel(o)}
          ghost={ghost}
          selected={isSelected(v)}
          accessibilityRole={isMulti ? 'checkbox' : 'radio'}
          onPress={() => toggle(v)}
        />
      </View>
    );
  });

  if (props.scroll) {
    const fade = cc.resolve(props.fadeColor ?? colors.canvas) as string;
    return (
      <View style={[props.bleed && styles.bleed, props.style]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => { viewW.current = e.nativeEvent.layout.width; }}
          accessibilityRole={isMulti ? undefined : 'radiogroup'}
          accessibilityLabel={props.accessibilityLabel}
          contentContainerStyle={[styles.chipRow, props.bleed && styles.chipRowBleed]}
        >
          {chips}
        </ScrollView>
        {props.bleed ? (
          <LinearGradient
            colors={[`${fade}00`, `${fade}E6`, fade]}
            locations={[0, 0.6, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.fade, { pointerEvents: 'none' }]}
          />
        ) : null}
      </View>
    );
  }
  return (
    <View
      accessibilityRole={isMulti ? undefined : 'radiogroup'}
      accessibilityLabel={props.accessibilityLabel}
      style={[styles.chipWrap, props.style]}
    >
      {chips}
    </View>
  );
}

/** Soft "+ Add where" chip for empty fields on the noted card (never an error). 36 visual / 44 hit. */
export function AddFieldChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.addHit}
    >
      {({ pressed }) => (
        <View style={[styles.addChip, pressed && { backgroundColor: colors.sunken }]}>
          <Icon name="plus" size={20} color={colors.accent} />
          <Txt maxFontSizeMultiplier={1.6} style={styles.addText}>{label}</Txt>
        </View>
      )}
    </Pressable>
  );
}

// ---- SegmentedControl ---------------------------------------------------------------------

export function SegmentedControl<T extends string>({
  options, value, onChange, accessibilityLabel, style,
}: {
  options: (T | { value: T; label: string })[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  // Below ~270 pt (200% text on a small phone) three labels no longer fit at 15 pt.
  const narrow = useWindowDimensions().width < 270;
  const tiny = useWindowDimensions().width < 220; // 200% text on a 390 phone: "Patterns" must not truncate
  return (
    <View style={[styles.segTrack, style]} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const v = (typeof o === 'string' ? o : o.value) as T;
        const label = typeof o === 'string' ? o : o.label;
        const selected = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => { if (!selected) { haptics.selection(); onChange(v); } }}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            aria-selected={selected}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[styles.seg, selected && styles.segSelected]}
          >
            <Txt maxFontSizeMultiplier={1.6} numberOfLines={1} style={[styles.segText, narrow && { fontSize: tiny ? 10.5 : 12 }, selected && { color: colors.ink }]}>
              {label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- DatePill -----------------------------------------------------------------------------

/** "Today ▾" — 36 pill that opens a date chooser (the caller owns the chooser). */
export function DatePill({ value, onPress, label }: { value: string; onPress: () => void; label?: string }) {
  const text = label ?? formatRelativeDay(value);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Date: ${text}. Change date`}
      style={styles.addHit}
    >
      {({ pressed }) => (
        <View style={[styles.datePill, pressed && { backgroundColor: colors.sunken }]}>
          <Txt maxFontSizeMultiplier={1.6} style={styles.datePillText}>{text}</Txt>
          <Icon name="chevron-down" size={20} color={colors.ink} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btnBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, borderRadius: radii.pill },
  primary: { minHeight: SIZE.primary, paddingHorizontal: space.xl },
  // A soft lift under the one main action (reads in light; invisible on Midnight, where the peach fill glows by itself).
  primaryLift: { boxShadow: '0 1px 2px rgba(0,0,0,0.10), 0 6px 14px rgba(0,0,0,0.10)' },
  // iOS "tinted" button: accent text on a soft accent fill, no outline.
  secondary: { minHeight: SIZE.secondary, paddingHorizontal: space.lg },
  textBtn: { minHeight: SIZE.text, paddingHorizontal: space.xs },
  iconBtn: { width: SIZE.icon, height: SIZE.icon, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  addPill: {
    height: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: space.sm, paddingRight: space.md,
    borderRadius: radii.pill, backgroundColor: colors.accentTint,
  },
  addPillText: { ...font.semibold, fontSize: 16, lineHeight: 21, color: colors.accent },

  chip: {
    minHeight: SIZE.chip, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderStrong,
    paddingHorizontal: space.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent',
  },
  // Selected border is 2px: trim padding by 1 so the chip doesn't grow.
  chipSelected: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentTint, paddingHorizontal: space.md - 1 },
  // Ghost answers (Not sure / It varies / Skip): same outline as chips (a hairline read as
  // disabled — review 1), told apart by ink2 text.
  chipGhost: { borderColor: colors.borderStrong },
  // Selected keeps weight 500 so neighbours never reflow (V25); tint + 2px ring mark it.
  chipText: { ...font.medium, fontSize: 15, lineHeight: 20, color: colors.ink },
  chipTextSelected: { color: colors.accent },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chipRow: { flexDirection: 'row', gap: space.xs, paddingRight: space.xxl },
  bleed: { marginHorizontal: -layout.gutter },
  chipRowBleed: { paddingHorizontal: layout.gutter, paddingRight: layout.gutter + space.xxl },
  fade: { position: 'absolute', top: 0, bottom: 0, right: 0, width: space.xxl },

  addHit: { minHeight: SIZE.text, justifyContent: 'center', alignSelf: 'flex-start' },
  addChip: {
    height: heights.addChip, borderRadius: radii.pill, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong,
    paddingHorizontal: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xxs,
  },
  addText: { ...font.medium, fontSize: 15, lineHeight: 20, color: colors.accent },

  // Pill like every other control (V9); the white thumb gets a hairline + the one micro-shadow.
  segTrack: { flexDirection: 'row', height: SIZE.segmented, borderRadius: radii.pill, backgroundColor: colors.sunken, padding: 3 },
  seg: { flex: 1, minWidth: 0, paddingHorizontal: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  segSelected: { backgroundColor: colors.surface, borderColor: colors.hairline, ...shadows.thumb },
  segText: { ...font.medium, fontSize: 16, lineHeight: 21, color: colors.ink2 },

  datePill: {
    height: heights.datePill, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderStrong,
    paddingLeft: space.sm, paddingRight: space.xs, flexDirection: 'row', alignItems: 'center', gap: space.xxs,
  },
  datePillText: { ...font.medium, fontSize: 15, lineHeight: 20, color: colors.ink },
});
