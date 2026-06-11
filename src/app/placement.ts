/**
 * Placement onboarding (brief §4.6.1) — "claim it, then prove it".
 *
 * One tap-question picks a persona; a short Placement Check decides where the
 * path opens. Self-report never unlocks gates — the check does, so "Mastered"
 * stays earned. Levels cleared by the check are "tested out" (visually distinct).
 */

import { LEVELS } from './levels';

export type Persona = 'new' | 'knows-play' | 'counts';

export interface PlacementOutcome {
  /** Level the path opens at. */
  startLevelId: string;
  /** Levels marked "tested out ✓" by the check (distinct from "Mastered"). */
  testedOut: string[];
  /** Casino Ready seeded from placement performance (instant hook for the Refresher). */
  seededCasinoReady: number;
  /** Persona-appropriate framing for the result card. */
  framing: string;
}

const ORDER = LEVELS.map((l) => l.id); // ['card-values','running-count-slow','running-count-speed']

/** Did the counting speed-check clear the bar? (accuracy + pace) */
export function checkPassed(correct: number, total: number, avgMsPerCard: number): boolean {
  if (total === 0) return false;
  return correct / total >= 0.85 && avgMsPerCard <= 2200;
}

/**
 * Map (persona, check performance) → where the path opens.
 *
 * - 'new': no check; starts at the very beginning, nothing tested out.
 * - 'knows-play': passing the check tests out Card Values, opens at Running Count.
 * - 'counts': passing tests out Card Values + Running Count (slow), opens at Speed,
 *   and seeds a meaningful Casino Ready so the Refresher sees a number immediately.
 *
 * A partial/failed check never says "you failed" — it places one step earlier with
 * fast-track framing.
 */
export function evaluatePlacement(
  persona: Persona,
  check: { correct: number; total: number; avgMsPerCard: number } | null,
): PlacementOutcome {
  if (persona === 'new') {
    return {
      startLevelId: ORDER[0]!,
      testedOut: [],
      seededCasinoReady: 0,
      framing: "We'll start from the very beginning — you'll be counting in minutes.",
    };
  }

  const passed = check !== null && checkPassed(check.correct, check.total, check.avgMsPerCard);
  const ratio = check !== null && check.total > 0 ? check.correct / check.total : 0;

  if (persona === 'knows-play') {
    if (passed) {
      return {
        startLevelId: ORDER[1]!, // running-count-slow
        testedOut: [ORDER[0]!], // card values
        seededCasinoReady: 20,
        framing: 'Card values — done. Straight to keeping the running count.',
      };
    }
    return {
      startLevelId: ORDER[0]!,
      testedOut: [],
      seededCasinoReady: Math.round(ratio * 10),
      framing: "Quick warm-up on card values first, then we fast-track you.",
    };
  }

  // persona === 'counts'
  if (passed) {
    return {
      startLevelId: ORDER[2]!, // running-count-speed
      testedOut: [ORDER[0]!, ORDER[1]!],
      seededCasinoReady: 55, // visible number with headroom — the Refresher hook
      framing: 'Sharp. You tested out of the basics — straight to speed.',
    };
  }
  return {
    startLevelId: ORDER[1]!, // running-count-slow
    testedOut: [ORDER[0]!],
    seededCasinoReady: 35,
    framing: 'Solid foundation — we placed you at running count to rebuild speed.',
  };
}
