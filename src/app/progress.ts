/**
 * ProgressState — everything the app persists locally (offline-first).
 * Casino Ready (profile-level) = best session composite across the last 10 sessions.
 */

import { LEVELS, gateProgressPct, isLevelUnlocked, prereqLevel } from './levels';
import { EMPTY_STREAK, type StreakState, recordCompletion } from './streak';
import type { SessionResult } from './drill';
import type { KVStorage } from './storage';

const STORAGE_KEY = 'count-trainer/progress/v1';
const ROLLING_WINDOW = 10;

export interface LevelProgress {
  bestAccuracy: number;
  bestAvgMsPerCard: number | null;
  gatePassed: boolean;
  sessionsCompleted: number;
}

export interface ProgressState {
  version: 1;
  levels: Record<string, LevelProgress>;
  streak: StreakState;
  casinoReady: number;
  recentScores: number[];
  totalSessions: number;
  /** Set after the first Results screen — account creation is prompted then, never before. */
  hasSeenFirstResult: boolean;
  /** Levels cleared by the Placement Check — unlock the path but are NOT "Mastered". */
  testedOut: string[];
  /** True once placement onboarding has run (gates the placement flow). */
  placed: boolean;
  /** Casino Ready never drops below this placement-seeded floor (a hook, not a punishment). */
  seededFloor: number;
  /** Level 0 Blackjack Basics lessons completed. */
  basicsComplete: boolean;
  /** Advisory gates: level ids whose soft pre-entry note has already been shown. */
  advisoryNotesShown: string[];
  /** Beta experiment: count of drills started on a not-yet-ready level. */
  skipAheads: number;
  /** Progressive jargon: times each term has been shown (collapses full→short at ~10). */
  jargonSeen: Record<string, number>;
  /** Play-mode first-entry briefing has been shown. */
  playBriefingSeen: boolean;
}

export function emptyProgress(): ProgressState {
  const levels: Record<string, LevelProgress> = {};
  for (const level of LEVELS) {
    levels[level.id] = {
      bestAccuracy: 0,
      bestAvgMsPerCard: null,
      gatePassed: false,
      sessionsCompleted: 0,
    };
  }
  return {
    version: 1,
    levels,
    streak: EMPTY_STREAK,
    casinoReady: 0,
    recentScores: [],
    totalSessions: 0,
    hasSeenFirstResult: false,
    testedOut: [],
    placed: false,
    seededFloor: 0,
    basicsComplete: false,
    advisoryNotesShown: [],
    skipAheads: 0,
    jargonSeen: {},
    playBriefingSeen: false,
  };
}

/** Levels the user has truly MASTERED (passed the gate by playing). */
export function gatesPassed(progress: ProgressState): Set<string> {
  return new Set(
    Object.entries(progress.levels)
      .filter(([, p]) => p.gatePassed)
      .map(([id]) => id),
  );
}

/**
 * Levels that count as cleared for UNLOCK purposes — mastered OR tested out.
 * "Tested out" opens the path forward without claiming mastery.
 */
export function clearedLevels(progress: ProgressState): Set<string> {
  const set = gatesPassed(progress);
  for (const id of progress.testedOut) set.add(id);
  return set;
}

/** Advisory-gate readiness signal for a level node. */
export type LevelSignal = 'mastered' | 'tested-out' | 'recommended' | 'ready' | 'not-ready';

/** The first un-cleared, ready level by order — the "Recommended next". */
export function recommendedLevelId(progress: ProgressState): string | null {
  const cleared = clearedLevels(progress);
  const mastered = gatesPassed(progress);
  for (const l of LEVELS) {
    if (!mastered.has(l.id) && !progress.testedOut.includes(l.id) && isLevelUnlocked(l.id, cleared)) {
      return l.id;
    }
  }
  return null;
}

