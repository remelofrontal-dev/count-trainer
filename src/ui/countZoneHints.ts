/**
 * Count-zone hint labels — DERIVED from the engine's counting system, never
 * hand-written. The UX mockup shipped with the −1/+1 hints inverted (see ISA
 * Decisions 2026-06-10); deriving from HI_LO makes that error structurally
 * impossible: the UI cannot teach a count the engine doesn't compute.
 */

import { HI_LO } from '../engine/counting';
import { RANKS, type Rank } from '../engine/types';
import type { CountingSystem } from '../engine/types';

function display(rank: Rank): string {
  return rank;
}

function ranksWithTag(system: CountingSystem, tag: number): Rank[] {
  const ranks = RANKS.filter((rank) => system.tags[rank] === tag);
  // Mockup ordering puts the ace last (10 · J · Q · K · A).
  return [...ranks.filter((r) => r !== 'A'), ...ranks.filter((r) => r === 'A')];
}

export interface ZoneHints {
  minus: string;
  zero: string;
  plus: string;
}

export function zoneHints(system: CountingSystem = HI_LO): ZoneHints {
  const join = (tag: number) => ranksWithTag(system, tag).map(display).join(' · ');
  return { minus: join(-1), zero: join(0), plus: join(1) };
}
