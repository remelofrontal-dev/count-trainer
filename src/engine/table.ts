/**
 * Blackjack table engine (handoff §2a) — the Play-mode + Level 9 core.
 *
 * Pure, deterministic, seeded. State machine:
 *   BETTING → DEALING → PLAYER_ACTION → DEALER_ACTION → SETTLEMENT
 * Supports Hit/Stand/Double/Split, 3:2 and 6:5 payouts, fictional chips, and
 * 0–5 AI seats that play basic strategy with occasional "tourist" mistakes whose
 * cards feed the running count (more seats = harder counting).
 *
 * Correctness is the product (brief §4.5): settlement math, splits, doubles, and
 * multi-seat dealing order are unit-tested before any UI is built on this.
 */

import { mulberry32, type Shoe } from './deck';
import { handValue, isBlackjack as isNaturalBlackjack } from './hand';
import { runningCount } from './counting';
import { basicStrategyAction, resolveAction, upcardKey } from './basicStrategy';
import { DEFAULT_RULES, type Card, type Rules } from './types';

export type BlackjackPayout = '3:2' | '6:5';
export type PlayerAction = 'hit' | 'stand' | 'double' | 'split';
export type Outcome = 'blackjack' | 'win' | 'push' | 'lose';
export type TablePhase = 'player' | 'dealer' | 'settlement';

export interface TableConfig {
  decks: number;
  dealerHitsSoft17: boolean;
  das: boolean; // double after split
  blackjackPayout: BlackjackPayout;
  /** 0 = heads-up vs dealer; 1–5 adds AI seats. */
  numAISeats: number;
  /** Index of the human seat among all seats (0 = first base). */
  playerSeatIndex: number;
  /** Per-AI-hand probability of a suboptimal "tourist" play (~0.05–0.10). */
  aiMistakeRate: number;
}

export const DEFAULT_TABLE: TableConfig = {
  decks: 6,
  dealerHitsSoft17: true,
  das: true,
  blackjackPayout: '3:2',
  numAISeats: 0,
  playerSeatIndex: 0,
  aiMistakeRate: 0.07,
};

export interface Hand {
  cards: Card[];
  /** Chips wagered on this hand (doubles to 2× when doubled). */
  wager: number;
  doubled: boolean;
  fromSplit: boolean;
  resolved: boolean;
  outcome: Outcome | null;
  /** Net chips: +profit on win, −wager on loss, 0 on push. Set at settlement. */
  net: number;
}

export interface Seat {
  isPlayer: boolean;
  hands: Hand[];
  activeHand: number;
}

export interface TableState {
  phase: TablePhase;
  config: TableConfig;
  rules: Rules;
  shoe: Shoe;
  seats: Seat[];
  dealer: Card[];
  /** dealer[1] stays hidden from the count until the dealer phase. */
  holeRevealed: boolean;
  activeSeat: number;
  rng: () => number;
}

function newHand(card1: Card, card2: Card, wager: number, fromSplit = false): Hand {
  return { cards: [card1, card2], wager, doubled: false, fromSplit, resolved: false, outcome: null, net: 0 };
}

function configToRules(config: TableConfig): Rules {
  return { ...DEFAULT_RULES, decks: config.decks, dealerHitsSoft17: config.dealerHitsSoft17, das: config.das };
}

/**
 * Deal a round. Standard order: each seat a card (first→third base), dealer up,
 * each seat a second card, dealer hole. Transitions to player phase, or straight
 * to settlement if the dealer peeks a natural.
 */
export function startRound(config: TableConfig, shoe: Shoe, baseBet: number, seed: number): TableState {
  const numSeats = config.numAISeats + 1;
  const playerIdx = Math.min(Math.max(config.playerSeatIndex, 0), numSeats - 1);
  const firstCards: Card[] = [];
  for (let i = 0; i < numSeats; i++) firstCards.push(shoe.draw());
  const dealerUp = shoe.draw();
  const secondCards: Card[] = [];
  for (let i = 0; i < numSeats; i++) secondCards.push(shoe.draw());
  const dealerHole = shoe.draw();

  const seats: Seat[] = [];
  for (let i = 0; i < numSeats; i++) {
    seats.push({
      isPlayer: i === playerIdx,
      hands: [newHand(firstCards[i] as Card, secondCards[i] as Card, baseBet)],
      activeHand: 0,
    });
  }

  const state: TableState = {
    phase: 'player',
    config,
    rules: configToRules(config),
    shoe,
    seats,
    dealer: [dealerUp, dealerHole],
    holeRevealed: false,
    activeSeat: 0,
    rng: mulberry32(seed),
  };

  // Dealer peek: a natural ends the round before anyone acts.
  if (isNaturalBlackjack(state.dealer)) {
    return toSettlement(state);
  }
  return advance(state);
}

