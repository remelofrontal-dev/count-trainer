import { describe, expect, test } from 'bun:test';
import { LESSONS } from '../lessons';
import { type AppDeps, createAppStore } from '../store';
import { localOnlyRegistry } from '../identity';
import { InMemoryStorage } from '../storage';

function makeDeps(over: Partial<AppDeps> = {}): AppDeps {
  return {
    storage: new InMemoryStorage(),
    now: () => 1_000_000,
    today: () => '2026-06-11',
    nextSeed: () => 1,
    syncClient: null,
    registry: localOnlyRegistry,
    ...over,
  };
}

describe('Level 0 lesson content', () => {
  test('covers the brief’s beginner topics with exactly one correct option each', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(6);
    for (const step of LESSONS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.teach.length).toBeGreaterThan(0);
      const correct = step.practice.options.filter((o) => o.correct);
      expect(correct).toHaveLength(1); // exactly one right answer
      expect(step.practice.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('the value lesson teaches face cards = 10', () => {
    const values = LESSONS.find((l) => /value/i.test(l.title))!;
    const king = values.practice.options.find((o) => o.label === '10')!;
    expect(king.correct).toBe(true);
  });
});

describe('Level 0 flow', () => {
  test("'new' placement routes into basics, not the path", async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await store.getState().submitName('Newbie');
    await store.getState().submitPlacement('new', null);
    expect(store.getState().screen).toBe('basics');
    expect(store.getState().progress.basicsComplete).toBe(false);
  });

  test('completing basics marks it done and returns home; persists', async () => {
    const storage = new InMemoryStorage();
    const store = createAppStore(makeDeps({ storage }));
    await store.getState().init();
    await store.getState().submitName('Newbie');
    await store.getState().submitPlacement('new', null);
    await store.getState().completeBasics();
    expect(store.getState().progress.basicsComplete).toBe(true);
    expect(store.getState().screen).toBe('home');

    const reopened = createAppStore(makeDeps({ storage }));
    await reopened.getState().init();
    expect(reopened.getState().progress.basicsComplete).toBe(true);
  });

  test("a returning beginner who finished basics lands on home, not basics", async () => {
    const storage = new InMemoryStorage();
    const first = createAppStore(makeDeps({ storage }));
    await first.getState().init();
    await first.getState().submitName('Newbie');
    await first.getState().submitPlacement('new', null);
    await first.getState().completeBasics();
    // re-take placement as 'new' — basics already done, so straight to home
    await first.getState().submitPlacement('new', null);
    expect(first.getState().screen).toBe('home');
  });

  test('enterBasics is reachable from the path any time', async () => {
    const store = createAppStore(makeDeps());
    await store.getState().init();
    await store.getState().submitName('X');
    await store.getState().submitPlacement('knows-play', { correct: 8, total: 8, avgMsPerCard: 1200 });
    store.getState().enterBasics();
    expect(store.getState().screen).toBe('basics');
  });
});
