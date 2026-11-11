// "What I'd like from this appointment", edited in place: one main priority (a chip writes a plain
// sentence) and her questions as a numbered list she can add to, edit and remove. It prints first on
// the page, word for word. Stored as one note (priority line, then one question per line), the same
// string agendaBlockOf() splits for the document, so nothing about the saved format changes.
import React, { useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, TextInput, View } from 'react-native';
import { colors, font, radii, space, type as typeScale } from '../../../constants/zeebaUI';
import { useDictation } from '../../../hooks/useDictation';
import { haptics } from '../../../lib/haptics';
import { agendaBlockOf } from '../../../lib/records/summary';
import { Icon } from '../../ui/Icon';
import { Card, ChipGroup, IconButton, InlineError, Txt } from '../kit';

// Symptom areas only: no treatments, no conditions.
const PRIORITIES = ['Pain', 'Bleeding', 'Tiredness', 'Mood', 'Bowel or bladder'] as const;
const prioritySentence = (p: string) => `My main priority is ${p.toLowerCase()}.`;
const MAX_QUESTIONS = 8;

interface Row { id: number; text: string }
let nextId = 1;
const rowsOf = (qs: string[]): Row[] => qs.map((text) => ({ id: nextId++, text }));
const serialise = (priority: string, rows: Row[]) =>
  [priority.trim(), ...rows.map((r) => r.text.replace(/\s*\n\s*/g, ' ').trim())].filter(Boolean).join('\n');

const animate = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

