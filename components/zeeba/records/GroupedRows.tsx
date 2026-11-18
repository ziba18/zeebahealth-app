// iOS-style inset-grouped list for Profile: one white card per section, 56 pt rows, hairline
// dividers inset past the leading glyph. Used instead of a stack of one-row cards.
import React from 'react';
import { Pressable, Switch, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { colors, heights, radii, space } from '../../../constants/zeebaUI';
import { Icon, type IconName } from '../../ui/Icon';
import { Quote, Txt } from '../kit';
import { haptics } from '../../../lib/haptics';

const ROW_PAD = space.md;
/** The leading glyph sits in a 32 pt tinted tile, like iOS Settings. */
const GLYPH = 32;
/** Divider inset = row padding + glyph tile + gap, so it starts under the label. */
const DIVIDER_INSET = ROW_PAD + GLYPH + space.sm;

/** Section heading over a group: 15/20 600 ink-2, 8 above the card. */
export function GroupHeading({ title, style, icon }: { title: string; style?: StyleProp<ViewStyle>; /** A glyph before a larger title (Profile's "Settings"). */ icon?: IconName }) {
  if (icon) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm, paddingHorizontal: space.xxs }, style]}>
        <Icon name={icon} size={22} color={colors.ink} />
        <Txt variant="section" accessibilityRole="header">{title}</Txt>
      </View>
    );
  }
  return (
    <View style={[{ marginBottom: space.xs, paddingHorizontal: space.xxs }, style]}>
      <Txt variant="groupLabel" accessibilityRole="header">{title}</Txt>
    </View>
  );
}

/**
 * The white card holding a section's rows. Children should be `GroupRow`s. `edge="clay"` draws
 * the 4 pt bleeding edge ONCE down the card's left side (bleeding rows only), and the rows and
 * dividers start after it.
 */
export function Group({
  children, style, edge, accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edge?: 'clay';
  accessibilityLabel?: string;
}) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]} accessibilityLabel={accessibilityLabel}>
      {edge ? <View style={styles.clayEdge} /> : null}
      {rows.map((child, i) => (
        <View key={i} style={edge ? styles.afterEdge : undefined}>
          {i > 0 ? <View style={[styles.divider, { marginLeft: hasIcon(child) ? DIVIDER_INSET : ROW_PAD }]} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

const hasIcon = (child: React.ReactNode) =>
  React.isValidElement(child) && !!(child.props as { icon?: IconName }).icon;

/**
 * One row: optional 20 pt ink glyph, label (17 ink) with an optional secondary line, an
 * optional trailing value (ink-3) and a chevron when it navigates.
 */
export function GroupRow({
  icon, label, detail, quote, value, onPress, chevron = true, accessibilityLabel, tone,
}: {
  icon?: IconName;
  label: string;
  detail?: string;
  /** Sam's own words for this row (e.g. a period-day note), shown as a serif Quote. */
  quote?: string;
  value?: string;
  onPress: () => void;
  chevron?: boolean;
  accessibilityLabel?: string;
  /** `danger`: the label and glyph in error red (Delete account). */
  tone?: 'danger';
}) {
  // Under ~280 px (200% zoom) the decorative icon goes and the gap closes, so words are not broken mid-word.
  const tight = useWindowDimensions().width < 280;
  const danger = tone === 'danger';
  return (
    <Pressable
      onPress={() => { haptics.selection(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [label, detail, quote, value].filter(Boolean).join('. ')}
      style={({ pressed }) => [styles.row, tight && { gap: space.xs }, pressed && { backgroundColor: colors.sunken }]}
    >
      {icon && !tight ? (
        <View style={[styles.glyph, danger && { backgroundColor: colors.errorTint }]} aria-hidden>
          <Icon name={icon} size={18} color={danger ? colors.error : colors.accent} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Txt variant="body" color={danger ? colors.error : undefined}>{label}</Txt>
        {detail ? <Txt variant="secondary">{detail}</Txt> : null}
        {quote ? <Quote numberOfLines={2}>{quote}</Quote> : null}
      </View>
      {value ? <Txt variant="body" color={colors.ink3} style={styles.tabular}>{value}</Txt> : null}
      {chevron ? <Icon name="chevron-right" size={20} color={colors.ink3} /> : null}
    </Pressable>
  );
}

/** Children with fragments expanded, so a fields component returning <>…</> still gets one hairline per field. */
function flatten(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((c) =>
    React.isValidElement(c) && c.type === React.Fragment ? flatten((c.props as { children?: React.ReactNode }).children) : [c],
  );
}

/** White rounded group of form fields, a hairline between each (iOS Settings style). */
export function FieldGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = flatten(children);
  return (
    <View style={[styles.group, style]}>
      {items.map((child, i) => (
        <View key={i} style={[{ padding: space.md }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** Footer note under a group (13 pt, ink2 — ink3 fails AA on the sunken background). */
export function GroupFooter({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return <Txt variant="caption" color={colors.ink2} style={[{ marginTop: space.xs, paddingHorizontal: space.md }, style]}>{children}</Txt>;
}

/** One choice in a short list (reminder time): a full-width 56 pt row, ticked when chosen. */
export function GroupChoiceRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { if (!selected) { haptics.selection(); onPress(); } }}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sunken }]}
    >
      <View style={styles.text}><Txt variant="body" style={selected ? { fontWeight: '600' } : undefined}>{label}</Txt></View>
      {selected ? <Icon name="check" size={22} color={colors.accent} strokeWidth={2.4} /> : null}
    </Pressable>
  );
}

/**
 * A row with a native-style switch, for settings groups. The whole row is the target (56 pt or taller), not only
 * the small switch, the same as the two rows on the consent screen; the switch itself only shows the state.
 */
export function GroupSwitchRow({ label, detail, value, onChange, icon }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={() => { haptics.selection(); onChange(!value); }}
      accessibilityRole="switch"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sunken }]}
    >
      {icon ? <View style={styles.glyph} aria-hidden><Icon name={icon} size={18} color={colors.accent} /></View> : null}
      <View style={styles.text}>
        <Txt variant="body">{label}</Txt>
        {detail ? <Txt variant="secondary">{detail}</Txt> : null}
      </View>
      <View style={{ pointerEvents: 'none' }} accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden>
        <Switch
          value={value}
          onValueChange={() => {}}
          trackColor={{ false: colors.borderStrong, true: colors.accent }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.borderStrong}
          // react-native-web only (the design preview): its "on" thumb is teal unless told otherwise.
          {...({ activeThumbColor: '#FFFFFF' } as object)}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface, borderRadius: radii.card, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.cardBorder,
    boxShadow: '0 1px 2px rgba(16,18,40,0.04), 0 6px 18px rgba(16,18,40,0.05)',
  },
  // 56 pt rows: a large, forgiving target for every setting.
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: Math.max(56, heights.minHit),
    paddingHorizontal: ROW_PAD, paddingVertical: space.sm,
  },
  glyph: { width: GLYPH, height: GLYPH, borderRadius: 9, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
  clayEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.clay, zIndex: 1 },
  afterEdge: { marginLeft: 4 },
  tabular: { fontVariant: ['tabular-nums'] },
});
