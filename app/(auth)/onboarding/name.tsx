// Question: her name. Asked only when we do not already have a real one (Apple can hide it, and the
// email form no longer asks). Wren waves as soon as she starts typing.
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { font } from '../../../constants/zeebaUI';
import { InlineError } from '../../../components/zeeba/kit';
import { Rise } from '../../../components/zeeba/motion';
import { OnboardingScreen } from '../../../components/auth/OnboardingScreen';
import { Field } from '../../../components/zeeba/onboarding/Field';
import { BigButton } from '../../../components/zeeba/onboarding/Scaffold';
import { markNameAsked } from '../../../components/zeeba/onboarding/flow';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../lib/api';
import { track } from '../../../lib/analytics';

export default function OnboardingNameScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  // Counted as a question from the first render, so every later step shows "of 4".
  useState(() => { markNameAsked(); return null; });
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError('');
    try {
      await api.patch('/me', { display_name: trimmed });
      await fetchProfile();
      track('Onboarding Step Completed', { step: 'name' });
      // push, not replace: Back on the next question returns here.
      router.push('/(auth)/onboarding/basics');
    } catch {
      setError('We couldn’t save your name. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const typed = name.trim().length > 0;
  return (
    <OnboardingScreen
      question="name"
      ask="What should I call you?"
      hint="Your first name is fine. You can change it any time."
      mood={typed ? 'wave' : 'idle'}
      footer={
        <>
          <InlineError message={error} />
          <BigButton label={loading ? 'Saving…' : 'Continue'} loading={loading} disabled={!typed} onPress={handleSave} />
        </>
      }
    >
      <Rise index={1}>
        <Field
          label="Your name"
          hideLabel
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="given-name"
          textContentType="givenName"
          autoFocus
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          inputStyle={styles.input}
        />
      </Rise>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  input: { ...font.semibold, fontSize: 22, minHeight: 60 },
});