export function AgendaEditor({
  value, onChange, onCommit, title, error,
}: {
  value: string;
  onChange: (t: string) => void;
  /** Save now (on blur, after a chip, after removing a row). */
  onCommit: () => void;
  title: string;
  error?: string;
}) {
  const parsed = agendaBlockOf(value, title);
  const [priority, setPriority] = useState(parsed?.priority ?? '');
  const [rows, setRows] = useState<Row[]>(() => rowsOf(parsed?.questions ?? []));
  const emitted = useRef(value);
  const inputs = useRef(new Map<number, { focus: () => void } | null>());
  const focusId = useRef<number | null>(null);
  const dictatingId = useRef<number | null>(null);

  // A note loaded from the server (or changed elsewhere) replaces the list; our own edits don't.
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    const b = agendaBlockOf(value, title);
    setPriority(b?.priority ?? '');
    setRows(rowsOf(b?.questions ?? []));
  }, [value, title]);

  useEffect(() => {
    if (focusId.current == null) return;
    inputs.current.get(focusId.current)?.focus();
    focusId.current = null;
  });

  // The dictation callback outlives renders: it reads the current list from here.
  const latest = useRef({ rows, priority });
  latest.current = { rows, priority };

  const push = (p: string, r: Row[]) => {
    const next = serialise(p, r);
    emitted.current = next;
    onChange(next);
  };

  const dictation = useDictation((transcript) => {
    const id = dictatingId.current;
    if (id == null) return;
    const next = latest.current.rows.map((r) => (r.id === id ? { ...r, text: transcript.trim() } : r));
    setRows(next);
    push(latest.current.priority, next);
  });

  const choosePriority = (v: string | null) => {
    const p = v ? prioritySentence(v) : '';
    setPriority(p);
    push(p, rows);
    onCommit();
  };

  const edit = (id: number, text: string) => {
    const next = rows.map((r) => (r.id === id ? { ...r, text } : r));
    setRows(next);
    push(priority, next);
  };

  const remove = (id: number) => {
    haptics.light();
    animate();
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    push(priority, next);
    onCommit();
  };

  const add = (focus = true) => {
    if (rows.length >= MAX_QUESTIONS) return null;
    // Reuse a trailing empty row instead of stacking blanks.
    const last = rows[rows.length - 1];
    if (last && !last.text.trim()) {
      if (focus) inputs.current.get(last.id)?.focus();
      return last.id;
    }
    animate();
    const row = { id: nextId++, text: '' };
    if (focus) focusId.current = row.id;
    setRows([...rows, row]);
    return row.id;
  };

  const toggleMic = () => {
    haptics.light();
    if (dictation.recording) {
      dictation.stop();
      dictatingId.current = null;
      onCommit();
      return;
    }
    const id = add(false);
    if (id == null) return;
    dictatingId.current = id;
    dictation.start();
  };

  const chip = PRIORITIES.find((p) => priority === prioritySentence(p)) ?? null;
  const filled = rows.filter((r) => r.text.trim()).length;

  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Txt variant="headline" accessibilityRole="header" nativeID="agendaTitle">{title}</Txt>
          <Txt variant="caption" style={{ marginTop: 2 }}>Printed first on the page, in your words.</Txt>
        </View>
        <View aria-hidden style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="message-circle" size={18} color={colors.accent} />
        </View>
      </View>

      <Txt variant="groupLabel" style={{ marginTop: space.xxs }}>Main priority</Txt>
      {priority && !chip ? <Txt variant="quote">{priority}</Txt> : null}
      <ChipGroup
        mode="single"
        options={[...PRIORITIES]}
        value={chip}
        allowDeselect
        onChange={choosePriority}
        accessibilityLabel="Main priority"
      />

      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space.xs }}>
        <Txt variant="groupLabel" style={{ flex: 1 }}>My questions</Txt>
        {filled ? <Txt variant="caption">{`${filled} of ${MAX_QUESTIONS}`}</Txt> : null}
      </View>
      <View style={{ gap: space.xs }}>
        {rows.map((r, i) => (
          <View
            key={r.id}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: space.xs,
              backgroundColor: colors.sunken, borderRadius: radii.input, paddingLeft: space.sm,
            }}
          >
            <Txt aria-hidden style={{ ...font.rounded, fontSize: 15, lineHeight: 22, color: colors.accent, paddingTop: space.sm, minWidth: 14 }}>
              {String(i + 1)}
            </Txt>
            <TextInput
              ref={(el) => { inputs.current.set(r.id, el); }}
              value={r.text}
              onChangeText={(t) => edit(r.id, t)}
              onBlur={onCommit}
              onSubmitEditing={() => add()}
              blurOnSubmit
              returnKeyType="next"
              submitBehavior="submit"
              multiline
              maxLength={200}
              placeholder="Type a question"
              placeholderTextColor={colors.ink2}
              accessibilityLabel={`Question ${i + 1}`}
              style={{ ...typeScale.body, flex: 1, paddingVertical: space.sm, minHeight: 44, outlineStyle: 'none' } as object}
            />
            <IconButton icon="x" size={20} label={`Remove question ${i + 1}`} onPress={() => remove(r.id)} color={colors.ink2} />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <Pressable
          onPress={() => { haptics.light(); add(); }}
          disabled={rows.length >= MAX_QUESTIONS}
          accessibilityRole="button"
          accessibilityLabel={rows.length ? 'Add another question' : 'Add a question'}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44,
            paddingHorizontal: space.sm, borderRadius: radii.input, borderWidth: 1, borderStyle: 'dashed',
            borderColor: colors.borderStrong, opacity: rows.length >= MAX_QUESTIONS ? 0.4 : pressed ? 0.6 : 1,
          })}
        >
          <Icon name="plus" size={18} color={colors.accent} />
          <Txt variant="body" color={colors.accent}>{rows.length ? 'Add another question' : 'Add a question'}</Txt>
        </Pressable>
        {dictation.supported ? (
          <IconButton
            icon={dictation.recording ? 'square' : 'mic'}
            label={dictation.recording ? 'Stop dictating' : 'Dictate a question'}
            onPress={toggleMic}
            color={colors.accent}
          />
        ) : null}
      </View>
      {dictation.recording ? <Txt variant="caption">Listening… tap stop when you’re done.</Txt> : null}
      <InlineError message={dictation.error || error || ''} />
    </Card>
  );
}
