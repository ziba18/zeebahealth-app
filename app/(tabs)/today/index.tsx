// Today — one story in three steps, the app's pillars (design/BRAND.md §1), redesigned 10 Nov 2026:
//   1 RECORD  Today's check-in: pain on a 0–10 slider, her own words, any other area; today's entries as chips.
//   2 PROVE   This week: what her record already shows (worst number she gave, days recorded) + her latest note.
//   3 REACH   Her next appointment and the report it feeds ("N notes ready · Open my report").
// Before, the same pieces sat as seven unrelated blocks; each section now says which step it is and why it matters.
import { usePageTitle } from '../../../lib/usePageTitle';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, HeaderAvatar, InlineError, ScreenLarge, SkeletonCards, Txt } from '../../../components/zeeba/kit';
import { LogBleedingSheet } from '../../../components/zeeba/LogBleedingSheet';
import { AppointmentCard, nextAppointment } from '../../../components/zeeba/capture/AppointmentCard';
import {
  CheckInCard, GhostNoteCard, LatestNoteCard, PillarHeader, WeekDashboard, latestNote,
} from '../../../components/zeeba/capture/TodayCards';
import { space } from '../../../constants/zeebaUI';
import { isHumanName } from '../../../lib/humanName';
import { diffDays, todayKey } from '../../../lib/records/dates';
import { useAuthStore } from '../../../stores/authStore';
import { useRecordsStore } from '../../../stores/recordsStore';
import { CHAT_ENABLED } from '../../../lib/features';

function greeting(name: string | null | undefined): string {
  const hour = new Date().getHours(); // time of day only — dates always come from todayKey()
  // 00:00-04:59 is neither morning nor evening for someone awake with symptoms.
  const part = hour < 5 ? 'Hello' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const first = isHumanName(name) ? name!.trim().split(/\s+/)[0] : '';
  return first ? `${part}, ${first}` : part;
}

/** Step 3's one line: how close the appointment is, so the report has a reason. */
function reachWhy(date?: string): string {
  if (!date) return 'Everything you record goes into a report you can share or print.';
  const d = diffDays(todayKey(), date);
  if (d <= 0) return 'Your appointment is today. Your report already has everything you recorded.';
  if (d === 1) return 'Your appointment is tomorrow. Your report updates with every entry.';
  return `${d} days to go. Your report updates with every entry.`;
}

export default function TodayScreen() {
  const router = useRouter();
  usePageTitle('Today');
  const name = useAuthStore((s) => s.profile?.display_name);
  const symptoms = useRecordsStore((s) => s.records.symptom);
  const appts = useRecordsStore((s) => s.records.appointment);
  const userId = useAuthStore((s) => s.user?.id);
  const loadError = useRecordsStore((s) => s.error);
  const loadedFor = useRecordsStore((s) => s.loadedFor);
  const load = useRecordsStore((s) => s.load);
  const loading = useRecordsStore((s) => s.loading);
  const [bleeding, setBleeding] = useState(false);
  const latest = latestNote(symptoms);
  const next = nextAppointment(appts);
  const firstRun = !!loadedFor && symptoms.length === 0;
  const toEvidence = () => router.push('/(tabs)/timeline' as any);

  return (
    <ScreenLarge title="Today" subtitle={greeting(name)} right={<HeaderAvatar />}>
      {loadError && !loadedFor ? (
        <InlineError message={loadError} onRetry={userId ? () => load(userId) : undefined} style={{ marginBottom: space.md }} />
      ) : null}

      {/* 1 · RECORD */}
      <View style={{ marginTop: space.md }}>
        <PillarHeader step={1} pillar="Record" title="Today’s check-in" why="Ten seconds is enough. Add words when you can." />
        <CheckInCard first={firstRun} onPeriod={() => setBleeding(true)} />
        {CHAT_ENABLED ? (
          <Button
            label="Talk it through instead"
            variant="text"
            small
            onPress={() => router.push('/(tabs)/today/chat' as any)}
            accessibilityHint="Opens a chat. It can’t diagnose; you can turn it into a note for your doctor"
          />
        ) : null}
      </View>

      {loading && !loadedFor ? (
        <View style={{ marginTop: space.xl }}><SkeletonCards count={2} label="Loading your notes" /></View>
      ) : loadedFor ? (
        <>
          {/* 2 · PROVE */}
          <View style={{ marginTop: space.xxl }}>
            <PillarHeader
              step={2}
              pillar="Prove"
              title="This week on your record"
              why={firstRun ? 'Your entries add up here, dated, in numbers and in your words.' : 'What your entries already show. Open Evidence for the full picture.'}
              action={firstRun ? undefined : 'Evidence'}
              onAction={toEvidence}
            />
            <View style={{ gap: space.md }}>
              {symptoms.length > 0 ? <WeekDashboard /> : null}
              {latest ? <LatestNoteCard note={latest} /> : <GhostNoteCard />}
            </View>
          </View>

          {/* 3 · REACH */}
          <View style={{ marginTop: space.xxl }}>
            <PillarHeader step={3} pillar="Reach" title={next ? 'Your next appointment' : 'For your doctor'} why={reachWhy(next?.data.date)} />
            <AppointmentCard />
          </View>
        </>
      ) : null}

      <Txt variant="caption" style={{ textAlign: 'center', marginTop: space.xl }}>
        Zeeba Health can’t diagnose. If you feel very unwell, contact your GP, NHS 111 or 999.
      </Txt>
      <LogBleedingSheet visible={bleeding} onClose={() => setBleeding(false)} />
    </ScreenLarge>
  );
}
