# ENGINE_SOURCES.md — authoritative sources for every chart in the engine

> Brief §4.4 / §4.5: *"Verified-correct charts (two published sources, documented,
> test-covered) are a marketing asset; one wrong cell is a permanent reputation
> wound on Reddit/Google."* This file is the trust backbone — it feeds the in-app
> **"Our Math"** screen. Every strategy/deviation table the app teaches MUST be
> cross-checked against ≥2 independent published sources and listed here before a
> drill is built on it.

## Ruleset the charts assume

4–8 deck shoe · dealer peeks for blackjack · DAS allowed · late surrender available.
Both **H17** (dealer hits soft 17) and **S17** are supported; the engine encodes S17
as the base table plus an explicit H17 override set (`H17_OVERRIDES` in
`src/engine/basicStrategy.ts`) so the divergence is data, not duplicated tables.

## Basic strategy (`src/engine/basicStrategy.ts`) — STATUS: verified

| Table | Source 1 | Source 2 | Cross-check |
|-------|----------|----------|-------------|
| Hard totals 4–21 | Wizard of Odds — *4–8 Deck, Dealer Hits/Stands Soft 17* (wizardofodds.com/games/blackjack/strategy/4-decks/) | Stanford Wong, *Professional Blackjack* (Pi Yee Press) — basic strategy appendix | every cell |
| Soft totals A2–A9 | Wizard of Odds (same) | Wong, *Professional Blackjack* | every cell |
| Pair splitting | Wizard of Odds (same) | Wong, *Professional Blackjack* | every cell |
| H17 vs S17 divergence (the 6-cell override set) | Wizard of Odds H17 vs S17 charts | Wong | exact diff set |

**Verification record:** the full 18×10 hard / 9×10 soft / 10×10 pair matrices were
checked cell-by-cell against the Wizard of Odds 4–8 deck DAS+LS charts during the
Phase 0 cross-vendor review (2026-06-10, GPT-5.4/Forge), and the H17/S17 divergence
set `{hard 11vA→D, 15vA→Rh, 17vA→Rs, soft 18v2→Ds, 19v6→Ds, pair 8,8vA→Rp}` was
confirmed complete and correct. Unit test `basicStrategy.test.ts` (ISC-33) pins the
divergence set; a transposed cell fails the suite. **Open item:** add a frozen
golden-chart fixture asserting all 370 cells against an independently transcribed
copy (queued in ISA Changelog) so a systematic transcription error can't hide in
self-referential tests.

## Deviations / Illustrious 18 — STATUS: not yet built

Before the Deviations drill is built, index plays will be validated against:
- Don Schlesinger, *Blackjack Attack: Playing the Pros' Way* — the origin of the
  Illustrious 18 and Fab 4 surrender indices.
- Wizard of Odds deviation tables (Hi-Lo, 4–8 deck).

## Table / settlement math (`src/engine/table.ts`)

| Rule | Source |
|------|--------|
| Blackjack pays 3:2 (and the punitive 6:5 variant) | Standard US casino rules; 6:5 house-edge penalty per Wizard of Odds blackjack house-edge calculator |
| Dealer hits to 17, H17 hits soft 17 | Standard US shoe rules |
| Double / split / surrender mechanics | Wong, *Professional Blackjack* |

The 6:5 settlement path is unit-tested explicitly (brief §A2.6 requirement) — the
"Table Quality A–F" grade and the *"why counters walk past 6:5 tables"* lesson
depend on the payout math being correct.
