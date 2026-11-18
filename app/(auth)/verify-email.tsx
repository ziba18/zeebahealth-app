import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, space } from '../../constants/zeebaUI';
import { InlineError, Txt } from '../../components/zeeba/kit';
import { Rise } from '../../components/zeeba/motion';
import { AuthScreen } from '../../components/auth/AuthScreen';
import { Field } from '../../components/zeeba/onboarding/Field';
import { BigButton } from '../../components/zeeba/onboarding/Scaffold';
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
    <AuthScreen
      back={false}
      title="Check your email"
      subtitle={email ? `We sent a six-digit code to ${email}.` : 'We sent you a six-digit code.'}
      mood={codeError || error ? 'thinking' : code.length === 6 ? 'happy' : 'idle'}
    >
      <Rise index={1}>
        <Field
          label="Code from the email"
          value={code}
          onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setCodeError(''); }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          returnKeyType="go"
          onSubmitEditing={confirm}
          error={codeError}
          hint="It works for 15 minutes. Look in junk if you can’t see it."
          inputStyle={styles.code}
        />
      </Rise>

      <Rise index={2} style={styles.actions}>
        {note ? <Txt variant="secondary" style={styles.note} accessibilityLiveRegion="polite">{note}</Txt> : null}
        <InlineError message={error} />
        <BigButton label={busy ? 'Checking…' : 'Confirm email'} loading={busy} onPress={confirm} />
        <BigButton label="Send a new code" variant="text" onPress={resend} />
        <BigButton label="Sign out" variant="text" onPress={async () => { await signOut(); router.replace('/(auth)/welcome'); }} />
      </Rise>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  code: { ...font.rounded, fontSize: 30, letterSpacing: 10, textAlign: 'center', minHeight: 68, fontVariant: ['tabular-nums'] },
  note: { textAlign: 'center', color: colors.ink },
  actions: { marginTop: space.xl, gap: space.xxs },
});
