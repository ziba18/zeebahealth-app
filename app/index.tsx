import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { LoadingScreen } from '../components/zeeba/kit';
import { routeAfterSignIn } from '../lib/authRouting';

export default function Index() {
  const router = useRouter();
  const { session, profile, user, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    router.replace((session ? routeAfterSignIn(profile, user) : '/(auth)/welcome') as any);
  }, [isInitialized, session, profile, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return <LoadingScreen message="Opening Zeeba Health…" />;
}
