/**
 * Skill path levels 1–3 (Phase 1 free tier) with mastery gates.
 * Gates, not menus (brief §4.2): a level unlocks only when the previous gate is passed.
 */

import type { Tier } from './entitlement';

export type DrillMode = 'card-tag' | 'running-count' | 'strategy' | 'true-count';

export interface LevelDef {
  id: string;
  title: string;
  order: number;
  mode: DrillMode;
  /** Free = blackjack school; premium = counting academy (handoff §4 tier map). */
  tier: Tier;
  /** Cards dealt per drill session. */
  cardsPerSession: number;
  /** Time between deals; 0 = self-paced (answer advances). */
  dealIntervalMs: number;
  gate: {
    /** Minimum session accuracy (0–1) to pass. */
    minAccuracy: number;
    /** Maximum average ms per card to pass. */
    maxAvgMsPerCard: number;
  };
}

export const LEVELS: readonly LevelDef[] = [
  {
    id: 'card-values',
    title: 'Card values',
    order: 1,
    mode: 'card-tag',
    tier: 'free',
    cardsPerSession: 20,
    dealIntervalMs: 0,
    gate: { minAccuracy: 0.95, maxAvgMsPerCard: 2500 },
  },
  {
    id: 'running-count-slow',
    title: 'Running count',
    order: 2,
    mode: 'running-count',
    tier: 'free',
    cardsPerSession: 25,
    dealIntervalMs: 0,
    gate: { minAccuracy: 0.95, maxAvgMsPerCard: 2000 },
  },
  {
    id: 'running-count-speed',
    title: 'Speed count',
    order: 3,
    mode: 'running-count',
    tier: 'free',
    cardsPerSession: 30,
    dealIntervalMs: 0,
    gate: { minAccuracy: 0.95, maxAvgMsPerCard: 1500 },
  },
  {
    id: 'basic-strategy',
    title: 'Basic strategy',
    order: 4,
    mode: 'strategy',
    tier: 'free', // handoff §4: basic strategy is FREE ("learning blackjack is free")
    cardsPerSession: 18,
    dealIntervalMs: 0,
    gate: { minAccuracy: 0.95, maxAvgMsPerCard: 4000 },
  },
  {
    id: 'true-count',
    title: 'True count',
    order: 5,
    mode: 'true-count',
    tier: 'premium', // first premium gate ("becoming a counter is premium")
    cardsPerSession: 15,
    dealIntervalMs: 0,
    gate: { minAccuracy: 0.9, maxAvgMsPerCard: 4000 },
  },
] as const;

export function levelById(id: string): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (level === undefined) {
    throw new Error(`Unknown level: ${id}`);
  }
  return level;
}

export interface GateResult {
  passed: boolean;
  accuracyOk: boolean;
  speedOk: boolean;
  completionOk: boolean;
}

/**
 * Mastery gate: accuracy AND speed AND completion must all clear.
 * The completion axis exists because accuracy is computed over cards
 * ANSWERED — without it, one correct card + the 120s timeout would pass a
 * "95% at 1.5s/card" gate (Forge CRITICAL finding, 2026-06-10).
 */
export function evaluateGate(
  level: LevelDef,
  accuracy: number,
  avgMsPerCard: number,
  cardsAnswered: number,
): GateResult {
  const accuracyOk = accuracy >= level.gate.minAccuracy;
  const speedOk = avgMsPerCard <= level.gate.maxAvgMsPerCard;
  const completionOk = cardsAnswered >= level.cardsPerSession;
  return { passed: accuracyOk && speedOk && completionOk, accuracyOk, speedOk, completionOk };
}

/**
 * A level is unlocked when every level before it (by order) has its gate passed.
 * Level 1 is always unlocked.
 */
export function isLevelUnlocked(levelId: string, gatesPassed: ReadonlySet<string>): boolean {
  const level = levelById(levelId);
  return LEVELS.filter((l) => l.order < level.order).every((l) => gatesPassed.has(l.id));
}

/**
 * ADVISORY GATES (handoff §3b). Beta: gates measure + signal readiness but never
 * block — every level stays tappable. Flip to false to restore blocking gates with
 * no other code changes (the lock UI is kept behind this flag, not deleted).
 */
export const GATES_ADVISORY = true;

/** The immediately-preceding level by order, or undefined for the first. */
export function prereqLevel(levelId: string): LevelDef | undefined {
  const level = levelById(levelId);
  const prior = LEVELS.filter((l) => l.order < level.order);
  return prior[prior.length - 1];
}

/**
 * 0–100 progress toward a level's gate, blending accuracy and speed against its
 * thresholds. Drives the "Not ready yet — 71% there" readiness signal.
 */
export function gateProgressPct(
  levelId: string,
  bestAccuracy: number,
  bestAvgMsPerCard: number | null,
): number {
  const { gate } = levelById(levelId);
  const accFrac = Math.min(1, bestAccuracy / gate.minAccuracy);
  const speedFrac = bestAvgMsPerCard === null ? 0 : Math.min(1, gate.maxAvgMsPerCard / bestAvgMsPerCard);
  return Math.round(((accFrac + speedFrac) / 2) * 100);
}
