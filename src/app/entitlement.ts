/**
 * Entitlement layer — a single `isPremium` flag behind a clean interface
 * (brief §4.4 Track A). RevenueCat drops in behind this in Track B with zero
 * feature-code changes. In Track A the flag is mock-controlled via the Dev Menu.
 */

import type { KVStorage } from './storage';

export interface Entitlement {
  isPremium: boolean;
}

export const FREE: Entitlement = { isPremium: false };
export const PREMIUM: Entitlement = { isPremium: true };

const KEY = 'count-trainer/entitlement/v1';

export async function loadEntitlement(storage: KVStorage): Promise<Entitlement> {
  const raw = await storage.getItem(KEY);
  if (raw === null) return FREE;
  try {
    const parsed = JSON.parse(raw) as { isPremium?: unknown };
    return { isPremium: parsed.isPremium === true };
  } catch {
    return FREE;
  }
}

export async function saveEntitlement(storage: KVStorage, ent: Entitlement): Promise<void> {
  await storage.setItem(KEY, JSON.stringify(ent));
}
