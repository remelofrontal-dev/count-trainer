import { describe, expect, test } from 'bun:test';
import { expectedAnswer } from '../drill';
import { localOnlyRegistry } from '../identity';
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
    registry: localOnlyRegistry,
    ...over,
  };
}

type Store = ReturnType<typeof createAppStore>;

/** Run name gate + placement (+ skip Level 0) so the store lands on home, ready to drill. */
async function onboard(store: Store, persona: 'new' | 'knows-play' | 'counts' = 'new') {
  await store.getState().submitName('Remelo');
  await store.getState().submitPlacement(persona, null);
  if (store.getState().screen === 'basics') await store.getState().completeBasics();
}

async function completeDrill(store: Store, perfect: boolean) {
  const state = store.getState();
  while (store.getState().drill !== null && store.getState().drill!.status === 'running') {
    const drill = store.getState().drill!;
    const right = expectedAnswer(drill, drill.index); // normalized string, e.g. "1"/"0"/"-1"
    state.answerCurrent(perfect ? right : right === '1' ? '-1' : '1');
  }
}

describe('name gate + placement entry flow', () => {
  test('first launch lands on namegate; name → placement → home', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    expect(store.getState().screen).toBe('namegate');
    expect(store.getState().profile).toBeNull();

    expect(await store.getState().submitName('  ')).toBe(false); // empty rejected
    expect(store.getState().screen).toBe('namegate');

    expect(await store.getState().submitName('Remelo')).toBe(true);
    expect(store.getState().profile!.name).toBe('Remelo');
    expect(store.getState().screen).toBe('placement');

    await store.getState().submitPlacement('new', null);
    expect(store.getState().screen).toBe('basics'); // beginners go to Level 0 first
    expect(store.getState().progress.placed).toBe(true);
    await store.getState().completeBasics();
    expect(store.getState().screen).toBe('home');
  });

  test('the tester registry receives the name (founder roster)', async () => {
    const registered: string[] = [];
    const store = createAppStore(
      makeDeps({ registry: { register: async (p) => void registered.push(p.name) } }),
    );
    await store.getState().init();
    await store.getState().submitName('Dana');
    expect(registered).toEqual(['Dana']);
  });

  test('returning tester (named + placed) cold-starts on home', async () => {
    const deps = makeDeps();
    const first = createAppStore(deps);
    await first.getState().init();
    await onboard(first);

    const second = createAppStore(deps); // same storage
    await second.getState().init();
    expect(second.getState().screen).toBe('home');
    expect(second.getState().profile!.name).toBe('Remelo');
  });

  test("placement 'counts' tests out two levels and opens speed", async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await store.getState().submitName('Sharp');
    await store.getState().submitPlacement('counts', { correct: 8, total: 8, avgMsPerCard: 1100 });
    expect(store.getState().progress.testedOut).toEqual(['card-values', 'running-count-slow']);
    expect(store.getState().progress.casinoReady).toBe(55);
    expect(store.getState().startDrill('running-count-speed')).toBe(true); // unlocked via tested-out
  });
});

describe('ISC-114: advisory gates — guide, don\'t block', () => {
  test('advisory (default): a not-ready level IS startable, and counts as a skip-ahead', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await onboard(store);
    expect(store.getState().startDrill('running-count-speed')).toBe(true); // never blocked
    expect(store.getState().screen).toBe('drill');
    expect(store.getState().progress.skipAheads).toBe(1); // tracked for the beta experiment
  });

  test('blocking mode (dev override): a locked level is rejected again', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await onboard(store);
    store.getState().devSetBlockingGates(true);
    expect(store.getState().startDrill('running-count-speed')).toBe(false);
    expect(store.getState().screen).toBe('home');
  });

  test('passing the L1 gate unlocks L2 (recommended next)', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    await completeDrill(store, true); // 100% at 700ms/card → gate passed
    expect(store.getState().lastGateJustPassed).toBe(true);
  });

  test('failing accuracy does not pass the gate (still locked under blocking)', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    await completeDrill(store, false); // all wrong
    expect(store.getState().lastGateJustPassed).toBe(false);
    store.getState().devSetBlockingGates(true);
    expect(store.getState().startDrill('running-count-slow')).toBe(false);
  });
});

