// A milestone of the record, celebrated once (rules and wording: lib/milestones.ts). Wren is proud, confetti
// bursts once, the number counts up, one plain sentence says what the record now holds, and "Carry on" closes it.
// It never appears over the capture sheet, the tour or the Doctor tab (which has no mascot, ever): it waits.
// Symptom numbers are never celebrated: an 8-or-worse entry holds the celebration back (see `evaluate`).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, StyleSheet, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { colors, font, space } from '../../../constants/zeebaUI';
import { useCaptureStore } from '../../../lib/captureStore';
import { haptics } from '../../../lib/haptics';
import {
  daysOnRecord, factsOf, forgetMilestoneUser, hydrateMilestones, milestoneCopy, milestoneSeen, recordChanged, useMilestones,
  type AddedEntry, type MilestoneId, type RecordFacts,
} from '../../../lib/milestones';
import { peakOf } from '../../../lib/records/format';
import { useTour } from '../../../lib/tour';
import { useRecordsStore } from '../../../stores/recordsStore';
import { Button } from '../kit-parts/controls';
import { useReduceMotion } from '../kit-parts/Sheet';
import { Txt } from '../kit-parts/Txt';
import { Confetti, CountUp, Pop } from '../motion';
import { Wren } from '../Wren';

const ND = Platform.OS !== 'web';
/** After a save: let the chip land and the toast be read before anything else takes the screen. */
const AFTER_SAVE_MS = 1300;

/** Watches the record while the app is open and tells lib/milestones what was added. Draws nothing. */
function useMilestoneWatcher() {
  const loadedFor = useRecordsStore((s) => s.loadedFor);
  const symptoms = useRecordsStore((s) => s.records.symptom);
  const periodDays = useRecordsStore((s) => s.records.period_day);
  const prev = useRef<{ user: string; sym: Set<string>; per: Set<string>; facts: RecordFacts } | null>(null);

  useEffect(() => {
    if (!loadedFor) {
      if (prev.current) forgetMilestoneUser();
      prev.current = null;
      return;
    }
    const facts = factsOf(symptoms, periodDays);
    const sym = new Set(symptoms.map((r) => r.id));
    const per = new Set(periodDays.map((r) => r.data.date));
    const before = prev.current;
    prev.current = { user: loadedFor, sym, per, facts };
    if (!before || before.user !== loadedFor) {
      void hydrateMilestones(loadedFor, facts);
      return;
    }
    const newSym = symptoms.filter((r) => !before.sym.has(r.id));
    const goneSym = [...before.sym].filter((id) => !sym.has(id)).length;
    // An offline note getting its real id is a swap, not a new entry.
    const swapped = newSym.length > 0 && goneSym === newSym.length;
    const added: AddedEntry[] = [
      ...(swapped ? [] : newSym.map((r) => ({ date: r.data.date, worst: peakOf(r.data) }))),
      ...periodDays.filter((r) => !before.per.has(r.data.date)).map((r) => ({ date: r.data.date, worst: null })),
    ];
    if (added.length) void recordChanged(before.facts, facts, added);
  }, [loadedFor, symptoms, periodDays]);
}

export function MilestoneHost() {
  useMilestoneWatcher();
  const router = useRouter();
  const reduce = useReduceMotion();
  const next = useMilestones((s) => s.queue[0]);
  const captureOpen = useCaptureStore((s) => s.open);
  const touring = useTour((s) => s.step !== null);
  const onDoctor = (useSegments() as string[])[1] === 'doctor';
  const days = useRecordsStore((s) => daysOnRecord(s.records.symptom, s.records.period_day).length);

  const [showing, setShowing] = useState<MilestoneId | null>(null);
  const [fire, setFire] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showing || !next || captureOpen || touring || onDoctor) return undefined;
    const t = setTimeout(() => setShowing(next), AFTER_SAVE_MS);
    return () => clearTimeout(t);
  }, [showing, next, captureOpen, touring, onDoctor]);

  useEffect(() => {
    useMilestones.setState({ showing: showing !== null });
    if (!showing) return undefined;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: reduce ? 0 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
    const t = setTimeout(() => { haptics.light(); setFire((n) => n + 1); }, 260);
    return () => clearTimeout(t);
  }, [showing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!showing) return null;
  const copy = milestoneCopy(showing, days);
  const close = (then?: () => void) => {
    const id = showing;
    setShowing(null);
    void milestoneSeen(id);
    then?.();
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
      <Animated.View style={[styles.scrim, { opacity: fade }]} accessibilityViewIsModal>
        <Pop from={0.9} style={styles.cardWrap}>
          <View style={styles.card} accessibilityLiveRegion="polite">
            <Wren mood="proud" size={148} decorative />
            {copy.count != null ? (
              <View style={{ alignItems: 'center' }} accessible accessibilityRole="header" accessibilityLabel={`${copy.count} ${copy.countLabel}`}>
                <CountUp value={copy.count} duration={900} variant="numeral" style={styles.count} />
                <Txt variant="headline" style={styles.center}>{copy.countLabel}</Txt>
              </View>
            ) : null}
            {copy.title ? <Txt variant="title" accessibilityRole={copy.count == null ? 'header' : undefined} style={styles.center}>{copy.title}</Txt> : null}
            <Txt variant="body" color={colors.ink2} style={styles.center}>{copy.line}</Txt>
            <View style={styles.actions}>
              {copy.openReport ? (
                <>
                  <Button label="See it on my report" icon="file-text" onPress={() => close(() => router.push('/(tabs)/doctor' as any))} style={styles.btn} />
                  <Button label="Carry on" variant="secondary" onPress={() => close()} style={styles.btn} />
                </>
              ) : (
                <Button label="Carry on" onPress={() => close()} style={styles.btn} />
              )}
            </View>
          </View>
        </Pop>
        <Confetti fire={fire} count={44} originY={0.34} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(8,10,22,0.6)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
  cardWrap: { width: '100%', maxWidth: 380 },
  card: {
    backgroundColor: colors.surface, borderRadius: 32, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.lg,
    alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: colors.cardBorder,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 24px 60px rgba(0,0,0,0.30)',
  },
  count: { ...font.roundedBold, fontSize: 80, lineHeight: 84, color: colors.accent, fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: space.xs, marginTop: space.sm },
  btn: { minHeight: 56 },
});
