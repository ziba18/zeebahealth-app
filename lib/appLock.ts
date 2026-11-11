// App lock: Face ID, Touch ID or the phone's passcode before the app shows anything, on launch and
// each time it comes back from the background. A per-phone choice (Profile), off by default, kept in
// AsyncStorage. The check is the phone's own; the app never sees a fingerprint, face or passcode.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const KEY = 'zeeba_app_lock';
const listeners = new Set<(on: boolean) => void>();

export async function isAppLockOn(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try { return (await AsyncStorage.getItem(KEY)) === '1'; } catch { return false; }
}

/** True when the phone has a passcode or biometrics to lock with. */
export async function canAppLock(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
  } catch { return false; }
}

export async function unlockWithDevice(promptMessage = 'Unlock Zeeba Health'): Promise<boolean> {
  try {
    return (await LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: false })).success;
  } catch { return false; }
}

/** Turn the lock on or off; either way she proves it is her first. Resolves to the state now in force. */
export async function setAppLock(on: boolean): Promise<boolean> {
  const was = await isAppLockOn();
  if (!(await unlockWithDevice(on ? 'Turn on app lock' : 'Turn off app lock'))) return was;
  try { await AsyncStorage.setItem(KEY, on ? '1' : '0'); } catch { return was; }
  listeners.forEach((l) => l(on));
  return on;
}

export function onAppLockChange(listener: (on: boolean) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
