// Create account, the way mainstream apps do it: one line of reason, then Continue with Apple / Google /
// email, equal size, Apple first. Choosing email opens a short form on the same route (email + password;
// Wren asks her name afterwards, so there is less to type here).
import React, { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, space } from '../../constants/zeebaUI';
import { InlineError, Txt } from '../../components/zeeba/kit';
import { Pop, Rise } from '../../components/zeeba/motion';
import { Wren, WREN_ASPECT } from '../../components/zeeba/Wren';
import { ClayIcon } from '../../components/zeeba/art/ClayIcon';
import { AuthScreen } from '../../components/auth/AuthScreen';
import { LegalLinks } from '../../components/auth/LegalLinks';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { Halo } from '../../components/zeeba/onboarding/Backdrop';
import { Field } from '../../components/zeeba/onboarding/Field';
import { BigButton, FlowScreen, useUsableHeight } from '../../components/zeeba/onboarding/Scaffold';
import { useAuthStore } from '../../stores/authStore';
import { ApiError } from '../../lib/api';
import { track } from '../../lib/analytics';
import { routeAfterSignIn } from '../../lib/authRouting';
import { usePageTitle } from '../../lib/usePageTitle';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ with?: string }>();
  const register = useAuthStore((s) => s.register);
  const [step, setStep] = useState<'choose' | 'email'>(params.with === 'email' ? 'email' : 'choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const height = useUsableHeight();
  usePageTitle('Create your account');

  const clear = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const next: Record<string, string> = {
      email: !trimmedEmail ? 'Enter your email.' : !EMAIL_RE.test(trimmedEmail) ? 'That email doesn’t look right.' : '',
      password: !password ? 'Choose a password.' : password.length < 8 ? 'Use at least 8 characters.' : '',
    };
    setErrors(next);
    setError('');
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      // No name here: the server allows an account without one, and routeAfterSignIn then sends her to
      // the name question, where Wren asks it.
      await register(trimmedEmail.toLowerCase(), password);
      track('Signup Completed', { method: 'email' });
      router.replace(routeAfterSignIn(useAuthStore.getState().profile) as any);
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError && err.status === 400) setErrors((e) => ({ ...e, email: 'There is already an account with this email. Try signing in.' }));
      else setError('We couldn’t create your account. Check your connection and try again.');
    }
  };

  if (step === 'choose') {
    const wren = height < 700 ? 112 : height < 800 ? 140 : 164;
    return (
      <FlowScreen
        glow="full"
        scroll={false}
        role="main"
        back
        footer={
          <Rise delay={160} style={styles.stack}>
            <SocialAuthButtons mode="signup" onEmail={() => setStep('email')} />
            <BigButton label="I already have an account" variant="text" onPress={() => router.replace('/(auth)/login')} />
            <LegalLinks />
          </Rise>
        }
      >
        <View style={styles.middle}>
          <Pop style={[styles.hero, { height: wren * WREN_ASPECT }]}>
            <Halo size={wren * 1.8} />
            <Wren mood="happy" size={wren} interactive />
          </Pop>
          <Rise delay={80} style={styles.words}>
            <Txt style={styles.title} accessibilityRole="header">Create your account</Txt>
            <View style={styles.reason}>
              <ClayIcon name="lock" size={30} />
              <Txt style={styles.reasonText}>Keep your record safe and private.</Txt>
            </View>
          </Rise>
        </View>
      </FlowScreen>
    );
  }

  const hasError = !!error || Object.values(errors).some(Boolean);
  const ready = EMAIL_RE.test(email.trim()) && password.length >= 8;
  return (
    <AuthScreen
      title="Sign up"
      subtitle="Keep your record safe and private."
      mood={hasError ? 'thinking' : ready ? 'happy' : 'idle'}
      onBack={() => { setStep('choose'); setErrors({}); setError(''); }}
    >
      <Rise index={1} style={styles.fields}>
        <Field
          label="Email"
          value={email}
          onChangeText={(v) => { setEmail(v); clear('email'); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="you@example.com"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={errors.email}
        />
        <Field
          ref={passwordRef}
          label="Password"
          hint="At least 8 characters. Tap Show to check it."
          secret
          value={password}
          onChangeText={(v) => { setPassword(v); clear('password'); }}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleRegister}
          error={errors.password}
        />
      </Rise>

      <Rise index={2} style={styles.actions}>
        <InlineError message={error} />
        <BigButton label={loading ? 'Creating your account…' : 'Create account'} loading={loading} onPress={handleRegister} />
        <LegalLinks />
        <BigButton label="I already have an account" variant="text" onPress={() => router.replace('/(auth)/login')} />
      </Rise>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingBottom: space.xs },
  hero: { alignItems: 'center', justifyContent: 'center' },
  words: { alignItems: 'center', gap: space.sm },
  title: { ...font.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: colors.ink, textAlign: 'center' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  reasonText: { ...font.regular, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: colors.ink2 },
  stack: { gap: space.xxs },
  fields: { gap: space.lg },
  actions: { marginTop: space.xl, gap: space.xs },
});
