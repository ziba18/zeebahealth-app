import React, { useState } from 'react';
import { View, Pressable, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { isRunningInExpoGo } from 'expo';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors, font, heights, radii, space, useScheme } from '../../constants/zeebaUI';
import { InlineError, Txt } from '../zeeba/kit';
import { GoogleGLogo } from './GoogleGLogo';
import { signInWithApple, signInWithGoogle } from '../../lib/socialAuth';
import { routeAfterSignIn } from '../../lib/authRouting';
import { useAuthStore } from '../../stores/authStore';
import { haptics } from '../../lib/haptics';
import { track } from '../../lib/analytics';

const IN_EXPO_GO = isRunningInExpoGo();
const IS_IOS = Platform.OS === 'ios';

const APPLE_LOGO =
  'M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.75.73 1.05 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.52zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.21z';

/**
 * Sign-in stack, per Apple's HIG for Sign in with Apple: Apple first and no smaller than the
 * others; black on light backgrounds, white on dark. Then Google (white with the full-colour G,
 * per Google's branding rules), then email. All 50 tall and full width.
 *
 * Expo Go: Apple's native button view isn't available, so an Apple-styled button calls the same
 * sign-in (it works once the server accepts Expo Go's tokens; see backend config
 * `apple_allow_expo_go`). Google's native module can't run in Expo Go at all, so its button
 * explains that instead of failing silently.
 */
export function SocialAuthButtons({
  mode = 'signin', onEmail, emailLabel,
}: {
  mode?: 'signin' | 'signup';
  /** Show "Continue with email" as the last option. */
  onEmail?: () => void;
  emailLabel?: string;
  /** @deprecated kept for older callers; the divider is gone. */
  divider?: boolean;
}) {
  const router = useRouter();
  const scheme = useScheme();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const run = async (provider: 'apple' | 'google') => {
    haptics.light();
    setError('');
    setNote('');
    if (provider === 'google' && IN_EXPO_GO) {
      setNote('Google sign-in works in the installed app (TestFlight or the App Store). In Expo Go, use Apple or email.');
      return;
    }
    setBusy(provider);
    const { user, error: err } = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    setBusy(null);
    if (err) {
      setError(`${provider === 'apple' ? 'Apple' : 'Google'} sign-in didn't work. ${err.message}`);
      return;
    }
    if (user) {
      const profile = useAuthStore.getState().profile;
      // Social sign-in doubles as sign-up; an unfinished onboarding is the closest signal.
      if (!profile?.onboarding_complete) track('Signup Completed', { method: provider });
      router.replace(routeAfterSignIn(profile) as any);
    }
  };

  const dark = scheme === 'dark';
  const appleLabel = mode === 'signup' ? 'Sign up with Apple' : 'Sign in with Apple';

  return (
    <View style={{ gap: space.sm }}>
      {IS_IOS ? (
        busy === 'apple' ? (
          <View style={styles.loading}><ActivityIndicator color={colors.ink} /></View>
        ) : IN_EXPO_GO ? (
          <Pressable
            onPress={() => run('apple')}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel={appleLabel}
            style={({ pressed }) => [styles.btn, { backgroundColor: dark ? '#FFFFFF' : '#000000', opacity: pressed ? 0.8 : 1 }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" aria-hidden><Path d={APPLE_LOGO} fill={dark ? '#000000' : '#FFFFFF'} /></Svg>
            <Txt style={[styles.label, { color: dark ? '#000000' : '#FFFFFF' }]}>{appleLabel}</Txt>
          </Pressable>
        ) : (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={mode === 'signup' ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={heights.primary / 2}
            style={styles.apple}
            onPress={() => run('apple')}
          />
        )
      ) : null}

      {busy === 'google' ? (
        <View style={styles.loading}><ActivityIndicator color={colors.ink} /></View>
      ) : (
        <Pressable
          onPress={() => run('google')}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          style={({ pressed }) => [styles.btn, styles.google, pressed && { opacity: 0.8 }]}
        >
          <GoogleGLogo size={20} />
          <Txt style={[styles.label, { color: '#1F1F1F' }]}>Continue with Google</Txt>
        </Pressable>
      )}

      {onEmail ? (
        <Pressable
          onPress={() => { haptics.light(); onEmail(); }}
          accessibilityRole="button"
          accessibilityLabel={emailLabel ?? 'Continue with email'}
          style={({ pressed }) => [styles.btn, styles.email, pressed && { opacity: 0.75 }]}
        >
          <Txt style={[styles.label, { color: colors.ink }]}>{emailLabel ?? 'Continue with email'}</Txt>
        </Pressable>
      ) : null}

      {note ? <Txt variant="caption" style={{ textAlign: 'center' }}>{note}</Txt> : null}
      <InlineError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: heights.primary, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: space.xs, paddingHorizontal: space.lg,
  },
  label: { ...font.semibold, fontSize: 17, lineHeight: 22 },
  apple: { height: heights.primary, width: '100%' },
  loading: { height: heights.primary, alignItems: 'center', justifyContent: 'center' },
  // Google's button stays white in both appearances (its branding rules), with a hairline edge.
  google: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DADCE0' },
  email: { backgroundColor: colors.sunken },
});
