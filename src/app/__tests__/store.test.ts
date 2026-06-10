import { describe, expect, test } from 'bun:test';
import { expectedAnswer } from '../drill';
import { levelById } from '../levels';
import { type AppDeps, createAppStore } from '../store';
import { InMemoryStorage } from '../storage';

function makeDeps(over: Partial<AppDeps> = {}): AppDeps {
  let clock = 1_000_000;
  return {
    storage: new InMemoryStorage(),
    now: () => (clock += 700), // each timestamp request advances 700ms → fast enough for gates
    today: () => '2026-06-10',
    nextSeed: () => 42,
    syncClient: null,
    ...over,
  };
}

async function completeDrill(store: ReturnType<typeof createAppStore>, perfect: boolean) {
  const state = store.getState();
  while (store.getState().drill !== null && store.getState().drill!.status === 'running') {
    const drill = store.getState().drill!;
    const right = expectedAnswer(drill, drill.index);
    state.answerCurrent(perfect ? right : right === 1 ? -1 : 1);
  }
}

describe('ISC-63: cold start → drill with no auth step', () => {
  test('first launch lands on onboarding; one action starts dealing; account prompt only at results', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    expect(store.getState().screen).toBe('onboarding');
    expect(store.getState().promptAccount).toBe(false);

    expect(store.getState().startDrill('card-values')).toBe(true);
    expect(store.getState().screen).toBe('drill');

    await completeDrill(store, true);
    expect(store.getState().screen).toBe('results');
    expect(store.getState().promptAccount).toBe(true); // account AFTER first result
    expect(store.getState().progress.hasSeenFirstResult).toBe(true);
  });

  test('returning user (has seen first result) cold-starts on home, no account prompt', async () => {
    const deps = makeDeps();
    const first = createAppStore(deps);
    await first.getState().init();
    first.getState().startDrill('card-values');
    await completeDrill(first, true);

    const second = createAppStore(deps); // same storage
    await second.getState().init();
    expect(second.getState().screen).toBe('home');
    expect(second.getState().promptAccount).toBe(false);
  });
});

describe('ISC-48: locked levels rejected at the store boundary', () => {
  test('starting a locked level returns false and stays put', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    expect(store.getState().startDrill('running-count-speed')).toBe(false);
    expect(store.getState().screen).toBe('onboarding');
    expect(store.getState().drill).toBeNull();
  });

  test('passing the L1 gate unlocks L2', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    store.getState().startDrill('card-values');
    await completeDrill(store, true); // 100% at 700ms/card → gate passed
    expect(store.getState().lastGateJustPassed).toBe(true);
    expect(store.getState().startDrill('running-count-slow')).toBe(true);
  });

  test('failing accuracy does not pass the gate', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    store.getState().startDrill('card-values');
    await completeDrill(store, false); // all wrong
    expect(store.getState().lastGateJustPassed).toBe(false);
    expect(store.getState().startDrill('running-count-slow')).toBe(false);
  });
});

describe('flow: one more round, home, persistence, sync queue', () => {
  test('oneMoreRound restarts the same level; goHome clears the prompt', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    store.getState().startDrill('card-values');
    await completeDrill(store, true);
    expect(store.getState().oneMoreRound()).toBe(true);
    expect(store.getState().screen).toBe('drill');
    expect(store.getState().drill!.level.id).toBe('card-values');
    await completeDrill(store, true);
    store.getState().goHome();
    expect(store.getState().screen).toBe('home');
    expect(store.getState().promptAccount).toBe(false);
  });

  test('oneMoreRound without a result is a no-op', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    expect(store.getState().oneMoreRound()).toBe(false);
  });

  test('finished sessions persist progress and enqueue a score event', async () => {
    const storage = new InMemoryStorage();
    const store = createAppStore(makeDeps({ storage }));
    await store.getState().init();
    store.getState().startDrill('card-values');
    await completeDrill(store, true);
    await new Promise((r) => setTimeout(r, 0)); // finishDrill persists in its async tail
    expect(await storage.getItem('count-trainer/progress/v1')).not.toBeNull();
    const queue = await storage.getItem('count-trainer/sync-queue/v1');
    expect(queue).not.toBeNull();
    expect(JSON.parse(queue as string)).toHaveLength(1);
  });

  test('with a sync client the queue drains after the session', async () => {
    const pushed: unknown[] = [];
    const store = createAppStore(
      makeDeps({
        syncClient: {
          pushScores: async (events) => {
            pushed.push(...events);
          },
        },
      }),
    );
    await store.getState().init();
    store.getState().startDrill('card-values');
    await completeDrill(store, true);
    await new Promise((r) => setTimeout(r, 0)); // let finishDrill's async tail run
    expect(pushed).toHaveLength(1);
  });

  test('peekCount flows into the session result score', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    store.getState().startDrill('card-values');
    store.getState().peekCount();
    await completeDrill(store, true);
    expect(store.getState().lastResult!.peeks).toBe(1);
  });

  test('tickClock past the cap finishes the session', async () => {
    let clock = 1_000_000;
    const store = createAppStore(makeDeps({ now: () => clock }));
    await store.getState().init();
    store.getState().startDrill('card-values');
    clock += 120_000;
    store.getState().tickClock();
    expect(store.getState().screen).toBe('results');
  });

  test('level defs sanity: store flow used the real L1', () => {
    expect(levelById('card-values').cardsPerSession).toBe(20);
  });
});
