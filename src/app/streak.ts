/**
 * Streak system — local-calendar-day based, clock-injected for testability.
 */

export interface StreakState {
  count: number;
  /** Local calendar day of last completed drill, as YYYY-MM-DD. */
  lastDay: string | null;
}

export const EMPTY_STREAK: StreakState = { count: 0, lastDay: null };

/** Local calendar day string for a Date (device timezone). */
export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayAfter(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const next = new Date(y, m - 1, d + 1, 12); // noon avoids DST edge
  return localDay(next);
}

/**
 * Record a completed drill on `day` (YYYY-MM-DD, local).
 * Same day: unchanged. Next day: +1. Gap or first ever: reset to 1.
 */
export function recordCompletion(state: StreakState, day: string): StreakState {
  if (state.lastDay === day) {
    return state;
  }
  if (state.lastDay !== null && dayAfter(state.lastDay) === day) {
    return { count: state.count + 1, lastDay: day };
  }
  return { count: 1, lastDay: day };
}

/** A streak is broken for display purposes if more than one day has elapsed without a drill. */
export function effectiveStreak(state: StreakState, today: string): number {
  if (state.lastDay === null) return 0;
  if (state.lastDay === today || dayAfter(state.lastDay) === today) return state.count;
  return 0;
}
