/**
 * Card display-name layer. Card FACES keep raw corner indices ("K♥") because
 * reading real indices is part of the training. Everything that TALKS about a
 * card in prose — lessons, briefings, quiz prompts, coach insights, feedback —
 * goes through here so users never read bare "K"/"Q♦"/"A" in a sentence.
 */

import { rankValue } from './types';
import type { Card, Rank, Suit } from './types';

export type CardNameFormat = 'corner' | 'spoken' | 'rank';

const RANK_NAMES: Record<Rank, string> = {
  A: 'Ace',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
};

const SUIT_NAMES: Record<Suit, string> = {
  '♠': 'Spades',
  '♥': 'Hearts',
  '♦': 'Diamonds',
  '♣': 'Clubs',
};

/** "King" / "Ace" — the spoken rank, for prose. */
export function rankName(rank: Rank): string {
  return RANK_NAMES[rank];
}

/** Plural rank for counts in prose: "Aces", "Kings", "Sixes". */
export function rankNamePlural(rank: Rank): string {
  const name = RANK_NAMES[rank];
  return name.endsWith('x') ? `${name}es` : `${name}s`; // Six → Sixes; all others +s
}

/** "Spades" / "Hearts" — the spoken suit. */
export function suitName(suit: Suit): string {
  return SUIT_NAMES[suit];
}

/**
 * Display a card by format:
 *   'corner' → "K♥"            (rendered card faces only)
 *   'spoken' → "King of Hearts"
 *   'rank'   → "King"
 */
export function cardName(card: Card, format: CardNameFormat): string {
  switch (format) {
    case 'corner':
      return `${card.rank}${card.suit}`;
    case 'spoken':
      return `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`;
    case 'rank':
      return RANK_NAMES[card.rank];
  }
}

/**
 * Beginner bridge label shown under dealt cards in Level 0 + Level 1 only:
 * "King = 10", "Ace = 1 or 11", "Seven = 7".
 */
export function cardValueHint(card: Card): string {
  if (card.rank === 'A') return 'Ace = 1 or 11';
  return `${RANK_NAMES[card.rank]} = ${rankValue(card.rank)}`;
}
