import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { space } from '../../constants/zeebaUI';
import { Button, InlineError, ScreenLarge, TextField, Txt } from '../../components/zeeba/kit';
import { FieldGroup } from '../../components/zeeba/records/GroupedRows';
import { useAuthStore, type AuthUser } from '../../stores/authStore';
import { ApiError, api } from '../../lib/api';
import { routeAfterSignIn } from '../../lib/authRouting';

/** Confirms the email on a password account with the six-digit code sent at sign-up. */
export default function VerifyEmailScreen() {
  const router = useRouter();
  const email = useAuthStore((s) => s.user?.email);
  const signOut = useAuthStore((s) => s.signOut);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) { setCodeError('Enter the six digits from the email.'); return; }
    setBusy(true); setError(''); setNote('');
    try {
      const user = await api.post<AuthUser>('/auth/verify-email', { code });
      useAuthStore.getState().setUser(user);
      router.replace(routeAfterSignIn(useAuthStore.getState().profile, user) as any);
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.status === 400) setCodeError('That code isn’t right or has run out. Ask for a new one.');
      else if (e instanceof ApiError && e.status === 429) setError('Too many tries. Wait a minute, then try again.');
      else setError('We couldn’t check the code. Check your connection and try again.');
    }
  };

  const resend = async () => {
    setError(''); setNote(''); setCodeError('');
    try {
      await api.post('/auth/verify-email/resend');
      setNote('We’ve sent a new code. The old one no longer works.');
    } catch (e) {
      setError(e instanceof ApiError && e.status === 429
        ? 'You’ve asked for several codes. Try again in an hour.'
        : 'We couldn’t send a code. Check your connection and try again.');
    }
  };

  return (
    <ScreenLarge brand grouped title="Check your email" subtitle={email ? `We sent a six-digit code to ${email}.` : 'We sent you a six-digit code.'}>
      <FieldGroup>
        <TextField
          label="Code"
          value={code}
          onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setCodeError(''); }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          returnKeyType="go"
          onSubmitEditing={confirm}
          error={codeError}
        />
      </FieldGroup>
      <Txt variant="caption" style={{ marginTop: space.xs }}>It works for 15 minutes. Look in junk if you can’t see it.</Txt>

      <View style={{ marginTop: space.xxl, gap: space.xs }}>
        {note ? <Txt variant="secondary" style={{ textAlign: 'center' }}>{note}</Txt> : null}
        <InlineError message={error} style={{ marginBottom: space.xs }} />
        <Button label={busy ? 'Checking…' : 'Confirm email'} loading={busy} onPress={confirm} />
        <Button label="Send a new code" variant="text" onPress={resend} />
        <Button label="Sign out" variant="text" onPress={async () => { await signOut(); router.replace('/(auth)/welcome'); }} />
      </View>
    </ScreenLarge>
  );
}
