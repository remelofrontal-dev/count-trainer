/**
 * App store — Zustand vanilla store with injected deps (storage, clock, seeds)
 * so the entire flow is unit-testable without React or a device.
 */

import { createStore } from 'zustand/vanilla';
import { coachInsight, type Insight } from './coach';
import {
  type DrillState,
  type SessionResult,
  answer,
  createDrill,
  peek,
  sessionResult,
  tick,
} from './drill';
import { type Entitlement, FREE, loadEntitlement, saveEntitlement } from './entitlement';
import {
  type TesterProfile,
  type TesterRegistry,
  loadProfile,
  localOnlyRegistry,
  normalizeName,
  saveProfile,
} from './identity';
import { LEVELS, evaluateGate, isLevelUnlocked, levelById } from './levels';

const LEVEL_IDS = LEVELS.map((l) => l.id);
import { type Persona, evaluatePlacement } from './placement';
import {
  type ProgressState,
  applyPlacement,
  clearedLevels,
  emptyProgress,
  loadProgress,
  recordSession,
  saveProgress,
} from './progress';
import { EMPTY_RECORD, type PlayRecord, foldRecord } from './play';
import { EMPTY_STREAK, localDay } from './streak';
import { type SyncClient, drainQueue, enqueueScore } from './sync';
import type { KVStorage } from './storage';
import { Shoe } from '../engine/deck';
import {
  type PlayerAction,
  type TableConfig,
  type TableState,
  DEFAULT_TABLE,
  act as tableAct,
  startRound,
  tableRunningCount,
} from '../engine/table';

export type Screen = 'namegate' | 'placement' | 'home' | 'modes' | 'drill' | 'results' | 'play';

export const PLAY_BET = 100;

export interface AppDeps {
  storage: KVStorage;
  /** Clock — injectable for tests. */
  now: () => number;
  today: () => string;
  /** Seed source for drill shoes. */
  nextSeed: () => number;
  syncClient: SyncClient | null;
  /** Tester roster sink (founder tracking). Local-only by default. */
  registry: TesterRegistry;
}

export const defaultDeps = (storage: KVStorage): AppDeps => ({
  storage,
  now: () => Date.now(),
  today: () => localDay(new Date()),
  nextSeed: () => Math.floor(Math.random() * 2 ** 31),
  syncClient: null,
  registry: localOnlyRegistry,
});

export interface CheckStats {
  correct: number;
  total: number;
  avgMsPerCard: number;
}

export interface AppState {
  screen: Screen;
  profile: TesterProfile | null;
  entitlement: Entitlement;
  progress: ProgressState;
  drill: DrillState | null;
  lastResult: SessionResult | null;
  lastInsight: Insight | null;
  lastGateJustPassed: boolean;
  ready: boolean;

  // Play mode (full blackjack table)
  playConfig: TableConfig;
  play: TableState | null;
  playShoe: Shoe | null;
  /** Running count accumulated from completed rounds this shoe (count carries). */
  playCount: number;
  playRecord: PlayRecord;
  playCoach: boolean;

  init(): Promise<void>;
  goModes(): void;
  enterPlay(): void;
  exitPlay(): void;
  setPlayConfig(partial: Partial<TableConfig>): void;
  togglePlayCoach(): void;
  dealRound(): void;
  playAct(action: PlayerAction): void;
  submitName(name: string): Promise<boolean>;
  submitPlacement(persona: Persona, check: CheckStats | null): Promise<void>;
  startDrill(levelId: string): boolean;
  answerCurrent(value: number): void;
  peekCount(): void;
  tickClock(): void;
  finishDrill(): Promise<void>;
  oneMoreRound(): boolean;
  goHome(): void;

  // Developer Menu (debug only) — mock entitlement + progress overrides.
  devSetPremium(on: boolean): Promise<void>;
  devForceFree(on: boolean): Promise<void>;
  devResetProgress(): Promise<void>;
  devSetCasinoReady(n: number): Promise<void>;
  devSetStreak(n: number): Promise<void>;
  devUnlockAll(): Promise<void>;
}

/** First screen for a given load state: name → placement → home. */
function entryScreen(profile: TesterProfile | null, progress: ProgressState): Screen {
  if (profile === null) return 'namegate';
  if (!progress.placed) return 'placement';
  return 'home';
}

