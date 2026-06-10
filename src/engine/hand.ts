import { type Card, isTenValue, rankValue } from './types';

export interface HandValue {
  /** Best total ≤21 when possible (one ace promoted to 11 when safe). */
  total: number;
  /** True when an ace is currently counted as 11. */
  isSoft: boolean;
}

/**
 * Hand total with ace promotion.
 * Since 11+11 > 21, at most ONE ace can ever count as 11 — sum all aces as 1,
 * then promote a single ace by +10 if it doesn't bust.
 */
export function handValue(cards: readonly Card[]): HandValue {
  let total = 0;
  let hasAce = false;
  for (const card of cards) {
    total += rankValue(card.rank);
    if (card.rank === 'A') hasAce = true;
  }
  if (hasAce && total + 10 <= 21) {
    return { total: total + 10, isSoft: true };
  }
  return { total, isSoft: false };
}

/** Natural blackjack: exactly two cards, ace + ten-value. */
export function isBlackjack(cards: readonly Card[]): boolean {
  if (cards.length !== 2) return false;
  const [a, b] = cards as [Card, Card];
  return (
    (a.rank === 'A' && isTenValue(b.rank)) ||
    (b.rank === 'A' && isTenValue(a.rank))
  );
}

/** Splittable pair: exactly two cards of the same rank (K+Q is NOT a pair — see ISA Decisions). */
export function isPair(cards: readonly Card[]): boolean {
  if (cards.length !== 2) return false;
  const [a, b] = cards as [Card, Card];
  return a.rank === b.rank;
}

export function isBust(cards: readonly Card[]): boolean {
  return handValue(cards).total > 21;
}
