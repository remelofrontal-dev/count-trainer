/**
 * App store — Zustand vanilla store with injected deps (storage, clock, seeds)
 * so the entire flow is unit-testable without React or a device.
 */

import { createStore } from 'zustand/vanilla';
import {
  type DrillState,
  type SessionResult,
  answer,
  createDrill,
  peek,
  sessionResult,
  tick,
} from './drill';
import { evaluateGate, isLevelUnlocked, levelById } from './levels';
import {
  type ProgressState,
  emptyProgress,
  gatesPassed,
  loadProgress,
  recordSession,
  saveProgress,
} from './progress';
import { localDay } from './streak';
import { type SyncClient, drainQueue, enqueueScore } from './sync';
import type { KVStorage } from './storage';

export type Screen = 'onboarding' | 'home' | 'drill' | 'results';

export interface AppDeps {
  storage: KVStorage;
  /** Clock — injectable for tests. */
  now: () => number;
  today: () => string;
  /** Seed source for drill shoes. */
  nextSeed: () => number;
  syncClient: SyncClient | null;
}

export const defaultDeps = (storage: KVStorage): AppDeps => ({
  storage,
  now: () => Date.now(),
  today: () => localDay(new Date()),
  nextSeed: () => Math.floor(Math.random() * 2 ** 31),
  syncClient: null,
});

export interface AppState {
  screen: Screen;
  progress: ProgressState;
  drill: DrillState | null;
  lastResult: SessionResult | null;
  lastGateJustPassed: boolean;
  /** Account creation is prompted only on/after the first Results screen (brief §4.4). */
  promptAccount: boolean;
  ready: boolean;

  init(): Promise<void>;
  startDrill(levelId: string): boolean;
  answerCurrent(value: number): void;
  peekCount(): void;
  tickClock(): void;
  finishDrill(): Promise<void>;
  oneMoreRound(): boolean;
  goHome(): void;
}

export function createAppStore(deps: AppDeps) {
  return createStore<AppState>()((set, get) => ({
    screen: 'onboarding',
    progress: emptyProgress(),
    drill: null,
    lastResult: null,
    lastGateJustPassed: false,
    promptAccount: false,
    ready: false,

    async init() {
      const progress = await loadProgress(deps.storage);
      set({
        progress,
        ready: true,
        // Returning users skip onboarding — dealing within 60s applies to first launch.
        screen: progress.hasSeenFirstResult ? 'home' : 'onboarding',
      });
      await drainQueue(deps.storage, deps.syncClient);
    },

    startDrill(levelId: string): boolean {
      const { progress } = get();
      if (!isLevelUnlocked(levelId, gatesPassed(progress))) {
        return false; // gates, not menus — locked levels cannot start
      }
      const drill = createDrill(levelById(levelId), deps.nextSeed(), deps.now());
      set({ drill, screen: 'drill', lastGateJustPassed: false });
      return true;
    },

    answerCurrent(value: number) {
      const { drill } = get();
      if (drill === null) return;
      const next = answer(drill, value, deps.now());
      set({ drill: next });
      if (next.status === 'finished') {
        void get().finishDrill();
      }
    },

    peekCount() {
      const { drill } = get();
      if (drill === null) return;
      set({ drill: peek(drill) });
    },

    tickClock() {
      const { drill } = get();
      if (drill === null || drill.status !== 'running') return;
      const next = tick(drill, deps.now());
      set({ drill: next });
      if (next.status === 'finished') {
        void get().finishDrill();
      }
    },

    async finishDrill() {
      const { drill, progress } = get();
      if (drill === null) return;
      const result = sessionResult(drill);
      const gate = evaluateGate(drill.level, result.accuracy, result.avgMsPerCard);
      const { next, gateJustPassed } = recordSession(progress, result, gate.passed, deps.today());
      const withFirstResult: ProgressState = { ...next, hasSeenFirstResult: true };
      set({
        progress: withFirstResult,
        drill: null,
        lastResult: result,
        lastGateJustPassed: gateJustPassed,
        screen: 'results',
        promptAccount: !progress.hasSeenFirstResult,
      });
      await saveProgress(deps.storage, withFirstResult);
      await enqueueScore(deps.storage, {
        levelId: result.levelId,
        score: result.score,
        accuracy: result.accuracy,
        avgMsPerCard: result.avgMsPerCard,
        completedAtIso: new Date(deps.now()).toISOString(),
      });
      await drainQueue(deps.storage, deps.syncClient);
    },

    oneMoreRound(): boolean {
      const { lastResult } = get();
      if (lastResult === null) return false;
      return get().startDrill(lastResult.levelId);
    },

    goHome() {
      set({ screen: 'home', promptAccount: false });
    },
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;