export function createAppStore(deps: AppDeps) {
  return createStore<AppState>()((set, get) => ({
    screen: 'namegate',
    profile: null,
    entitlement: FREE,
    progress: emptyProgress(),
    drill: null,
    lastResult: null,
    lastInsight: null,
    lastGateJustPassed: false,
    ready: false,

    playConfig: DEFAULT_TABLE,
    play: null,
    playShoe: null,
    playCount: 0,
    playRecord: EMPTY_RECORD,
    playCoach: true,

    async init() {
      // Best-effort: a corrupt local store must never block startup.
      let progress = emptyProgress();
      let profile: TesterProfile | null = null;
      let entitlement: Entitlement = FREE;
      try {
        [progress, profile, entitlement] = await Promise.all([
          loadProgress(deps.storage),
          loadProfile(deps.storage),
          loadEntitlement(deps.storage),
        ]);
      } catch {
        progress = emptyProgress();
      }
      set({ progress, profile, entitlement, ready: true, screen: entryScreen(profile, progress) });
      try {
        await drainQueue(deps.storage, deps.syncClient);
      } catch {
        /* offline-first: sync is never load-bearing for startup */
      }
    },

    async submitName(name: string): Promise<boolean> {
      const clean = normalizeName(name);
      if (clean.length < 1) return false; // gate stays meaningful — no empty names
      const profile: TesterProfile = { name: clean, joinedAtIso: new Date(deps.now()).toISOString() };
      await saveProfile(deps.storage, profile);
      void deps.registry.register(profile); // best-effort roster delivery
      set({ profile, screen: 'placement' });
      return true;
    },

    async submitPlacement(persona: Persona, check: CheckStats | null): Promise<void> {
      const outcome = evaluatePlacement(persona, check);
      const next = applyPlacement(get().progress, outcome);
      set({ progress: next, screen: 'home' });
      await saveProgress(deps.storage, next);
    },

    startDrill(levelId: string): boolean {
      const { progress } = get();
      if (!isLevelUnlocked(levelId, clearedLevels(progress))) {
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
      const gate = evaluateGate(drill.level, result.accuracy, result.avgMsPerCard, result.cardsAnswered);
      const { next, gateJustPassed } = recordSession(progress, result, gate.passed, deps.today());
      const withFirstResult: ProgressState = { ...next, hasSeenFirstResult: true };
      const insight = coachInsight({
        answers: drill.answers,
        accuracy: result.accuracy,
        avgMsPerCard: result.avgMsPerCard,
        peeks: result.peeks,
        gatePassed: gate.passed,
      });
      set({
        progress: withFirstResult,
        drill: null,
        lastResult: result,
        lastInsight: insight,
        lastGateJustPassed: gateJustPassed,
        screen: 'results',
      });
      await saveProgress(deps.storage, withFirstResult);
      await enqueueScore(deps.storage, {
        levelId: result.levelId,
        score: result.score,
        accuracy: result.accuracy,
        avgMsPerCard: result.avgMsPerCard,
        peeks: result.peeks,
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
      set({ screen: 'home' });
    },

    goModes() {
      set({ screen: 'modes' });
    },

    enterPlay() {
      set({ screen: 'play' });
    },

    exitPlay() {
      set({ screen: 'home' });
    },

    setPlayConfig(partial: Partial<TableConfig>) {
      // A config change starts a fresh shoe (and resets the carried count).
      set({
        playConfig: { ...get().playConfig, ...partial },
        playShoe: null,
        play: null,
        playCount: 0,
      });
    },

    togglePlayCoach() {
      set({ playCoach: !get().playCoach });
    },

    dealRound() {
      const { playConfig } = get();
      let shoe = get().playShoe;
      let playCount = get().playCount;
      // Fresh shoe at start or once the cut card is reached — count resets with it.
      if (shoe === null || shoe.cutCardReached) {
        shoe = new Shoe(playConfig.decks, { seed: deps.nextSeed() });
        playCount = 0;
      }
      let state = startRound(playConfig, shoe, PLAY_BET, deps.nextSeed());
      let record = get().playRecord;
      // If the round resolved immediately (dealer natural), fold it now.
      if (state.phase === 'settlement') {
        record = foldRecord(record, state);
        playCount += tableRunningCount(state);
      }
      set({ play: state, playShoe: shoe, playCount, playRecord: record });
    },

    playAct(action: PlayerAction) {
      const state = get().play;
      if (state === null || state.phase !== 'player') return;
      const next = tableAct(state, action);
      let { playCount, playRecord } = get();
      if (next.phase === 'settlement') {
        playRecord = foldRecord(playRecord, next);
        playCount += tableRunningCount(next);
      }
      set({ play: next, playCount, playRecord });
    },

    async devSetPremium(on: boolean) {
      const entitlement: Entitlement = { ...get().entitlement, purchasedPremium: on };
      await saveEntitlement(deps.storage, entitlement);
      set({ entitlement });
    },

    async devForceFree(on: boolean) {
      const entitlement: Entitlement = { ...get().entitlement, devForceFree: on };
      await saveEntitlement(deps.storage, entitlement);
      set({ entitlement });
    },

    async devResetProgress() {
      const fresh = emptyProgress();
      await saveProgress(deps.storage, fresh);
      set({ progress: fresh, screen: 'placement', lastResult: null, lastInsight: null });
    },

    async devSetCasinoReady(n: number) {
      const clamped = Math.max(0, Math.min(100, Math.round(n)));
      const next: ProgressState = { ...get().progress, casinoReady: clamped, seededFloor: clamped };
      await saveProgress(deps.storage, next);
      set({ progress: next });
    },

    async devSetStreak(n: number) {
      const count = Math.max(0, Math.round(n));
      const streak = count === 0 ? EMPTY_STREAK : { count, lastDay: deps.today() };
      const next: ProgressState = { ...get().progress, streak };
      await saveProgress(deps.storage, next);
      set({ progress: next });
    },

    async devUnlockAll() {
      const testedOut = LEVEL_IDS.slice();
      const next: ProgressState = { ...get().progress, placed: true, testedOut };
      await saveProgress(deps.storage, next);
      set({ progress: next });
    },
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;
