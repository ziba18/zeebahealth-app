// Sign in: the same family as sign-up. Apple and Google sit above the email form, so people who signed
// up with them never scroll (Apple HIG); then email and password, with "Forgot your password?" beside it.
import React, { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { useRouter } from 'expo-router';
import { space } from '../../constants/zeebaUI';
import { InlineError } from '../../components/zeeba/kit';
import { Rise } from '../../components/zeeba/motion';
import { AuthScreen, OrLine } from '../../components/auth/AuthScreen';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { Field } from '../../components/zeeba/onboarding/Field';
import { BigButton } from '../../components/zeeba/onboarding/Scaffold';
import { useAuthStore } from '../../stores/authStore';
import { ApiError } from '../../lib/api';
import { routeAfterSignIn } from '../../lib/authRouting';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const handleLogin = async () => {
    const trimmed = email.trim();
    const eErr = !trimmed ? 'Enter your email.' : !EMAIL_RE.test(trimmed) ? 'That email doesn’t look right.' : '';
    const pErr = password ? '' : 'Enter your password.';
    setEmailError(eErr);
    setPasswordError(pErr);
    setError('');
    if (eErr || pErr) return;

    setLoading(true);
    try {
      await login(trimmed.toLowerCase(), password);
      router.replace(routeAfterSignIn(useAuthStore.getState().profile) as any);
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError && err.status === 401) setPasswordError('The email or password is not right.');
      else setError('We couldn’t sign you in. Check your connection and try again.');
    }
  };

  const hasError = !!(emailError || passwordError || error);
  const ready = EMAIL_RE.test(email.trim()) && password.length > 0;
  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to open your record."
      mood={hasError ? 'thinking' : ready ? 'happy' : 'wave'}
    >
      <Rise index={1}>
        <SocialAuthButtons mode="signin" />
        <OrLine label="or use your email" />
      </Rise>

      <Rise index={2} style={styles.fields}>
        <Field
          label="Email"
          value={email}
          onChangeText={(v) => { setEmail(v); setEmailError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="you@example.com"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={emailError}
        />
        <View>
          <Field
            ref={passwordRef}
            label="Password"
            secret
            value={password}
            onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            error={passwordError}
          />
          <BigButton
            label="Forgot your password?"
            variant="text"
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgot}
          />
        </View>
      </Rise>

      <Rise index={3} style={styles.actions}>
        <InlineError message={error} />
        <BigButton label={loading ? 'Signing in…' : 'Sign in'} loading={loading} onPress={handleLogin} />
        <BigButton label="New here? Create an account" variant="text" onPress={() => router.replace('/(auth)/register')} />
      </Rise>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: space.md },
  forgot: { alignSelf: 'flex-start', paddingHorizontal: space.xxs },
  actions: { marginTop: space.sm, gap: space.xs },
});
