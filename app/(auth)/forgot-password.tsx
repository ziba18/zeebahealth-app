import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { space } from '../../constants/zeebaUI';
import { SUPPORT_EMAIL } from '../../constants/config';
import { Button, Card, InlineError, ScreenLarge, TextField, Txt } from '../../components/zeeba/kit';
import { FieldGroup } from '../../components/zeeba/records/GroupedRows';
import { useAuthStore } from '../../stores/authStore';
import { ApiError, api } from '../../lib/api';
import { routeAfterSignIn } from '../../lib/authRouting';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Two steps: ask for a code by email, then enter the code with a new password. The server answers
 * the first step the same way whether or not the address has an account. If email isn't set up on
 * the server (503) the screen falls back to the support address.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [step, setStep] = useState<'email' | 'code' | 'unavailable'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) { setErrors({ email: 'That email doesn’t look right.' }); return; }
    setBusy(true); setError(''); setErrors({});
    try {
      await api.post('/auth/forgot-password', { email: trimmed });
      setEmail(trimmed);
      setStep('code');
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) setStep('unavailable');
      else if (e instanceof ApiError && e.status === 429) setError('You’ve asked several times. Try again in an hour.');
      else setError('We couldn’t send a code. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    const next = {
      code: /^\d{6}$/.test(code) ? '' : 'Enter the six digits from the email.',
      password: password.length < 8 ? 'Use at least 8 characters.' : '',
    };
    setErrors(next); setError('');
    if (next.code || next.password) return;
    setBusy(true);
    try {
      await resetPassword(email, code, password);
      router.replace(routeAfterSignIn(useAuthStore.getState().profile) as any);
    } catch (e) {
      setBusy(false);
      const detail = e instanceof ApiError && e.status === 400 ? e.message : '';
      if (/code/i.test(detail)) setErrors({ code: 'That code isn’t right or has run out. Ask for a new one.' });
      else if (detail) setErrors({ password: detail });
      else if (e instanceof ApiError && e.status === 429) setError('Too many tries. Wait a minute, then try again.');
      else setError('We couldn’t change your password. Check your connection and try again.');
    }
  };

  if (step === 'unavailable') {
    return (
      <ScreenLarge brand grouped title="Forgot password?" back={{ label: 'Sign in' }}>
        <Card style={{ gap: space.sm }}>
          <Txt variant="body">
            Resetting a password by email isn’t switched on yet. If you signed up with Apple or Google, use that button on the sign-in screen. Otherwise, email us from the address you signed up with and we can delete the account so you can start again. For your privacy we can’t give anyone access to saved notes by email.
          </Txt>
          <Txt variant="headline" selectable>{SUPPORT_EMAIL}</Txt>
        </Card>
        <Button
          label="Email support"
          icon="send"
          style={{ marginTop: space.xxl }}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Zeeba Health password help')}`).catch(() => {})}
        />
      </ScreenLarge>
    );
  }

  if (step === 'code') {
    return (
      <ScreenLarge brand grouped title="Choose a new password" subtitle={`If ${email} has an account, we’ve emailed it a six-digit code.`} back={{ label: 'Back', onPress: () => setStep('email') }}>
        <FieldGroup>
          <TextField label="Code from the email" value={code} onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setErrors({}); }} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" error={errors.code} />
          <TextField label="New password" hint="At least 8 characters" secret value={password} onChangeText={(v) => { setPassword(v); setErrors({}); }} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={finish} error={errors.password} />
        </FieldGroup>
        <Txt variant="caption" style={{ marginTop: space.xs }}>The code works for 15 minutes. Signed up with Apple or Google? Use that button on the sign-in screen.</Txt>
        <View style={{ marginTop: space.xxl, gap: space.xs }}>
          <InlineError message={error} style={{ marginBottom: space.xs }} />
          <Button label={busy ? 'Saving…' : 'Save and sign in'} loading={busy} onPress={finish} />
          <Button label="Send a new code" variant="text" onPress={requestCode} />
        </View>
      </ScreenLarge>
    );
  }

  return (
    <ScreenLarge brand grouped title="Forgot password?" subtitle="We’ll email you a code to choose a new one." back={{ label: 'Sign in' }}>
      <FieldGroup>
        <TextField label="Email" value={email} onChangeText={(v) => { setEmail(v); setErrors({}); }} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" returnKeyType="go" onSubmitEditing={requestCode} error={errors.email} />
      </FieldGroup>
      <View style={{ marginTop: space.xxl, gap: space.xs }}>
        <InlineError message={error} style={{ marginBottom: space.xs }} />
        <Button label={busy ? 'Sending…' : 'Email me a code'} loading={busy} onPress={requestCode} />
      </View>
    </ScreenLarge>
  );
}
