// The save moment (11 Nov 2026): when an entry is saved it visibly lands on the record. A small chip flies from
// where she saved to the Doctor tab, whose icon bumps as it arrives. This file is only the hand-off between the
// place that saved (Today's check-in card, the capture sheet), the flight (SaveFlight.tsx) and the tab bar.
// Presentation only: nothing here saves or sends anything.
import { create } from 'zustand';
import type { Rect } from '../../../lib/tour';

export type Flight = {
  id: number;
  /** Where the chip starts (window coordinates). Null: from the middle of the screen (the capture sheet). */
  from: Rect | null;
  /** The number she gave, if any: the chip shows it on the pain ramp. Otherwise it shows a small note glyph. */
  value: number | null;
};

type SaveMomentState = {
  flight: Flight | null;
  /** Goes up by one each time a chip lands: the Doctor tab icon bumps. */
  bump: number;
};

export const useSaveMoment = create<SaveMomentState>(() => ({ flight: null, bump: 0 }));

let seq = 0;

/** Call once, right after a successful save. */
export function entryLanded(opts: { from?: Rect | null; value?: number | null } = {}): void {
  seq += 1;
  useSaveMoment.setState({ flight: { id: seq, from: opts.from ?? null, value: opts.value ?? null } });
}

/** The chip reached the Doctor tab (or there was nowhere to fly to). */
export function flightDone(bump: boolean): void {
  useSaveMoment.setState((s) => ({ flight: null, bump: bump ? s.bump + 1 : s.bump }));
}
