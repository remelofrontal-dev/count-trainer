/**
 * Engine types — pure TypeScript, zero runtime dependencies.
 * The engine never imports react/react-native/expo (enforced by purity test).
 */

export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** Blackjack point value of a rank. Ace counts as 1 here; hand math promotes one ace to 11 when safe. */
export function rankValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return parseInt(rank, 10);
}

/** True when the rank is worth ten (10, J, Q, K). */
export function isTenValue(rank: Rank): boolean {
  return rankValue(rank) === 10;
}

/**
 * Table rules the strategy charts are computed against.
 * A basic-strategy table is only "correct" relative to a declared ruleset.
 */
export interface Rules {
  /** Dealer hits soft 17 (H17) vs stands (S17). */
  dealerHitsSoft17: boolean;
  /** Double after split allowed. */
  das: boolean;
  /** Late surrender available. */
  lateSurrender: boolean;
  /** Number of decks in the shoe. */
  decks: number;
}

/** Standard US shoe-game defaults (see ISA Decisions). */
export const DEFAULT_RULES: Rules = {
  dealerHitsSoft17: true,
  das: true,
  lateSurrender: true,
  decks: 6,
};

/**
 * A counting system assigns a tag to every rank.
 * Hi-Lo is the v1 system, but the engine API is system-agnostic (brief: more systems in Phase 3).
 */
export interface CountingSystem {
  name: string;
  tags: Record<Rank, number>;
  /** Balanced systems sum to 0 over a full deck. */
  balanced: boolean;
}
