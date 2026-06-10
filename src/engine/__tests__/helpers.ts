import type { Card, Rank, Suit } from '../types';

/** Build a card quickly; suit is irrelevant to math, defaults to spades. */
export function c(rank: Rank, suit: Suit = '♠'): Card {
  return { rank, suit };
}

export function hand(...ranks: Rank[]): Card[] {
  return ranks.map((r) => c(r));
}
