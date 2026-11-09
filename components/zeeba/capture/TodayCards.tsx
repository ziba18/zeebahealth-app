// Today's building blocks: hero capture card, starter chips, Rough day quick log, latest note.
// No stat tiles, rings, streaks or charts — the screen's one number is the note count.
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Button, Card, Chip, FactLine, HeroNumber, InlineError, QuickTile, PressableCard, Quote, SeverityRow, SeverityTag, Txt, showToast, useReduceMotion,
} from '../kit';
import { colors, layout, radii, space, useColors } from '../../../constants/zeebaUI';
import { openCapture } from '../../../lib/captureStore';
import { haptics } from '../../../lib/haptics';
import { todayKey } from '../../../lib/records/dates';
import { STARTER_CHIPS } from '../../../lib/records/fields';
import {
  compareNotesNewestFirst, formatDay, formatTimeOfDay, formatWhere, joinFacts, labelEscape, noteCount, noteStamp, noteWrittenAt, notesLabel,
  typicalOf, worstOf,
} from '../../../lib/records/format';
import { useRecordsStore } from '../../../stores/recordsStore';
import type { Rec, SymptomData } from '../../../types/records';
import { Wren } from '../Wren';
import { Gauge, MiniBars, SectionHeader, Tile, TileRow } from '../dash/Dash';
import { nextAppointment } from './AppointmentCard';
import { type IconName } from '../../ui/Icon';
import { addDays, diffDays } from '../../../lib/records/dates';

// Warm wash (V6): a faint plum-tint blush at the very top that settles into the warm canvas,
// then white — the hero is never cooler than the paper around it. Top 40% only.
const WASH_STOPS = [0, 0.18, 0.4] as const;

const PROMPT = 'What’s been going on with your body?';
/** Broken evenly at every width: unforced it either rags ("…with / your body?") or leaves "body?" alone on line 2 (V29). */
const PROMPT_BALANCED = 'What’s been going on\nwith your body?';

/** The guided follow-ups that fill the structured fields, previewed so the hero reads as step one of three. */
const NEXT_STEPS = ['When', 'How strong', 'Where'] as const;

/**
 * The capture hero (direction A layout, B's warmth): Wren beside the question, then Speak + Type.
 * `first` = brand-new user with no notes yet: the prompt becomes a gentle invitation.
 */
