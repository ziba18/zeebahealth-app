import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Txt } from '../components/zeeba/kit';
import { Wren } from '../components/zeeba/Wren';
import { colors, space } from '../constants/zeebaUI';
import { routeAfterSignIn } from '../lib/authRouting';

// The first thing anyone sees: Wren, awake and breathing, while the saved session is restored.
export default function Index() {
  const router = useRouter();
  const { session, profile, user, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    router.replace((session ? routeAfterSignIn(profile, user) : '/(auth)/welcome') as any);
  }, [isInitialized, session, profile, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', gap: space.md }}
      accessibilityLiveRegion="polite"
    >
      <Wren mood="idle" size={132} decorative />
      <Txt variant="body" color={colors.ink2}>Opening Zeeba Health…</Txt>
    </View>
  );
}
