/**
 * ProgressState — everything the app persists locally (offline-first).
 * Casino Ready (profile-level) = best session composite across the last 10 sessions.
 */

import { LEVELS } from './levels';
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
  };
}

export function gatesPassed(progress: ProgressState): Set<string> {
  return new Set(
    Object.entries(progress.levels)
      .filter(([, p]) => p.gatePassed)
      .map(([id]) => id),
  );
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
      casinoReady: Math.max(...recentScores, 0),
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
  const parsed = JSON.parse(raw) as ProgressState;
  if (parsed.version !== 1) {
    throw new Error(`Unsupported progress version: ${String(parsed.version)}`);
  }
  // Merge over empty state so newly added levels get defaults.
  const base = emptyProgress();
  return { ...base, ...parsed, levels: { ...base.levels, ...parsed.levels } };
}

export async function loadProgress(storage: KVStorage): Promise<ProgressState> {
  const raw = await storage.getItem(STORAGE_KEY);
  return raw === null ? emptyProgress() : deserialize(raw);
}

export async function saveProgress(storage: KVStorage, progress: ProgressState): Promise<void> {
  await storage.setItem(STORAGE_KEY, serialize(progress));
}
