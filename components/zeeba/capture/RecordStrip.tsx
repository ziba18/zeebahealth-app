// PROVE on Today: "N days on your record" — a total that only ever goes up — with a small knitted strip under it,
// one stitch for each day she recorded, coloured by that day's highest number on the app's pain ramp.
// Only recorded days are drawn, so there are no gaps to look at and nothing to feel behind on (no streaks, ever:
// scratchpad research gamification.md §6). Counts and dates only; nothing here interprets her health.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, radii, severityRamp, severityStep, space, useScheme } from '../../../constants/zeebaUI';
import { daysOnRecord, type DayOnRecord } from '../../../lib/milestones';
import { formatDay } from '../../../lib/records/format';
import { useRecordsStore } from '../../../stores/recordsStore';
import { Icon } from '../../ui/Icon';
import { ClayIcon } from '../art/ClayIcon';
import { Txt } from '../kit-parts/Txt';
import { CountUp, Pop, PressScale } from '../motion';

const STITCH_W = 16;
const STITCH_H = 18;
const ROW_STEP = 13; // rows overlap, the way knitted rows sit into each other
const MAX_ROWS = 3;

/** One knit stitch: a small "V" made of two leaning loops. */
function Stitch({ day }: { day: DayOnRecord }) {
  const color = day.worst != null ? severityRamp[severityStep(day.worst)] : day.bleeding ? colors.clay : colors.borderStrong;
  const faint = day.worst == null && !day.bleeding;
  return (
    <View style={[styles.stitch, faint && { opacity: 0.45 }]}>
      <View style={[styles.leg, styles.legL, { backgroundColor: color }]} />
      <View style={[styles.leg, styles.legR, { backgroundColor: color }]} />
    </View>
  );
}

/** An empty stitch: the row a first entry will start filling (first run only). */
function GhostStitch() {
  return (
    <View style={styles.stitch}>
      <View style={[styles.leg, styles.legL, styles.ghostLeg]} />
      <View style={[styles.leg, styles.legR, styles.ghostLeg]} />
    </View>
  );
}

export function RecordStrip() {
  const router = useRouter();
  const scheme = useScheme();
  const symptoms = useRecordsStore((s) => s.records.symptom);
  const periodDays = useRecordsStore((s) => s.records.period_day);
  const days = daysOnRecord(symptoms, periodDays);
  const [width, setWidth] = useState(0);
  const n = days.length;
  const perRow = Math.max(1, Math.floor(width / STITCH_W));
  const shown = width > 0 ? days.slice(-perRow * MAX_ROWS) : [];
  const rows: DayOnRecord[][] = [];
  for (let i = 0; i < shown.length; i += perRow) rows.push(shown.slice(i, i + perRow));
  const toEvidence = () => router.push('/(tabs)/timeline' as any);
  const first = days[0]?.date;

  const head = (
    <View style={styles.head}>
      <ClayIcon name="prove" size={30} />
      <Txt variant="eyebrow" color={colors.accent} style={{ flex: 1 }}>Prove</Txt>
      {n > 0 ? (
        <View style={styles.link}>
          <Txt variant="secondary" color={colors.accent} style={{ fontWeight: '600' }}>See evidence</Txt>
          <Icon name="chevron-right" size={16} color={colors.accent} />
        </View>
      ) : null}
    </View>
  );

  if (n === 0) {
    return (
      <View style={styles.card} accessible accessibilityLabel="Your record. Every day you record is added here, with its date.">
        {head}
        <Txt variant="headline" style={{ marginTop: space.sm }}>Your record starts with one entry</Txt>
        <Txt variant="secondary" style={{ marginTop: 2 }}>Every day you record is added here, with its date.</Txt>
        <View style={[styles.knit, { marginTop: space.md }]} aria-hidden>
          <View style={styles.row}>{Array.from({ length: 12 }, (_, i) => <GhostStitch key={i} />)}</View>
        </View>
      </View>
    );
  }

  return (
    <PressScale
      onPress={toEvidence}
      haptic="selection"
      to={0.98}
      accessibilityLabel={`${n} ${n === 1 ? 'day' : 'days'} on your record. First entry ${first ? formatDay(first, 'always') : ''}.`}
      accessibilityHint="Opens your evidence"
      style={styles.card}
    >
      {head}
      <View style={styles.countRow} aria-hidden>
        <CountUp value={n} variant="numeral" style={styles.count} />
        <Txt variant="headline" style={{ flexShrink: 1, paddingBottom: 9 }}>{n === 1 ? 'day on your record' : 'days on your record'}</Txt>
      </View>
      <View style={styles.knit} onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))} aria-hidden>
        {rows.map((row, r) => (
          <View key={r} style={[styles.row, r > 0 && { marginTop: ROW_STEP - STITCH_H }]}>
            {row.map((d, i) => {
              const newest = r === rows.length - 1 && i === row.length - 1;
              // The newest stitch pops in again each time a day is added.
              return newest ? <Pop key={`${d.date}-${n}`} from={0.6}><Stitch day={d} /></Pop> : <Stitch key={d.date} day={d} />;
            })}
          </View>
        ))}
      </View>
      <Txt variant="caption" style={{ marginTop: space.sm }} aria-hidden>
        {`One stitch for each day you recorded. ${scheme === 'dark' ? 'Brighter' : 'Darker'} means a higher number.`}
      </Txt>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.cardBorder, padding: space.md,
    boxShadow: '0 1px 2px rgba(16,18,40,0.04), 0 6px 18px rgba(16,18,40,0.06)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 30 },
  countRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, marginTop: space.xs },
  count: { ...font.roundedBold, fontSize: 56, lineHeight: 60, color: colors.ink, fontVariant: ['tabular-nums'] },
  knit: { marginTop: space.sm, minHeight: STITCH_H },
  row: { flexDirection: 'row' },
  stitch: { width: STITCH_W, height: STITCH_H },
  // A knit stitch is a "V": the left loop leans out to the left, the right loop to the right.
  leg: { position: 'absolute', top: 1, width: 6.5, height: 16, borderRadius: 3.25 },
  legL: { left: 2, transform: [{ rotate: '-24deg' }] },
  legR: { right: 2, transform: [{ rotate: '24deg' }] },
  ghostLeg: { backgroundColor: colors.chartTrack },
});