describe('flow: results, coach, one more round, persistence, sync', () => {
  test('results carry a coach insight; oneMoreRound restarts the level; goHome', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    await completeDrill(store, true);
    expect(store.getState().screen).toBe('results');
    expect(store.getState().lastInsight).not.toBeNull();
    expect(store.getState().lastInsight!.headline.length).toBeGreaterThan(0);
    expect(store.getState().oneMoreRound()).toBe(true);
    expect(store.getState().drill!.level.id).toBe('card-values');
    await completeDrill(store, true);
    store.getState().goHome();
    expect(store.getState().screen).toBe('home');
  });

  test('oneMoreRound without a result is a no-op', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await onboard(store);
    expect(store.getState().oneMoreRound()).toBe(false);
  });

  test('finished sessions persist progress and enqueue a score event', async () => {
    const storage = new InMemoryStorage();
    const store = createAppStore(makeDeps({ storage }));
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    await completeDrill(store, true);
    await new Promise((r) => setTimeout(r, 0));
    expect(await storage.getItem('count-trainer/progress/v1')).not.toBeNull();
    const queue = await storage.getItem('count-trainer/sync-queue/v1');
    expect(JSON.parse(queue as string)).toHaveLength(1);
  });

  test('with a sync client the queue drains after the session', async () => {
    const pushed: unknown[] = [];
    const store = createAppStore(
      makeDeps({ syncClient: { pushScores: async (events) => void pushed.push(...events) } }),
    );
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    await completeDrill(store, true);
    await new Promise((r) => setTimeout(r, 0));
    expect(pushed).toHaveLength(1);
  });

  test('peekCount flows into the session result score', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    store.getState().peekCount();
    await completeDrill(store, true);
    expect(store.getState().lastResult!.peeks).toBe(1);
  });

  test('tickClock past the cap finishes the session', async () => {
    let clock = 1_000_000;
    const store = createAppStore(makeDeps({ now: () => clock }));
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    clock += 120_000;
    store.getState().tickClock();
    expect(store.getState().screen).toBe('results');
  });

  test('ISC-70: answering one card then timing out does NOT pass the gate (Forge CRITICAL regression)', async () => {
    let clock = 1_000_000;
    const store = createAppStore(makeDeps({ now: () => clock }));
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    const drill = store.getState().drill!;
    store.getState().answerCurrent(expectedAnswer(drill, 0));
    clock += 120_000;
    store.getState().tickClock();
    expect(store.getState().screen).toBe('results');
    expect(store.getState().lastGateJustPassed).toBe(false); // gate not passed — the core assertion
    // and under blocking gates it would still be locked
    store.getState().devSetBlockingGates(true);
    expect(store.getState().startDrill('running-count-slow')).toBe(false);
  });

  test('init recovers from a corrupted progress blob instead of bricking', async () => {
    const storage = new InMemoryStorage();
    await storage.setItem('count-trainer/progress/v1', '{corrupt not json');
    const store = createAppStore(makeDeps({ storage }));
    await store.getState().init();
    expect(store.getState().ready).toBe(true);
    expect(store.getState().screen).toBe('namegate'); // no profile yet → name gate
  });

  test('synced score event carries the peek count', async () => {
    const pushed: { peeks: number }[] = [];
    const store = createAppStore(
      makeDeps({ syncClient: { pushScores: async (e) => void pushed.push(...(e as { peeks: number }[])) } }),
    );
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    store.getState().peekCount();
    await completeDrill(store, true);
    await new Promise((r) => setTimeout(r, 0));
    expect(pushed[0]!.peeks).toBe(1);
  });
});

describe('Developer Menu (mock entitlement + overrides)', () => {
  test('toggles purchased premium and force-free, persisting both', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    expect(store.getState().entitlement.purchasedPremium).toBe(false);
    await store.getState().devSetPremium(true);
    expect(store.getState().entitlement.purchasedPremium).toBe(true);
    await store.getState().devForceFree(true);
    expect(store.getState().entitlement.devForceFree).toBe(true);
  });

  test('forces Casino Ready (clamped 0–100) and sets streak', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await onboard(store);
    await store.getState().devSetCasinoReady(150);
    expect(store.getState().progress.casinoReady).toBe(100);
    await store.getState().devSetStreak(12);
    expect(store.getState().progress.streak.count).toBe(12);
  });

  test('resets progress back to placement', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await onboard(store);
    store.getState().startDrill('card-values');
    await completeDrill(store, true);
    await store.getState().devResetProgress();
    expect(store.getState().progress.totalSessions).toBe(0);
    expect(store.getState().progress.placed).toBe(false);
    expect(store.getState().screen).toBe('placement');
  });

  test('level defs sanity: store flow used the real L1', () => {
    expect(levelById('card-values').cardsPerSession).toBe(20);
  });
});
