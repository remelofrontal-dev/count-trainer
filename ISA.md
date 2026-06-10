---
task: "Count Trainer Phase 0 foundation: scaffold, tokens, engine"
slug: 20260610-150000_count-trainer-phase-0
project: count-trainer
effort: E3
effort_source: classifier
phase: build
progress: 0/45
mode: interactive
started: 2026-06-10T15:00:00-07:00
updated: 2026-06-10T15:00:00-07:00
---

# ISA — Count Trainer (Phase 0: Foundation)

## Problem

The Count Trainer exists only as a web prototype on Base44 and a master brief. There is no mobile codebase, no design-token theme, no CI, and — most critically — no correctness-verified counting engine. Every later phase (drills, gates, Casino Ready Score, billing) sits on top of the pure-TS engine; if its math is wrong, the product teaches users wrong counting and the entire premise collapses. Phase 0 must produce a repo where the engine is provably flawless before any UI work begins.

## Vision

A founder opens the repo and sees a clean Expo + TypeScript scaffold whose theme file reads like the brief's token table verbatim, and an engine directory where `bun test --coverage` prints all-green with 100% engine coverage — including the nasty edge cases (multi-ace soft hands, H17/S17 divergence cells, sub-one-deck true counts, cut-card penetration). The feeling: "the foundation is already casino-grade; everything from here is assembly."

## Out of Scope

Phases 1–4 entirely: no onboarding flow, no drill/results/home screens, no mastery-gate UI, no Supabase, no RevenueCat/billing, no analytics SDK, no pressure engine, no additional counting systems (KO/Omega II/etc.), no store assets. No EAS account login or actual cloud build run — Phase 0 ships CI *configuration*, not a triggered build. No deviation from brief pricing, gate sequence, or phase order.

## Principles

- Counting math correctness outranks every other concern in this phase — the engine IS the product.
- The engine is substrate-independent: pure TypeScript, zero React/Expo imports, runnable anywhere Bun runs.
- Determinism by design: shuffles are seeded so daily challenges and tests are reproducible.
- Design tokens are data, not convention — the theme layer enforces the brief, code can't drift from it.

## Constraints

- React Native + Expo + TypeScript (brief §4.3). bun/bunx only — never npm/npx.
- Engine is a pure TS module with 100% unit-test coverage (brief §4.4 Phase 0 — non-negotiable).
- Color tokens exactly as §4.2; Emerald #3DDC84 only for progress/wins, enforced in the theme layer.
- No Stripe for anything, ever (store-rejection risk, brief §7.6).
- Strategy tables assume 4–8 deck shoe, DAS allowed, late surrender available, both H17 and S17 dealer rules supported.
- Hi-Lo is the v1 system; engine API must not hardcode it (other systems arrive Phase 3).

## Goal

A git-initialized Expo+TypeScript repo at `count-trainer/` containing the §4.2 design tokens as an enforced theme, EAS + CI config, and a dependency-free `src/engine` module (deck/shoe, Hi-Lo, true count, hand math, H17/S17 basic strategy, scoring) that passes its full test suite at 100% line coverage under `bun test`.

## Criteria

### Scaffold & repo
- [ ] ISC-1: `git -C count-trainer log --oneline` shows ≥1 commit
- [ ] ISC-2: `package.json` declares expo, react, react-native, typescript; name is "count-trainer"
- [ ] ISC-3: `tsconfig.json` has `"strict": true`
- [ ] ISC-4: `App.tsx` exists and imports theme from `src/theme`
- [ ] ISC-5: `app.json` sets app background / splash to Felt #0C1512 and userInterfaceStyle dark
- [ ] ISC-6: `eas.json` defines development, preview, and production build profiles
- [ ] ISC-7: `.github/workflows/ci.yml` runs engine tests with bun on push

