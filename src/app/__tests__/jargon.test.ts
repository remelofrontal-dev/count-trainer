import { describe, expect, test } from 'bun:test';
import { JARGON_THRESHOLD, jargonForm, jargonText } from '../jargon';
import { coachVisibility } from '../play';
import { type ProgressState, emptyProgress } from '../progress';

function withMastered(p: ProgressState, id: string): ProgressState {
  return { ...p, levels: { ...p.levels, [id]: { ...p.levels[id]!, gatePassed: true } } };
}

describe('level-aware coach bar (the fix)', () => {
  test('fresh player: only Book is visible — no count concepts they haven\'t reached', () => {
    const vis = coachVisibility(emptyProgress());
    expect(vis.book).toBe(true);
    expect(vis.runningCount).toBe(false);
    expect(vis.trueCount).toBe(false);
  });

  test('running count appears only after reaching the Running Count levels', () => {
    let p = emptyProgress();
    expect(coachVisibility(p).runningCount).toBe(false);
    p = withMastered(p, 'card-values'); // now running-count-slow is reached
    expect(coachVisibility(p).runningCount).toBe(true);
    expect(coachVisibility(p).trueCount).toBe(false); // still not reached
  });

  test('true count appears only after reaching True Count', () => {
    let p = emptyProgress();
    for (const id of ['card-values', 'running-count-slow', 'running-count-speed', 'basic-strategy']) {
      p = withMastered(p, id);
    }
    expect(coachVisibility(p).trueCount).toBe(true);
  });
});

describe('progressive jargon', () => {
  test('full form until fluent, then short', () => {
    const p = emptyProgress();
    expect(jargonForm('runningCount', p)).toBe('full');
    expect(jargonText('runningCount', p)).toBe('Running Count');
  });

  test('collapses to short after ~10 exposures', () => {
    const seen: ProgressState = { ...emptyProgress(), jargonSeen: { runningCount: JARGON_THRESHOLD } };
    expect(jargonForm('runningCount', seen)).toBe('short');
    expect(jargonText('runningCount', seen)).toBe('RC');
  });

  test('collapses immediately once the teaching level is mastered', () => {
    const known = withMastered(emptyProgress(), 'true-count');
    expect(jargonForm('trueCount', known)).toBe('short');
    expect(jargonText('trueCount', known)).toBe('TC');
    // book collapses once basic-strategy is mastered
    expect(jargonText('book', withMastered(emptyProgress(), 'basic-strategy'))).toBe('Book');
  });

  test('terms without a teaching level only collapse via exposure', () => {
    expect(jargonForm('record', emptyProgress())).toBe('full');
    expect(jargonForm('record', { ...emptyProgress(), jargonSeen: { record: 10 } })).toBe('short');
  });
});
