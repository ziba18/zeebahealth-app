// Question: the first day of her last period. Optional: "I'm not sure, or it doesn't apply" sits under Continue,
// always in view (the same place as "I'm not sure yet" and "Not now" on the other questions), and moves on.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space } from '../../../constants/zeebaUI';
import { DayChooser, InlineError } from '../../../components/zeeba/kit';
import { Rise } from '../../../components/zeeba/motion';
import { OnboardingScreen } from '../../../components/auth/OnboardingScreen';
import { BigButton } from '../../../components/zeeba/onboarding/Scaffold';
import { useRecordsStore } from '../../../stores/recordsStore';
import { isFuture } from '../../../lib/records/dates';
import { formatDay } from '../../../lib/records/format';
import { track } from '../../../lib/analytics';

export default function OnboardingLastPeriod() {
  const router = useRouter();
  const savePeriodDays = useRecordsStore((s) => s.savePeriodDays);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const choose = (key: string) => {
    setError(isFuture(key) ? 'Choose today or a day before today.' : '');
    setSelected(isFuture(key) ? null : key);
  };

  // Nothing is saved for "not sure": the step is simply left.
  const skip = () => {
    track('Onboarding Step Completed', { step: 'last_period', skipped: true });
    router.push('/(auth)/onboarding/reminders');
  };

  const handleNext = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      // Period days are the one source of truth. (The old /cycles endpoint was removed from the
      // server in Sept 2026; posting to it returned 404 and showed a false "connection" error.)
      await savePeriodDays([{ date: selected, status: 'started', isStart: true, isEnd: false, note: '' }]);
      track('Onboarding Step Completed', { step: 'last_period', skipped: false });
      router.push('/(auth)/onboarding/reminders');
    } catch {
      setError('We couldn’t save that date. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const answered = !!selected;
  return (
    <OnboardingScreen
      question="period"
      ask="When did your last period start?"
      hint={
        selected ? `First day: ${formatDay(selected, 'always')}.`
        : 'Tap the first day. A guess is fine.'
      }
      mood={answered ? 'happy' : 'thinking'}
      footer={
        <>
          <InlineError message={error} />
          <BigButton label={loading ? 'Saving…' : 'Continue'} loading={loading} disabled={!answered || loading} onPress={handleNext} />
          <BigButton label="I’m not sure, or it doesn’t apply" variant="text" disabled={loading} onPress={skip} />
        </>
      }
    >
      <Rise index={1}>
        <View style={[styles.calendar, !!selected && styles.calendarOn]}>
          <DayChooser value={selected ?? ''} onChange={choose} />
        </View>
      </Rise>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: colors.surface, borderRadius: 24, borderWidth: 2, borderColor: colors.cardBorder,
    paddingHorizontal: space.sm, paddingTop: space.xs, paddingBottom: space.sm,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.05)',
  },
  calendarOn: { borderColor: colors.accent },
});
