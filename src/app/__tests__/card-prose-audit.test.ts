import { describe, expect, test } from 'bun:test';
import { LESSONS } from '../lessons';
import { INFO_CARDS } from '../info';

/**
 * Enforcement: user-facing prose must never use bare card-rank abbreviations
 * (J/Q/K/A as card references). Cards are named in full ("Jacks, Queens and
 * Kings", "an Ace"). Card FACES keep raw indices — those are JSX, not prose.
 */

// Patterns that indicate raw rank abbreviations used as card references in a sentence.
const ABBREV_PATTERNS: { re: RegExp; why: string }[] = [
  { re: /[JQKA]\/[JQKA]/, why: 'slash list like J/Q/K' },
  { re: /\b[JQK], ?[JQK]\b/, why: 'comma list like J, Q' },
  { re: /\b[2-9JQK] and [2-9JQKA]\b/, why: 'pairing like "Q and K" / "A and K"' },
  { re: /\bA and [2-9JQK]\b/, why: 'pairing like "A and K"' },
];

function proseStrings(): string[] {
  const out: string[] = [];
  for (const l of LESSONS) {
    out.push(l.title, l.teach, l.practice.prompt, ...l.practice.options.map((o) => o.label));
  }
  for (const c of INFO_CARDS) {
    out.push(c.title, ...c.body);
  }
  return out;
}

describe('card prose audit', () => {
  test('no lesson or info copy uses bare rank abbreviations', () => {
    const offenders: string[] = [];
    for (const s of proseStrings()) {
      for (const { re, why } of ABBREV_PATTERNS) {
        if (re.test(s)) offenders.push(`[${why}] "${s.slice(0, 60)}…"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
