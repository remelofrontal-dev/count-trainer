/**
 * Design tokens — brief §4.2. This file is the ONLY place raw hex values live.
 *
 * Emerald (#3DDC84) is reserved for progress and wins ONLY (brief §7.4).
 * It is deliberately NOT exported as a general color: the public theme exposes
 * it exclusively through `semantic.progress` and `semantic.win`. A unit test
 * (theme.test.ts) fails the build if the raw hex appears anywhere else in src/.
 */

// Internal palette — not exported. Consumers go through `theme`.
const palette = {
  felt: '#0C1512', // Base background
  panel: '#141F1A', // Surfaces/cards
  cardStock: '#F2EDE2', // Text & playing cards
  emerald: '#3DDC84', // Progress/wins ONLY (never decorative)
  brass: '#C9A85C', // Casino accents, streaks, league
  suitRed: '#C8453A', // Errors, −1 count, losses
  line: '#26352D', // Borders
  mute: '#6E8278', // Secondary text
} as const;

export const theme = {
  colors: {
    background: palette.felt,
    surface: palette.panel,
    text: palette.cardStock,
    card: palette.cardStock,
    accent: palette.brass,
    streak: palette.brass,
    league: palette.brass,
    error: palette.suitRed,
    loss: palette.suitRed,
    countMinus: palette.suitRed,
    border: palette.line,
    textSecondary: palette.mute,
  },
  // Emerald lives here and ONLY here.
  semantic: {
    progress: palette.emerald,
    win: palette.emerald,
    countPlus: palette.emerald,
  },
  typography: {
    display: 'Big Shoulders Display', // counts and scores are heroes
    body: 'Outfit', // body/UI
  },
  motion: {
    answerFlashMs: 80, // green/red flash on answers (brief §4.2)
  },
} as const;

export type Theme = typeof theme;
