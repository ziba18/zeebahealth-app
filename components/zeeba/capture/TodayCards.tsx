// Today's building blocks (Record · Prove · Reach): the check-in card (pain slider, her words, other areas,
// today's entries), pillar headers, the week's tiles and the latest note.
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Button, Card, FactLine, InlineError, PainSlider, PressableCard, Quote, SeverityTag, Txt, showToast,
} from '../kit';
import { colors, font, layout, radii, space, useColors } from '../../../constants/zeebaUI';
import { VOICE_AVAILABLE } from '../../../lib/speechModule';
import { Icon } from '../../ui/Icon';
import { openCapture } from '../../../lib/captureStore';
import { haptics } from '../../../lib/haptics';
import { todayKey } from '../../../lib/records/dates';
import {
  compareNotesNewestFirst, formatDay, formatTimeOfDay, formatWhere, joinFacts, labelEscape, noteStamp, noteWrittenAt, notesLabel,
  typicalOf, worstOf,
} from '../../../lib/records/format';
import { useRecordsStore } from '../../../stores/recordsStore';
import type { Rec, SymptomData } from '../../../types/records';
import { Wren } from '../Wren';
import { topicsFor, useFocusStore } from '../../../lib/focus';
import { Gauge, MiniBars, Tile, TileRow } from '../dash/Dash';
import { type IconName } from '../../ui/Icon';
import { addDays } from '../../../lib/records/dates';

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** "This week" dashboard: worst pain (gauge) + days recorded (bars), then the days it got in the way. */
export function WeekDashboard() {
  const router = useRouter();
  const symptoms = useRecordsStore((s) => s.records.symptom);
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const perDay = days.map((d) => {
    const notes = symptoms.filter((x) => x.data.date === d);
    if (!notes.length) return null;
    const scores = notes.map((n) => worstOf(n.data)).filter((v): v is number => typeof v === 'number');
    return scores.length ? Math.max(...scores) : 0;
  });
  const recorded = perDay.filter((v) => v !== null).length;
  const scored = perDay.filter((v): v is number => typeof v === 'number' && v > 0);
  const worst = scored.length ? Math.max(...scored) : null;
  const inTheWay = days.filter((d) => symptoms.some((x) => x.data.date === d && (x.data.impacts ?? []).length > 0)).length;
  const letters = days.map((d) => DAY_LETTER[new Date(`${d}T12:00:00`).getDay()]);
  const toEvidence = () => router.push('/(tabs)/timeline' as any);
  return (
    <View>
      <TileRow>
        <Tile label="Worst pain" value={worst === null ? '–' : String(worst)} unit={worst === null ? undefined : '/10'} onPress={toEvidence}>
          <Gauge value={worst ?? 0} />
        </Tile>
        <Tile label="Recorded" value={String(recorded)} unit=" of 7 days" onPress={toEvidence}>
          <MiniBars values={perDay} labels={letters} />
        </Tile>
      </TileRow>
      {inTheWay > 0 ? (
        <Txt variant="secondary" style={styles.inTheWay}>
          It got in the way on <Txt variant="secondary" style={{ fontWeight: '600', color: colors.ink }}>{inTheWay} {inTheWay === 1 ? 'day' : 'days'}</Txt> this week.
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * The three steps every Today section belongs to (BRAND §1: Record · Prove · Reach). A small accent eyebrow
 * names the step, the title says what it is, one line says why it matters, so each card's place in her case is
 * plain.
 */
export function PillarHeader({
  step, pillar, title, why, action, onAction,
}: { step: number; pillar: 'Record' | 'Prove' | 'Reach'; title: string; why?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.pillar}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`Step ${step} of 3, ${pillar}`}>
        <View style={styles.stepDot}><Txt style={styles.stepNum}>{String(step)}</Txt></View>
        <Txt variant="eyebrow" color={colors.accent}>{pillar}</Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: 4 }}>
        <Txt variant="section" accessibilityRole="header" style={{ flex: 1 }}>{title}</Txt>
        {action && onAction ? (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link">
            {({ pressed }) => <Txt variant="body" color={colors.accent} style={{ opacity: pressed ? 0.5 : 1 }}>{action}</Txt>}
          </Pressable>
        ) : null}
      </View>
      {why ? <Txt variant="caption" style={{ marginTop: 2 }}>{why}</Txt> : null}
    </View>
  );
}