/** Running count over all currently-exposed cards (hole excluded until revealed). */
export function tableRunningCount(state: TableState): number {
  const exposed: Card[] = [];
  for (const seat of state.seats) for (const hand of seat.hands) exposed.push(...hand.cards);
  exposed.push(state.dealer[0] as Card);
  if (state.holeRevealed) exposed.push(state.dealer[1] as Card);
  // any dealer draws beyond the initial two are always exposed
  exposed.push(...state.dealer.slice(2));
  return runningCount(exposed);
}

export function dealerUpcard(state: TableState): Card {
  return state.dealer[0] as Card;
}

/** The hand awaiting the human's decision, or null if it isn't the human's turn. */
export function activePlayerHand(state: TableState): Hand | null {
  if (state.phase !== 'player') return null;
  const seat = state.seats[state.activeSeat];
  if (seat === undefined || !seat.isPlayer) return null;
  return seat.hands[seat.activeHand] ?? null;
}

export function canSplit(hand: Hand, seat: Seat): boolean {
  if (hand.cards.length !== 2) return false;
  const [a, b] = hand.cards as [Card, Card];
  // by rank (K+Q not splittable); cap total hands per seat at 4
  return a.rank === b.rank && seat.hands.length < 4;
}

export function canDouble(hand: Hand, config: TableConfig): boolean {
  if (hand.cards.length !== 2) return false;
  if (hand.fromSplit && !config.das) return false;
  return true;
}

export function availableActions(state: TableState): PlayerAction[] {
  const hand = activePlayerHand(state);
  if (hand === null) return [];
  const seat = state.seats[state.activeSeat] as Seat;
  const actions: PlayerAction[] = ['hit', 'stand'];
  if (canDouble(hand, state.config)) actions.push('double');
  if (canSplit(hand, seat)) actions.push('split');
  return actions;
}

function handIsDone(hand: Hand): boolean {
  return hand.resolved || handValue(hand.cards).total >= 21;
}

/**
 * Apply the human's action to the active hand, then auto-run to the next decision.
 * Returns a FRESH top-level object so React/Zustand re-render on every action — the
 * engine mutates nested structures in place, so without a new reference the UI
 * would only repaint when some other field changed (cards "popping in" at the end).
 */
export function act(state: TableState, action: PlayerAction): TableState {
  if (state.phase !== 'player') return state;
  const seat = state.seats[state.activeSeat];
  if (seat === undefined || !seat.isPlayer) return state;
  const next = applyAction(state, action);
  return { ...advance(next) };
}

function applyAction(state: TableState, action: PlayerAction): TableState {
  const seat = state.seats[state.activeSeat] as Seat;
  const hand = seat.hands[seat.activeHand] as Hand;
  switch (action) {
    case 'hit': {
      hand.cards.push(state.shoe.draw());
      if (handValue(hand.cards).total >= 21) hand.resolved = true;
      break;
    }
    case 'stand':
      hand.resolved = true;
      break;
    case 'double': {
      hand.wager *= 2;
      hand.doubled = true;
      hand.cards.push(state.shoe.draw());
      hand.resolved = true;
      break;
    }
    case 'split': {
      const [c1, c2] = hand.cards as [Card, Card];
      const baseWager = hand.wager; // each resulting hand keeps the original base bet
      // First hand: keep c1, draw a new card.
      hand.cards = [c1, state.shoe.draw()];
      hand.fromSplit = true;
      // Second hand: c2 + a new card, inserted right after the current hand.
      const splitHand = newHand(c2, state.shoe.draw(), baseWager, true);
      seat.hands.splice(seat.activeHand + 1, 0, splitHand);
      if (handValue(hand.cards).total >= 21) hand.resolved = true;
      break;
    }
  }
  return state;
}

