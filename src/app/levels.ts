/**
 * Skill path levels 1–3 (Phase 1 free tier) with mastery gates.
 * Gates, not menus (brief §4.2): a level unlocks only when the previous gate is passed.
 */

export type DrillMode = 'card-tag' | 'running-count';

export interface LevelDef {
  id: string;
  title: string;
  order: number;
  mode: DrillMode;
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
    cardsPerSession: 20,
    dealIntervalMs: 0,
    gate: { minAccuracy: 0.95, maxAvgMsPerCard: 2500 },
  },
  {
    id: 'running-count-slow',
    title: 'Running count',
    order: 2,
    mode: 'running-count',
    cardsPerSession: 25,
    dealIntervalMs: 0,
    gate: { minAccuracy: 0.95, maxAvgMsPerCard: 2000 },
  },
  {
    id: 'running-count-speed',
    title: 'Speed count',
    order: 3,
    mode: 'running-count',
    cardsPerSession: 30,
    dealIntervalMs: 0,
    gate: { minAccuracy: 0.95, maxAvgMsPerCard: 1500 },
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
}

/** Mastery gate: BOTH accuracy and speed must clear (brief §4.1: "95% accuracy at 1.5s/card"). */
export function evaluateGate(level: LevelDef, accuracy: number, avgMsPerCard: number): GateResult {
  const accuracyOk = accuracy >= level.gate.minAccuracy;
  const speedOk = avgMsPerCard <= level.gate.maxAvgMsPerCard;
  return { passed: accuracyOk && speedOk, accuracyOk, speedOk };
}

/**
 * A level is unlocked when every level before it (by order) has its gate passed.
 * Level 1 is always unlocked.
 */
export function isLevelUnlocked(levelId: string, gatesPassed: ReadonlySet<string>): boolean {
  const level = levelById(levelId);
  return LEVELS.filter((l) => l.order < level.order).every((l) => gatesPassed.has(l.id));
}
