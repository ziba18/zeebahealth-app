// Today's building blocks (Record · Prove · Reach): the check-in card (pain slider, her words, other areas,
// today's entries), pillar headers, the week's tiles and the latest note.
import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
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
import { ClayIcon } from '../art/ClayIcon';
import { Pop, PressScale, Pulse } from '../motion';
import { useTourTarget, type Measurable, type Rect } from '../../../lib/tour';
import { entryLanded } from './saveMoment';
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

/** Today's entries as chips ("6/10 · 09:12", "Note · 13:05"): proof that what she just did was kept. Each opens its entry. */
function TodayEntries({ list }: { list: Rec<SymptomData>[] }) {
  const router = useRouter();
  if (!list.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
      {list.slice(-6).map((r) => {
        const n = worstOf(r.data) ?? typicalOf(r.data);
        const time = formatTimeOfDay(noteWrittenAt(r));
        const quick = r.data.source === 'quick';
        const label = joinFacts(n != null ? `${n}/10` : quick ? 'Rough day' : 'Note', time);
        return (
          <PressScale
            key={r.id}
            onPress={() => router.push(`/(tabs)/timeline/entry/${r.id}?from=Today` as any)}
            haptic="selection"
            accessibilityLabel={`${quick ? 'Pain' : 'Note'} ${label}. Opens it`}
            style={styles.entryChip}
          >
            {n != null ? <SeverityTag value={n} suffix="/10" style={{ height: 28 }} /> : <Icon name={quick ? 'zap' : 'pencil'} size={16} color={colors.accent} />}
            <Txt variant="secondary" color={colors.ink} style={{ fontWeight: '500' }}>{n != null ? time || 'Today' : label}</Txt>
            <Icon name="chevron-right" size={14} color={colors.ink3} />
          </PressScale>
        );
      })}
    </View>
  );
}

/** The tick that pops in when today is on the record. */
function DoneTick() {
  return (
    <Pop from={0.6}>
      <View style={styles.doneTick}><Icon name="check" size={26} color={colors.saved} strokeWidth={2.6} /></View>
    </Pop>
  );
}

/**
 * RECORD: the one check-in card, and the one obvious thing to do on Today.
 *   Before today's entry — "How's your pain right now?": the number, very big, between a minus and a plus; the
 *   slider under it (drag, or tap a digit); one Save button. One tap on a number is a complete entry.
 *   After — "Done for today": today's entries as chips, and two ways to add more. It never nags for more.
 * The same record is written as before (a `source: 'quick'` symptom with `worst`); only how it looks changed.
 */