/** AI plays basic strategy with an occasional rng-driven mistake. */
function aiAction(state: TableState, hand: Hand): PlayerAction {
  const optimal = resolveAction(basicStrategyAction(hand.cards, dealerUpcard(state).rank, state.rules), {
    canDouble: canDouble(hand, state.config),
    canSurrender: false,
  });
  let action: PlayerAction = optimal === 'D' ? 'double' : optimal === 'P' ? 'split' : optimal === 'H' ? 'hit' : 'stand';
  // tourist mistake: occasionally deviate to a plausible-but-wrong play
  if (state.rng() < state.config.aiMistakeRate) {
    action = action === 'stand' ? 'hit' : 'stand';
  }
  // guard: only split/double when legal
  const seat = state.seats[state.activeSeat] as Seat;
  if (action === 'split' && !canSplit(hand, seat)) action = 'hit';
  if (action === 'double' && !canDouble(hand, state.config)) action = 'hit';
  return action;
}

/**
 * Auto-advance: resolve AI seats/hands and finished human hands until the next
 * human decision or the dealer phase.
 */
function advance(state: TableState): TableState {
  let guard = 0;
  while (state.phase === 'player') {
    if (guard++ > 500) break; // safety net against any logic error
    const seat = state.seats[state.activeSeat];
    if (seat === undefined) {
      state.phase = 'dealer';
      break;
    }
    const hand = seat.hands[seat.activeHand];
    if (hand === undefined) {
      advanceSeat(state);
      continue;
    }
    if (handIsDone(hand)) {
      hand.resolved = true;
      if (seat.activeHand + 1 < seat.hands.length) {
        seat.activeHand += 1;
      } else {
        advanceSeat(state);
      }
      continue;
    }
    if (seat.isPlayer) {
      return state; // wait for human input
    }
    applyAction(state, aiAction(state, hand));
  }
  if (state.phase === 'dealer') {
    return toSettlement(state);
  }
  return state;
}

function advanceSeat(state: TableState): void {
  if (state.activeSeat + 1 < state.seats.length) {
    state.activeSeat += 1;
  } else {
    state.phase = 'dealer';
  }
}

/** Reveal the hole, play the dealer per rules, settle every hand. */
function toSettlement(state: TableState): TableState {
  state.holeRevealed = true;
  // Dealer draws only if at least one player hand can still win (not busted).
  // If every player hand busted, the round is already decided — dealer stands pat.
  const anyLive = state.seats.some((seat) =>
    seat.hands.some((hand) => handValue(hand.cards).total <= 21),
  );
  if (anyLive) playDealer(state);
  settle(state);
  state.phase = 'settlement';
  return state;
}

function playDealer(state: TableState): void {
  // If the dealer has a natural, no drawing.
  if (isNaturalBlackjack(state.dealer)) return;
  let v = handValue(state.dealer);
  while (v.total < 17 || (v.total === 17 && v.isSoft && state.rules.dealerHitsSoft17)) {
    state.dealer.push(state.shoe.draw());
    v = handValue(state.dealer);
  }
}

function payoutMultiplier(payout: BlackjackPayout): number {
  return payout === '3:2' ? 1.5 : 1.2;
}

/** Settle every hand against the dealer. Sets outcome + net chips. */
export function settle(state: TableState): void {
  const dealer = handValue(state.dealer);
  const dealerBJ = isNaturalBlackjack(state.dealer);
  const dealerBust = dealer.total > 21;
  for (const seat of state.seats) {
    for (const hand of seat.hands) {
      const player = handValue(hand.cards);
      const playerBJ = !hand.fromSplit && isNaturalBlackjack(hand.cards);

      if (playerBJ && dealerBJ) {
        setOutcome(hand, 'push', 0);
      } else if (playerBJ) {
        setOutcome(hand, 'blackjack', hand.wager * payoutMultiplier(state.config.blackjackPayout));
      } else if (dealerBJ) {
        setOutcome(hand, 'lose', -hand.wager);
      } else if (player.total > 21) {
        setOutcome(hand, 'lose', -hand.wager);
      } else if (dealerBust || player.total > dealer.total) {
        setOutcome(hand, 'win', hand.wager);
      } else if (player.total === dealer.total) {
        setOutcome(hand, 'push', 0);
      } else {
        setOutcome(hand, 'lose', -hand.wager);
      }
    }
  }
}

function setOutcome(hand: Hand, outcome: Outcome, net: number): void {
  hand.outcome = outcome;
  hand.net = net;
  hand.resolved = true;
}

/** Net chips across all of the human's hands this round (for the W/L/P record). */
export function playerNet(state: TableState): number {
  const seat = state.seats.find((s) => s.isPlayer);
  if (seat === undefined) return 0;
  return seat.hands.reduce((sum, h) => sum + h.net, 0);
}
