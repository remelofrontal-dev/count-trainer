import { describe, expect, test } from 'bun:test';
import {
  type TableConfig,
  type TableState,
  DEFAULT_TABLE,
  act,
  availableActions,
  canSplit,
  playerNet,
  settle,
  startRound,
  tableRunningCount,
} from '../table';
import { Shoe, buildShoe } from '../deck';
import { runningCount } from '../counting';
import type { Card } from '../types';

/** A shoe whose draw() yields a fixed scripted sequence (for deterministic settlement tests). */
class ScriptedShoe {
  private i = 0;
  constructor(private cards: Card[]) {}
  draw(): Card {
    const c = this.cards[this.i++];
    if (c === undefined) throw new Error('scripted shoe exhausted');
    return c;
  }
  get cardsRemaining() {
    return this.cards.length - this.i;
  }
  get decksRemaining() {
    return this.cardsRemaining / 52;
  }
  get cutCardReached() {
    return false;
  }
  get cardsDealt() {
    return this.i;
  }
  get numDecks() {
    return 1;
  }
}

function c(rank: Card['rank']): Card {
  return { rank, suit: '♠' };
}

/** Heads-up config (no AI), scripted shoe. Deal order: P1, Dup, P2, Dhole, then draws. */
function headsUp(cards: Card[], over: Partial<TableConfig> = {}): TableState {
  const config: TableConfig = { ...DEFAULT_TABLE, numAISeats: 0, ...over };
  return startRound(config, new ScriptedShoe(cards) as unknown as Shoe, 100, 1);
}

describe('settlement — naturals and payouts', () => {
  test('player blackjack pays 3:2', () => {
    // P: A,K  Dealer: 9,7(=16→draws)… but player has natural, dealer 9 up not BJ
    // deal order: P1=A, Dup=9, P2=K, Dhole=7 → dealer 16 then draws
    const s = headsUp([c('A'), c('9'), c('K'), c('7'), c('5')]); // dealer 9,7,5=21
    const net = playerNet(s);
    expect(s.seats[0]!.hands[0]!.outcome).toBe('blackjack');
    expect(net).toBe(150); // 100 * 1.5
  });

  test('player blackjack pays 6:5 on a bad table', () => {
    const s = headsUp([c('A'), c('9'), c('K'), c('7'), c('5')], { blackjackPayout: '6:5' });
    expect(s.seats[0]!.hands[0]!.outcome).toBe('blackjack');
    expect(playerNet(s)).toBe(120); // 100 * 1.2 — the 6:5 penalty, this is why counters walk
  });

  test('player and dealer both blackjack → push', () => {
    // P=A,K  D=A,Q (dealer natural, peeked) — round ends immediately
    const s = headsUp([c('A'), c('A'), c('K'), c('Q')]);
    expect(s.phase).toBe('settlement');
    expect(s.seats[0]!.hands[0]!.outcome).toBe('push');
    expect(playerNet(s)).toBe(0);
  });

  test('dealer natural beats a non-blackjack player', () => {
    // P=10,9  D=A,K (natural) → player loses without acting
    const s = headsUp([c('10'), c('A'), c('9'), c('K')]);
    expect(s.phase).toBe('settlement');
    expect(playerNet(s)).toBe(-100);
  });
});

describe('settlement — plays', () => {
  test('player stands and beats the dealer', () => {
    // P=10,9(19) D=10,7(17 stands). deal: P1=10,Dup=10,P2=9,Dhole=7
    let s = headsUp([c('10'), c('10'), c('9'), c('7')]);
    s = act(s, 'stand');
    expect(s.seats[0]!.hands[0]!.outcome).toBe('win');
    expect(playerNet(s)).toBe(100);
  });

  test('player busts and loses immediately', () => {
    // P=10,6(16) hit→10 = 26 bust. deal P1=10,Dup=9,P2=6,Dhole=7,draw=10
    let s = headsUp([c('10'), c('9'), c('6'), c('7'), c('10')]);
    s = act(s, 'hit');
    expect(playerNet(s)).toBe(-100);
  });

  test('dealer busts → standing player wins', () => {
    // P=10,9(19 stand) D=10,6(16)→draw 10 = 26 bust. P1=10,Dup=10,P2=9,Dhole=6,draw=10
    let s = headsUp([c('10'), c('10'), c('9'), c('6'), c('10')]);
    s = act(s, 'stand');
    expect(playerNet(s)).toBe(100);
  });

  test('equal totals push', () => {
    // P=10,8(18) D=10,8(18). P1=10,Dup=10,P2=8,Dhole=8
    let s = headsUp([c('10'), c('10'), c('8'), c('8')]);
    s = act(s, 'stand');
    expect(s.seats[0]!.hands[0]!.outcome).toBe('push');
    expect(playerNet(s)).toBe(0);
  });

  test('double doubles the wager and draws exactly one card', () => {
    // P=5,6(11) double→10 =21. D=10,7(17). P1=5,Dup=10,P2=6,Dhole=7,double=10
    let s = headsUp([c('5'), c('10'), c('6'), c('7'), c('10')]);
    expect(availableActions(s)).toContain('double');
    s = act(s, 'double');
    expect(s.seats[0]!.hands[0]!.doubled).toBe(true);
    expect(s.seats[0]!.hands[0]!.cards).toHaveLength(3);
    expect(playerNet(s)).toBe(200); // won 2× wager
  });
});