export function HeroCard({ first }: { first?: boolean } = {}) {
  const c = useColors();
  const prompt = first ? 'Your first note takes a minute.' : 'How’s your body today?';
  const web = Platform.OS === 'web';
  return (
    <Card tone="hero" style={styles.hero}>
      <LinearGradient
        colors={[c.glow, 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      <View style={styles.heroTop}>
        <Wren mood="idle" size={88} decorative />
        <View style={styles.heroText}>
          <Txt variant="hero" style={styles.heroPrompt} accessibilityRole="header">{prompt}</Txt>
          <Txt variant="secondary">Say it your way. It’s saved with today’s date.</Txt>
        </View>
      </View>
      <View style={styles.heroBtns}>
        {web ? (
          // Browsers have no voice capture here: the typed note is the one action.
          <Button label="Type a note" icon="pencil" onPress={() => openCapture({ mode: 'type' })} style={{ flex: 1 }} />
        ) : (
          <>
            <Button
              label="Speak"
              icon="mic"
              onPress={() => openCapture({ mode: 'speak', startRecording: true })}
              accessibilityHint="Opens a new note and starts recording"
              style={{ flex: 1 }}
            />
            <Button label="Type" icon="pencil" variant="secondary" onPress={() => openCapture({ mode: 'type' })} style={{ flex: 1 }} />
          </>
        )}
      </View>
    </Card>
  );
}

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
      <SectionHeader title="This week" action="Evidence" onAction={toEvidence} />
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

/** Horizontal starter chips that scroll inside the screen (right-edge fade); the page never scrolls sideways. */
export function StarterChips({ onPeriod }: { onPeriod: () => void }) {
  const c = useColors();
  return (
    <View style={styles.chipsWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        accessibilityLabel="Ways to start"
      >
        {STARTER_CHIPS.map((label) => (
          <Chip
            key={label}
            label={label}
            onPress={() => (label === 'My period' ? onPeriod() : openCapture({ mode: 'speak', tag: label }))}
          />
        ))}
      </ScrollView>
      <LinearGradient
        colors={[`${c.canvas}00`, `${c.canvas}E6`, c.canvas]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.fade, { pointerEvents: 'none' }]}
      />
    </View>
  );
}

export function RoughDayCard() {
  const create = useRecordsStore((s) => s.create);
  const [value, setValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (value == null || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = await create('symptom', {
        date: todayKey(), words: '', where: '', typical: null, worst: value, score: value,
        duration: '', stopped: null, stoppedWords: '', source: 'quick', createdAt: noteStamp(todayKey()),
      });
      haptics.success();
      setValue(null);
      const hard = value != null && value >= 8;
      showToast(
        saved.pending ? 'Saved on this phone. It will send when you’re online.'
          : hard ? 'Saved. That sounded like a hard day.'
          : `Saved. ${notesLabel(noteCount(useRecordsStore.getState().records.symptom))} ready for your doctor.`,
        saved.pending ? undefined : { mood: hard ? 'comfort' : 'proud' },
      );
    } catch {
      setError("That didn’t save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: space.xxs }}>
        <Txt variant="headline" accessibilityRole="header">Rough day?</Txt>
        <Txt variant="secondary">Just the number is enough.</Txt>
      </View>
      <SeverityRow value={value} onChange={setValue} label="How rough, from 0 to 10" showLabel={false} />
      <InlineError message={error} />
      {/* Disabled = sunken + ink2; once a number is chosen it is clearly the action (UX #23). */}
      <Button label="Save" onPress={save} disabled={value == null} loading={saving} />
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

/** Counts up to `target` once on first show (about half a second); straight to the number under Reduce Motion. */
function useCountUp(target: number): number {
  const reduce = useReduceMotion();
  const [n, setN] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce || target <= 1) { setN(target); return; }
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 500);
      setN(Math.round(target * (1 - (1 - t) * (1 - t))));
      if (t >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [target, reduce]);
  return n;
}

/** The screen's one big number: days to the next appointment, else notes in the last 7 days. */
export function HeroNumberCard() {
  const router = useRouter();
  const symptoms = useRecordsStore((s) => s.records.symptom);
  const appts = useRecordsStore((s) => s.records.appointment);
  const today = todayKey();
  const next = nextAppointment(appts);
  const daysAway = next ? Math.max(0, diffDays(today, next.data.date)) : 0;
  // Past two months a day count reads as noise; weeks are what a person plans by.
  const inWeeks = daysAway > 60;
  const total = noteCount(symptoms);
  // On the day itself the numeral is the notes ready for the visit, not a "0 days".
  const count = useCountUp(next ? (daysAway === 0 ? total : inWeeks ? Math.round(daysAway / 7) : daysAway) : noteCount(symptoms, { from: addDays(today, -6), to: today }));
  let big: string; let line: string; let sub: string; let target: string;
  if (next) {
    const days = diffDays(today, next.data.date);
    const who = next.data.who.trim();
    if (days === 0) {
      big = String(count);
      line = total === 1 ? 'note ready for today’s appointment' : 'notes ready for today’s appointment';
      const tail = total > 0 ? 'Opens your summary' : 'Add a note and it appears in your summary';
      sub = who ? `${who} · ${tail}` : tail;
    } else {
      big = String(count);
      line = inWeeks ? 'weeks until your appointment' : days === 1 ? 'day until your appointment' : 'days until your appointment';
      const notes = total > 0 ? `${notesLabel(total)} ready for your summary` : 'Add a note and it appears in your summary';
      sub = who ? `${who} · ${notes}` : notes;
    }
    target = '/(tabs)/doctor';
  } else if (total === 0) {
    big = '0';
    line = 'notes so far';
    sub = 'Your first note starts your record';
    target = '';
  } else {
    const week = noteCount(symptoms, { from: addDays(today, -6), to: today });
    big = String(count);
    line = week === 1 ? 'note in the last 7 days' : 'notes in the last 7 days';
    sub = total === week ? 'Open them in your Timeline' : `${notesLabel(total)} in all`;
    target = '/(tabs)/timeline';
  }
  return (
    <HeroNumber
      big={big} line={line} sub={sub}
      onPress={target ? () => router.push(target as any) : undefined}
      accessibilityHint={next ? 'Opens For my doctor' : 'Opens Timeline'}
    />
  );
}

/** Short phones (320x568): the same number as HeroNumberCard as one line above the prompt, so the appointment signal is not pushed off the first screen. */
export function HeroChip() {
  const router = useRouter();
  const symptoms = useRecordsStore((s) => s.records.symptom);
  const appts = useRecordsStore((s) => s.records.appointment);
  const today = todayKey();
  const next = nextAppointment(appts);
  const total = noteCount(symptoms);
  const week = noteCount(symptoms, { from: addDays(today, -6), to: today });
  const days = next ? diffDays(today, next.data.date) : -1;
  let label = ''; let target = '/(tabs)/timeline';
  if (next && days === 0 && total > 0) { label = `${notesLabel(total)} ready · today`; target = '/(tabs)/doctor'; }
  else if (next && days > 0) { label = days > 60 ? `${Math.round(days / 7)} weeks to your appointment` : `${days} ${days === 1 ? 'day' : 'days'} to your appointment`; target = '/(tabs)/doctor'; }
  else if (week > 0) label = `${notesLabel(week)} in the last 7 days`;
  if (!label) return null;
  return (
    <PressableCard
      onPress={() => router.push(target as any)}
      accessibilityLabel={label}
      accessibilityHint={target.includes('doctor') ? 'Opens For my doctor' : 'Opens Timeline'}
      style={styles.chip}
    >
      <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>{label}</Txt>
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

/** Icon + label tiles, two across (replace the four outline chips); each opens a note already started on that topic. */
export function QuickRows({ onPeriod }: { onPeriod: () => void }) {
  const [more, setMore] = useState(false);
  const rows = more ? QUICK_ROWS : QUICK_ROWS.filter((r) => PRIMARY_ROWS.includes(r.label));
  return (
    <View style={styles.qgrid}>
      {rows.map((r) => (
        <QuickTile
          key={r.label}
          label={r.label}
          icon={r.icon}
          onPress={() => (r.label === 'Bleeding' ? onPeriod() : openCapture({ mode: 'speak', tag: r.tag }))}
        />
      ))}
      <Button
        label={more ? 'Fewer topics' : 'More topics'}
        variant="text"
        small
        onPress={() => setMore((m) => !m)}
        style={{ flexBasis: '100%' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: space.xs, paddingHorizontal: space.md, alignItems: "center" },
  qgrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hero: { padding: space.md, gap: space.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  heroText: { flex: 1, minWidth: 0, gap: space.xxs },
  heroPrompt: { fontSize: 24, lineHeight: 29 },
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
