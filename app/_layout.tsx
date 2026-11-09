// The handler itself is installed from index.ts, before anything else loads.
import { clearFatalError, getFatalError, subscribeFatalError } from '../lib/crashGuard';
import { Stack, usePathname, useRouter, type ErrorBoundaryProps } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, View, useWindowDimensions } from 'react-native';
import '../hooks/useAuth';
import { cancelPredictedCycleReminders } from '../lib/notifications';
import { UI, colors, useScheme, webThemeCss } from '../constants/zeebaUI';
import { IS_PREVIEW } from '../lib/preview/flag';
import { ErrorScreen, ToastHost } from '../components/zeeba/kit';
import { PrivacyCover } from '../components/zeeba/PrivacyCover';
import { useFonts } from 'expo-font';
// iOS uses Apple's own faces (SF Pro, SF Rounded, New York) — nothing to load. Newsreader is only the
// web preview's stand-in for New York, which desktop Chrome can't reach.
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader/400Regular_Italic';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useSyncExternalStore } from 'react';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web: the colour tokens are CSS variables; define them once for light and dark.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('zeeba-theme')) {
  const style = document.createElement('style');
  style.id = 'zeeba-theme';
  style.textContent = `${webThemeCss()}html,body{background:var(--z-canvas)}`;
  document.head.appendChild(style);
}

// Older builds scheduled "period coming" / "ovulation" reminders from a
// cycle prediction. The app no longer predicts anything, so clear any that
// are still queued on the device.
if (Platform.OS !== 'web') cancelPredictedCycleReminders().catch(() => {});

// Importing useAuth (above) runs the module-level startAuthInit() side effect that
// begins the session restore. `app/index.tsx` reads auth state and routes accordingly,
// so the root layout doesn't subscribe to auth changes.
function AppShell() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const wideMock = IS_PREVIEW && usePathname() === '/clinic-mock'; // preview-only desktop mock
  const fatalError = useSyncExternalStore(subscribeFatalError, getFatalError);

  // Route taps on the daily log reminder straight to Today (where capture starts),
  // whether the app was already open (listener) or launched cold from the
  // notification (getLastNotificationResponseAsync). Not on web (design preview only).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handleResponse = (response: Notifications.NotificationResponse) => {
      if (response.notification.request.content.data?.type === 'daily_log_reminder') {
        router.push('/(tabs)/today' as any);
      }
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, [router]);

  const scheme = useScheme();
  const [fontsLoaded] = useFonts(Platform.OS === 'web' ? { Newsreader_400Regular, Newsreader_400Regular_Italic } : {});

  // Hide the splash as soon as the fonts are ready. The auth session continues
  // resolving in the background — `app/index.tsx` shows a loading screen until
  // `isInitialized` flips, so the user sees the app respond rather than a frozen splash.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  if (fatalError) return <ErrorScreen error={fatalError} onRetry={clearFatalError} />;

  const isTablet = width >= UI.maxContentWidth && !wideMock;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {isTablet ? (
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: UI.colors.background }}>
          <View style={{ flex: 1, width: UI.maxContentWidth }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="clinic-mock" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </View>
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="clinic-mock" />
          <Stack.Screen name="+not-found" />
        </Stack>
      )}
      {/* Above every screen; sits just over the tab bar. */}
      <ToastHost />
      <PrivacyCover />
    </>
  );
}

// Catches errors thrown while rendering any screen (see lib/crashGuard.ts for the rest).
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen error={error} onRetry={retry} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppShell />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
