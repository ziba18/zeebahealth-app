// Today — rebuilt 11 Nov 2026 around ONE obvious action ("Wren guides you" brief).
//   Wren greets her by name and says, in plain words, where today stands.
//   RECORD  the check-in card: one number is a full entry; after it, a clear "Done for today".
//   PROVE   "N days on your record": a total that only goes up, with one knitted stitch per recorded day.
//   REACH   the way into her report, and her next appointment.
// The three pillars are still here (design/BRAND.md §1) but no longer as a numbered form.
// Returns after a gap say what she has ("Your record holds 23 days."), never what she missed. No streaks.
import { usePageTitle } from '../../../lib/usePageTitle';
import React, { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, HeaderAvatar, InlineError, ScreenLarge, SkeletonCards, Txt } from '../../../components/zeeba/kit';
import { LogBleedingSheet } from '../../../components/zeeba/LogBleedingSheet';
import { CheckInCard } from '../../../components/zeeba/capture/TodayCards';
import { RecordStrip } from '../../../components/zeeba/capture/RecordStrip';
import { ReportCard } from '../../../components/zeeba/capture/ReportCard';
import { Rise, WrenSays } from '../../../components/zeeba/motion';
import type { WrenMood } from '../../../components/zeeba/Wren';
import { space } from '../../../constants/zeebaUI';
import { useCaptureStore } from '../../../lib/captureStore';
import { CHAT_ENABLED } from '../../../lib/features';
import { isHumanName } from '../../../lib/humanName';
import { HARD_DAY_FROM, daysOnRecord, useMilestones } from '../../../lib/milestones';
import { MONTH_NAMES, diffDays, parseKey, todayKey } from '../../../lib/records/dates';
import { peakOf } from '../../../lib/records/format';
import { startTour, tourWanted, useTour } from '../../../lib/tour';
import { useAuthStore } from '../../../stores/authStore';
import { useRecordsStore } from '../../../stores/recordsStore';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Wednesday 24 September": the date under the title, so "today" is never in doubt. */
function longDate(key: string): string {
  const { y, m0, d } = parseKey(key);
  return `${WEEKDAYS[new Date(y, m0, d, 12).getDay()]} ${d} ${MONTH_NAMES[m0]}`;
}

function hello(name: string | null | undefined, hour: number): string {
  // 00:00-04:59 is neither morning nor evening for someone awake with symptoms.
  const part = hour < 5 ? 'Hello' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const first = isHumanName(name) ? name!.trim().split(/\s+/)[0] : '';
  return first ? `${part}, ${first}.` : `${part}.`;
}

const holds = (n: number) => `Your record holds ${n} ${n === 1 ? 'day' : 'days'}.`;

