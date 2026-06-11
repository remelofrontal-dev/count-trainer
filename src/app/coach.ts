/**
 * Coach Insight engine v1 (brief §4.1 pillar 4) — ONE specific, data-driven
 * insight per results screen, never a stats dump. Rule-based off session data:
 * rank-class misses, speed decay, peek reliance, accuracy/speed weakness.
 *
 * Pure: takes a finished drill's answers and returns a single Insight.
 */

import type { AnswerRecord } from './drill';
import { isTenValue } from '../engine/types';

export interface Insight {
  /** Brass coach-card headline — short, specific. */
  headline: string;
  /** One sentence of detail. */
  detail: string;
}

type RankClass = 'aces' | 'tens' | 'low';

function rankClass(rank: string): RankClass | null {
  if (rank === 'A') return 'aces';
  if (isTenValue(rank as never)) return 'tens';
  if (['2', '3', '4', '5', '6'].includes(rank)) return 'low';
  return null; // 7,8,9 are the neutral middle
}

const CLASS_LABEL: Record<RankClass, string> = {
  aces: 'aces',
  tens: 'ten-value cards',
  low: 'low cards (2–6)',
};

/**
 * Returns the single most useful insight for this session.
 * `peeks` and `accuracy` come from the session; `answers` carries per-card data.
 */
export function coachInsight(opts: {
  answers: readonly AnswerRecord[];
  accuracy: number;
  avgMsPerCard: number;
  peeks: number;
  gatePassed: boolean;
}): Insight {
  const { answers, accuracy, avgMsPerCard, peeks, gatePassed } = opts;

  if (answers.length === 0) {
    return {
      headline: 'Give it a real go',
      detail: 'That round ended before you answered any cards — tap a count zone for each card next time.',
    };
  }

  // 1) Celebrate a clean, fast, gate-clearing run — then point forward.
  if (gatePassed && accuracy >= 0.98) {
    return {
      headline: 'Locked in',
      detail: 'Near-perfect and fast enough to clear the gate. Push the next level — your ceiling is higher than this.',
    };
  }

  // 2) Disproportionate misses in one rank class — the most actionable signal.
  // Only applies to count drills (which carry a single card per question).
  const missByClass: Record<RankClass, { miss: number; total: number }> = {
    aces: { miss: 0, total: 0 },
    tens: { miss: 0, total: 0 },
    low: { miss: 0, total: 0 },
  };
  for (const a of answers) {
    const card = a.question.card;
    if (card === undefined) continue;
    const cls = rankClass(card.rank);
    if (cls === null) continue;
    missByClass[cls].total += 1;
    if (!a.correct) missByClass[cls].miss += 1;
  }
  const worst = (Object.entries(missByClass) as [RankClass, { miss: number; total: number }][])
    .filter(([, v]) => v.total >= 3 && v.miss >= 2)
    .sort((a, b) => b[1].miss / b[1].total - a[1].miss / a[1].total)[0];
  if (worst !== undefined) {
    const [cls, v] = worst;
    return {
      headline: `${CLASS_LABEL[cls][0]!.toUpperCase()}${CLASS_LABEL[cls].slice(1)} trip you up`,
      detail: `You missed ${v.miss} of ${v.total} ${CLASS_LABEL[cls]}. Slow down a beat when one appears — they're where the count leaks.`,
    };
  }

  // 3) Speed decay — slower in the back half than the front half.
  if (answers.length >= 6) {
    const mid = Math.floor(answers.length / 2);
    const front = avg(answers.slice(0, mid).map((a) => a.latencyMs));
    const back = avg(answers.slice(mid).map((a) => a.latencyMs));
    if (back > front * 1.4) {
      return {
        headline: 'You fade late in the shoe',
        detail: 'Your second half was noticeably slower than your first. Stamina is a drill too — run one more round and hold the pace.',
      };
    }
  }

  // 4) Leaning on peek.
  if (peeks >= 2) {
    return {
      headline: 'Wean off the peek',
      detail: `You peeked ${peeks} times. Try one round without it — trusting your own count is the skill that transfers to a real table.`,
    };
  }

  // 5) Fall through: name the bigger of the two weaknesses.
  if (accuracy < 0.9) {
    return {
      headline: 'Accuracy before speed',
      detail: `You hit ${Math.round(accuracy * 100)}%. Counting is worthless if it's wrong — slow down until you're at 95%, then chase speed.`,
    };
  }
  if (avgMsPerCard > 1800) {
    return {
      headline: 'Tighten the tempo',
      detail: `${(avgMsPerCard / 1000).toFixed(1)}s per card is accurate but slow for a real shoe. Aim under 1.5s — the count has to keep up with the dealer.`,
    };
  }
  return {
    headline: 'Solid, steady round',
    detail: 'Good accuracy at a fair pace. Run another — consistency across rounds is what moves the Casino Ready number.',
  };
}

function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}
