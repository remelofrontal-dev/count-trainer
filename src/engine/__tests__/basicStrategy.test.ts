import { describe, expect, test } from 'bun:test';
import {
  type Action,
  H17_OVERRIDES,
  UPCARD_KEYS,
  type UpcardKey,
  basicStrategyAction,
  hardAction,
  pairAction,
  resolveAction,
  softAction,
  upcardKey,
} from '../basicStrategy';
import { DEFAULT_RULES, RANKS, type Rules } from '../types';
import { hand } from './helpers';

const S17: Rules = { dealerHitsSoft17: false, das: true, lateSurrender: true, decks: 6 };
const H17: Rules = { ...S17, dealerHitsSoft17: true };
const ACTIONS: Action[] = ['H', 'S', 'D', 'Ds', 'P', 'Rh', 'Rs', 'Rp'];

describe('upcard mapping', () => {
  test('collapses ten-values to T, keeps ace and pips', () => {
    expect(upcardKey('K')).toBe('T');
    expect(upcardKey('Q')).toBe('T');
    expect(upcardKey('J')).toBe('T');
    expect(upcardKey('10')).toBe('T');
    expect(upcardKey('A')).toBe('A');
    expect(upcardKey('7')).toBe('7');
  });
});

describe('ISC-32: exhaustive coverage — every cell defined under both rulesets', () => {
  for (const rules of [S17, H17]) {
    const label = rules.dealerHitsSoft17 ? 'H17' : 'S17';
    test(`${label}: all hard totals 4–21 × 10 upcards`, () => {
      for (let total = 4; total <= 21; total++) {
        for (const up of UPCARD_KEYS) {
          expect(ACTIONS).toContain(hardAction(total, up, rules));
        }
      }
    });
    test(`${label}: all soft totals 13–21 × 10 upcards`, () => {
      for (let total = 13; total <= 21; total++) {
        for (const up of UPCARD_KEYS) {
          expect(ACTIONS).toContain(softAction(total, up, rules));
        }
      }
    });
    test(`${label}: all pair ranks × 10 upcards`, () => {
      for (const pairKey of UPCARD_KEYS) {
        for (const up of UPCARD_KEYS) {
          expect(ACTIONS).toContain(pairAction(pairKey, up, rules));
        }
      }
    });
    test(`${label}: every two-card hand vs every upcard routes without throwing`, () => {
      for (const r1 of RANKS) {
        for (const r2 of RANKS) {
          for (const up of RANKS) {
            expect(ACTIONS).toContain(basicStrategyAction(hand(r1, r2), up, rules));
          }
        }
      }
    });
  }
});

describe('ISC-33: H17/S17 divergence is exactly the documented set', () => {
  test('diff-enumeration over the full table domain', () => {
    const diffs: string[] = [];
    for (let total = 4; total <= 21; total++) {
      for (const up of UPCARD_KEYS) {
        if (hardAction(total, up, S17) !== hardAction(total, up, H17)) {
          diffs.push(`hard:${total}:${up}`);
        }
      }
    }
    for (let total = 13; total <= 21; total++) {
      for (const up of UPCARD_KEYS) {
        if (softAction(total, up, S17) !== softAction(total, up, H17)) {
          diffs.push(`soft:${total}:${up}`);
        }
      }
    }
    for (const pairKey of UPCARD_KEYS) {
      for (const up of UPCARD_KEYS) {
        if (pairAction(pairKey, up, S17) !== pairAction(pairKey, up, H17)) {
          diffs.push(`pair:${pairKey}:${up}`);
        }
      }
    }
    const expected = H17_OVERRIDES.map((o) => `${o.table}:${o.row}:${o.up}`).sort();
    expect(diffs.sort()).toEqual(expected);
    expect(expected).toEqual(
      ['hard:11:A', 'hard:15:A', 'hard:17:A', 'soft:18:2', 'soft:19:6', 'pair:8:A'].sort(),
    );
  });
});

describe('ISC-34: hard-total spot checks', () => {
  test('canonical cells', () => {
    expect(basicStrategyAction(hand('10', '2'), '2', H17)).toBe('H'); // 12 vs 2
    expect(basicStrategyAction(hand('10', '2'), '4', H17)).toBe('S'); // 12 vs 4
    expect(basicStrategyAction(hand('10', '6'), 'K', H17)).toBe('Rh'); // 16 vs 10, surrender offered
    expect(basicStrategyAction(hand('10', '6'), 'K', { ...H17, lateSurrender: false })).toBe('H');
    expect(basicStrategyAction(hand('5', '4'), '3', H17)).toBe('D'); // 9 vs 3
    expect(basicStrategyAction(hand('6', '5'), '6', H17)).toBe('D'); // 11 vs 6
    expect(basicStrategyAction(hand('6', '5'), 'A', H17)).toBe('D'); // 11 vs A — H17
    expect(basicStrategyAction(hand('6', '5'), 'A', S17)).toBe('H'); // 11 vs A — S17
    expect(basicStrategyAction(hand('10', '7'), 'A', H17)).toBe('Rs'); // 17 vs A — H17
    expect(basicStrategyAction(hand('10', '7'), 'A', { ...H17, lateSurrender: false })).toBe('S');
  });

  test('hard 15 vs 10 surrenders; 15 vs A only under H17', () => {
    expect(basicStrategyAction(hand('10', '5'), 'K', S17)).toBe('Rh');
    expect(basicStrategyAction(hand('10', '5'), 'A', S17)).toBe('H');
    expect(basicStrategyAction(hand('10', '5'), 'A', H17)).toBe('Rh');
  });
});