describe('splits', () => {
  test('splitting 8s creates two hands each keeping the base bet', () => {
    // P=8,8 D=9,7. deal P1=8,Dup=9,P2=8,Dhole=7, then split draws: h1+10, h2+10
    // hands: [8,10]=18 and [8,10]=18; dealer 9,7=16 → draws 5 = 21 → both lose
    let s = headsUp([c('8'), c('9'), c('8'), c('7'), c('10'), c('10'), c('5')]);
    const seat = s.seats[0]!;
    expect(canSplit(seat.hands[0]!, seat)).toBe(true);
    s = act(s, 'split');
    // after split both hands are 18 → auto-resolve (≥21? no, 18 needs stand). Stand both.
    s = act(s, 'stand'); // first hand
    s = act(s, 'stand'); // second hand
    expect(s.seats[0]!.hands).toHaveLength(2);
    expect(s.seats[0]!.hands.every((h) => h.wager === 100)).toBe(true);
    expect(playerNet(s)).toBe(-200); // both lose to dealer 21
  });

  test('a 21 after a split is NOT a blackjack (pays even money)', () => {
    // P=A,A split → each gets a ten = 21 but fromSplit, so win 1:1 not 3:2
    // deal P1=A,Dup=9,P2=A,Dhole=7, split draws: h1+K, h2+Q; dealer 9,7=16→draw 8=24 bust
    let s = headsUp([c('A'), c('9'), c('A'), c('7'), c('K'), c('Q'), c('8')]);
    s = act(s, 'split');
    // both hands are 21 → handIsDone auto-resolves them; advance runs to dealer
    expect(s.phase).toBe('settlement');
    for (const h of s.seats[0]!.hands) {
      expect(h.outcome).toBe('win'); // dealer busts, both win
      expect(h.outcome).not.toBe('blackjack');
    }
    expect(playerNet(s)).toBe(200); // 100 + 100, NOT 150+150
  });
});

describe('multi-seat dealing + counting', () => {
  test('AI seats are dealt and their cards feed the running count', () => {
    // 3 seats (2 AI + player at index 1), real shoe
    const config: TableConfig = { ...DEFAULT_TABLE, numAISeats: 2, playerSeatIndex: 1, aiMistakeRate: 0 };
    const shoe = new Shoe(6, { seed: 7 });
    const s = startRound(config, shoe, 50, 99);
    expect(s.seats).toHaveLength(3);
    expect(s.seats[1]!.isPlayer).toBe(true);
    expect(s.seats[0]!.isPlayer).toBe(false);
    // running count counts every exposed card (all seat cards + dealer up), hole excluded
    const exposed: Card[] = [];
    for (const seat of s.seats) for (const h of seat.hands) exposed.push(...h.cards);
    exposed.push(s.dealer[0]!);
    expect(tableRunningCount(s)).toBe(runningCount(exposed));
  });

  test('more seats means more cards dealt per round', () => {
    const headsUpShoe = new Shoe(6, { seed: 3 });
    startRound({ ...DEFAULT_TABLE, numAISeats: 0 }, headsUpShoe, 50, 1);
    const fiveSeatShoe = new Shoe(6, { seed: 3 });
    startRound({ ...DEFAULT_TABLE, numAISeats: 4, aiMistakeRate: 0 }, fiveSeatShoe, 50, 1);
    // heads-up deals 4 cards initially; 5 seats deal 12 — so more are consumed
    expect(headsUpShoe.cardsDealt).toBeGreaterThanOrEqual(4);
    expect(fiveSeatShoe.cardsDealt).toBeGreaterThan(headsUpShoe.cardsDealt);
  });

  test('AI tourist mistakes (rate=1) still resolve to a valid settlement', () => {
    const config: TableConfig = { ...DEFAULT_TABLE, numAISeats: 3, playerSeatIndex: 0, aiMistakeRate: 1 };
    let s = startRound(config, new Shoe(6, { seed: 5 }), 25, 7);
    let guard = 0;
    while (s.phase === 'player' && guard++ < 20) s = act(s, 'stand');
    expect(s.phase).toBe('settlement');
    for (const seat of s.seats) for (const h of seat.hands) expect(h.outcome).not.toBeNull();
  });

  test('AI plays without crashing and the round reaches settlement', () => {
    const config: TableConfig = { ...DEFAULT_TABLE, numAISeats: 4, playerSeatIndex: 2, aiMistakeRate: 0.1 };
    let s = startRound(config, new Shoe(6, { seed: 42 }), 25, 123);
    // human acts until it's no longer their turn
    let guard = 0;
    while (s.phase === 'player' && guard++ < 20) {
      s = act(s, 'stand');
    }
    expect(s.phase).toBe('settlement');
    // every hand at every seat got an outcome
    for (const seat of s.seats) for (const h of seat.hands) expect(h.outcome).not.toBeNull();
  });
});

describe('dealer rules', () => {
  test('H17: dealer hits soft 17', () => {
    // P=10,9(19 stand). D=A,6 (soft 17) must hit. P1=10,Dup=A,P2=9,Dhole=6,draw=K(→17 hard stand)
    let s = headsUp([c('10'), c('A'), c('9'), c('6'), c('K')], { dealerHitsSoft17: true });
    s = act(s, 'stand');
    expect(s.dealer.length).toBe(3); // drew on soft 17
  });

  test('S17: dealer stands on soft 17', () => {
    let s = headsUp([c('10'), c('A'), c('9'), c('6')], { dealerHitsSoft17: false });
    s = act(s, 'stand');
    expect(s.dealer.length).toBe(2); // stood on soft 17
    expect(playerNet(s)).toBe(100); // 19 beats 17
  });
});

describe('settle() is pure over a constructed state', () => {
  test('blackjack vs non-blackjack 20', () => {
    const state = headsUp([c('A'), c('K'), c('Q'), c('9'), c('2')]); // resolves already
    // re-settling is idempotent on outcome
    settle(state);
    expect(state.seats[0]!.hands[0]!.outcome).toBe('blackjack');
  });
});
