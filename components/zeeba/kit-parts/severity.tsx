import React from 'react';
import {
  StyleSheet, View, type StyleProp, type ViewStyle,
} from 'react-native';
import { font, radii, severityColor, space } from '../../../constants/zeebaUI';
import { Txt } from './Txt';
import { PainSlider } from './PainSlider';

/**
 * 0–10 "how strong" answer (Usually / At worst). Since 10 Nov 2026 it is the PainSlider (snaps to whole
 * numbers, nothing pre-selected, Clear to un-answer), so every 0–10 in the app works the same way.
 */
export function SeverityRow({
  value, onChange, label, showLabel = true, style,
}: {
  value: number | null | undefined;
  onChange: (n: number | null) => void;
  /** Group name: shown as a FieldLabel above the slider and read by screen readers. */
  label?: string;
  /** Set false to keep `label` for screen readers only. */
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <PainSlider value={value} onChange={onChange} label={label} showLabel={showLabel} clearable style={style} />;
}

/** Display-only severity: ramp colour + the digit (the colour is never shown without the number). */
export function SeverityTag({
  value, suffix, style,
}: { value: number; /** e.g. "/10" or "/10 at worst" — the words sit inside the pill (N7). */ suffix?: string; style?: StyleProp<ViewStyle> }) {
  const { bg, fg } = severityColor(value);
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]} accessible accessibilityLabel={`${value} out of 10${(suffix ?? '').replace('/10', '')}`}>
      <Txt maxFontSizeMultiplier={1.4} style={[styles.tagText, { color: fg }]}>{`${value}${suffix ?? ''}`}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    minWidth: 28, height: 28, borderRadius: radii.pill, paddingHorizontal: space.xs,
    alignItems: 'center', justifyContent: 'center',
  },
  tagText: { ...font.semibold, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
});
