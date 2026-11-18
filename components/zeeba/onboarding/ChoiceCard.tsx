// The answers on a question screen: big cards with a picture and a word, and a tick that springs in when chosen.
//   ChoiceCard  full-width row (56 pt or taller): picture, label, optional second line, tick on the right
//   ChoiceTile  half-width tile for a grid, when there are too many answers to stack without scrolling
// Both give a selection tick on the phone's haptics and say "selected" to a screen reader.
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, space } from '../../../constants/zeebaUI';
import { Icon, type IconName } from '../../ui/Icon';
import { Txt } from '../kit';
import { Pop, PressScale } from '../motion';

type Common = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** A line icon from the app's set, shown on a soft tinted square. */
  icon?: IconName;
  /** Or any picture of your own (a ClayIcon, a small drawing). */
  art?: React.ReactNode;
  /** 'checkbox' when several can be chosen, 'radio' when only one. */
  role?: 'checkbox' | 'radio';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Empty ring, or the accent disc with a tick that pops in. */
export function Tick({ on, size = 26 }: { on: boolean; size?: number }) {
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, on && styles.ringOn]}>
      {on ? (
        <Pop from={0.75} style={styles.tickFill}>
          <Icon name="check" size={size * 0.62} color={colors.onAccent} strokeWidth={2.6} />
        </Pop>
      ) : null}
    </View>
  );
}

function Picture({ icon, art, selected, small }: { icon?: IconName; art?: React.ReactNode; selected: boolean; small?: boolean }) {
  if (art) return <View style={styles.art}>{art}</View>;
  if (!icon) return null;
  return (
    <View style={[styles.iconWell, small && styles.iconWellSmall, selected && styles.iconWellOn]}>
      <Icon name={icon} size={small ? 19 : 22} color={selected ? colors.onAccent : colors.accent} />
    </View>
  );
}

const a11y = (role: 'checkbox' | 'radio', selected: boolean) => ({
  accessibilityRole: role,
  accessibilityState: { checked: selected },
} as const);

export function ChoiceCard({
  label, detail, selected, onPress, icon, art, role = 'radio', disabled, style,
}: Common & { detail?: string }) {
  return (
    <PressScale
      onPress={onPress}
      haptic="selection"
      disabled={disabled}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      {...a11y(role, selected)}
      style={[styles.card, selected && styles.cardOn, disabled && styles.off, style]}
    >
      <Picture icon={icon} art={art} selected={selected} />
      <View style={styles.text}>
        <Txt style={styles.label}>{label}</Txt>
        {detail ? <Txt variant="secondary">{detail}</Txt> : null}
      </View>
      <Tick on={selected} />
    </PressScale>
  );
}

export function ChoiceTile({
  label, detail, selected, onPress, icon, art, role = 'checkbox', disabled, style, center, compact,
}: Common & {
  detail?: string;
  /** Picture above, words centred (time-of-day cards). */
  center?: boolean;
  /** Tighter, for short phones, so more tiles fit without scrolling. */
  compact?: boolean;
}) {
  return (
    <PressScale
      onPress={onPress}
      haptic="selection"
      disabled={disabled}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      {...a11y(role, selected)}
      style={[styles.tile, compact && styles.tileCompact, center && styles.tileCenter, selected && styles.cardOn, disabled && styles.off, style]}
    >
      {center ? (
        <>
          <View style={styles.tickCorner}><Tick on={selected} size={20} /></View>
          <Picture icon={icon} art={art} selected={selected} />
        </>
      ) : (
        <View style={styles.tileTop}>
          <Picture icon={icon} art={art} selected={selected} small={compact} />
          <Tick on={selected} size={compact ? 22 : 24} />
        </View>
      )}
      <View style={center ? styles.centerText : null}>
        <Txt style={[styles.tileLabel, center && { textAlign: 'center' }]}>{label}</Txt>
        {detail ? <Txt variant="caption" style={center ? { textAlign: 'center' } : null}>{detail}</Txt> : null}
      </View>
    </PressScale>
  );
}

const shadow = '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.05)';

const styles = StyleSheet.create({
  card: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.sm,
    paddingVertical: space.sm, paddingHorizontal: space.md - 2,
    backgroundColor: colors.surface, borderRadius: 20, borderWidth: 2, borderColor: colors.cardBorder, boxShadow: shadow,
  },
  cardOn: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  off: { opacity: 0.5 },
  text: { flex: 1, minWidth: 0, gap: 1 },
  label: { ...font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: colors.ink },
  art: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  iconWell: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  iconWellSmall: { width: 32, height: 32, borderRadius: 11 },
  iconWellOn: { backgroundColor: colors.accent },
  ring: { borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ringOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  tickFill: { alignItems: 'center', justifyContent: 'center' },

  tile: {
    flex: 1, minHeight: 92, justifyContent: 'space-between', gap: 6,
    padding: space.sm, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 2, borderColor: colors.cardBorder,
    boxShadow: shadow,
  },
  tileCompact: { minHeight: 0, paddingVertical: space.xs + 2, gap: 2, borderRadius: 18 },
  tileCenter: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: space.md, paddingBottom: space.sm },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tickCorner: { position: 'absolute', top: 6, right: 6 },
  centerText: { alignItems: 'center', gap: 1 },
  tileLabel: { ...font.semibold, fontSize: 15, lineHeight: 19, letterSpacing: -0.2, color: colors.ink },
});
