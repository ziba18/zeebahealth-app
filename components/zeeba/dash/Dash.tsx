// Dashboard building blocks (Midnight direction B's tiles, used in both appearances).
// Tile: small caps label, one big SF Rounded number, an optional visual. Gauge: a 0–10 arc.
// MiniBars: one bar per day. All colours are tokens; SVG gets plain hex from useColors().
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, space, type as typeScale, useColors } from '../../../constants/zeebaUI';
import { Txt } from '../kit';
import { Icon } from '../../ui/Icon';

export function Tile({
  label, value, unit, note, children, onPress, style, accessibilityLabel,
}: {
  label: string;
  value: string;
  unit?: string;
  /** One short line under the number (accent-coloured fact, e.g. "4 missed work"). */
  note?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const tall = !!children;
  const body = (
    <>
      <View style={styles.head}>
        <Txt variant="eyebrow" style={{ flex: 1 }}>{label}</Txt>
        {onPress ? <Icon name="chevron-right" size={14} color={colors.ink3} /> : null}
      </View>
      <Txt style={typeScale.metric} accessible={false}>
        {value}
        {unit ? <Txt style={styles.unit}>{unit}</Txt> : null}
      </Txt>
      {note ? <Txt variant="caption" color={colors.accent} style={styles.note}>{note}</Txt> : null}
      {children ? <View style={styles.visual}>{children}</View> : null}
    </>
  );
  const a11y = accessibilityLabel ?? `${label}: ${value}${unit ? ` ${unit.trim()}` : ''}${note ? `. ${note}` : ''}`;
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [styles.tile, !tall && styles.short, style, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={[styles.tile, !tall && styles.short, style]} accessible accessibilityLabel={a11y}>{body}</View>;
}

/** Two tiles side by side. */
export function TileRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

/** Semicircle gauge for a 0–10 value. */
export function Gauge({ value, max = 10, height = 64 }: { value: number; max?: number; height?: number }) {
  const c = useColors();
  const w = 140; const h = 74; const r = 62; const cx = 70; const cy = 70; const sw = 9;
  const frac = Math.max(0, Math.min(1, value / max));
  const a = Math.PI * (1 - frac);
  const x = cx + r * Math.cos(a); const y = cy - r * Math.sin(a);
  const track = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fill = frac <= 0 ? '' : `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${w} ${h + 2}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
      <Path d={track} stroke={c.chartTrack} strokeWidth={sw} strokeLinecap="round" fill="none" />
      {fill ? <Path d={fill} stroke={c.accent} strokeWidth={sw} strokeLinecap="round" fill="none" /> : null}
    </Svg>
  );
}

/** One bar per day; empty days are short track stubs. `values` are 0–10, null = no note. */
export function MiniBars({ values, labels }: { values: (number | null)[]; labels?: string[] }) {
  const c = useColors();
  return (
    <View aria-hidden>
      <View style={styles.bars}>
        {values.map((v, i) => {
          const has = v !== null;
          const hgt = has ? 10 + ((v ?? 0) / 10) * 26 : 6;
          return (
            <View
              key={i}
              style={{
                flex: 1, height: hgt, borderRadius: 4,
                backgroundColor: has ? c.accent : c.chartTrack,
                opacity: has ? 0.45 + ((v ?? 5) / 10) * 0.55 : 1,
              }}
            />
          );
        })}
      </View>
      {labels ? (
        <View style={styles.barLabels}>
          {labels.map((l, i) => <Txt key={i} variant="caption" style={styles.barLabel}>{l}</Txt>)}
        </View>
      ) : null}
    </View>
  );
}

/** Section title over cards, with an optional trailing link ("See all"). */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Txt variant="section" accessibilityRole="header" style={{ flex: 1 }}>{title}</Txt>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link">
          {({ pressed }) => <Txt variant="body" color={colors.accent} style={{ opacity: pressed ? 0.5 : 1 }}>{action}</Txt>}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1, minHeight: 132, backgroundColor: colors.raised, borderRadius: radii.tile,
    borderWidth: 1, borderColor: colors.cardBorder, padding: space.md, gap: space.xxs,
  },
  short: { minHeight: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  unit: { ...typeScale.secondary, fontWeight: '600', color: colors.ink2 },
  note: { fontWeight: '600' },
  visual: { marginTop: 'auto', paddingTop: space.xs },
  row: { flexDirection: 'row', gap: space.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 36 },
  barLabels: { flexDirection: 'row', gap: 4, marginTop: 4 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 10, lineHeight: 12 },
  section: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: space.xxs, marginBottom: space.xs },
});
