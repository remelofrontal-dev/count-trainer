/**
 * Mode registry (brief §4.6.2) — the single source of truth for the Modes hub
 * and the bottom nav. "One engine, four launch modes" plus the two premium ones.
 */

import type { Tier } from './entitlement';

export type ModeId = 'journey' | 'quick-drill' | 'play' | 'daily-shoe' | 'gauntlet';
export type ModeStatus = 'live' | 'soon';

export interface ModeDef {
  id: ModeId;
  title: string;
  glyph: string;
  blurb: string;
  mood: string;
  tier: Tier;
  status: ModeStatus;
}

export const MODES: readonly ModeDef[] = [
  {
    id: 'journey',
    title: 'Journey',
    glyph: '♦',
    blurb: 'The guided skill path — gates, mastery, Casino Ready.',
    mood: "I'm making progress",
    tier: 'free',
    status: 'live',
  },
  {
    id: 'quick-drill',
    title: 'Quick Drill',
    glyph: '♣',
    blurb: 'Any unlocked skill, 2-minute burst, chase your best.',
    mood: 'I have 3 minutes',
    tier: 'free',
    status: 'live',
  },
  {
    id: 'play',
    title: 'Play',
    glyph: '♠',
    blurb: 'Full blackjack table — count for real, coach optional.',
    mood: 'I want to play',
    tier: 'free',
    status: 'live',
  },
  {
    id: 'daily-shoe',
    title: 'Daily Shoe',
    glyph: '☀',
    blurb: 'Same shoe for everyone today. One leaderboard.',
    mood: 'Compete today',
    tier: 'free',
    status: 'soon',
  },
  {
    id: 'gauntlet',
    title: 'The Gauntlet',
    glyph: '🔥',
    blurb: 'Survival — speed and distractions ramp until you break.',
    mood: 'Test me',
    tier: 'premium',
    status: 'soon',
  },
];

export function modeById(id: ModeId): ModeDef {
  const m = MODES.find((x) => x.id === id);
  if (m === undefined) throw new Error(`Unknown mode: ${id}`);
  return m;
}
