// The guided tour (11 Nov 2026): the first time she reaches Today, Wren points at four things, one at a time.
// This file is the tour's memory and plumbing; the picture is components/zeeba/guide/TourOverlay.tsx.
//
//   - Seen once per phone (AsyncStorage `zeeba.tour.v1`), replayable from Settings ("Show me around again").
//   - Screens mark the things Wren points at with `useTourTarget('checkin')`; the overlay asks where they are
//     with `measureTarget()` (window coordinates, so it works on iPhone and in the web preview alike).
//   - Nothing here touches her records or the network.
import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { IS_PREVIEW } from './preview/flag';

const KEY = 'zeeba.tour.v1';

export type TourTarget = 'checkin' | 'tab-evidence' | 'tab-doctor' | 'avatar';
export type Rect = { x: number; y: number; w: number; h: number };

/** One step: what Wren points at and says. Eight words or fewer, no medical content. */
export const TOUR_STEPS: { target: TourTarget; text: string; pad: number; radius: number }[] = [
  { target: 'checkin', text: 'Start here. Slide or tap a number.', pad: 10, radius: 22 },
  { target: 'tab-evidence', text: 'Your entries turn into charts here.', pad: 2, radius: 28 },
  { target: 'tab-doctor', text: 'Your report for the doctor is here.', pad: 2, radius: 28 },
  { target: 'avatar', text: 'Your profile and settings are here.', pad: 8, radius: 30 },
];

/**
 * Design preview only (never true in a real build, see lib/preview/flag.ts): a value from the page address, so a
 * reviewer can open a state directly: `/today?tour=1`, `/today?milestone=days7`, `/today?seed=empty`.
 */
export function previewParam(name: string): string | null {
  if (!IS_PREVIEW || typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location?.search ?? '').get(name);
  } catch {
    return null;
  }
}

type TourState = {
  /** null until the phone's memory has been read. */
  seen: boolean | null;
  /** Asked for from Settings: play it the next time Today is on screen and idle. */
  requested: boolean;
  /** The step on screen (0-based), or null when the tour is not running. */
  step: number | null;
};

export const useTour = create<TourState>(() => ({ seen: null, requested: false, step: null }));

// In the design preview the tour does not start by itself (reviewers' screenshots stay clean); `?tour=1` shows it.
if (IS_PREVIEW) {
  useTour.setState({ seen: true, requested: previewParam('tour') === '1' });
} else {
  AsyncStorage.getItem(KEY)
    .then((v) => useTour.setState({ seen: v != null }))
    .catch(() => useTour.setState({ seen: true })); // if the phone's memory can't be read, never nag
}

const remember = () => {
  useTour.setState({ seen: true, requested: false });
  if (!IS_PREVIEW) AsyncStorage.setItem(KEY, new Date().toISOString()).catch(() => {});
};

/** True when the tour should play as soon as Today is idle (first visit, or asked for again). */
export function tourWanted(s: TourState = useTour.getState()): boolean {
  return s.step === null && (s.requested || s.seen === false);
}

export function startTour(): void {
  if (useTour.getState().step !== null) return;
  // Remembered as soon as it starts: if the app is closed half-way it must not ambush her next time.
  remember();
  useTour.setState({ step: 0 });
}

export function nextTourStep(): void {
  const { step } = useTour.getState();
  if (step === null) return;
  useTour.setState({ step: step + 1 >= TOUR_STEPS.length ? null : step + 1 });
}

/** Skip or finish: the tour goes away at once. */
export function endTour(): void {
  remember();
  useTour.setState({ step: null });
}

/** Settings → "Show me around again". The caller then goes to Today, where it starts. */
export function replayTour(): void {
  useTour.setState({ requested: true, step: null });
}

// ---- Targets ------------------------------------------------------------------------------------------------

/** Anything that can say where it is on screen (a View; typed loosely because RN's instance types differ by version). */
export type Measurable = { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void };

const targets = new Map<TourTarget, { current: Measurable | null }>();

/** Spread the returned ref onto the one view Wren should point at: `<View ref={useTourTarget('checkin')} />`. */
export function useTourTarget(id: TourTarget | null | undefined) {
  const ref = useRef<Measurable | null>(null);
  useEffect(() => {
    if (!id) return undefined;
    targets.set(id, ref);
    return () => { if (targets.get(id) === ref) targets.delete(id); };
  }, [id]);
  return useCallback((node: unknown) => { ref.current = (node as Measurable | null) ?? null; }, []);
}

/** Where a target is on screen right now (window coordinates), or null if it is not there. */
export function measureTarget(id: TourTarget): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = targets.get(id)?.current;
    if (!node?.measureInWindow) { resolve(null); return; }
    let done = false;
    const finish = (r: Rect | null) => { if (!done) { done = true; resolve(r); } };
    try {
      node.measureInWindow((x, y, w, h) => {
        finish(Number.isFinite(x) && Number.isFinite(y) && w > 0 && h > 0 ? { x, y, w, h } : null);
      });
    } catch {
      finish(null);
    }
    setTimeout(() => finish(null), 400); // a detached view never calls back
  });
}
