/**
 * Offline-first score sync — drills never depend on the network (brief §4.3).
 * Events queue locally; the queue drains when a sync client exists (Supabase
 * project + env credentials arrive later — see ISA Decisions). Without
 * credentials this module is a safe no-op that never throws.
 */

import type { KVStorage } from './storage';

const QUEUE_KEY = 'count-trainer/sync-queue/v1';

export interface ScoreEvent {
  levelId: string;
  score: number;
  accuracy: number;
  avgMsPerCard: number;
  completedAtIso: string;
}

/** Implemented by the real Supabase client once credentials exist. */
export interface SyncClient {
  pushScores(events: ScoreEvent[]): Promise<void>;
}

/**
 * Reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.
 * Returns null until a Supabase project is configured — callers must treat
 * null as "queue locally, sync later".
 */
export function supabaseConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): { url: string; anonKey: string } | null {
  const url = env['EXPO_PUBLIC_SUPABASE_URL'];
  const anonKey = env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
  if (url === undefined || anonKey === undefined || url === '' || anonKey === '') {
    return null;
  }
  return { url, anonKey };
}

export async function enqueueScore(storage: KVStorage, event: ScoreEvent): Promise<void> {
  const raw = await storage.getItem(QUEUE_KEY);
  const queue: ScoreEvent[] = raw === null ? [] : (JSON.parse(raw) as ScoreEvent[]);
  queue.push(event);
  await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function pendingScores(storage: KVStorage): Promise<ScoreEvent[]> {
  const raw = await storage.getItem(QUEUE_KEY);
  return raw === null ? [] : (JSON.parse(raw) as ScoreEvent[]);
}

/**
 * Drain the queue through the client. Queue is cleared ONLY after a successful
 * push; on failure the queue is left intact for the next attempt. Never throws.
 */
export async function drainQueue(storage: KVStorage, client: SyncClient | null): Promise<number> {
  if (client === null) {
    return 0;
  }
  const queue = await pendingScores(storage);
  if (queue.length === 0) {
    return 0;
  }
  try {
    await client.pushScores(queue);
    await storage.removeItem(QUEUE_KEY);
    return queue.length;
  } catch {
    return 0; // offline-first: failure is silent here; queue persists for retry
  }
}