describe('ISC-35: soft-total spot checks', () => {
  test('A7 (soft 18) cells', () => {
    expect(basicStrategyAction(hand('A', '7'), '9', H17)).toBe('H');
    expect(basicStrategyAction(hand('A', '7'), '3', H17)).toBe('Ds');
    expect(basicStrategyAction(hand('A', '7'), '2', S17)).toBe('S');
    expect(basicStrategyAction(hand('A', '7'), '2', H17)).toBe('Ds');
    expect(basicStrategyAction(hand('A', '7'), '7', H17)).toBe('S');
  });

  test('A8 (soft 19) vs 6: S in S17, Ds in H17', () => {
    expect(basicStrategyAction(hand('A', '8'), '6', S17)).toBe('S');
    expect(basicStrategyAction(hand('A', '8'), '6', H17)).toBe('Ds');
  });

  test('multi-card soft hands route to soft table (A,2,4 = soft 17 vs 3 → D)', () => {
    expect(basicStrategyAction(hand('A', '2', '4'), '3', H17)).toBe('D');
  });
});

describe('ISC-36: pair spot checks', () => {
  test('8,8 and A,A always split (S17); H17 8,8 vs A surrenders-else-splits', () => {
    for (const up of UPCARD_KEYS) {
      expect(pairAction('8', up, S17)).toBe('P');
      expect(pairAction('A', up, S17)).toBe('P');
      expect(pairAction('A', up, H17)).toBe('P');
    }
    expect(pairAction('8', 'A', H17)).toBe('Rp');
    expect(pairAction('8', 'A', { ...H17, lateSurrender: false })).toBe('P');
  });

  test('10,10 never splits', () => {
    for (const up of UPCARD_KEYS) {
      expect(basicStrategyAction(hand('K', 'K'), up === 'T' ? '10' : up, H17)).toBe('S');
    }
  });

  test('9,9 stands vs 7/10/A, splits vs 2–6 and 8–9', () => {
    for (const up of ['2', '3', '4', '5', '6', '8', '9'] as UpcardKey[]) {
      expect(pairAction('9', up, H17)).toBe('P');
    }
    for (const up of ['7', 'T', 'A'] as UpcardKey[]) {
      expect(pairAction('9', up, H17)).toBe('S');
    }
  });

  test('5,5 never splits — plays as hard 10', () => {
    for (const up of ['2', '3', '4', '5', '6', '7', '8', '9'] as UpcardKey[]) {
      expect(pairAction('5', up, H17)).toBe('D');
    }
    expect(pairAction('5', 'T', H17)).toBe('H');
    expect(pairAction('5', 'A', H17)).toBe('H');
  });

  test('no-DAS adjustments: 2,2/3,3 vs 2–3, 4,4 vs 5–6, 6,6 vs 2 become hits', () => {
    const noDas: Rules = { ...H17, das: false };
    expect(pairAction('2', '2', noDas)).toBe('H');
    expect(pairAction('3', '3', noDas)).toBe('H');
    expect(pairAction('4', '5', noDas)).toBe('H');
    expect(pairAction('6', '2', noDas)).toBe('H');
    // unaffected cells keep their DAS action
    expect(pairAction('2', '4', noDas)).toBe('P');
    expect(pairAction('6', '3', noDas)).toBe('P');
  });
});

describe('guards and resolution', () => {
  test('busted hands throw — no strategy action exists past 21', () => {
    expect(() => basicStrategyAction(hand('10', '9', '5'), '6', H17)).toThrow('busted');
    expect(() => hardAction(22, '6', H17)).toThrow();
    expect(() => softAction(12, '6', H17)).toThrow();
  });

  test('hard totals below 4 clamp to the all-hit row', () => {
    expect(hardAction(3, '6', H17)).toBe('H');
  });

  test('resolveAction degrades composites by availability', () => {
    expect(resolveAction('D', { canDouble: true, canSurrender: false })).toBe('D');
    expect(resolveAction('D', { canDouble: false, canSurrender: false })).toBe('H');
    expect(resolveAction('Ds', { canDouble: true, canSurrender: false })).toBe('D');
    expect(resolveAction('Ds', { canDouble: false, canSurrender: false })).toBe('S');
    expect(resolveAction('Rh', { canDouble: false, canSurrender: true })).toBe('R');
    expect(resolveAction('Rh', { canDouble: false, canSurrender: false })).toBe('H');
    expect(resolveAction('Rs', { canDouble: false, canSurrender: true })).toBe('R');
    expect(resolveAction('Rs', { canDouble: false, canSurrender: false })).toBe('S');
    expect(resolveAction('Rp', { canDouble: false, canSurrender: true })).toBe('R');
    expect(resolveAction('Rp', { canDouble: false, canSurrender: false })).toBe('P');
    expect(resolveAction('H', { canDouble: true, canSurrender: true })).toBe('H');
    expect(resolveAction('S', { canDouble: true, canSurrender: true })).toBe('S');
    expect(resolveAction('P', { canDouble: true, canSurrender: true })).toBe('P');
  });

  test('default rules are H17 — basicStrategyAction(DEFAULT_RULES) matches H17 cells', () => {
    expect(basicStrategyAction(hand('6', '5'), 'A', DEFAULT_RULES)).toBe('D');
  });
});
