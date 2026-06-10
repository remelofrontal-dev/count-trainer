import type { Card, CountingSystem, Rank } from './types';

/**
 * Hi-Lo: 2–6 → +1, 7–9 → 0, 10/J/Q/K/A → −1.
 * Balanced: per deck, 5 ranks×4 suits×(+1) cancels 5 ranks×4 suits×(−1).
 */
export const HI_LO: CountingSystem = {
  name: 'Hi-Lo',
  balanced: true,
  tags: {
    A: -1,
    '2': 1,
    '3': 1,
    '4': 1,
    '5': 1,
    '6': 1,
    '7': 0,
    '8': 0,
    '9': 0,
    '10': -1,
    J: -1,
    Q: -1,
    K: -1,
  },
};

/** Count tag for a single rank under a system (default Hi-Lo). */
export function countValue(rank: Rank, system: CountingSystem = HI_LO): number {
  return system.tags[rank];
}

/** Running count over a sequence of dealt cards. */
export function runningCount(cards: readonly Card[], system: CountingSystem = HI_LO): number {
  let rc = 0;
  for (const card of cards) {
    rc += countValue(card.rank, system);
  }
  return rc;
}

/**
 * True count = running count ÷ decks remaining (density normalization —
 * converts absolute card excess into per-deck density so the edge estimate
 * is shoe-size-invariant). Exact float.
 */
export function trueCount(rc: number, decksRemaining: number): number {
  if (decksRemaining <= 0) {
    throw new Error(`decksRemaining must be > 0, got ${decksRemaining}`);
  }
  return rc / decksRemaining;
}

/**
 * Floored true count — truncates toward zero (+2.5 → +2, −2.5 → −2).
 * Industry betting convention; drills that grade conversion precision use
 * the exact float from trueCount() instead.
 */
export function trueCountFloored(rc: number, decksRemaining: number): number {
  return Math.trunc(trueCount(rc, decksRemaining));
}
