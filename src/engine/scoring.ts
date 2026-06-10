/**
 * Drill scoring — Casino Ready Score v1 = speed + accuracy composite (brief §4.4 Phase 1).
 * Pressure/true-count sub-scores join the composite in later phases.
 */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Fraction of correct answers, 0–1. Zero attempts → 0 (no NaN). */
export function accuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(correct / total, 0, 1);
}

/**
 * Speed score 0–100, monotonically non-increasing in ms-per-card.
 * ≤500ms/card (casino dealing speed) → 100; ≥3000ms/card → 0; linear between.
 */
export const SPEED_FLOOR_MS = 500;
export const SPEED_CEILING_MS = 3000;

export function speedScore(avgMsPerCard: number): number {
  return clamp((100 * (SPEED_CEILING_MS - avgMsPerCard)) / (SPEED_CEILING_MS - SPEED_FLOOR_MS), 0, 100);
}

export interface SessionStats {
  /** Accuracy ratio 0–1. */
  accuracy: number;
  /** Average milliseconds per card answered. */
  avgMsPerCard: number;
}

/** Casino Ready v1: 60% accuracy, 40% speed, bounded 0–100. */
export function casinoReadyV1(stats: SessionStats): number {
  const composite = 0.6 * clamp(stats.accuracy, 0, 1) * 100 + 0.4 * speedScore(stats.avgMsPerCard);
  return Math.round(clamp(composite, 0, 100));
}

/** "Count hidden — tap to peek (−5 pts)" (brief §4.2). Floors at 0. */
export const PEEK_PENALTY = 5;

export function applyPeekPenalty(score: number, peeks: number): number {
  return clamp(score - PEEK_PENALTY * peeks, 0, 100);
}
