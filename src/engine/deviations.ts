/**
 * Deviations engine (Illustrious 18 + Fab 4) — Hi-Lo, multi-deck.
 *
 * A deviation is a true-count-triggered departure from basic strategy. When the
 * true count reaches a play's index, you take the deviation action; otherwise you
 * follow basic strategy.
 *
 * CORRECTNESS NOTE: the index numbers below are the SEED set (the highest-confidence
 * canonical Illustrious 18 values). The authoritative full table is being generated
 * and cross-validated by Forge (GPT-5.4) against two published sources (Schlesinger
 * "Blackjack Attack" + Wizard of Odds) and audited by Cato before this level ships.
 * See ENGINE_SOURCES.md → Deviations.
 */

import { basicStrategyAction, resolveAction, upcardKey, type UpcardKey } from './basicStrategy';
import { handValue, isPair } from './hand';
import type { Card, Rank, Rules } from './types';

/** Primitive playing action a deviation can call for. Insurance is handled separately. */
export type DeviationAction = 'H' | 'S' | 'D' | 'P' | 'R';

export interface Deviation {
  id: string;
  /** Hard/soft total OR the pair rank's value (for pair deviations). */
  playerTotal: number;
  isPair: boolean;
  isSoft: boolean;
  dealerUpcard: UpcardKey;
  /** True-count threshold. */
  index: number;
  /** Deviate when TC is at-or-above (positive plays) or at-or-below (negative plays) the index. */
  direction: 'at_or_above' | 'at_or_below';
  deviationAction: DeviationAction;
}

/**
 * SEED Illustrious-18 indices (Hi-Lo, multi-deck). Provisional — replaced by the
 * Forge-validated + Cato-audited full table before the Deviations level ships.
 */
export const DEVIATIONS: readonly Deviation[] = [
  { id: '16v10', playerTotal: 16, isPair: false, isSoft: false, dealerUpcard: 'T', index: 0, direction: 'at_or_above', deviationAction: 'S' },
  { id: '15v10', playerTotal: 15, isPair: false, isSoft: false, dealerUpcard: 'T', index: 4, direction: 'at_or_above', deviationAction: 'S' },
  { id: '12v3', playerTotal: 12, isPair: false, isSoft: false, dealerUpcard: '3', index: 2, direction: 'at_or_above', deviationAction: 'S' },
  { id: '12v2', playerTotal: 12, isPair: false, isSoft: false, dealerUpcard: '2', index: 3, direction: 'at_or_above', deviationAction: 'S' },
  { id: '13v2', playerTotal: 13, isPair: false, isSoft: false, dealerUpcard: '2', index: -1, direction: 'at_or_below', deviationAction: 'H' },
  { id: '12v4', playerTotal: 12, isPair: false, isSoft: false, dealerUpcard: '4', index: 0, direction: 'at_or_below', deviationAction: 'H' },
  { id: '11vA', playerTotal: 11, isPair: false, isSoft: false, dealerUpcard: 'A', index: 1, direction: 'at_or_above', deviationAction: 'D' },
];

/** Is the true count past this deviation's index in its active direction? */
export function indexReached(dev: Deviation, trueCount: number): boolean {
  return dev.direction === 'at_or_above' ? trueCount >= dev.index : trueCount <= dev.index;
}

/** Find the deviation matching this situation, if any. */
export function findDeviation(
  cards: readonly Card[],
  dealerUp: Rank,
  opts: { pairOnly?: boolean } = {},
): Deviation | undefined {
  const up = upcardKey(dealerUp);
  const { total, isSoft } = handValue(cards);
  const pair = isPair(cards);
  return DEVIATIONS.find((d) => {
    if (d.dealerUpcard !== up) return false;
    if (d.isPair !== pair) return false;
    if (opts.pairOnly === true && !d.isPair) return false;
    if (d.isSoft !== isSoft) return false;
    return d.playerTotal === total;
  });
}

/**
 * The count-aware correct action: the deviation action when its index is reached,
 * otherwise basic strategy. This is what the Deviations drill grades against.
 */
export function deviationAwareAction(
  cards: readonly Card[],
  dealerUp: Rank,
  trueCount: number,
  rules: Rules,
): DeviationAction {
  const dev = findDeviation(cards, dealerUp);
  if (dev !== undefined && indexReached(dev, trueCount)) {
    return dev.deviationAction;
  }
  // The Illustrious-18 baseline is the no-surrender basic play; surrender
  // deviations (Fab 4) are encoded as their own entries with deviationAction 'R'.
  return resolveAction(basicStrategyAction(cards, dealerUp, rules), {
    canDouble: cards.length === 2,
    canSurrender: false,
  }) as DeviationAction;
}

/** Insurance deviation: dealer shows an ace; take it when TC ≥ +3 (the #1 index play). */
export const INSURANCE_INDEX = 3;
export function shouldTakeInsurance(dealerUp: Rank, trueCount: number): boolean {
  return dealerUp === 'A' && trueCount >= INSURANCE_INDEX;
}
