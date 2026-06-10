import { describe, expect, test } from 'bun:test';
import { handValue, isBlackjack, isBust, isPair } from '../hand';
import { DEFAULT_RULES, rankValue, isTenValue } from '../types';
import { c, hand } from './helpers';

describe('rank values', () => {
  test('faces are 10, ace is 1 (pre-promotion), pips are face value', () => {
    expect(rankValue('K')).toBe(10);
    expect(rankValue('Q')).toBe(10);
    expect(rankValue('J')).toBe(10);
    expect(rankValue('10')).toBe(10);
    expect(rankValue('A')).toBe(1);
    expect(rankValue('7')).toBe(7);
    expect(isTenValue('K')).toBe(true);
    expect(isTenValue('9')).toBe(false);
  });

  test('default ruleset matches ISA decisions (6D, H17, DAS, LS)', () => {
    expect(DEFAULT_RULES).toEqual({ dealerHitsSoft17: true, das: true, lateSurrender: true, decks: 6 });
  });
});

describe('hand totals', () => {
  test('ISC-28: hard total 10+9=19; soft total A+6 = soft 17', () => {
    expect(handValue(hand('10', '9'))).toEqual({ total: 19, isSoft: false });
    expect(handValue(hand('A', '6'))).toEqual({ total: 17, isSoft: true });
  });

  test('ISC-29: multi-ace hands — at most one ace counts as 11', () => {
    expect(handValue(hand('A', 'A'))).toEqual({ total: 12, isSoft: true });
    expect(handValue(hand('A', 'A', '9'))).toEqual({ total: 21, isSoft: true });
    expect(handValue(hand('A', '6', '10'))).toEqual({ total: 17, isSoft: false }); // ace demoted
    expect(handValue(hand('A', 'A', 'A'))).toEqual({ total: 13, isSoft: true });
    expect(handValue(hand('A', 'A', '10', '9'))).toEqual({ total: 21, isSoft: false });
  });
});

describe('blackjack detection', () => {
  test('ISC-30: exactly two cards A+ten-value, in either order', () => {
    expect(isBlackjack(hand('A', 'K'))).toBe(true);
    expect(isBlackjack(hand('10', 'A'))).toBe(true);
    expect(isBlackjack(hand('A', '9'))).toBe(false);
    expect(isBlackjack(hand('10', '5', '6'))).toBe(false); // 21 in 3 cards ≠ blackjack
    expect(isBlackjack(hand('A', '4', '6'))).toBe(false);
  });
});

describe('pairs and busts', () => {
  test('ISC-31: pair by rank; K+Q is not a pair; bust at >21', () => {
    expect(isPair(hand('8', '8'))).toBe(true);
    expect(isPair([c('K', '♠'), c('K', '♥')])).toBe(true);
    expect(isPair(hand('K', 'Q'))).toBe(false); // ten-value but different rank
    expect(isPair(hand('8', '8', '8'))).toBe(false); // three cards is not a splittable pair
    expect(isBust(hand('10', '9', '5'))).toBe(true);
    expect(isBust(hand('10', '9', '2'))).toBe(false);
  });
});
