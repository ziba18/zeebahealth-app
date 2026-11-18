import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { api, clearTokens, getStoredAccessToken, setSessionExpiredHandler } from '../lib/api';
import { useAuthStore, type AuthUser } from '../stores/authStore';
import { syncDailyLogReminder } from '../lib/notifications';
import { clearOfflineCache, readCachedSession, writeCachedSession } from '../lib/offlineCache';
import { isOfflineError } from '../lib/outbox';
import type { Profile } from '../types/database';
import { IS_PREVIEW, PREVIEW_USER_ID } from '../lib/preview/flag';
import { CONSENT_VERSION } from '../constants/config';
import { PREVIEW_EMAIL, PREVIEW_PROFILE } from '../lib/preview/seed';

let authInitStarted = false;

function startAuthInit() {
  if (authInitStarted) return;
  authInitStarted = true;

  setSessionExpiredHandler(() => {
    useAuthStore.getState().signOut();
  });

  // Design preview: signed in as "Sam" immediately, no tokens, no network.
  if (IS_PREVIEW) {
    const { setSession, setUser, setProfile } = useAuthStore.getState();
    setUser({ id: PREVIEW_USER_ID, email: PREVIEW_EMAIL, email_verified: true, health_consent_version: CONSENT_VERSION });
    setProfile(PREVIEW_PROFILE);
    setSession({ access_token: 'design-preview' });
    return;
  }

  // Keep a copy of who is signed in on the phone, so the app can open with no connection.
  useAuthStore.subscribe((s, prev) => {
    if (!s.session || !s.user || !s.profile) return;
    if (s.user !== prev.user || s.profile !== prev.profile || s.session !== prev.session) void writeCachedSession(s.user, s.profile);
  });

  // True while she is signed in from the phone's copy (or waiting on the sign-in screen with a saved session)
  // because the server could not be reached at launch. Checked again when the app comes forward and every 30 s.
  let unconfirmed = false;

  const confirmWithServer = async (token: string, timeoutMs?: number) => {
    const [user, profile] = await Promise.all([
      api.get<AuthUser>('/auth/me', timeoutMs),
      api.get<Profile>('/me', timeoutMs),
    ]);
    const { setSession, setUser, setProfile } = useAuthStore.getState();
    setUser(user);
    setProfile(profile);
    setSession({ access_token: token });
  };

  const rejectSession = async () => {
    await clearTokens();
    await clearOfflineCache();
    useAuthStore.setState({ session: null, user: null, profile: null, isLoading: false, isInitialized: true });
  };

  const tryAgain = async () => {
    if (!unconfirmed) return;
    const token = await getStoredAccessToken();
    if (!token) { unconfirmed = false; return; }
    try {
      await confirmWithServer(token);
      unconfirmed = false;
    } catch (e) {
      if (isOfflineError(e)) return; // still no connection: stay as we are
      unconfirmed = false;
      await rejectSession();
    }
  };

  (async () => {
    const { setSession, setUser, setProfile } = useAuthStore.getState();
    const token = await getStoredAccessToken();

    if (!token) {
      setSession(null);
      return;
    }

    // With a copy on the phone, give the server a few seconds and then open from the copy, so a sleeping
    // server never holds her on the opening screen. With no copy there is nothing to open, so wait properly.
    const saved = await readCachedSession<AuthUser, Profile>();
    try {
      await confirmWithServer(token, saved ? 6000 : undefined);
    } catch (e) {
      if (!isOfflineError(e)) {
        // The server answered and refused this session: sign out for real.
        await rejectSession();
        return;
      }
      // No connection, or the server is not answering. She stays signed in: being offline is not being signed out.
      unconfirmed = true;
      if (saved) {
        setUser(saved.user);
        setProfile(saved.profile);
        setSession({ access_token: token });
      } else {
        setSession(null); // this phone holds no copy yet: sign-in screen, session kept for the next try
      }
      AppState.addEventListener('change', (st) => { if (st === 'active') void tryAgain(); });
      const timer = setInterval(() => {
        if (!unconfirmed) clearInterval(timer);
        else if (AppState.currentState === 'active') void tryAgain();
      }, 30000);
    }
  })();
}

// Kick off auth as soon as this module is imported, before React mounts.
startAuthInit();

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const signOut = useAuthStore((s) => s.signOut);
  const syncedDailyReminder = useRef(false);

  useEffect(() => {
    if (IS_PREVIEW || !profile || !profile.onboarding_complete || syncedDailyReminder.current) return;
    syncedDailyReminder.current = true;
    syncDailyLogReminder(profile.daily_log_reminder_enabled, profile.daily_log_reminder_time).catch(() => {});
  }, [profile]);

  return { session, user, profile, isLoading, isInitialized, signOut };
}
