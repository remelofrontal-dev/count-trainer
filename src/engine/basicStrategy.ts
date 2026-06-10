import { handValue, isPair } from './hand';
import { type Card, type Rank, type Rules, isTenValue } from './types';

/**
 * Basic strategy — 4–8 deck shoe, DAS, late surrender, dealer peeks.
 * Encoded as an S17 base table plus an explicit H17 override diff so the
 * H17/S17 divergence is DATA the test suite can verify by set-equality
 * (a transposed cell breaks the diff test loudly).
 *
 * Composite actions resolve by table availability:
 *   H  hit            S  stand
 *   D  double, else hit          Ds double, else stand
 *   P  split
 *   Rh surrender, else hit       Rs surrender, else stand
 *   Rp surrender, else split
 */
export type Action = 'H' | 'S' | 'D' | 'Ds' | 'P' | 'Rh' | 'Rs' | 'Rp';

/** Resolved primitive action when doubling/surrender aren't available. */
export type PrimitiveAction = 'H' | 'S' | 'D' | 'P' | 'R';

export const UPCARD_KEYS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'] as const;
export type UpcardKey = (typeof UPCARD_KEYS)[number];

/** Collapse a dealer upcard rank to a strategy column (10/J/Q/K → T). */
export function upcardKey(rank: Rank): UpcardKey {
  if (rank === 'A') return 'A';
  if (isTenValue(rank)) return 'T';
  return rank as UpcardKey;
}

type Row = readonly [Action, Action, Action, Action, Action, Action, Action, Action, Action, Action];

// Columns: 2    3    4    5    6    7    8    9    T    A
const HARD_S17: Record<number, Row> = {
  4:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  5:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  6:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  7:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  8:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  9:  ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  10: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
  11: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'],
  12: ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  13: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  14: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  15: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'Rh', 'H'],
  16: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'Rh', 'Rh', 'Rh'],
  17: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  18: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  19: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  20: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  21: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
};

// Soft totals (ace counted as 11). Soft 12 = A,A which routes to the pair table first.
const SOFT_S17: Record<number, Row> = {
  13: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  14: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  15: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  16: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  17: ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  18: ['S', 'Ds', 'Ds', 'Ds', 'Ds', 'S', 'S', 'H', 'H', 'H'],
  19: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  20: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  21: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
};

// Pair rows keyed by the paired rank's strategy key. Assumes DAS (adjusted below when rules.das=false).
const PAIR_S17: Record<UpcardKey, Row> = {
  '2': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '3': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '4': ['H', 'H', 'H', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
  '5': ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
  '6': ['P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
  '7': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '8': ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  '9': ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
  T:   ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  A:   ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
};

/** The complete H17-vs-S17 divergence set for this ruleset. This IS the documented diff (ISC-33). */
export const H17_OVERRIDES: ReadonlyArray<{
  table: 'hard' | 'soft' | 'pair';
  row: number | UpcardKey;
  up: UpcardKey;
  action: Action;
}> = [
  { table: 'hard', row: 11, up: 'A', action: 'D' },   // 11 vs A: hit → double
  { table: 'hard', row: 15, up: 'A', action: 'Rh' },  // 15 vs A: hit → surrender
  { table: 'hard', row: 17, up: 'A', action: 'Rs' },  // 17 vs A: stand → surrender
  { table: 'soft', row: 18, up: '2', action: 'Ds' },  // A7 vs 2: stand → double
  { table: 'soft', row: 19, up: '6', action: 'Ds' },  // A8 vs 6: stand → double
  { table: 'pair', row: '8', up: 'A', action: 'Rp' }, // 8,8 vs A: split → surrender
];

// Pairs that lose their split when double-after-split is NOT allowed.
const NO_DAS_HITS: ReadonlyArray<{ row: UpcardKey; ups: UpcardKey[] }> = [
  { row: '2', ups: ['2', '3'] },
  { row: '3', ups: ['2', '3'] },
  { row: '4', ups: ['5', '6'] },
  { row: '6', ups: ['2'] },
];

function colIndex(up: UpcardKey): number {
  return UPCARD_KEYS.indexOf(up);
}

function applyH17(base: Action, table: 'hard' | 'soft' | 'pair', row: number | UpcardKey, up: UpcardKey, rules: Rules): Action {
  if (!rules.dealerHitsSoft17) return base;
  const override = H17_OVERRIDES.find((o) => o.table === table && o.row === row && o.up === up);
  return override ? override.action : base;
}

/** Surrender entries degrade to their fallback when late surrender isn't offered. */
function resolveSurrender(action: Action, rules: Rules): Action {
  if (rules.lateSurrender) return action;
  if (action === 'Rh') return 'H';
  if (action === 'Rs') return 'S';
  if (action === 'Rp') return 'P';
  return action;
}

/** Strategy action for a hard total (no usable ace, not a pair). */
export function hardAction(total: number, up: UpcardKey, rules: Rules): Action {
  const clamped = Math.min(Math.max(total, 4), 21);
  const row = HARD_S17[clamped];
  if (row === undefined || total > 21) {
    throw new Error(`No hard-total action for total ${total}`);
  }
  return resolveSurrender(applyH17(row[colIndex(up)] as Action, 'hard', clamped, up, rules), rules);
}

/** Strategy action for a soft total (ace counted as 11), totals 13–21. */
export function softAction(total: number, up: UpcardKey, rules: Rules): Action {
  const row = SOFT_S17[total];
  if (row === undefined) {
    throw new Error(`No soft-total action for total ${total}`);
  }
  return resolveSurrender(applyH17(row[colIndex(up)] as Action, 'soft', total, up, rules), rules);
}

/** Strategy action for a pair, keyed by the paired rank. */
export function pairAction(pairKey: UpcardKey, up: UpcardKey, rules: Rules): Action {
  let action = PAIR_S17[pairKey][colIndex(up)] as Action;
  if (!rules.das && NO_DAS_HITS.some((d) => d.row === pairKey && d.ups.includes(up))) {
    action = 'H';
  }
  return resolveSurrender(applyH17(action, 'pair', pairKey, up, rules), rules);
}

/**
 * Full lookup: routes pair → soft → hard, exactly like reading a chart.
 * Throws on busted hands — there is no "correct play" past 21.
 */
export function basicStrategyAction(playerCards: readonly Card[], dealerUp: Rank, rules: Rules): Action {
  const up = upcardKey(dealerUp);
  if (isPair(playerCards)) {
    return pairAction(upcardKey((playerCards[0] as Card).rank), up, rules);
  }
  const { total, isSoft } = handValue(playerCards);
  if (total > 21) {
    throw new Error(`Hand is busted (${total}) — no strategy action exists`);
  }
  if (isSoft) {
    return softAction(total, up, rules);
  }
  return hardAction(total, up, rules);
}

/** Resolve a composite action to a primitive given what the table currently allows. */
export function resolveAction(action: Action, opts: { canDouble: boolean; canSurrender: boolean }): PrimitiveAction {
  switch (action) {
    case 'D':
      return opts.canDouble ? 'D' : 'H';
    case 'Ds':
      return opts.canDouble ? 'D' : 'S';
    case 'Rh':
      return opts.canSurrender ? 'R' : 'H';
    case 'Rs':
      return opts.canSurrender ? 'R' : 'S';
    case 'Rp':
      return opts.canSurrender ? 'R' : 'P';
    default:
      return action;
  }
}
