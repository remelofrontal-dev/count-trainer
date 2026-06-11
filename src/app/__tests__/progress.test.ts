import { describe, expect, test } from 'bun:test';
import {
  deserialize,
  emptyProgress,
  gatesPassed,
  loadProgress,
  recordSession,
  saveProgress,
  serialize,
} from '../progress';
import { InMemoryStorage } from '../storage';
import type { SessionResult } from '../drill';

function result(over: Partial<SessionResult> = {}): SessionResult {
  return {
    levelId: 'card-values',
    accuracy: 0.96,
    avgMsPerCard: 1200,
    peeks: 0,
    score: 80,
    cardsAnswered: 20,
    misses: 1,
    ...over,
  };
}

describe('ISC-55: serialization round-trip', () => {
  test('serialize → deserialize is lossless', () => {
    const { next } = recordSession(emptyProgress(), result(), true, '2026-06-10');
    expect(deserialize(serialize(next))).toEqual(next);
  });

  test('unsupported version / corrupt payloads throw; missing levels get defaults', () => {
    expect(() => deserialize('{"version":2}')).toThrow('corrupt');
    expect(() => deserialize('null')).toThrow('corrupt'); // null no longer TypeErrors (Forge MAJOR)
    expect(() => deserialize('[]')).toThrow('corrupt');
    expect(() => deserialize('5')).toThrow('corrupt');
    expect(() => deserialize('{not json')).toThrow(); // malformed JSON still throws (caller catches)
    const sparse = { ...emptyProgress(), levels: {} };
    const revived = deserialize(JSON.stringify(sparse));
    expect(revived.levels['card-values']).toBeDefined();
  });

  test('Forge MAJOR: loadProgress never throws on a corrupt blob — falls back to empty', async () => {
    const storage = new InMemoryStorage();
    await storage.setItem('count-trainer/progress/v1', '{truncated');
    expect(await loadProgress(storage)).toEqual(emptyProgress());
    await storage.setItem('count-trainer/progress/v1', 'null');
    expect(await loadProgress(storage)).toEqual(emptyProgress());
  });
});

describe('ISC-56: storage adapters', () => {
  test('InMemory satisfies the interface; load/save round-trips; empty load gives defaults', async () => {
    const storage = new InMemoryStorage();
    expect(await loadProgress(storage)).toEqual(emptyProgress());
    const { next } = recordSession(emptyProgress(), result(), false, '2026-06-10');
    await saveProgress(storage, next);
    expect(await loadProgress(storage)).toEqual(next);
    await storage.removeItem('count-trainer/progress/v1');
    expect(await loadProgress(storage)).toEqual(emptyProgress());
  });
});

describe('gate + level progress folding', () => {
  test('gateJustPassed fires exactly once', () => {
    const first = recordSession(emptyProgress(), result(), true, '2026-06-10');
    expect(first.gateJustPassed).toBe(true);
    const second = recordSession(first.next, result(), true, '2026-06-11');
    expect(second.gateJustPassed).toBe(false);
    expect(gatesPassed(second.next).has('card-values')).toBe(true);
  });

  test('bests are monotonic; sessions and streak fold in', () => {
    const a = recordSession(emptyProgress(), result({ accuracy: 0.9, avgMsPerCard: 1500 }), false, '2026-06-10');
    const b = recordSession(a.next, result({ accuracy: 0.8, avgMsPerCard: 1100 }), false, '2026-06-11');
    const lp = b.next.levels['card-values']!;
    expect(lp.bestAccuracy).toBe(0.9);
    expect(lp.bestAvgMsPerCard).toBe(1100);
    expect(lp.sessionsCompleted).toBe(2);
    expect(b.next.totalSessions).toBe(2);
    expect(b.next.streak.count).toBe(2);
  });

  test('unknown level id throws', () => {
    expect(() => recordSession(emptyProgress(), result({ levelId: 'nope' }), false, '2026-06-10')).toThrow(
      'Unknown level',
    );
  });
});

describe('ISC-57: Casino Ready best-of-last-10', () => {
  test('tracks the best score within the rolling window and forgets older highs', () => {
    let progress = emptyProgress();
    progress = recordSession(progress, result({ score: 90 }), false, '2026-06-01').next;
    expect(progress.casinoReady).toBe(90);
    // 10 more sessions at 60 push the 90 out of the window
    for (let i = 0; i < 10; i++) {
      progress = recordSession(progress, result({ score: 60 }), false, `2026-06-0${(i % 8) + 2}`).next;
    }
    expect(progress.recentScores).toHaveLength(10);
    expect(progress.recentScores.every((s) => s === 60)).toBe(true);
    expect(progress.casinoReady).toBe(60);
  });
});
