// Question: "What would you like to keep a record of?" — the areas she wants on her record.
// Replaces the old cycle/period-length questions (Zeeba Health is not a cycle predictor). Her answer
// visibly changes the app: these topics come first on Today. The server's required profile fields
// still get their usual defaults in the same PATCH, so nothing downstream changes.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { space } from '../../../constants/zeebaUI';
import { InlineError } from '../../../components/zeeba/kit';
import { Rise } from '../../../components/zeeba/motion';
import { OnboardingScreen } from '../../../components/auth/OnboardingScreen';
import { ChoiceTile } from '../../../components/zeeba/onboarding/ChoiceCard';
import { BigButton, useUsableHeight } from '../../../components/zeeba/onboarding/Scaffold';
import { api } from '../../../lib/api';
import { track } from '../../../lib/analytics';
import { FOCUS_AREAS, useFocusStore } from '../../../lib/focus';

const DEFAULT_CYCLE = 28;
const DEFAULT_PERIOD = 5;

const ROWS = Array.from({ length: Math.ceil(FOCUS_AREAS.length / 2) }, (_, i) => FOCUS_AREAS.slice(i * 2, i * 2 + 2));

export default function OnboardingFocus() {
  const router = useRouter();
  const saved = useFocusStore((s) => s.areas);
  const setAreas = useFocusStore((s) => s.set);
  const [areas, setLocal] = useState<string[]>(saved);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Eight tiles and both buttons fit on one screen of a standard iPhone only with the tighter tile.
  const compact = useUsableHeight() < 800;

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

  const toggle = (value: string) => {
    setLocal((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));
  };

  const answered = areas.length > 0;
  return (
    <OnboardingScreen
      question="focus"
      ask="What would you like to keep a record of?"
      hint={areas.length ? 'Got it. These go first on Today.' : 'Tap all that fit.'}
      mood={answered ? 'happy' : 'thinking'}
      footer={
        <>
          <InlineError message={error} />
          <BigButton
            label={loading ? 'Saving…' : 'Continue'}
            loading={loading}
            disabled={!answered || loading}
            onPress={() => next(false)}
          />
          {/* "I'm not sure yet" is an answer too, and always in view: it saves no areas and moves on. */}
          <BigButton label="I’m not sure yet" variant="text" disabled={loading} onPress={() => next(true)} />
        </>
      }
    >
      <View style={[styles.grid, compact && styles.gridShort]} accessibilityLabel="What you’d like to keep a record of">
        {ROWS.map((row, r) => (
          <Rise key={r} index={r + 1} style={styles.row}>
            {row.map((f) => (
              <ChoiceTile
                key={f.value}
                label={f.label}
                icon={f.icon}
                selected={areas.includes(f.value)}
                onPress={() => toggle(f.value)}
                compact={compact}
              />
            ))}
          </Rise>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.xs + 2 },
  gridShort: { gap: space.xs },
  row: { flexDirection: 'row', gap: space.xs + 2 },
});
