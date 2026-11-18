// "What brings you here?" — the areas she chose in onboarding. Kept on the device (not health data
// sent anywhere); used to put her topics first on Today. Changeable any time by re-running the step.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { IconName } from '../components/ui/Icon';

const KEY = 'zeeba.focus';

/**
 * Each area maps to the Today topic it opens (labels match QUICK_ROWS in TodayCards). `icon` is the line
 * icon shown on its onboarding card (the same ones Today uses for those topics).
 */
export const FOCUS_AREAS: { value: string; label: string; topic: string; icon: IconName }[] = [
  { value: 'pain', label: 'Pain or cramps', topic: 'Pain', icon: 'zap' },
  { value: 'bleeding', label: 'Heavy or irregular periods', topic: 'Bleeding', icon: 'droplet' },
  { value: 'tired', label: 'Exhaustion or fatigue', topic: 'Tired', icon: 'moon' },
  { value: 'bowel', label: 'Bowel or bladder', topic: 'Tummy, bowel or bladder', icon: 'activity' },
  { value: 'mood', label: 'Mood or anxiety', topic: 'Mood', icon: 'heart' },
  { value: 'meno', label: 'Perimenopause or menopause', topic: 'Something new', icon: 'flower' },
  { value: 'skin', label: 'Skin or hair', topic: 'Skin or hair', icon: 'sparkles' },
  { value: 'other', label: 'Something else', topic: 'Something new', icon: 'plus' },
];

type FocusState = { areas: string[]; set: (areas: string[]) => void };

export const useFocusStore = create<FocusState>((set) => ({
  areas: [],
  set: (areas) => {
    set({ areas });
    AsyncStorage.setItem(KEY, JSON.stringify(areas)).catch(() => {});
  },
}));

AsyncStorage.getItem(KEY)
  .then((v) => { if (v) useFocusStore.setState({ areas: JSON.parse(v) }); })
  .catch(() => {});

/** Today's four topic tiles: her chosen areas first, then the defaults, no repeats. */
export function topicsFor(areas: string[], defaults: string[]): string[] {
  const chosen = areas.map((a) => FOCUS_AREAS.find((f) => f.value === a)?.topic).filter((t): t is string => !!t);
  const out: string[] = [];
  for (const t of [...chosen, ...defaults]) if (!out.includes(t)) out.push(t);
  return out.slice(0, 4);
}
