import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { HI_LO } from '../../engine/counting';
import { zoneHints } from '../countZoneHints';
import { DRILL_INTERACTIVE_TOP_FRACTION } from '../layout';

const UI_DIR = join(import.meta.dir, '..');
const SCREENS_DIR = join(UI_DIR, 'screens');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('ISC-61: count-zone hints derive from engine truth (mockup had them inverted)', () => {
  test('−1 zone lists the ten-values and ace; +1 zone lists 2–6', () => {
    const hints = zoneHints();
    expect(hints.minus).toBe('10 · J · Q · K · A');
    expect(hints.zero).toBe('7 · 8 · 9');
    expect(hints.plus).toBe('2 · 3 · 4 · 5 · 6');
  });

  test('labels agree with HI_LO tags rank-by-rank (derivation, not transcription)', () => {
    const hints = zoneHints(HI_LO);
    for (const [rank, tag] of Object.entries(HI_LO.tags)) {
      const bucket = tag === -1 ? hints.minus : tag === 1 ? hints.plus : hints.zero;
      expect(bucket.split(' · ')).toContain(rank);
    }
  });
});

describe('ISC-59: thumb-zone layout contract', () => {
  test('interactive container starts at or below the midline', () => {
    expect(DRILL_INTERACTIVE_TOP_FRACTION).toBeGreaterThanOrEqual(0.5);
  });

  test('DrillScreen uses the layout constant (rule is wired, not decorative)', () => {
    const source = readFileSync(join(SCREENS_DIR, 'DrillScreen.tsx'), 'utf8');
    expect(source.includes('DRILL_INTERACTIVE_TOP_FRACTION')).toBe(true);
  });
});

describe('ISC-60: no confirmation dialogs in the drill flow', () => {
  test('no Alert import anywhere under src/ui', () => {
    const offenders = walk(UI_DIR).filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /\bAlert\b/.test(source) && !file.endsWith('ui.test.ts');
    });
    expect(offenders).toEqual([]);
  });
});

describe('ISC-62: results screen has exactly one dominant CTA', () => {
  test('"ONE MORE ROUND" appears exactly once in ResultsScreen', () => {
    const source = readFileSync(join(SCREENS_DIR, 'ResultsScreen.tsx'), 'utf8');
    const matches = source.match(/ONE MORE ROUND/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});

describe('ISC-58/64: screens exist and the root registers all four', () => {
  test('all four screen files exist', () => {
    const files = readdirSync(SCREENS_DIR);
    for (const name of ['OnboardingScreen.tsx', 'HomeScreen.tsx', 'DrillScreen.tsx', 'ResultsScreen.tsx']) {
      expect(files).toContain(name);
    }
  });

  test('AppRoot switches across all four screens', () => {
    const source = readFileSync(join(UI_DIR, 'AppRoot.tsx'), 'utf8');
    for (const screen of ['onboarding', 'home', 'drill', 'results']) {
      expect(source.includes(`case '${screen}'`)).toBe(true);
    }
  });

  test('screens take colors from theme tokens only (no raw hex in UI files)', () => {
    const offenders = walk(UI_DIR).filter((file) =>
      /#[0-9A-Fa-f]{6}\b/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