/** Today's entries as small chips ("6/10 · 09:12", "Note · 13:05"): proof that what she just did was kept. */
function TodayEntries() {
  const router = useRouter();
  const symptoms = useRecordsStore((s) => s.records.symptom);
  const today = todayKey();
  const list = symptoms.filter((r) => r.data.date === today).sort(compareNotesNewestFirst).reverse();
  if (!list.length) return null;
  return (
    <View style={{ gap: space.xs }}>
      <Txt variant="groupLabel">{`On your record today · ${notesLabel(list.length)}`}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {list.slice(-6).map((r) => {
          const n = worstOf(r.data) ?? typicalOf(r.data);
          const time = formatTimeOfDay(noteWrittenAt(r));
          const quick = r.data.source === 'quick';
          const label = joinFacts(n != null ? `${n}/10` : quick ? 'Rough day' : 'Note', time);
          return (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/(tabs)/timeline/entry/${r.id}?from=Today` as any)}
              accessibilityRole="button"
              accessibilityLabel={`${quick ? 'Pain' : 'Note'} ${label}. Opens it`}
              style={({ pressed }) => [styles.entryChip, pressed && { opacity: 0.6 }]}
            >
              {n != null ? <SeverityTag value={n} style={{ height: 22, minWidth: 22 }} /> : <Icon name={quick ? 'zap' : 'pencil'} size={14} color={colors.accent} />}
              <Txt variant="caption" color={colors.ink}>{n != null ? time || 'Today' : label}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * RECORD: the one check-in card. Pain on a 0–10 slider (nothing pre-set; Log saves it, dated, in about ten
 * seconds), then her own words (speak or type), then any other area. Everything she adds here lands in
 * Evidence and in the report for her doctor.
 */
export function CheckInCard({ first, onPeriod }: { first?: boolean; onPeriod: () => void }) {
  const create = useRecordsStore((s) => s.create);
  const c = useColors();
  const [value, setValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const voice = VOICE_AVAILABLE && Platform.OS !== 'web';

  const log = async () => {
    if (value == null || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = await create('symptom', {
        date: todayKey(), words: '', where: '', typical: null, worst: value, score: value,
        duration: '', stopped: null, stoppedWords: '', source: 'quick', createdAt: noteStamp(todayKey()),
      });
      haptics.success();
      const hard = value >= 8;
      showToast(
        saved.pending ? 'Saved on this phone. It will send when you’re online.'
          : hard ? `Pain ${value}/10 is on your record. That sounded like a hard day.`
          : `Pain ${value}/10 is on your record.`,
        saved.pending ? undefined : { mood: hard ? 'comfort' : 'proud' },
      );
      setValue(null);
    } catch {
      setError('That didn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card tone="hero" style={styles.hero}>
      <LinearGradient
        colors={[c.glow, 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.25 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      <View style={styles.heroTop}>
        <Wren mood="idle" size={56} decorative />
        <View style={styles.heroPrompt}>
          <Txt variant="hero" accessibilityRole="header">{first ? 'Start your record' : 'How’s your body today?'}</Txt>
          <Txt variant="caption" style={{ marginTop: 2 }}>Every entry is dated and kept for your doctor.</Txt>
        </View>
      </View>

      <View>
        <Txt variant="headline">Pain right now</Txt>
        <PainSlider value={value} onChange={setValue} label="Pain right now" showLabel={false} readout minLabel="No pain" maxLabel="Worst imaginable" />
        <Button
          label={value == null ? 'Choose a number to log it' : `Log pain ${value}/10`}
          icon={value == null ? undefined : 'check'}
          onPress={log}
          loading={saving}
          disabled={value == null}
          style={{ marginTop: space.sm }}
          accessibilityHint="Saves it to today, with the time"
        />
        <InlineError message={error} style={{ marginTop: space.xs }} />
      </View>

      <View style={styles.divider} />

      <View style={{ gap: space.sm }}>
        <Txt variant="headline">In your own words</Txt>
        <View style={styles.heroBtns}>
          {voice ? (
            <>
              <Button label="Speak" icon="mic" variant="secondary" onPress={() => openCapture({ mode: 'speak', startRecording: true })} accessibilityHint="Opens a new note and starts recording" style={{ flex: 1 }} />
              <Button label="Type" icon="pencil" variant="secondary" onPress={() => openCapture({ mode: 'type' })} style={{ flex: 1 }} />
            </>
          ) : (
            <Button label="Write a note" icon="pencil" variant="secondary" onPress={() => openCapture({ mode: 'type' })} style={{ flex: 1 }} />
          )}
        </View>
        <Txt variant="caption">Your words are quoted as you wrote them. Or log something else:</Txt>
        <QuickRows onPeriod={onPeriod} onCard />
      </View>

      <TodayEntries />
    </Card>
  );
}

/** Most recent symptom note (by date, then by when it was saved). */
export function latestNote(symptoms: Rec<SymptomData>[]): Rec<SymptomData> | undefined {
  return [...symptoms].sort(compareNotesNewestFirst)[0];
}

/** First run: what a saved note will look like here, clearly marked as an example. */
export function GhostNoteCard() {
  return (
    <View style={styles.ghost} accessible accessibilityLabel="Example of a saved note. Sharp low belly pain since Tuesday, worse in the evening. 7 out of 10 at worst. Your notes will appear here.">
      <Txt variant="caption">Example · your notes will appear here</Txt>
      <View style={{ opacity: 0.85 }} aria-hidden>
        <Quote numberOfLines={2}>Sharp low belly pain since Tuesday, worse in the evening.</Quote>
        <View style={[styles.factRow, { marginTop: space.sm }]}>
          <SeverityTag value={7} suffix="/10 at worst" />
          <Txt variant="secondary">Lower belly</Txt>
        </View>
      </View>
    </View>
  );
}

export function LatestNoteCard({ note }: { note: Rec<SymptomData> }) {
  const router = useRouter();
  const s = note.data;
  const words = (s.words ?? '').trim();
  const worst = worstOf(s);
  const quick = s.source === 'quick';
  // Same reading as Timeline's EntryCard (N7): the worst value leads as a SeverityTag with its
  // words inside the pill, then where / an escape answer on the same line.
  const suffix = quick || typicalOf(s) == null ? '/10' : '/10 at worst';
  const facts = joinFacts(
    labelEscape('Where', formatWhere(s)),
    s.strengthText ? labelEscape('How strong', s.strengthText) : '',
  );
  const time = formatTimeOfDay(noteWrittenAt(note));
  const date = joinFacts(formatDay(s.date), time);
  const strength = worst != null ? `${worst}/10${suffix === '/10' ? '' : ' at worst'}` : '';
  return (
    <PressableCard
      onPress={() => router.push(`/(tabs)/timeline/entry/${note.id}?from=Today` as any)}
      accessibilityLabel={`Your latest note, ${date}. ${words || 'Rough day'}. ${joinFacts(strength, facts)}`}
      accessibilityHint="Opens the note"
    >
      <View style={{ gap: space.sm }}>
        {/* Non-breaking spaces keep the date together, so at 320 it wraps before it rather than orphaning the time. */}
        <Txt variant="caption">{`Your latest note · ${date.replace(/ /g, '\u00A0')}`}</Txt>
        {words ? <Quote numberOfLines={4}>{words}</Quote> : <Txt variant="headline">Rough day</Txt>}
        {worst != null || facts ? (
          <View style={styles.factRow}>
            {worst != null ? <SeverityTag value={worst} suffix={suffix} /> : null}
            {facts ? <View style={{ flex: 1, minWidth: 110 }}><FactLine parts={[facts]} numberOfLines={2} /></View> : null}
          </View>
        ) : null}
      </View>
    </PressableCard>
  );
}

const QUICK_ROWS: { label: string; icon: IconName; tag?: string }[] = [
  { label: 'Pain', icon: 'zap', tag: 'Pain today' },
  { label: 'Bleeding', icon: 'droplet' },
  { label: 'Tummy, bowel or bladder', icon: 'activity', tag: 'Tummy, bowel or bladder' },
  { label: 'Tired', icon: 'moon', tag: 'Tired' },
  { label: 'Mood', icon: 'heart', tag: 'Mood' },
  { label: 'Skin or hair', icon: 'sparkles', tag: 'Skin or hair' },
  { label: 'Something new', icon: 'plus', tag: 'Something new' },
];

const PRIMARY_ROWS = ['Pain', 'Bleeding', 'Tired', 'Something new'];
/** Short chip labels (the long names stay as note tags). */
const CHIP_LABEL: Record<string, string> = { 'Tummy, bowel or bladder': 'Bowel or bladder', 'Something new': 'Other' };

/** One compact, scrolling row of topic chips (her chosen areas first). Each opens a note on that topic. */
export function QuickRows({ onPeriod, onCard }: { onPeriod: () => void; /** Inside a card: sunken chips that bleed to the card edge. */ onCard?: boolean }) {
  const focus = useFocusStore((st) => st.areas);
  const primary = topicsFor(focus, PRIMARY_ROWS);
  const rows = [
    ...primary.map((l) => QUICK_ROWS.find((r) => r.label === l)!).filter(Boolean),
    ...QUICK_ROWS.filter((r) => !primary.includes(r.label)),
  ].filter((r) => !(onCard && r.label === 'Pain')); // the check-in's slider is right above
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroll} accessibilityLabel="Log something else">
      {rows.map((r) => (
        <Pressable
          key={r.label}
          onPress={() => { haptics.selection(); r.label === 'Bleeding' ? onPeriod() : openCapture({ mode: 'type', tag: r.tag }); }}
          accessibilityRole="button"
          accessibilityLabel={`Log ${r.label}`}
          style={({ pressed }) => [styles.topicChip, onCard && { backgroundColor: colors.sunken }, pressed && { opacity: 0.6 }]}
        >
          <Icon name={r.icon} size={15} color={colors.accent} />
          <Txt variant="secondary" color={colors.ink} style={{ fontWeight: '500' }}>{CHIP_LABEL[r.label] ?? r.label}</Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: space.xs, paddingHorizontal: space.md, alignItems: "center" },
  qgrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hero: { padding: space.md, gap: space.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: -space.xxs },
  pillar: { paddingHorizontal: space.xxs, marginBottom: space.sm },
  stepDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  stepNum: { ...font.roundedBold, fontSize: 11, lineHeight: 13, color: colors.accent },
  entryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: space.sm, height: 30, borderRadius: radii.pill, backgroundColor: colors.sunken },
  chipScroll: { marginHorizontal: -layout.gutter },
  chipRow: { paddingHorizontal: layout.gutter, gap: space.xs },
  topicChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: space.sm,
    borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder,
  },
  rough: { paddingVertical: space.sm, gap: space.xs },
  roughHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  scale: { flexDirection: 'row', gap: 3 },
  cell: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cellNum: { ...font.rounded, fontSize: 14 },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  heroPrompt: { flex: 1, minWidth: 0 },
  heroBtns: { flexDirection: 'row', gap: space.xs },
  inTheWay: { marginTop: space.sm, paddingHorizontal: space.xxs },
  center: { textAlign: 'center' },
  ghost: { gap: space.sm, padding: space.md, borderRadius: radii.card, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.hairline },
  wave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 30, marginBottom: space.md },
  heroMic: { alignItems: 'center', marginTop: space.xl, gap: space.sm },
  micLabel: { textAlign: 'center' },
  next: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
    marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline,
  },
  nextItem: { flexDirection: 'row', alignItems: 'center' },
  nextDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.ink3, marginHorizontal: 5 },
  chipsWrap: { marginHorizontal: -layout.gutter },
  chipsRow: { flexDirection: 'row', gap: space.xs, paddingHorizontal: layout.gutter, paddingRight: layout.gutter + space.xxl },
  fade: { position: 'absolute', top: 0, bottom: 0, right: 0, width: space.xxl },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs },
});
