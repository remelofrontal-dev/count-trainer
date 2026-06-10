import { describe, expect, test } from 'bun:test';
import { InMemoryStorage } from '../storage';
import {
  type ScoreEvent,
  type SyncClient,
  drainQueue,
  enqueueScore,
  pendingScores,
  supabaseConfigFromEnv,
} from '../sync';

function event(score: number): ScoreEvent {
  return {
    levelId: 'card-values',
    score,
    accuracy: 0.95,
    avgMsPerCard: 1300,
    completedAtIso: '2026-06-10T19:30:00.000Z',
  };
}

describe('ISC-67: offline-first sync', () => {
  test('env config: null without credentials, parsed with them', () => {
    expect(supabaseConfigFromEnv({})).toBeNull();
    expect(supabaseConfigFromEnv({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull();
    expect(
      supabaseConfigFromEnv({ EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: '' }),
    ).toBeNull();
    expect(
      supabaseConfigFromEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon',
      }),
    ).toEqual({ url: 'https://x.supabase.co', anonKey: 'anon' });
  });

  test('events queue locally and drain is a no-op without a client (never throws)', async () => {
    const storage = new InMemoryStorage();
    await enqueueScore(storage, event(70));
    await enqueueScore(storage, event(75));
    expect(await pendingScores(storage)).toHaveLength(2);
    expect(await drainQueue(storage, null)).toBe(0);
    expect(await pendingScores(storage)).toHaveLength(2); // queue intact
  });

  test('successful drain pushes all events and clears the queue', async () => {
    const storage = new InMemoryStorage();
    await enqueueScore(storage, event(70));
    const pushed: ScoreEvent[][] = [];
    const client: SyncClient = {
      pushScores: async (events) => {
        pushed.push(events);
      },
    };
    expect(await drainQueue(storage, client)).toBe(1);
    expect(pushed[0]).toHaveLength(1);
    expect(await pendingScores(storage)).toHaveLength(0);
    expect(await drainQueue(storage, client)).toBe(0); // empty queue no-op
  });

  test('failed push retains the queue for retry and never throws', async () => {
    const storage = new InMemoryStorage();
    await enqueueScore(storage, event(70));
    const failing: SyncClient = {
      pushScores: async () => {
        throw new Error('network down');
      },
    };
    expect(await drainQueue(storage, failing)).toBe(0);
    expect(await pendingScores(storage)).toHaveLength(1);
  });
});
