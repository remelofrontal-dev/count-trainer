import { type Card, RANKS, SUITS } from './types';

/** A single ordered 52-card deck. */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** N decks concatenated, unshuffled. */
export function buildShoe(numDecks: number): Card[] {
  if (!Number.isInteger(numDecks) || numDecks < 1) {
    throw new Error(`numDecks must be a positive integer, got ${numDecks}`);
  }
  const shoe: Card[] = [];
  for (let i = 0; i < numDecks; i++) {
    shoe.push(...buildDeck());
  }
  return shoe;
}

/**
 * Mulberry32 — small, fast, seedable PRNG.
 * Seeded shuffles make daily challenges and tests reproducible (ISA Principles).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates with a seeded PRNG. Returns a new array; input is not mutated. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

export interface ShoeOptions {
  seed: number;
  /** Fraction of the shoe dealt before the cut card is reached. Default 0.75. */
  penetration?: number;
}

/** A dealt shoe with cut-card penetration tracking. */
export class Shoe {
  private cards: Card[];
  private dealt = 0;
  private readonly cutIndex: number;
  readonly numDecks: number;

  constructor(numDecks: number, opts: ShoeOptions) {
    const penetration = opts.penetration ?? 0.75;
    if (penetration <= 0 || penetration > 1) {
      throw new Error(`penetration must be in (0, 1], got ${penetration}`);
    }
    this.numDecks = numDecks;
    this.cards = shuffle(buildShoe(numDecks), opts.seed);
    this.cutIndex = Math.floor(this.cards.length * penetration);
  }

  draw(): Card {
    const card = this.cards[this.dealt];
    if (card === undefined) {
      throw new Error('Cannot draw from an empty shoe');
    }
    this.dealt++;
    return card;
  }

  get cardsDealt(): number {
    return this.dealt;
  }

  get cardsRemaining(): number {
    return this.cards.length - this.dealt;
  }

  /** Fractional decks remaining — the denominator of true count conversion. */
  get decksRemaining(): number {
    return this.cardsRemaining / 52;
  }

  /** True once the cut card position has been dealt past — shoe should be reshuffled. */
  get cutCardReached(): boolean {
    return this.dealt >= this.cutIndex;
  }
}
