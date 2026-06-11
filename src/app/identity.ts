/**
 * Tester identity — a name gate before first play (founder-directed, tester build).
 *
 * Deviation note: the brief's §4.2 rule is "no forms before cards / account after
 * first result." For the tester round the founder wants a name captured up front to
 * count unique testers, so this single-field gate runs before the first deal. For
 * public launch this reverts toward the post-first-result account model.
 *
 * `TesterRegistry` is the seam: locally it just remembers the name; a remote
 * collector (Formspree / Worker / Supabase) drops in behind the same interface so
 * the founder can see the roster, without the app code changing.
 */

import type { KVStorage } from './storage';

export interface TesterProfile {
  name: string;
  /** ISO timestamp of first launch — for "how many joined" counting. */
  joinedAtIso: string;
}

/** Sink for tester registrations. Local-only by default; remote impl added later. */
export interface TesterRegistry {
  register(profile: TesterProfile): Promise<void>;
}

/** No-op registry — used until a collector endpoint is configured. Never throws. */
export const localOnlyRegistry: TesterRegistry = {
  register: async () => {},
};

/**
 * POSTs registrations to a collector URL (e.g. a Formspree form or a Worker).
 * Offline-first: a failed POST is swallowed; the local profile is the source of truth.
 */
export function httpRegistry(endpoint: string): TesterRegistry {
  return {
    register: async (profile) => {
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        });
      } catch {
        /* offline-first: roster delivery is best-effort, never blocks play */
      }
    },
  };
}

const PROFILE_KEY = 'count-trainer/tester/v1';

/** Names are trimmed and capped; empty/whitespace is rejected by the caller (gate stays meaningful). */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 40);
}

export function isValidName(raw: string): boolean {
  return normalizeName(raw).length >= 1;
}

export async function loadProfile(storage: KVStorage): Promise<TesterProfile | null> {
  const raw = await storage.getItem(PROFILE_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as TesterProfile).name === 'string' &&
      (parsed as TesterProfile).name.length > 0
    ) {
      return parsed as TesterProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveProfile(storage: KVStorage, profile: TesterProfile): Promise<void> {
  await storage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
