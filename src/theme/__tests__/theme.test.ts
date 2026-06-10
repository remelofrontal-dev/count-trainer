import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { theme } from '../tokens';

// Built by concatenation so this file itself never contains the raw emerald hex.
const EMERALD = '#' + '3DDC84';

const SRC_ROOT = join(import.meta.dir, '..', '..'); // src/
const TOKENS_FILE = join(SRC_ROOT, 'theme', 'tokens.ts');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('design tokens (brief §4.2)', () => {
  test('ISC-8: tokens.ts contains all 8 exact hex values', () => {
    const source = readFileSync(TOKENS_FILE, 'utf8');
    const hexes = ['#0C1512', '#141F1A', '#F2EDE2', EMERALD, '#C9A85C', '#C8453A', '#26352D', '#6E8278'];
    for (const hex of hexes) {
      expect(source.includes(hex)).toBe(true);
    }
  });

  test('ISC-9: emerald reachable ONLY through semantic progress/win keys', () => {
    expect(theme.semantic.progress).toBe(EMERALD);
    expect(theme.semantic.win).toBe(EMERALD);
    expect(theme.semantic.countPlus).toBe(EMERALD);
    // No general color slot carries emerald, and no key is named "emerald".
    for (const [key, value] of Object.entries(theme.colors)) {
      expect(value).not.toBe(EMERALD);
      expect(key.toLowerCase()).not.toContain('emerald');
    }
    expect(JSON.stringify(Object.keys(theme))).not.toContain('emerald');
  });

  test('ISC-10: typography names Big Shoulders Display (display) and Outfit (body)', () => {
    expect(theme.typography.display).toBe('Big Shoulders Display');
    expect(theme.typography.body).toBe('Outfit');
  });

  test('core surfaces match the brief table', () => {
    expect(theme.colors.background).toBe('#0C1512');
    expect(theme.colors.surface).toBe('#141F1A');
    expect(theme.colors.text).toBe('#F2EDE2');
    expect(theme.colors.error).toBe('#C8453A');
    expect(theme.colors.border).toBe('#26352D');
    expect(theme.colors.textSecondary).toBe('#6E8278');
    expect(theme.colors.accent).toBe('#C9A85C');
  });
});

describe('enforcement (brief §7.4 — emerald is progress/wins ONLY)', () => {
  test('ISC-11/ISC-43: raw emerald hex appears nowhere in src/ outside tokens.ts', () => {
    const offenders = walk(SRC_ROOT)
      .filter((file) => file !== TOKENS_FILE)
      .filter((file) => readFileSync(file, 'utf8').includes(EMERALD));
    expect(offenders).toEqual([]);
  });
});

describe('engine purity (ISC-41)', () => {
  test('no file in src/engine imports react/react-native/expo', () => {
    const engineDir = join(SRC_ROOT, 'engine');
    const offenders = walk(engineDir).filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /from\s+['"](react|react-native|expo)/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