export function CheckInCard({
  first, onPeriod, onDraft,
}: {
  first?: boolean;
  onPeriod: () => void;
  /** Tells Today that she is choosing a number (Wren leans in to listen), or has stopped. */
  onDraft?: (choosing: boolean) => void;
}) {
  const create = useRecordsStore((s) => s.create);
  const symptoms = useRecordsStore((s) => s.records.symptom);
  const c = useColors();
  const [value, setValueState] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const voice = VOICE_AVAILABLE && Platform.OS !== 'web';
  const today = todayKey();
  const todays = symptoms.filter((r) => r.data.date === today).sort(compareNotesNewestFirst).reverse();
  const done = todays.length > 0 && !adding;
  const dial = useRef<Measurable | null>(null);
  const tourTarget = useTourTarget('checkin');

  const setValue = (n: number | null) => { setValueState(n); onDraft?.(n != null); };

  const log = async () => {
    if (value == null || saving) return;
    setSaving(true);
    setError('');
    try {
      // Where the number is on screen, so the chip can fly from it to the Doctor tab.
      const from = await new Promise<Rect | null>((resolve) => {
        const node = dial.current;
        if (!node?.measureInWindow) { resolve(null); return; }
        node.measureInWindow((x, y, w, h) => resolve(w > 0 ? { x: x + w / 2 - 32, y: y + 20, w: 64, h: 34 } : null));
        setTimeout(() => resolve(null), 300);
      });
      const saved = await create('symptom', {
        date: todayKey(), words: '', where: '', typical: null, worst: value, score: value,
        duration: '', stopped: null, stoppedWords: '', source: 'quick', createdAt: noteStamp(todayKey()),
      });
      haptics.success();
      const hard = value >= 8;
      entryLanded({ from, value });
      showToast(
        saved.pending ? 'Saved on this phone. It will send when you’re online.'
          : hard ? `Pain ${value}/10 is on your record. That sounded like a hard day.`
          : `Pain ${value}/10 is on your record.`,
        saved.pending ? undefined : { mood: hard ? 'comfort' : 'proud' },
      );
      setValue(null);
      setAdding(false);
    } catch {
      setError('That didn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const words = (
    <View style={styles.heroBtns}>
      {voice ? (
        <>
          <Button label="Speak" icon="mic" variant="secondary" onPress={() => openCapture({ mode: 'speak', startRecording: true })} accessibilityHint="Opens a new note and starts recording" style={styles.wordBtn} />
          <Button label="Type" icon="pencil" variant="secondary" onPress={() => openCapture({ mode: 'type' })} accessibilityLabel="Type a note" style={styles.wordBtn} />
        </>
      ) : (
        <Button label={done ? 'Add a note in your words' : 'Write a note instead'} icon="pencil" variant="secondary" onPress={() => openCapture({ mode: 'type' })} style={styles.wordBtn} />
      )}
    </View>
  );

  return (
    <Card tone="hero" style={styles.hero}>
      <LinearGradient
        colors={[c.glow, 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.32 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      <View style={styles.pillarRow}>
        <ClayIcon name="record" size={30} />
        <Txt variant="eyebrow" color={colors.accent} style={{ flex: 1 }}>Record</Txt>
        <Txt variant="caption">{formatDay(today)}</Txt>
      </View>

      {done ? (
        <View style={{ gap: space.md }}>
          {/* Once today is recorded the slider is put away, so the tour points here instead. */}
          <View ref={tourTarget as any} collapsable={false} style={styles.doneRow}>
            <DoneTick />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="hero" accessibilityRole="header">Done for today</Txt>
              <Txt variant="secondary" style={{ marginTop: 2 }}>Dated, saved and already in your report.</Txt>
            </View>
          </View>
          <TodayEntries list={todays} />
          <View style={styles.divider} />
          <View style={{ gap: space.xs }}>
            <Txt variant="caption">Something changed? Add to today any time.</Txt>
            <Button label="Add another number" icon="plus" variant="secondary" onPress={() => setAdding(true)} style={styles.wordBtn} />
            {words}
          </View>
        </View>
      ) : (
        <>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="hero" accessibilityRole="header">{adding ? 'Add another number' : 'How’s your pain right now?'}</Txt>
                <Txt variant="secondary" style={{ marginTop: 2 }}>{first ? 'Start here. One tap is a full entry.' : 'One tap is a full entry.'}</Txt>
              </View>
              {adding ? (
                <Button label="Cancel" variant="text" small onPress={() => { setValue(null); setAdding(false); }} style={{ marginTop: -10 }} />
              ) : null}
            </View>
            <View ref={((node: unknown) => { dial.current = node as Measurable | null; tourTarget(node); }) as any} collapsable={false} style={{ marginTop: space.sm }}>
              <PainSlider value={value} onChange={setValue} label="Pain right now" showLabel={false} readout size="large" minLabel="No pain" maxLabel="Worst imaginable" />
            </View>
            <Pulse active={!!first && value != null && !saving} radius={radii.pill} style={{ marginTop: space.md }}>
              <Button
                label={value == null ? 'Choose a number first' : `Save ${value}/10 to my record`}
                icon={value == null ? undefined : 'check'}
                onPress={log}
                loading={saving}
                disabled={value == null}
                style={{ minHeight: 56 }}
                accessibilityHint="Saves it to today, with the time"
              />
            </Pulse>
            <InlineError message={error} style={{ marginTop: space.xs }} />
          </View>
          <View style={styles.divider} />
          <View style={{ gap: space.xs }}>
            <Txt variant="caption">Or say it in your own words. They are quoted exactly as you wrote them.</Txt>
            {words}
          </View>
        </>
      )}

      <View style={{ gap: space.xs }}>
        <Txt variant="caption">Note something else</Txt>
        <QuickRows onPeriod={onPeriod} onCard />
      </View>
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

/** Topic chips (her chosen areas first), wrapped onto as many rows as they need so none hides off the side. Each opens a note on that topic. */
export function QuickRows({ onPeriod, onCard }: { onPeriod: () => void; /** Inside a card: sunken chips that bleed to the card edge. */ onCard?: boolean }) {
  const focus = useFocusStore((st) => st.areas);
  const primary = topicsFor(focus, PRIMARY_ROWS);
  const rows = [
    ...primary.map((l) => QUICK_ROWS.find((r) => r.label === l)!).filter(Boolean),
    ...QUICK_ROWS.filter((r) => !primary.includes(r.label)),
  ].filter((r) => !(onCard && r.label === 'Pain')); // the check-in's slider is right above
  return (
    <View style={styles.chipRow} accessibilityLabel="Note something else">
      {rows.map((r) => (
        <PressScale
          key={r.label}
          onPress={() => { r.label === 'Bleeding' ? onPeriod() : openCapture({ mode: 'type', tag: r.tag }); }}
          haptic="selection"
          accessibilityLabel={`Note ${r.label === 'Something new' ? 'something else' : r.label.toLowerCase()}`}
          style={[styles.topicChip, onCard && { backgroundColor: colors.sunken }]}
        >
          <Icon name={r.icon} size={17} color={r.label === 'Bleeding' ? colors.clay : colors.accent} />
          <Txt variant="secondary" color={colors.ink} style={{ fontWeight: '500' }}>{CHIP_LABEL[r.label] ?? r.label}</Txt>
        </PressScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: space.xs, paddingHorizontal: space.md, alignItems: "center" },
  qgrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hero: { padding: space.md, gap: space.md },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  doneTick: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.savedTint, alignItems: 'center', justifyContent: 'center' },
  wordBtn: { flex: 1, minHeight: 52 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
  pillar: { paddingHorizontal: space.xxs, marginBottom: space.sm },
  stepDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  stepNum: { ...font.roundedBold, fontSize: 11, lineHeight: 13, color: colors.accent },
  entryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, paddingRight: space.xs, height: 48, borderRadius: radii.pill, backgroundColor: colors.sunken },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  topicChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: space.md,
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
