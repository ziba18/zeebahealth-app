// Which question she is on, out of how many. The name question is only asked when we do not already
// have a real name (see lib/authRouting.ts), so the total is 4 or 3. Kept in memory for this run of
// the app only: nothing here is saved or sent anywhere.
export type QuestionKey = 'name' | 'focus' | 'period' | 'reminder';

const state = { nameAsked: false, greeted: false };

/** The name screen calls this when it opens, so the later steps count it. */
export function markNameAsked(): void {
  state.nameAsked = true;
}

/** True once Wren has said hello (the short moment before the first question). */
export const hasGreeted = (): boolean => state.greeted;
export function markGreeted(): void {
  state.greeted = true;
}

export function questionTotal(): number {
  return state.nameAsked ? 4 : 3;
}

/** Step number (from 1) and the total, for the progress bar and the "2 of 4" text. */
export function questionStep(key: QuestionKey): { step: number; total: number; first: boolean } {
  const order: QuestionKey[] = state.nameAsked ? ['name', 'focus', 'period', 'reminder'] : ['focus', 'period', 'reminder'];
  const i = Math.max(0, order.indexOf(key));
  return { step: i + 1, total: order.length, first: i === 0 };
}
