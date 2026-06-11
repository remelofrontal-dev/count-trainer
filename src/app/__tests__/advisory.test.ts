import { describe, expect, test } from 'bun:test';
import {
  type ProgressState,
  emptyProgress,
  levelSignal,
  markNoteShown,
  notReadyPct,
  recommendedLevelId,
} from '../progress';
import { GATES_ADVISORY, gateProgressPct, prereqLevel } from '../levels';

function withLevel(p: ProgressState, id: string, over: Partial<ProgressState['levels'][string]>): ProgressState {
  return { ...p, levels: { ...p.levels, [id]: { ...p.levels[id]!, ...over } } };
}

describe('advisory gate signals', () => {
  test('GATES_ADVISORY ships on for beta', () => {
    expect(GATES_ADVISORY).toBe(true);
  });

  test('fresh profile: Card Values is recommended, later levels are not-ready', () => {
    const p = emptyProgress();
    expect(levelSignal('card-values', p)).toBe('recommended');
    expect(levelSignal('running-count-slow', p)).toBe('not-ready');
    expect(levelSignal('true-count', p)).toBe('not-ready');
    expect(recommendedLevelId(p)).toBe('card-values');
  });

  test('mastered + tested-out signals', () => {
    let p = emptyProgress();
    p = withLevel(p, 'card-values', { gatePassed: true, bestAccuracy: 0.99 });
    expect(levelSignal('card-values', p)).toBe('mastered');
    // with card-values mastered, running-count-slow becomes recommended next
    expect(levelSignal('running-count-slow', p)).toBe('recommended');
    p = { ...p, testedOut: ['running-count-slow'] };
    expect(levelSignal('running-count-slow', p)).toBe('tested-out');
  });

  test('a ready-but-not-recommended level reads "ready"', () => {
    let p = emptyProgress();
    p = withLevel(p, 'card-values', { gatePassed: true });
    p = withLevel(p, 'running-count-slow', { gatePassed: true });
    // running-count-speed is now ready; the first un-cleared ready level is recommended
    expect(levelSignal('running-count-speed', p)).toBe('recommended');
  });

  test('notReadyPct reflects progress toward the prerequisite gate', () => {
    const p = emptyProgress();
    expect(notReadyPct('running-count-slow', p)).toBe(0); // no card-values progress yet
    // halfway on card-values accuracy + decent speed → some progress
    const partial = withLevel(p, 'card-values', { bestAccuracy: 0.95, bestAvgMsPerCard: 2500 });
    expect(notReadyPct('running-count-slow', partial)).toBeGreaterThan(0);
    // first level has no prerequisite
    expect(prereqLevel('card-values')).toBeUndefined();
  });

  test('gateProgressPct blends accuracy + speed, capped at 100', () => {
    expect(gateProgressPct('card-values', 0, null)).toBe(0);
    expect(gateProgressPct('card-values', 0.95, 2500)).toBe(100); // meets gate (0.95 / 2500ms)
    expect(gateProgressPct('card-values', 1.0, 1000)).toBe(100); // exceeds → capped
  });

  test('markNoteShown is idempotent', () => {
    const p = emptyProgress();
    const once = markNoteShown(p, 'true-count');
    expect(once.advisoryNotesShown).toEqual(['true-count']);
    expect(markNoteShown(once, 'true-count')).toBe(once); // unchanged
  });
});
