import { describe, expect, test } from 'bun:test';
import {
  BETA_ALL_ACCESS,
  FREE,
  type Entitlement,
  effectivePremium,
  hasAccess,
  loadEntitlement,
  saveEntitlement,
  showProTag,
} from '../entitlement';
import { InMemoryStorage } from '../storage';

describe('effective premium + beta all-access', () => {
  test('free tier is always accessible regardless of entitlement', () => {
    expect(hasAccess('free', FREE)).toBe(true);
    expect(hasAccess('free', { purchasedPremium: false, devForceFree: true })).toBe(true);
  });

  test('during beta, premium resolves unlocked even without a purchase', () => {
    // This test documents the launch switch; it holds while BETA_ALL_ACCESS is true.
    if (BETA_ALL_ACCESS) {
      expect(effectivePremium(FREE)).toBe(true);
      expect(hasAccess('premium', FREE)).toBe(true);
    }
  });

  test('devForceFree overrides beta + purchase (lets us test the locked UX)', () => {
    const forced: Entitlement = { purchasedPremium: true, devForceFree: true };
    expect(effectivePremium(forced)).toBe(false);
    expect(hasAccess('premium', forced)).toBe(false);
  });

  test('a real purchase grants premium', () => {
    expect(effectivePremium({ purchasedPremium: true, devForceFree: false })).toBe(true);
  });

  test('PRO tag shows on premium features until genuinely purchased', () => {
    expect(showProTag('premium', FREE)).toBe(true); // beta: reachable but tagged
    expect(showProTag('premium', { purchasedPremium: true, devForceFree: false })).toBe(false);
    expect(showProTag('free', FREE)).toBe(false);
  });
});

describe('persistence', () => {
  test('defaults to free; round-trips; corrupt → free', async () => {
    const storage = new InMemoryStorage();
    expect(await loadEntitlement(storage)).toEqual(FREE);

    await saveEntitlement(storage, { purchasedPremium: true, devForceFree: false });
    expect(await loadEntitlement(storage)).toEqual({ purchasedPremium: true, devForceFree: false });

    await storage.setItem('count-trainer/entitlement/v2', 'not json');
    expect(await loadEntitlement(storage)).toEqual(FREE);
  });
});
