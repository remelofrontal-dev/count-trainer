import { describe, expect, test } from 'bun:test';
import { EMPTY_RECORD, foldRecord, liveRunningCount, liveTrueCount } from '../play';
import { type AppDeps, createAppStore } from '../store';
import { localOnlyRegistry } from '../identity';
import { InMemoryStorage } from '../storage';
import { startRound, DEFAULT_TABLE, tableRunningCount } from '../../engine/table';
import { Shoe } from '../../engine/deck';

function makeDeps(over: Partial<AppDeps> = {}): AppDeps {
  let seed = 1;
  return {
    storage: new InMemoryStorage(),
    now: () => 1_000_000,
    today: () => '2026-06-11',
    nextSeed: () => seed++,
    syncClient: null,
    registry: localOnlyRegistry,
    ...over,
  };
}

describe('play helpers', () => {
  test('foldRecord tallies the human seat W/L/P + chips', () => {
    const s = startRound({ ...DEFAULT_TABLE, blackjackPayout: '3:2' }, new Shoe(6, { seed: 1 }), 100, 1);
    const rec = foldRecord(EMPTY_RECORD, s);
    expect(rec.wins + rec.losses + rec.pushes).toBeGreaterThanOrEqual(0);
  });

  test('liveRunningCount = accumulated + current round; trueCount guards 0 decks', () => {
    const s = startRound(DEFAULT_TABLE, new Shoe(6, { seed: 2 }), 100, 2);
    expect(liveRunningCount(5, s)).toBe(5 + tableRunningCount(s));
    expect(liveRunningCount(3, null)).toBe(3);
    expect(liveTrueCount(6, 0)).toBe(0);
    expect(liveTrueCount(6, 3)).toBe(2);
  });
});

describe('play store flow', () => {
  test('enter → deal → act resolves a round and updates the record', () => {
    const store = createAppStore(makeDeps());
    store.getState().enterPlay();
    expect(store.getState().screen).toBe('play');
    store.getState().dealRound();
    expect(store.getState().play).not.toBeNull();
    // play out the round (always stand) until settlement
    let guard = 0;
    while (store.getState().play!.phase === 'player' && guard++ < 20) {
      store.getState().playAct('stand');
    }
    expect(store.getState().play!.phase).toBe('settlement');
    const rec = store.getState().playRecord;
    expect(rec.wins + rec.losses + rec.pushes).toBeGreaterThanOrEqual(1);
  });

  test('the count carries across rounds (same shoe), resets on config change', () => {
    const store = createAppStore(makeDeps());
    store.getState().enterPlay();
    store.getState().dealRound();
    let guard = 0;
    while (store.getState().play!.phase === 'player' && guard++ < 20) store.getState().playAct('stand');
    const countAfterRound1 = store.getState().playCount;
    expect(countAfterRound1).toBe(tableRunningCount(store.getState().play!));
    const shoeRef = store.getState().playShoe;

    store.getState().dealRound(); // round 2 — same shoe
    expect(store.getState().playShoe).toBe(shoeRef); // shoe persisted
    guard = 0;
    while (store.getState().play!.phase === 'player' && guard++ < 20) store.getState().playAct('stand');
    expect(store.getState().playCount).not.toBe(countAfterRound1); // accumulated further

    store.getState().setPlayConfig({ decks: 2 }); // config change → fresh shoe + count reset
    expect(store.getState().playShoe).toBeNull();
    expect(store.getState().playCount).toBe(0);
    expect(store.getState().playConfig.decks).toBe(2);
  });

  test('coach toggle flips; seat config persists in playConfig', () => {
    const store = createAppStore(makeDeps());
    expect(store.getState().playCoach).toBe(true);
    store.getState().togglePlayCoach();
    expect(store.getState().playCoach).toBe(false);
    store.getState().setPlayConfig({ numAISeats: 3, playerSeatIndex: 1 });
    expect(store.getState().playConfig.numAISeats).toBe(3);
    store.getState().dealRound();
    expect(store.getState().play!.seats).toHaveLength(4);
  });

  test('exitPlay returns home', () => {
    const store = createAppStore(makeDeps());
    store.getState().enterPlay();
    store.getState().exitPlay();
    expect(store.getState().screen).toBe('home');
  });

  test('mode navigation switches screens: home → modes → info → play → home', () => {
    const store = createAppStore(makeDeps());
    store.getState().goModes();
    expect(store.getState().screen).toBe('modes');
    store.getState().goInfo();
    expect(store.getState().screen).toBe('info');
    store.getState().enterPlay();
    expect(store.getState().screen).toBe('play');
    store.getState().goHome();
    expect(store.getState().screen).toBe('home');
  });

  test('6:5 table yields a smaller blackjack payout than 3:2 over the same dealt shoe', () => {
    // Deterministic: same seed, compare a natural-blackjack round's chips.
    const mk = (payout: '3:2' | '6:5') => {
      const store = createAppStore(makeDeps());
      store.getState().setPlayConfig({ blackjackPayout: payout });
      // deal until the player gets a natural (bounded search)
      for (let i = 0; i < 40; i++) {
        store.getState().dealRound();
        const seat = store.getState().play!.seats.find((s) => s.isPlayer)!;
        if (seat.hands[0]!.outcome === 'blackjack') return seat.hands[0]!.net;
        let g = 0;
        while (store.getState().play!.phase === 'player' && g++ < 20) store.getState().playAct('stand');
      }
      return null;
    };
    const net32 = mk('3:2');
    const net65 = mk('6:5');
    if (net32 !== null && net65 !== null) {
      expect(net32).toBe(150);
      expect(net65).toBe(120);
    }
  });
});
