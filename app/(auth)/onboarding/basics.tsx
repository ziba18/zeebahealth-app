// Onboarding step 2: "What brings you here?" — the areas she wants to keep a record of.
// Replaces the old cycle/period-length questions (Zeeba Health is not a cycle predictor). Her answer
// visibly changes the app: these topics come first on Today. The server's required profile fields
// still get their usual defaults in the same PATCH, so nothing downstream changes.
import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { space } from '../../../constants/zeebaUI';
import { Button, ChipGroup, InlineError } from '../../../components/zeeba/kit';
import { OnboardingScreen } from '../../../components/auth/OnboardingScreen';
import { api } from '../../../lib/api';
import { track } from '../../../lib/analytics';
import { FOCUS_AREAS, useFocusStore } from '../../../lib/focus';

const DEFAULT_CYCLE = 28;
const DEFAULT_PERIOD = 5;

export default function OnboardingFocus() {
  const router = useRouter();
  const saved = useFocusStore((s) => s.areas);
  const setAreas = useFocusStore((s) => s.set);
  const [areas, setLocal] = useState<string[]>(saved);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const next = async (skip: boolean) => {
    setLoading(true);
    setError('');
    try {
      await api.patch('/me', { average_cycle_length: DEFAULT_CYCLE, average_period_length: DEFAULT_PERIOD });
      setAreas(skip ? [] : areas);
      track('Onboarding Step Completed', { step: 'focus', count: skip ? 0 : areas.length });
      router.push('/(auth)/onboarding/last-period');
    } catch {
      setError('We couldn’t save that. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingScreen
      step={2}
      back={{ label: 'Back' }}
      title="What would you like to keep a record of?"
      helper="Pick any that apply. They go first on your Today screen, and you can always note anything else."
    >
      <ChipGroup
        mode="multi"
        options={FOCUS_AREAS.map((f) => ({ value: f.value, label: f.label }))}
        value={areas}
        onChange={setLocal}
        exclusive={[]}
        accessibilityLabel="What you'd like to keep a record of"
      />
      <View style={{ marginTop: space.xxl, gap: space.xs }}>
        <InlineError message={error} style={{ marginBottom: space.xs }} />
        <Button
          label={loading ? 'Saving…' : 'Continue'}
          loading={loading}
          disabled={areas.length === 0 || loading}
          onPress={() => next(false)}
        />
        <Button label="Skip for now" variant="text" disabled={loading} onPress={() => next(true)} />
      </View>
    </OnboardingScreen>
  );
}