### Theme (design tokens §4.2)
- [ ] ISC-8: `src/theme/tokens.ts` contains all 8 exact hex values (#0C1512, #141F1A, #F2EDE2, #3DDC84, #C9A85C, #C8453A, #26352D, #6E8278) — grep count = 8
- [ ] ISC-9: Theme exposes emerald only via semantic keys (progress/win) — no generic `emerald` export on the public theme object
- [ ] ISC-10: Typography tokens name "Big Shoulders Display" (display) and "Outfit" (body)
- [ ] ISC-11: A unit test fails if raw `#3DDC84` appears in `src/` outside the tokens file (enforcement test exists and passes)

### Engine — deck & shoe
- [ ] ISC-12: `buildDeck()` returns exactly 52 cards
- [ ] ISC-13: Deck contains 13 ranks × 4 suits with zero duplicates
- [ ] ISC-14: `buildShoe(n)` returns 52×n cards for n=1,2,6,8
- [ ] ISC-15: Seeded shuffle is deterministic — same seed produces identical order twice
- [ ] ISC-16: Different seeds produce different orders
- [ ] ISC-17: `Shoe.draw()` decrements remaining; drawing from an empty shoe throws
- [ ] ISC-18: Cut card at penetration 0.75 — `cutCardReached` is false before 75% drawn, true after
- [ ] ISC-19: `decksRemaining` returns fractional decks (e.g., 26 cards → 0.5)

### Engine — Hi-Lo count
- [ ] ISC-20: Hi-Lo value is +1 for each of 2,3,4,5,6
- [ ] ISC-21: Hi-Lo value is 0 for each of 7,8,9
- [ ] ISC-22: Hi-Lo value is −1 for each of 10,J,Q,K,A
- [ ] ISC-23: Running count over any full deck/shoe sums to 0 (balanced system, tested at 1 and 6 decks)

### Engine — true count
- [ ] ISC-24: True count = RC ÷ decksRemaining (RC +6, 3 decks → +2.0 exact)
- [ ] ISC-25: Floored true count truncates toward zero (+5/2 → +2, −5/2 → −2), convention documented in source
- [ ] ISC-26: Sub-one-deck division works (RC +2, 26 cards → +4.0)
- [ ] ISC-27: True count with 0 cards remaining throws (guarded division by zero)

### Engine — hand math
- [ ] ISC-28: Hard totals correct (10+9=19); soft totals correct (A+6 = 17, isSoft=true)
- [ ] ISC-29: Multi-ace hands: A+A = soft 12; A+A+9 = soft 21; A+6+10 = hard 17 (ace demotion)
- [ ] ISC-30: Blackjack = exactly two cards A+ten-value; 21 in 3+ cards is NOT blackjack
- [ ] ISC-31: Pair detection by rank; bust detection at >21

### Engine — basic strategy (H17 + S17)
- [ ] ISC-32: Every (player hand, dealer upcard) combination returns a defined action for both H17 and S17 — exhaustive loop test, no undefined cells
- [ ] ISC-33: H17/S17 divergence is exactly the documented cell set (11 vs A, soft 18 vs 2, soft 19 vs 6, surrender cells) — diff-enumeration test
- [ ] ISC-34: Hard-total spot checks: 12 vs 2→Hit, 12 vs 4→Stand, 16 vs 10→Surrender-else-Hit, 9 vs 3→Double, 11 vs 6→Double
- [ ] ISC-35: Soft-total spot checks: A7 vs 9→Hit, A7 vs 3→Double-else-Stand, A8 vs 6→Stand(S17)/Double-else-Stand(H17)
- [ ] ISC-36: Pair spot checks: 8,8 always split; A,A always split; 10,10 never split; 9,9 stands vs 7/10/A and splits vs 2–6,8,9; 5,5 never splits (plays as hard 10)

### Engine — scoring
- [ ] ISC-37: Accuracy = correct/total, returns 0 on zero attempts (no NaN); speed score is monotonic in ms-per-card and bounded 0–100
- [ ] ISC-38: Casino Ready v1 composite (speed+accuracy) bounded 0–100; peek penalty subtracts 5 points and floors at 0

### Quality gates
- [ ] ISC-39: `bun test` exits 0 with zero failures
- [ ] ISC-40: `bun test --coverage` reports 100% line coverage for every file under `src/engine/`
- [ ] ISC-41: Engine purity — no file in `src/engine/` imports react/react-native/expo (grep returns nothing)

### Anti-criteria
- [ ] ISC-42: Anti: "stripe" appears nowhere in package.json or source
- [ ] ISC-43: Anti: raw #3DDC84 appears nowhere in src/ outside src/theme/tokens.ts
- [ ] ISC-44: Anti: no package-lock.json or yarn.lock (bun-only repo)
- [ ] ISC-45: Anti: no .py files anywhere in the repo

## Test Strategy

| isc | type | check | threshold | tool |
|---|---|---|---|---|
| 1 | repo | git log non-empty | ≥1 commit | Bash git |
| 2–7 | config | file content matches spec | exact keys present | Read/Grep |
| 8–10 | theme | hex/font strings present | exact match | Grep |
| 11 | enforcement | test exists + suite green | pass | bun test |
| 12–38 | unit | engine behavior assertions | all pass | bun test |
| 32 | property | exhaustive cell loop | 0 undefined | bun test |
| 33 | diff-enum | H17 vs S17 diff set equality | exact set | bun test |
| 39 | suite | exit code | 0 | Bash bun test |
| 40 | coverage | line coverage per engine file | 100% | bun test --coverage |
| 41, 43 | purity | grep for forbidden imports/hex | 0 matches | Grep |
| 42, 44, 45 | anti | grep/find forbidden artifacts | 0 matches | Bash/Grep |

## Features

| name | description | satisfies | depends_on | parallelizable |
|---|---|---|---|---|
| repo-scaffold | Expo+TS app skeleton, git init, configs | ISC-1..7, 44, 45 | — | yes |
| theme-tokens | §4.2 tokens + emerald enforcement | ISC-8..11, 43 | repo-scaffold | yes |
| engine-deck | deck/shoe/seeded shuffle/penetration | ISC-12..19 | — | yes |
| engine-hilo | Hi-Lo values + running count | ISC-20..23 | engine-deck | no |
| engine-truecount | conversion + flooring + guards | ISC-24..27 | engine-hilo | no |
| engine-hand | totals, soft/hard, blackjack, pairs | ISC-28..31 | engine-deck | yes |
| engine-strategy | H17/S17 tables + lookup | ISC-32..36 | engine-hand | no |
| engine-scoring | accuracy/speed/Casino Ready v1 | ISC-37..38 | — | yes |
| quality-gates | full suite, coverage, purity, anti | ISC-39..42 | all engine | no |
| forge-review | GPT-5.4 adversarial engine correctness review | ISC-33..36 | engine-strategy | yes |

## Decisions

- 2026-06-10: Strategy-table rule assumptions fixed for v1: 4–8 decks, DAS, late surrender available, peek game. Logged because charts differ by ruleset; brief doesn't pin rules, these are the standard US shoe-game defaults the ICP will face.
- 2026-06-10: Pair detection is by rank (K+Q is not a splittable pair). Mixed ten-value "pairs" are not splittable in most casinos' training conventions and splitting tens is never correct basic strategy anyway.
- 2026-06-10: True count flooring truncates toward zero (industry convention for betting decisions); exact float also exposed for drills.
- 2026-06-10: Scaffold is hand-authored (package.json + configs) rather than `bunx create-expo-app` — deterministic, no multi-minute dependency install needed since Phase 0 acceptance runs entirely on the dependency-free engine via bun test. `bun install` deferred to Phase 1 when UI work begins.
- 2026-06-10: show-your-math (delegation floor): Explore/second delegate skipped — all file targets are known and newly authored; nothing to search. Forge covers the E3 coding-task binding as adversarial reviewer of the correctness-critical strategy tables.
- 2026-06-10: EnterPlanMode skipped despite E3: user explicitly instructed "start Phase 0" against an approved written plan (the brief §4.4); session is autonomous — blocking on plan approval would contradict the directive.
