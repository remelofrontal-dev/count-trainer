/**
 * Entitlement layer (brief §4.4 Track A + handoff §3 Beta All-Access).
 *
 * RevenueCat drops in behind this in Track B with zero feature-code changes.
 *
 * BETA_ALL_ACCESS is the launch switch: while true, every premium check resolves
 * unlocked for beta testers — but entitlement checks are STILL written at every
 * premium boundary (and premium features wear a "PRO" tag) so flipping this one
 * constant to false at launch restores the free/premium split with no other edits.
 */

import type { KVStorage } from './storage';

/** THE LAUNCH SWITCH. true = all premium unlocked for beta. false = real split. */
export const BETA_ALL_ACCESS = true;

/** Feature tier. Free = "blackjack school"; premium = "the counting academy". */
export type Tier = 'free' | 'premium';

export interface Entitlement {
  /** Whether the user has actually purchased premium (set by RevenueCat in Track B). */
  purchasedPremium: boolean;
  /** Dev Menu override to SIMULATE the free tier even during beta (test locked UX). */
  devForceFree: boolean;
}

export const FREE: Entitlement = { purchasedPremium: false, devForceFree: false };

const KEY = 'count-trainer/entitlement/v2';

/**
 * Effective premium access. devForceFree wins (so we can test the locked
 * experience); otherwise a real purchase OR the beta flag grants it.
 */
export function effectivePremium(e: Entitlement): boolean {
  if (e.devForceFree) return false;
  return e.purchasedPremium || BETA_ALL_ACCESS;
}

/** Can the user reach a feature of this tier right now? */
export function hasAccess(tier: Tier, e: Entitlement): boolean {
  return tier === 'free' || effectivePremium(e);
}

/**
 * Should a feature of this tier show a "PRO" tag? Premium-tier features wear it
 * during beta (so testers see where the paywall will sit) even though they're
 * currently reachable. Hidden once the user genuinely owns premium.
 */
export function showProTag(tier: Tier, e: Entitlement): boolean {
  return tier === 'premium' && !e.purchasedPremium;
}

export async function loadEntitlement(storage: KVStorage): Promise<Entitlement> {
  const raw = await storage.getItem(KEY);
  if (raw === null) return FREE;
  try {
    const parsed = JSON.parse(raw) as Partial<Entitlement>;
    return {
      purchasedPremium: parsed.purchasedPremium === true,
      devForceFree: parsed.devForceFree === true,
    };
  } catch {
    return FREE;
  }
}

export async function saveEntitlement(storage: KVStorage, ent: Entitlement): Promise<void> {
  await storage.setItem(KEY, JSON.stringify(ent));
}
