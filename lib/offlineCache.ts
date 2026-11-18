// A copy of her account details and her records, kept on this phone so the app opens and shows what she has
// recorded when there is no connection. The server stays the source of truth: every successful load replaces
// the copy. It is removed on sign-out, account deletion and account switch.
// Stored with AsyncStorage (the app's own sandbox on the phone; localStorage on web), like the outbox.
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'zeeba.cache.session.v1';
const OWNER_KEY = 'zeeba.cache.records.v1.owner';
// One row per kind of record: Android cannot read back a single stored row larger than about 2 MB.
const kindKey = (kind: string) => `zeeba.cache.records.v1.${kind}`;

export interface CachedSession<U, P> { user: U; profile: P }

export async function readCachedSession<U extends { id: string }, P>(): Promise<CachedSession<U, P> | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.user && typeof parsed.user.id === 'string' && parsed.profile ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeCachedSession<U, P>(user: U, profile: P): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user, profile }));
  } catch { /* storage unavailable: the app still works online */ }
}

/** Her records as last seen, or null when this phone holds no copy for this account. */
export async function readCachedRecords<B extends Record<string, unknown[]>>(userId: string, kinds: readonly (keyof B & string)[]): Promise<B | null> {
  try {
    if ((await AsyncStorage.getItem(OWNER_KEY)) !== userId) return null;
    const rows = await AsyncStorage.multiGet(kinds.map(kindKey));
    const out: Record<string, unknown[]> = {};
    kinds.forEach((kind, i) => {
      const raw = rows[i]?.[1];
      const parsed = raw ? JSON.parse(raw) : [];
      out[kind] = Array.isArray(parsed) ? parsed : [];
    });
    return out as B;
  } catch {
    return null;
  }
}

export async function writeCachedRecords(userId: string, buckets: Record<string, unknown[]>): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [OWNER_KEY, userId],
      ...Object.entries(buckets).map(([kind, list]) => [kindKey(kind), JSON.stringify(list)] as [string, string]),
    ]);
  } catch { /* storage full or unavailable: nothing is lost, the server has the records */ }
}

export async function clearCachedRecords(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('zeeba.cache.records.'));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {}
}

/** Sign-out, account deletion, a rejected session: nothing of hers stays on the phone. */
export async function clearOfflineCache(): Promise<void> {
  try { await AsyncStorage.removeItem(SESSION_KEY); } catch {}
  await clearCachedRecords();
}
