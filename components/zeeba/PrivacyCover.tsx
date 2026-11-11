import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../../constants/zeebaUI';
import { isAppLockOn, onAppLockChange, unlockWithDevice } from '../../lib/appLock';
import { useAuthStore } from '../../stores/authStore';
import { Button } from './kit';

/**
 * Plain cover over the whole app while it is not the active app, so the iOS app-switcher snapshot
 * (and Control Centre / notification peeks) never shows symptom notes.
 *
 * With app lock on (Profile), the same cover stays up on launch and after every trip to the
 * background until Face ID, Touch ID or the passcode succeeds. Only for a signed-in session: the
 * sign-in screens hold nothing private.
 */
export function PrivacyCover() {
  const signedIn = useAuthStore((s) => !!s.session);
  const [covered, setCovered] = useState(false);
  const [lockOn, setLockOn] = useState(false);
  const [locked, setLocked] = useState(false);
  const prompting = useRef(false);

  const prompt = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    const ok = await unlockWithDevice();
    prompting.current = false;
    if (ok) setLocked(false);
  }, []);

  // Read the saved choice once; a cold start with the lock on begins locked.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    isAppLockOn().then((on) => { setLockOn(on); if (on) setLocked(true); });
    return onAppLockChange(setLockOn);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      setCovered(state !== 'active');
      // 'inactive' is also what the Face ID sheet itself causes, so only a real trip to the background locks.
      if (state === 'background' && lockOn) setLocked(true);
    });
    return () => sub.remove();
  }, [lockOn]);

  const mustUnlock = locked && lockOn && signedIn;
  useEffect(() => {
    if (mustUnlock && !covered) void prompt();
  }, [mustUnlock, covered, prompt]);

  if (!covered && !mustUnlock) return null;
  return (
    <View
      style={styles.cover}
      pointerEvents={mustUnlock ? 'auto' : 'none'}
      accessibilityViewIsModal={mustUnlock}
      accessibilityElementsHidden={!mustUnlock}
      importantForAccessibility={mustUnlock ? 'yes' : 'no-hide-descendants'}
    >
      <Text style={styles.name}>Zeeba Health</Text>
      {mustUnlock && !covered ? <Button label="Unlock" onPress={prompt} style={{ marginTop: space.xl, minWidth: 200 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  name: { fontSize: 22, fontWeight: '600', color: colors.ink },
});
