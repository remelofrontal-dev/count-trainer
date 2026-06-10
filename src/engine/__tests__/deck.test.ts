import { describe, expect, test } from 'bun:test';
import { Shoe, buildDeck, buildShoe, mulberry32, shuffle } from '../deck';
import { RANKS, SUITS } from '../types';

describe('buildDeck', () => {
  test('ISC-12: returns exactly 52 cards', () => {
    expect(buildDeck()).toHaveLength(52);
  });

  test('ISC-13: 13 ranks × 4 suits, zero duplicates', () => {
    const deck = buildDeck();
    const keys = new Set(deck.map((card) => `${card.rank}${card.suit}`));
    expect(keys.size).toBe(52);
    for (const suit of SUITS) {
      expect(deck.filter((card) => card.suit === suit)).toHaveLength(13);
    }
    for (const rank of RANKS) {
      expect(deck.filter((card) => card.rank === rank)).toHaveLength(4);
    }
  });
});

describe('buildShoe', () => {
  test('ISC-14: 52×n cards for n=1,2,6,8', () => {
    for (const n of [1, 2, 6, 8]) {
      expect(buildShoe(n)).toHaveLength(52 * n);
    }
  });

  test('rejects non-positive and non-integer deck counts', () => {
    expect(() => buildShoe(0)).toThrow();
    expect(() => buildShoe(2.5)).toThrow();
  });
});

describe('seeded shuffle', () => {
  test('ISC-15: same seed produces identical order', () => {
    const a = shuffle(buildShoe(6), 12345);
    const b = shuffle(buildShoe(6), 12345);
    expect(a).toEqual(b);
  });

  test('ISC-16: different seeds produce different orders', () => {
    const a = shuffle(buildShoe(6), 1);
    const b = shuffle(buildShoe(6), 2);
    expect(a).not.toEqual(b);
  });

  test('does not mutate input and preserves multiset', () => {
    const original = buildDeck();
    const snapshot = original.slice();
    const shuffled = shuffle(original, 7);
    expect(original).toEqual(snapshot);
    const sortKey = (cards: typeof original) =>
      cards.map((card) => `${card.rank}${card.suit}`).sort();
    expect(sortKey(shuffled)).toEqual(sortKey(original));
  });

  test('mulberry32 outputs are in [0,1) and deterministic', () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = r1();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(v).toBe(r2());
    }
  });
});

describe('Shoe', () => {
  test('ISC-17: draw decrements remaining; empty shoe throws', () => {
    const shoe = new Shoe(1, { seed: 9, penetration: 1 });
    expect(shoe.cardsRemaining).toBe(52);
    shoe.draw();
    expect(shoe.cardsRemaining).toBe(51);
    expect(shoe.cardsDealt).toBe(1);
    for (let i = 0; i < 51; i++) shoe.draw();
    expect(shoe.cardsRemaining).toBe(0);
    expect(() => shoe.draw()).toThrow('empty shoe');
  });

  test('ISC-18: cut card at penetration 0.75 — false before 75% dealt, true after', () => {
    const shoe = new Shoe(6, { seed: 3 }); // default penetration 0.75
    const cut = Math.floor(312 * 0.75); // 234
    for (let i = 0; i < cut - 1; i++) shoe.draw();
    expect(shoe.cutCardReached).toBe(false);
    shoe.draw();
    expect(shoe.cutCardReached).toBe(true);
  });

  test('ISC-19: decksRemaining is fractional (26 cards → 0.5)', () => {
    const shoe = new Shoe(1, { seed: 5, penetration: 1 });
    for (let i = 0; i < 26; i++) shoe.draw();
    expect(shoe.decksRemaining).toBe(0.5);
    const sixDeck = new Shoe(6, { seed: 5 });
    expect(sixDeck.decksRemaining).toBe(6);
  });

  test('rejects invalid penetration', () => {
    expect(() => new Shoe(6, { seed: 1, penetration: 0 })).toThrow();
    expect(() => new Shoe(6, { seed: 1, penetration: 1.1 })).toThrow();
  });
});
