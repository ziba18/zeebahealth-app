// Milestones of the record (11 Nov 2026). The only thing the app ever celebrates is the record itself growing:
// first entry, 3, 7, 14 and 28 days on the record, and the first report shared. Each one is celebrated once.
//
// Rules (scratchpad research, gamification.md §6 — and the brief):
//   - No streaks. The number is a total that only goes up; a gap is never shown or counted against her.
//   - Wren reacts to the act of recording, never to the pain number. If the entry that crosses a milestone is an
//     8-or-worse day, the celebration is HELD until her next entry on a later, easier day.
//   - Kept on this phone only (AsyncStorage `zeeba.milestones`, one block per signed-in user). Nothing is sent.
//   - Days already on the record when this phone first sees them are marked quietly, without a celebration.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { peakOf } from './records/format';
import { todayKey } from './records/dates';
import { previewParam } from './tour';
import { IS_PREVIEW } from './preview/flag';
import type { PeriodDayData, Rec, SymptomData } from '../types/records';

const KEY = 'zeeba.milestones';

export type MilestoneId = 'first' | 'days3' | 'days7' | 'days14' | 'days28' | 'shared';

export const DAY_MILESTONES: { id: MilestoneId; days: number }[] = [
  { id: 'days3', days: 3 },
  { id: 'days7', days: 7 },
  { id: 'days14', days: 14 },
  { id: 'days28', days: 28 },
];
const ALL_IDS: MilestoneId[] = ['first', 'days3', 'days7', 'days14', 'days28', 'shared'];

/** A day at this number or above is a hard day: warmth, never confetti. */
export const HARD_DAY_FROM = 8;

// ---- What the record holds ------------------------------------------------------------------------------------

export type DayOnRecord = {
  date: string;
  /** The highest number she gave that day, or null if she gave none. */
  worst: number | null;
  /** Bleeding or spotting was logged that day. */
  bleeding: boolean;
};

