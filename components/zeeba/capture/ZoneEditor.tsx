// "Where" editor. Shared by the capture follow-up, the noted card and Timeline's entry detail.
// Since 23 Nov 2026 it leads with the body map (BodyMap.tsx): she taps where it hurts on the front or back
// figure. Under it: chips for the two places a picture of the outside of the body cannot show (deep inside,
// bottom / opening bowels), any older answers already on the note, and the same body parts as a list for
// anyone who cannot use the picture. Nothing pre-selected; chips wrap (never clip).
// Pass `text` + `onTextChange` to also offer "Somewhere else" (her own words — a headache or a
// rash isn't in the pelvic zones) and the Not sure / It varies answers; both are saved as
// `whereText`. An escape answer clears the zones (onChange([])); picking a zone clears an escape.
import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, Chip, ChipGroup, Txt } from '../kit';
import { BODY_MAP_NAMES, BodyMap } from './BodyMap';
import { font, colors, fonts, radii, space } from '../../../constants/zeebaUI';
import { BODY_ZONE_LABELS, OFF_MAP_ZONES } from '../../../lib/records/fields';
import { isEscapeValue } from '../../../lib/records/format';

const ESCAPES = ['Not sure', 'It varies'];

export function ZoneEditor({
  value, onChange, text, onTextChange, onSubmit,
}: {
  value: string[];
  onChange: (zones: string[]) => void;
  /** Free "where" (her words) or an escape answer. Omit to show the zone chips only. */
  text?: string;
  onTextChange?: (text: string) => void;
  /** Return key in the "Somewhere else" field (e.g. close the editor). */
  onSubmit?: () => void;
}) {
  const withText = onTextChange !== undefined;
  const t = text ?? '';
  const escape = isEscapeValue(t) ? t.trim() : '';
  const [listOpen, setListOpen] = useState(false);
  const change = (zones: string[]) => {
    onChange(zones);
    if (withText && escape && zones.length) onTextChange!('');
  };
  const toggle = (name: string) => change(value.includes(name) ? value.filter((z) => z !== name) : [...value, name]);
  const onMap = value.filter((z) => BODY_MAP_NAMES.includes(z));
  // Chips: what the picture can't show, plus any answer already on the note that isn't a part of the picture.
  const older = value.filter((z) => !BODY_MAP_NAMES.includes(z) && !(OFF_MAP_ZONES as readonly string[]).includes(z));
  const chipZones = [...OFF_MAP_ZONES, ...older, ...(listOpen ? BODY_MAP_NAMES : [])];
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Txt variant="caption" style={{ textAlign: 'center' }}>Tap where you feel it. Front on the left, back on the right.</Txt>
        <BodyMap value={value} onToggle={toggle} />
        <Txt variant="secondary" color={onMap.length ? colors.ink : colors.ink2} style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
          {onMap.length ? onMap.join(' · ') : 'Nothing marked yet'}
        </Txt>
      </View>
      <ChipGroup
        mode="multi"
        accessibilityLabel="Where you feel it"
        options={chipZones.map((z) => ({ value: z, label: (BODY_ZONE_LABELS as Record<string, string | undefined>)[z] ?? z }))}
        ghosts={[]}
        exclusive={[]}
        value={value}
        onChange={change}
      />
      <Button
        label={listOpen ? 'Hide the list' : 'Pick from a list instead'}
        variant="text"
        small
        onPress={() => setListOpen((v) => !v)}
        accessibilityHint="Shows the same body parts as words"
      />
      {withText ? (
        <>
          <View style={{ gap: space.xs }}>
            <Txt variant="caption" nativeID="where-else-label">Somewhere else</Txt>
            <TextInput
              value={escape ? '' : t}
              onChangeText={(v) => onTextChange!(v)}
              placeholder="For example, my head"
              placeholderTextColor={colors.ink2}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              accessibilityLabel="Somewhere else, in your words"
              accessibilityLabelledBy="where-else-label"
              style={styles.input}
            />
          </View>
          <View style={styles.escapes}>
            {ESCAPES.map((a) => (
              <Chip
                key={a}
                label={a}
                ghost
                selected={escape === a}
                accessibilityRole="radio"
                onPress={() => {
                  if (escape === a) { onTextChange!(''); return; }
                  onChange([]);
                  onTextChange!(a);
                }}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52, borderRadius: radii.input, borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: colors.surface, paddingHorizontal: space.md, paddingVertical: space.sm,
    ...font.regular, fontSize: 17, lineHeight: 24, color: colors.ink,
  },
  escapes: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
