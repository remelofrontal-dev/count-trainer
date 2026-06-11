import { describe, expect, test } from 'bun:test';
import {
  cardName,
  cardValueHint,
  rankName,
  rankNamePlural,
  suitName,
} from '../cardName';
import { RANKS, SUITS } from '../types';
import { c } from './helpers';

describe('cardName formats', () => {
  test("'corner' is the raw face for rendering", () => {
    expect(cardName(c('K', '♥'), 'corner')).toBe('K♥');
    expect(cardName(c('10', '♦'), 'corner')).toBe('10♦');
    expect(cardName(c('A', '♠'), 'corner')).toBe('A♠');
  });

  test("'spoken' is the full prose name", () => {
    expect(cardName(c('K', '♥'), 'spoken')).toBe('King of Hearts');
    expect(cardName(c('A', '♠'), 'spoken')).toBe('Ace of Spades');
    expect(cardName(c('10', '♦'), 'spoken')).toBe('Ten of Diamonds');
    expect(cardName(c('2', '♣'), 'spoken')).toBe('Two of Clubs');
  });

  test("'rank' is just the rank word", () => {
    expect(cardName(c('K'), 'rank')).toBe('King');
    expect(cardName(c('Q'), 'rank')).toBe('Queen');
    expect(cardName(c('A'), 'rank')).toBe('Ace');
    expect(cardName(c('7'), 'rank')).toBe('Seven');
  });

  test('every rank and suit has a spoken name (no raw abbreviations leak)', () => {
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        const spoken = cardName(c(rank, suit), 'spoken');
        expect(spoken).toMatch(/^[A-Z][a-z]+ of [A-Z][a-z]+$/); // "Word of Word"
        expect(spoken).not.toMatch(/[♠♥♦♣]/); // no suit glyph in prose
      }
    }
  });
});

describe('rank helpers', () => {
  test('rankName + suitName', () => {
    expect(rankName('J')).toBe('Jack');
    expect(suitName('♣')).toBe('Clubs');
  });

  test('rankNamePlural handles the tricky Six → Sixes', () => {
    expect(rankNamePlural('A')).toBe('Aces');
    expect(rankNamePlural('K')).toBe('Kings');
    expect(rankNamePlural('6')).toBe('Sixes');
    expect(rankNamePlural('10')).toBe('Tens');
  });
});

describe('beginner value hint', () => {
  test('face cards = 10, ace = 1 or 11, pips = face value', () => {
    expect(cardValueHint(c('K'))).toBe('King = 10');
    expect(cardValueHint(c('Q'))).toBe('Queen = 10');
    expect(cardValueHint(c('10'))).toBe('Ten = 10');
    expect(cardValueHint(c('A'))).toBe('Ace = 1 or 11');
    expect(cardValueHint(c('7'))).toBe('Seven = 7');
  });
});
