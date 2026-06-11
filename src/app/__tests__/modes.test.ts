import { describe, expect, test } from 'bun:test';
import { MODES, modeById } from '../modes';

describe('mode registry', () => {
  test('the five brief modes exist with stable ids', () => {
    expect(MODES.map((m) => m.id)).toEqual(['journey', 'quick-drill', 'play', 'daily-shoe', 'gauntlet']);
  });

  test('Journey, Quick Drill, Play are live; Daily Shoe + Gauntlet are soon', () => {
    expect(modeById('journey').status).toBe('live');
    expect(modeById('quick-drill').status).toBe('live');
    expect(modeById('play').status).toBe('live');
    expect(modeById('daily-shoe').status).toBe('soon');
    expect(modeById('gauntlet').status).toBe('soon');
  });

  test('the Gauntlet is the premium mode', () => {
    expect(modeById('gauntlet').tier).toBe('premium');
    expect(modeById('play').tier).toBe('free');
  });

  test('unknown mode throws', () => {
    // @ts-expect-error testing the guard
    expect(() => modeById('nope')).toThrow('Unknown mode');
  });
});