/** Every day that has anything on the record, oldest first. Days without an entry simply are not in the list. */
export function daysOnRecord(symptoms: Rec<SymptomData>[], periodDays: Rec<PeriodDayData>[]): DayOnRecord[] {
  const byDate = new Map<string, DayOnRecord>();
  const get = (date: string) => {
    let d = byDate.get(date);
    if (!d) { d = { date, worst: null, bleeding: false }; byDate.set(date, d); }
    return d;
  };
  for (const r of symptoms) {
    if (!r.data?.date) continue;
    const d = get(r.data.date);
    const n = peakOf(r.data);
    if (n != null && (d.worst == null || n > d.worst)) d.worst = n;
  }
  for (const r of periodDays) {
    if (!r.data?.date) continue;
    const d = get(r.data.date);
    if (r.data.flow !== 'None') d.bleeding = true;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export type RecordFacts = { days: number; entries: number };

export function factsOf(symptoms: Rec<SymptomData>[], periodDays: Rec<PeriodDayData>[]): RecordFacts {
  return { days: daysOnRecord(symptoms, periodDays).length, entries: symptoms.length + periodDays.length };
}

// ---- The decision (pure, so it can be reasoned about) ----------------------------------------------------------

export type Saved = {
  /** Celebrated (or quietly marked): id → ISO time. */
  done: Partial<Record<MilestoneId, string>>;
  /** Crossed on a hard day; waiting for an entry on a later, easier day. `date` is that hard day. */
  held: { id: MilestoneId; date: string }[];
  /** Ready to celebrate as soon as the screen is free. */
  queue: MilestoneId[];
};

export const emptySaved = (): Saved => ({ done: {}, held: [], queue: [] });

export type AddedEntry = { date: string; worst: number | null };

const known = (s: Saved, id: MilestoneId) => !!s.done[id] || s.queue.includes(id) || s.held.some((h) => h.id === id);

/** First sight of a record on this phone: whatever it already holds is marked without a celebration. */
export function baseline(saved: Saved, facts: RecordFacts, now: string): Saved {
  const done = { ...saved.done };
  if (facts.entries > 0 && !known(saved, 'first')) done.first = now;
  for (const m of DAY_MILESTONES) if (facts.days >= m.days && !known(saved, m.id)) done[m.id] = now;
  return { ...saved, done };
}

/** One or two entries were just added: which celebrations become ready, which are held, which are released. */
export function evaluate(saved: Saved, before: RecordFacts, after: RecordFacts, added: AddedEntry[], now: string): Saved {
  const next: Saved = { done: { ...saved.done }, held: [...saved.held], queue: [...saved.queue] };
  const hard = added.some((e) => e.worst != null && e.worst >= HARD_DAY_FROM);

  // An easier entry on a later day releases anything that was held.
  if (!hard && added.length) {
    const latest = added.map((e) => e.date).sort().pop()!;
    const released = next.held.filter((h) => latest > h.date);
    if (released.length) {
      next.held = next.held.filter((h) => !released.includes(h));
      for (const h of released) if (!next.queue.includes(h.id)) next.queue.push(h.id);
    }
  }

  const crossed: MilestoneId[] = [];
  if (before.entries === 0 && after.entries > 0 && !known(next, 'first')) crossed.push('first');
  const days = DAY_MILESTONES.filter((m) => before.days < m.days && after.days >= m.days && !known(next, m.id));
  // Several thresholds in one go (rare): celebrate the highest, mark the rest quietly.
  days.slice(0, -1).forEach((m) => { next.done[m.id] = now; });
  if (days.length) crossed.push(days[days.length - 1].id);

  if (crossed.length) {
    if (hard) {
      const date = added.map((e) => e.date).sort().pop() ?? todayKey();
      crossed.forEach((id) => next.held.push({ id, date }));
    } else {
      crossed.forEach((id) => next.queue.push(id));
    }
  }
  return next;
}

// ---- The store ------------------------------------------------------------------------------------------------

type MilestoneState = Saved & {
  userId: string | null;
  /** The phone's memory has been read for this user. */
  ready: boolean;
  /** A celebration is on screen right now (Today's own Wren steps aside: one Wren per screen). */
  showing: boolean;
};

export const useMilestones = create<MilestoneState>(() => ({ ...emptySaved(), userId: null, ready: false, showing: false }));

type Disk = Record<string, Saved>;

async function readDisk(): Promise<Disk> {
  if (IS_PREVIEW) return {};
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const clean = (s: Partial<Saved> | undefined): Saved => ({
  done: s?.done && typeof s.done === 'object' ? s.done : {},
  held: Array.isArray(s?.held) ? s!.held.filter((h) => ALL_IDS.includes(h?.id) && typeof h?.date === 'string') : [],
  queue: Array.isArray(s?.queue) ? s!.queue.filter((id) => ALL_IDS.includes(id)) : [],
});

// One thing at a time: reads and writes of the phone's memory never overlap.
let chain: Promise<void> = Promise.resolve();
const inOrder = (fn: () => Promise<void> | void) => { chain = chain.then(fn).catch(() => {}); return chain; };

async function persist(): Promise<void> {
  const { userId, done, held, queue } = useMilestones.getState();
  if (!userId || IS_PREVIEW) return;
  try {
    const disk = await readDisk();
    disk[userId] = { done, held, queue };
    await AsyncStorage.setItem(KEY, JSON.stringify(disk));
  } catch {}
}

const apply = (s: Saved) => { useMilestones.setState(s); return persist(); };
const current = (): Saved => { const { done, held, queue } = useMilestones.getState(); return { done, held, queue }; };

/** Her records have just loaded on this phone. */
export function hydrateMilestones(userId: string, facts: RecordFacts): Promise<void> {
  return inOrder(async () => {
    const disk = await readDisk();
    const saved = baseline(clean(disk[userId]), facts, new Date().toISOString());
    // Design preview only: `/today?milestone=days7` shows one celebration.
    const forced = previewParam('milestone') as MilestoneId | null;
    if (forced && ALL_IDS.includes(forced)) { delete saved.done[forced]; saved.queue = [forced]; }
    useMilestones.setState({ ...saved, userId, ready: true });
    await persist();
  });
}

export function forgetMilestoneUser(): void {
  void inOrder(() => { useMilestones.setState({ ...emptySaved(), userId: null, ready: false }); });
}

/** Entries were added while the app is open. */
export function recordChanged(before: RecordFacts, after: RecordFacts, added: AddedEntry[]): Promise<void> {
  return inOrder(async () => {
    if (!useMilestones.getState().ready) return;
    const now = new Date().toISOString();
    // A big jump is not her saving an entry (a restore, a sync): mark, never celebrate.
    const next = added.length > 2 ? baseline(current(), after, now) : evaluate(current(), before, after, added, now);
    await apply(next);
  });
}

/** The first report left the app. */
export function reportShared(): Promise<void> {
  return inOrder(async () => {
    const s = current();
    if (!useMilestones.getState().ready || known(s, 'shared')) return;
    await apply({ ...s, queue: [...s.queue, 'shared'] });
  });
}

/** She tapped "Carry on": that milestone is done for good. */
export function milestoneSeen(id: MilestoneId): Promise<void> {
  return inOrder(async () => {
    const s = current();
    await apply({ done: { ...s.done, [id]: new Date().toISOString() }, held: s.held.filter((h) => h.id !== id), queue: s.queue.filter((q) => q !== id) });
  });
}

// ---- Words ----------------------------------------------------------------------------------------------------

export type MilestoneCopy = {
  /** A number to count up to, with the words under it. Absent for the first entry. */
  count?: number;
  countLabel?: string;
  /** Absent when the number and its label already say it. */
  title?: string;
  /** One plain sentence of fact. Never a promise about what a doctor will do. */
  line: string;
  /** The early win: a button that opens the report. */
  openReport?: boolean;
};

const dayWord = (n: number) => `${n} dated ${n === 1 ? 'day' : 'days'}`;

/** What the celebration says. `days` is what the record holds right now, so the sentence is always true. */
export function milestoneCopy(id: MilestoneId, days: number): MilestoneCopy {
  if (id === 'first') {
    return {
      title: 'It’s already on your report',
      line: 'Your entry is saved with its date. Everything you record goes straight into your report.',
      openReport: true,
    };
  }
  if (id === 'shared') {
    return {
      count: days,
      countLabel: days === 1 ? 'day on your record' : 'days on your record',
      title: 'You shared your first report',
      line: 'It was made from your own dated entries, in your own words.',
    };
  }
  return {
    count: days,
    countLabel: days === 1 ? 'day on your record' : 'days on your record',
    line: `Your record now holds ${dayWord(days)}.`,
  };
}