export default function TodayScreen() {
  const router = useRouter();
  usePageTitle('Today');
  const name = useAuthStore((s) => s.profile?.display_name);
  const symptoms = useRecordsStore((s) => s.records.symptom);
  const periodDays = useRecordsStore((s) => s.records.period_day);
  const userId = useAuthStore((s) => s.user?.id);
  const loadError = useRecordsStore((s) => s.error);
  const loadedFor = useRecordsStore((s) => s.loadedFor);
  const load = useRecordsStore((s) => s.load);
  const loading = useRecordsStore((s) => s.loading);
  const [bleeding, setBleeding] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const scrollRef = useRef<ScrollViewInstance | null>(null);

  // iPhone SE-class heights: drop the date line and shrink Wren a little, so the Save button is on the first screen.
  // Measured without the status bar and home indicator (the tab bar is taken off separately by the layout).
  const insets = useSafeAreaInsets();
  const short = useWindowDimensions().height - insets.top - insets.bottom < 700;
  const today = todayKey();
  const hour = new Date().getHours(); // time of day only — dates always come from todayKey()
  const days = daysOnRecord(symptoms, periodDays);
  const firstRun = !!loadedFor && days.length === 0;
  const todays = symptoms.filter((r) => r.data.date === today);
  const loggedToday = todays.length > 0;
  const hardToday = todays.some((r) => (peakOf(r.data) ?? 0) >= HARD_DAY_FROM);
  const last = days.length ? days[days.length - 1].date : null;
  const away = last ? diffDays(last, today) : 0;

  // Wren reacts to the act of recording and the time of day, never to the number: a hard day gets warmth.
  const mood: WrenMood =
    choosing ? 'listening'
    : loggedToday ? (hardToday ? 'comfort' : 'happy')
    : hour >= 22 || hour < 5 ? 'sleepy'
    : firstRun || hour < 12 ? 'wave'
    : 'idle';
  // Today's state in plain words. After a gap it says what she has, never what she missed.
  const state =
    !loadedFor ? ''
    : firstRun ? 'Let’s start your record. One number is enough.'
    : loggedToday ? (hardToday ? 'Today is on your record. That sounded like a hard day.' : 'Today is on your record.')
    : away >= 7 ? `Good to see you. ${holds(days.length)}`
    : `${holds(days.length)} Add today when you’re ready.`;

  // The guided tour: the first time she reaches Today (or when she asks for it again in Settings). It waits
  // until Today is on screen and nothing else is open, so it never starts on top of a sheet or a celebration.
  const focused = useIsFocused();
  const wanted = useTour(tourWanted);
  const touring = useTour((s) => s.step !== null);
  const captureOpen = useCaptureStore((s) => s.open);
  const celebrating = useMilestones((s) => s.queue.length > 0);
  const celebrationUp = useMilestones((s) => s.showing);
  useEffect(() => {
    if (!focused || !wanted || !loadedFor || captureOpen || bleeding || celebrating) return undefined;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      startTour();
    }, 900);
    return () => clearTimeout(t);
  }, [focused, wanted, loadedFor, captureOpen, bleeding, celebrating]);

  return (
    <ScreenLarge title="Today" subtitle={short ? undefined : longDate(today)} right={<HeaderAvatar tour />} scrollRef={scrollRef}>
      {loadError && !loadedFor ? (
        <InlineError message={loadError} onRetry={userId ? () => load(userId) : undefined} style={{ marginBottom: space.md }} />
      ) : null}

      {/* While the tour's or a celebration's Wren is on screen this one steps aside (one Wren per screen). */}
      <View style={{ opacity: touring || celebrationUp ? 0 : 1 }}>
        <WrenSays text={hello(name, hour)} mood={mood} size={short ? 80 : 92} side="left" textVariant="title" header>
          {state ? <Txt variant="secondary">{state}</Txt> : null}
        </WrenSays>
      </View>

      <Rise index={1} style={{ marginTop: space.md }}>
        <CheckInCard first={firstRun} onPeriod={() => setBleeding(true)} onDraft={setChoosing} />
        {CHAT_ENABLED ? (
          <Button
            label="Talk it through instead"
            variant="text"
            small
            onPress={() => router.push('/(tabs)/today/chat' as any)}
            accessibilityHint="Opens a chat. It can’t diagnose; you can turn it into a note for your doctor"
          />
        ) : null}
      </Rise>

      {loading && !loadedFor ? (
        <View style={{ marginTop: space.xl }}><SkeletonCards count={2} label="Loading your notes" /></View>
      ) : loadedFor ? (
        <>
          <Rise index={2} style={{ marginTop: space.md }}><RecordStrip /></Rise>
          <Rise index={3} style={{ marginTop: space.md }}><ReportCard /></Rise>
        </>
      ) : null}

      <Txt variant="caption" style={{ textAlign: 'center', marginTop: space.xl, paddingHorizontal: space.md }}>
        Zeeba Health can’t diagnose. If you feel very unwell, contact your GP, NHS 111 or 999.
      </Txt>
      <LogBleedingSheet visible={bleeding} onClose={() => setBleeding(false)} />
    </ScreenLarge>
  );
}