export function levelSignal(levelId: string, progress: ProgressState): LevelSignal {
  if (gatesPassed(progress).has(levelId)) return 'mastered';
  if (progress.testedOut.includes(levelId)) return 'tested-out';
  if (!isLevelUnlocked(levelId, clearedLevels(progress))) return 'not-ready';
  return recommendedLevelId(progress) === levelId ? 'recommended' : 'ready';
}

/** "% there" toward being ready — progress on the prerequisite level's gate. */
export function notReadyPct(levelId: string, progress: ProgressState): number {
  const prereq = prereqLevel(levelId);
  if (prereq === undefined) return 0;
  const lp = progress.levels[prereq.id];
  return gateProgressPct(prereq.id, lp?.bestAccuracy ?? 0, lp?.bestAvgMsPerCard ?? null);
}

/** Mark the soft pre-entry note as shown for a level (fires once, ever). */
export function markNoteShown(progress: ProgressState, levelId: string): ProgressState {
  if (progress.advisoryNotesShown.includes(levelId)) return progress;
  return { ...progress, advisoryNotesShown: [...progress.advisoryNotesShown, levelId] };
}

/** Apply a Placement Check outcome: record tested-out levels + seed Casino Ready. */
export function applyPlacement(
  progress: ProgressState,
  outcome: { testedOut: string[]; seededCasinoReady: number },
): ProgressState {
  return {
    ...progress,
    placed: true,
    testedOut: [...new Set([...progress.testedOut, ...outcome.testedOut])],
    casinoReady: Math.max(progress.casinoReady, outcome.seededCasinoReady),
    seededFloor: Math.max(progress.seededFloor, outcome.seededCasinoReady),
  };
}

/** Fold a finished session into progress. `gateJustPassed` drives the gate-unlock celebration. */
export function recordSession(
  progress: ProgressState,
  result: SessionResult,
  gatePassedNow: boolean,
  day: string,
): { next: ProgressState; gateJustPassed: boolean } {
  const prior = progress.levels[result.levelId];
  if (prior === undefined) {
    throw new Error(`Unknown level in session result: ${result.levelId}`);
  }
  const gateJustPassed = gatePassedNow && !prior.gatePassed;
  const levelNext: LevelProgress = {
    bestAccuracy: Math.max(prior.bestAccuracy, result.accuracy),
    bestAvgMsPerCard:
      prior.bestAvgMsPerCard === null
        ? result.avgMsPerCard
        : Math.min(prior.bestAvgMsPerCard, result.avgMsPerCard),
    gatePassed: prior.gatePassed || gatePassedNow,
    sessionsCompleted: prior.sessionsCompleted + 1,
  };
  const recentScores = [...progress.recentScores, result.score].slice(-ROLLING_WINDOW);
  return {
    next: {
      ...progress,
      levels: { ...progress.levels, [result.levelId]: levelNext },
      streak: recordCompletion(progress.streak, day),
      casinoReady: Math.max(...recentScores, progress.seededFloor),
      recentScores,
      totalSessions: progress.totalSessions + 1,
    },
    gateJustPassed,
  };
}

export function serialize(progress: ProgressState): string {
  return JSON.stringify(progress);
}

export function deserialize(raw: string): ProgressState {
  const parsed = JSON.parse(raw) as unknown; // throws on malformed JSON — caller handles
  if (typeof parsed !== 'object' || parsed === null || (parsed as { version?: unknown }).version !== 1) {
    throw new Error('Unsupported or corrupt progress payload');
  }
  // Merge over empty state so newly added levels get defaults.
  const base = emptyProgress();
  const state = parsed as ProgressState;
  return { ...base, ...state, levels: { ...base.levels, ...state.levels } };
}

/**
 * Never throws: a corrupted local blob must not brick app startup
 * (offline-first — this key IS the app state). Corrupt → fresh start.
 */
export async function loadProgress(storage: KVStorage): Promise<ProgressState> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (raw === null) return emptyProgress();
  try {
    return deserialize(raw);
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(storage: KVStorage, progress: ProgressState): Promise<void> {
  await storage.setItem(STORAGE_KEY, serialize(progress));
}
