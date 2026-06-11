/**
 * Play mode glue (brief §4.6.2) — pure helpers around the table engine.
 *
 * The shoe persists across rounds so the count carries (that's the whole point):
 * `accumulatedCount` holds the running count from COMPLETED rounds this shoe, and
 * the live count = accumulatedCount + the current round's exposed cards.
 */

import { tableRunningCount, type Outcome, type TableState } from '../engine/table';
import { trueCount } from '../engine/counting';

export interface PlayRecord {
  wins: number;
  losses: number;
  pushes: number;
  /** Net fictional chips across the session. */
  chips: number;
}

export const EMPTY_RECORD: PlayRecord = { wins: 0, losses: 0, pushes: 0, chips: 0 };

/** Tally the human seat's settled hands into the W/L/P + chips record. */
export function foldRecord(record: PlayRecord, state: TableState): PlayRecord {
  const seat = state.seats.find((s) => s.isPlayer);
  if (seat === undefined) return record;
  let { wins, losses, pushes, chips } = record;
  for (const hand of seat.hands) {
    chips += hand.net;
    const o: Outcome | null = hand.outcome;
    if (o === 'win' || o === 'blackjack') wins += 1;
    else if (o === 'lose') losses += 1;
    else if (o === 'push') pushes += 1;
  }
  return { wins, losses, pushes, chips };
}

/** Running count the player should be holding: prior rounds + this round's exposed cards. */
export function liveRunningCount(accumulatedCount: number, state: TableState | null): number {
  return accumulatedCount + (state === null ? 0 : tableRunningCount(state));
}

/** True count from the live running count and the shoe's decks remaining. */
export function liveTrueCount(runningCount: number, decksRemaining: number): number {
  if (decksRemaining <= 0) return 0;
  return trueCount(runningCount, decksRemaining);
}
