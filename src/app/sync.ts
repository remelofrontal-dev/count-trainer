/**
 * Offline-first score sync — drills never depend on the network (brief §4.3).
 * Events queue locally; the queue drains when a sync client exists (Supabase
 * project + env credentials arrive later — see ISA Decisions). Without
 * credentials this module is a safe no-op that never throws.
 */

import type { KVStorage } from './storage';

const QUEUE_KEY = 'count-trainer/sync-queue/v1';
/** Cap local queue growth when no sync client ever appears (Forge MAJOR finding). */
export const MAX_QUEUE = 500;

export interface ScoreEvent {
  levelId: string;
  score: number;
  accuracy: number;
  avgMsPerCard: number;
  /** Peek count — honesty signal; the server needs it to recompute/validate scores. */
  peeks: number;
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

/** Read the queue, tolerating a corrupted blob (returns [] rather than throwing). */
export async function pendingScores(storage: KVStorage): Promise<ScoreEvent[]> {
  const raw = await storage.getItem(QUEUE_KEY);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ScoreEvent[]) : [];
  } catch {
    return []; // poisoned queue must never wedge sync or block finishDrill
  }
}

export async function enqueueScore(storage: KVStorage, event: ScoreEvent): Promise<void> {
  const queue = await pendingScores(storage);
  queue.push(event);
  // Drop oldest beyond the cap — unbounded growth when no client ever appears.
  const capped = queue.length > MAX_QUEUE ? queue.slice(queue.length - MAX_QUEUE) : queue;
  await storage.setItem(QUEUE_KEY, JSON.stringify(capped));
}

/**
 * Drain the queue through the client. Queue is cleared ONLY after a successful
 * push; on failure the queue is left intact for the next attempt. Never throws —
 * pendingScores tolerates corruption and the push is guarded.
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
