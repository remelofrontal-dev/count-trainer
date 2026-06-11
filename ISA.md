---
task: "Count Trainer Phase A2: full premium features, modes, placement"
slug: 20260610-193000_count-trainer-phase-1
project: count-trainer
effort: E3
effort_source: classifier
phase: build
progress: 102/110
mode: interactive
started: 2026-06-10T15:00:00-07:00
updated: 2026-06-11T03:15:00-07:00
live_url: https://remelofrontal-dev.github.io/count-trainer/
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
- [x] ISC-1: `git -C count-trainer log --oneline` shows ≥1 commit
- [x] ISC-2: `package.json` declares expo, react, react-native, typescript; name is "count-trainer"
- [x] ISC-3: `tsconfig.json` has `"strict": true`
- [x] ISC-4: `App.tsx` exists and imports theme from `src/theme`
- [x] ISC-5: `app.json` sets app background / splash to Felt #0C1512 and userInterfaceStyle dark
- [x] ISC-6: `eas.json` defines development, preview, and production build profiles
- [x] ISC-7: `.github/workflows/ci.yml` runs engine tests with bun on push

### Theme (design tokens §4.2)
- [x] ISC-8: `src/theme/tokens.ts` contains all 8 exact hex values (#0C1512, #141F1A, #F2EDE2, #3DDC84, #C9A85C, #C8453A, #26352D, #6E8278) — grep count = 8
- [x] ISC-9: Theme exposes emerald only via semantic keys (progress/win) — no generic `emerald` export on the public theme object
- [x] ISC-10: Typography tokens name "Big Shoulders Display" (display) and "Outfit" (body)
- [x] ISC-11: A unit test fails if raw `#3DDC84` appears in `src/` outside the tokens file (enforcement test exists and passes)

### Engine — deck & shoe
- [x] ISC-12: `buildDeck()` returns exactly 52 cards
- [x] ISC-13: Deck contains 13 ranks × 4 suits with zero duplicates
- [x] ISC-14: `buildShoe(n)` returns 52×n cards for n=1,2,6,8
- [x] ISC-15: Seeded shuffle is deterministic — same seed produces identical order twice
- [x] ISC-16: Different seeds produce different orders
- [x] ISC-17: `Shoe.draw()` decrements remaining; drawing from an empty shoe throws
- [x] ISC-18: Cut card at penetration 0.75 — `cutCardReached` is false before 75% drawn, true after
- [x] ISC-19: `decksRemaining` returns fractional decks (e.g., 26 cards → 0.5)

### Engine — Hi-Lo count
- [x] ISC-20: Hi-Lo value is +1 for each of 2,3,4,5,6
- [x] ISC-21: Hi-Lo value is 0 for each of 7,8,9
- [x] ISC-22: Hi-Lo value is −1 for each of 10,J,Q,K,A
- [x] ISC-23: Running count over any full deck/shoe sums to 0 (balanced system, tested at 1 and 6 decks)

### Engine — true count
- [x] ISC-24: True count = RC ÷ decksRemaining (RC +6, 3 decks → +2.0 exact)
- [x] ISC-25: Floored true count truncates toward zero (+5/2 → +2, −5/2 → −2), convention documented in source
- [x] ISC-26: Sub-one-deck division works (RC +2, 26 cards → +4.0)
- [x] ISC-27: True count with 0 cards remaining throws (guarded division by zero)

### Engine — hand math
- [x] ISC-28: Hard totals correct (10+9=19); soft totals correct (A+6 = 17, isSoft=true)
- [x] ISC-29: Multi-ace hands: A+A = soft 12; A+A+9 = soft 21; A+6+10 = hard 17 (ace demotion)
- [x] ISC-30: Blackjack = exactly two cards A+ten-value; 21 in 3+ cards is NOT blackjack
- [x] ISC-31: Pair detection by rank; bust detection at >21

### Engine — basic strategy (H17 + S17)
- [x] ISC-32: Every (player hand, dealer upcard) combination returns a defined action for both H17 and S17 — exhaustive loop test, no undefined cells
- [x] ISC-33: H17/S17 divergence is exactly the documented cell set (11 vs A, soft 18 vs 2, soft 19 vs 6, surrender cells) — diff-enumeration test
- [x] ISC-34: Hard-total spot checks: 12 vs 2→Hit, 12 vs 4→Stand, 16 vs 10→Surrender-else-Hit, 9 vs 3→Double, 11 vs 6→Double
- [x] ISC-35: Soft-total spot checks: A7 vs 9→Hit, A7 vs 3→Double-else-Stand, A8 vs 6→Stand(S17)/Double-else-Stand(H17)
- [x] ISC-36: Pair spot checks: 8,8 always split; A,A always split; 10,10 never split; 9,9 stands vs 7/10/A and splits vs 2–6,8,9; 5,5 never splits (plays as hard 10)

### Engine — scoring
- [x] ISC-37: Accuracy = correct/total, returns 0 on zero attempts (no NaN); speed score is monotonic in ms-per-card and bounded 0–100
- [x] ISC-38: Casino Ready v1 composite (speed+accuracy) bounded 0–100; peek penalty subtracts 5 points and floors at 0

### Quality gates
- [x] ISC-39: `bun test` exits 0 with zero failures
- [x] ISC-40: `bun test --coverage` reports 100% line coverage for every file under `src/engine/`
- [x] ISC-41: Engine purity — no file in `src/engine/` imports react/react-native/expo (grep returns nothing)

### Phase 1 — domain logic (pure TS, tested)
- [x] ISC-46: Level definitions exist for L1 Card Values, L2 Running Count (slow), L3 Running Count (speed), each with gate thresholds (≥95% accuracy + per-level max ms/card)
- [x] ISC-47: Gate evaluation passes ONLY when session accuracy ≥95% AND avg ms/card ≤ level threshold — both boundaries unit-tested
- [x] ISC-48: Levels unlock strictly in sequence — L2 locked until L1 gate passed, L3 until L2; locked-level drill start is rejected
- [x] ISC-49: Drill session machine deals → grades → advances, recording per-card latency ms and correctness
- [x] ISC-50: Peek is recorded per session and applies −5 each to the session score (engine applyPeekPenalty wired)
- [x] ISC-51: Drill session ends at the 120s time cap (two-minute loop) — tick past cap transitions to finished
- [x] ISC-52: All levels grade per-card Hi-Lo tag answers (−1/0/+1) against engine tags; running-count levels additionally track the cumulative count revealed only by peek (refined 2×: zones tapping tags IS the mockup's interaction; hint labels fade at higher levels)
- [x] ISC-53: Streak increments on consecutive-day completion, persists same-day repeats, resets to 1 after a missed day
- [x] ISC-54: Streak day-rollover uses local calendar dates — midnight boundary tested with injected clock
- [x] ISC-55: ProgressState round-trips serialize → deserialize losslessly through the Storage interface
- [x] ISC-56: AsyncStorage adapter and InMemory adapter both satisfy the Storage interface; tests run on InMemory
- [x] ISC-57: Casino Ready score recomputes after each session as best-of-last-10-sessions composite and persists

### Phase 1 — UI layer
- [x] ISC-58: Four screens exist (Onboarding, Home, Drill, Results), all colors sourced from theme tokens
- [x] ISC-59: Drill screen interactive controls live in the bottom half — layout constants assert thumb-zone placement, unit-tested
- [x] ISC-60: Anti: no Alert/confirm dialog imports anywhere in the drill flow
- [x] ISC-61: Count-zone hints match engine truth: −1 zone labeled 10·J·Q·K·A (suit red), +1 zone labeled 2·3·4·5·6 (semantic emerald) — unit test derives labels FROM HI_LO tags (mockup had these inverted; engine is ground truth)
- [x] ISC-62: Results screen renders exactly one dominant CTA: "ONE MORE ROUND →"
- [x] ISC-63: Navigation reaches Drill from cold start without any auth step; account prompt appears only on/after first Results
- [x] ISC-64: App.tsx mounts the navigation root with all four screens registered

### Phase 1 — infra & quality
- [x] ISC-65: `bun install` complete and `bunx tsc --noEmit` exits 0 (strict mode, whole repo)
- [x] ISC-66: Full suite green and engine coverage remains 100% lines+funcs
- [x] ISC-67: Supabase sync module is offline-first — without env credentials it queues locally and never throws; queue drain logic unit-tested with a mock client
- [x] ISC-68: Anti: emerald enforcement test still passes with all new UI files (no raw #3DDC84 outside tokens)
- [ ] ISC-69: [DEFERRED-VERIFY] Live device flow: install → counting cards → first result → streak day 2, zero crashes (follow-up: founder runs `bunx expo start` on device; tracked as Phase 1 QA task in Decisions)

### Phase 1.1 — Forge-fix hardening (gate integrity + resilience)
- [x] ISC-70: Mastery gate requires completion — answering < cardsPerSession fails the gate even at 100% accuracy/speed (closes the 1-card+timeout bypass Forge proved at runtime)
- [x] ISC-71: loadProgress never throws on a corrupt local blob — falls back to emptyProgress (startup cannot brick)
- [x] ISC-72: sync queue tolerates corrupted JSON (returns []), never throws, capped at MAX_QUEUE=500 (no unbounded growth)
- [x] ISC-73: synced ScoreEvent carries the peek count (honesty signal preserved for server validation)

### Phase 1.2 — Web distribution (shareable free v1)
- [x] ISC-74: `bunx expo export -p web` produces dist/ with index.html + hashed JS bundle, zero build errors
- [x] ISC-75: Deployed public URL returns HTTP 200 and references the app bundle
- [x] ISC-76: Deployed site renders in a real browser engine (onboarding: felt bg, display headline, emerald CTA) — headless-Chrome screenshot evidence
- [x] ISC-77: Interactive flow works on the LIVE URL: tap "DEAL ME IN" → drill screen with timer/card/zones (CDP click-through proof)
- [x] ISC-78: Count-zone labels on the live site match engine truth (−1→10·J·Q·K·A, +1→2·3·4·5·6) — mockup-inversion fix verified in production DOM
- [x] ISC-79: Anti: no secrets in the public repo (.env.example holds empty placeholders only; secret-pattern grep returns nothing)

### Phase A2 — full build (handoff v3, founder chose Option B). Brief order: entitlement → table engine → placement → down the list.
**Done this increment:**
- [x] ISC-93: BETA_ALL_ACCESS launch switch — all premium resolves unlocked while true; flip to false = the split, no other code changes
- [x] ISC-94: Entitlement checks at every premium boundary still written; effectivePremium/hasAccess/showProTag unit-tested
- [x] ISC-95: devForceFree simulates the FREE tier during beta (test locked UX); Dev Menu exposes purchased-premium + force-free
- [x] ISC-96: Tier map (handoff §4) — levels carry tier; 3 existing levels free; Basic Strategy free, True Count+ premium
- [x] ISC-97: ENGINE_SOURCES.md documents 2 sources (Wizard of Odds + Wong) per strategy table — trust backbone
- [x] ISC-98: Table engine state machine BETTING→PLAYER→DEALER→SETTLEMENT (src/engine/table.ts)
- [x] ISC-99: Hit/Stand/Double/Split + multi-hand; split-21 is NOT a blackjack (even money) — unit-tested
- [x] ISC-100: Settlement pays 3:2 AND 6:5 correctly (6:5 path explicitly tested — feeds the table-quality grade)
- [x] ISC-101: 0–5 AI seats play basic strategy w/ tourist mistakes; their cards feed the count; dealing order tested
- [x] ISC-102: Dealer H17/S17 rules; dealer stands pat when all players bust — unit-tested
**Pending (next increments):**
- [ ] ISC-103: Drill engine generalized to action (strategy) + number (true-count) question types
- [ ] ISC-104: Level 0 Blackjack Basics — show-then-do micro-lessons (beginner on-ramp)
- [ ] ISC-105: Levels 4–9 (Basic Strategy free → True Count → Deck Est → Deviations → Bet Spreads → Full Table)
- [x] ISC-106: Play mode UI — felt table (dealer+seats), Hit/Stand/Double/Split, Coach ON/OFF overlay (live RC+TC+book play), seat config (heads-up↔multi, PRO-tagged), 3:2↔6:5 toggle, W/L/P+chips header, count carries across rounds. Verified live via CDP (deal→coach RC−1→act→settle, 0 errors). [deal-speed selector + count-quiz fold into ISC-108]
- [ ] ISC-107: Table Rules presets + Table Quality A–F grade + "why counters walk past 6:5" lesson
- [ ] ISC-108: Table Briefings (30s/mode, "?" re-open); Quick Drill mode; global count-quiz mechanic
- [ ] ISC-109: Trust layer — "Our Math" screen, score-meaning + Bet Spreads expectations cards, mandatory "Know the Law" card
- [ ] ISC-110: Stats Hub (dial + 5 sub-skill bars, premium-tagged) + paywall preview (dormant while BETA_ALL_ACCESS)

### Anti-criteria
- [x] ISC-42: Anti: "stripe" appears nowhere in package.json or source
- [x] ISC-43: Anti: raw #3DDC84 appears nowhere in src/ outside src/theme/tokens.ts
- [x] ISC-44: Anti: no package-lock.json or yarn.lock (bun-only repo)
- [x] ISC-45: Anti: no .py files anywhere in the repo

### Phase A2-lite — tester slice increment 1 (2026-06-11)
- [x] ISC-80: Name gate is the first screen for a new tester; empty/whitespace names rejected; valid name persists and personalizes Home ("Hey {name}")
- [x] ISC-81: TesterRegistry seam exists — local-only no-op by default, httpRegistry POSTs profile and swallows network failure (offline-first), unit-tested
- [x] ISC-82: Placement asks 3 personas; 'new' starts at Card Values, 'knows-play'/'counts' run an inline Hi-Lo check before routing
- [x] ISC-83: Placement Check decides unlock (self-report never unlocks gates); passing 'counts' tests out 2 levels, opens Speed, seeds Casino Ready 55
- [x] ISC-84: Tested-out levels unlock the path but render distinctly ("Tested out ✓"), NOT "Mastered"; gates stay earned
- [x] ISC-85: Coach Insight v1 returns ONE specific insight per result from session data (rank-class misses, speed decay, peek reliance, accuracy/speed) — every branch non-empty, unit-tested
- [x] ISC-86: Results screen renders the brass Coach Insight card (replaces the account prompt)
- [x] ISC-87: Mock entitlement (isPremium) behind a clean interface; Dev Menu (hidden 5-tap on Home title) toggles premium, unlocks all, sets Casino Ready/streak, resets
- [x] ISC-88: Casino Ready never drops below the placement-seeded floor (a hook, not a punishment) — unit-tested
- [x] ISC-89: Disclaimer reads "No real-money wagering" (brief §1; removes the Play-mode contradiction)
- [x] ISC-90: Anti: no raw hex outside theme tokens across all new UI files; engine purity preserved
- [ ] ISC-91: [DEFERRED — increment 2] Level 0 Blackjack Basics + Basic Strategy & True Count drills (needs drill-engine generalization + ENGINE_SOURCES.md two-source validation)
- [ ] ISC-92: [DEFERRED — founder input] Remote tester-roster collector wired behind TesterRegistry (Formspree / Cloudflare Worker / Supabase) so names reach the founder, not just each device

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
| p1-levels-gates | Level defs L1–L3 + mastery-gate logic | ISC-46..48 | engine-scoring | yes |
| p1-drill-session | Drill state machine, grading, peek, 120s cap | ISC-49..52 | p1-levels-gates | no |
| p1-streaks | Streak counter w/ local-date rollover | ISC-53..54 | — | yes |
| p1-persistence | Storage interface + adapters + ProgressState | ISC-55..57 | — | yes |
| p1-screens | Onboarding/Home/Drill/Results + nav store | ISC-58..64 | p1-drill-session, theme-tokens | no |
| p1-sync | Offline-first Supabase scaffold + queue | ISC-67 | p1-persistence | yes |
| p1-quality | typecheck, suite, coverage, enforcement | ISC-65..66, 68 | all p1 | no |
| p1-forge-review | Adversarial review of gate/streak/drill logic | ISC-47, 53, 49 | p1-quality | yes |

## Decisions

- 2026-06-10: Strategy-table rule assumptions fixed for v1: 4–8 decks, DAS, late surrender available, peek game. Logged because charts differ by ruleset; brief doesn't pin rules, these are the standard US shoe-game defaults the ICP will face.
- 2026-06-10: Pair detection is by rank (K+Q is not a splittable pair). Mixed ten-value "pairs" are not splittable in most casinos' training conventions and splitting tens is never correct basic strategy anyway.
- 2026-06-10: True count flooring truncates toward zero (industry convention for betting decisions); exact float also exposed for drills.
- 2026-06-10: Scaffold is hand-authored (package.json + configs) rather than `bunx create-expo-app` — deterministic, no multi-minute dependency install needed since Phase 0 acceptance runs entirely on the dependency-free engine via bun test. `bun install` deferred to Phase 1 when UI work begins.
- 2026-06-10: show-your-math (delegation floor): Explore/second delegate skipped — all file targets are known and newly authored; nothing to search. Forge covers the E3 coding-task binding as adversarial reviewer of the correctness-critical strategy tables.
- 2026-06-10: EnterPlanMode skipped despite E3: user explicitly instructed "start Phase 0" against an approved written plan (the brief §4.4); session is autonomous — blocking on plan approval would contradict the directive.
- 2026-06-10: Advisor (Rule 2) UNAVAILABLE — `Inference.ts` exits 1 on advisor and fast modes (same infra failure as the session's mode classifier, which fell back to fail-safe). Three invocation attempts made; degradation logged per Rule 3 rather than silently skipped. Forge cross-vendor review stands in as the commitment-boundary second opinion.
- 2026-06-10: Forge (GPT-5.4) spawned in background for adversarial review of the strategy tables — the single biggest transcription-error surface (290 cells × 2 rulesets); verdict gates VERIFY completion.

- 2026-06-10: Forge verdict PASS, 0 critical. Caveat honestly noted: codex CLI absent on this machine, so Forge ran as direct static analysis + numeric probes rather than the GPT-5.4 production path — review quality high (all 290×2 cells checked against canonical chart) but not literally cross-vendor this run. MINOR finding queued for Phase 1: add a frozen golden-chart fixture asserting every strategy cell against an independently transcribed external chart, so a systematic transcription error can't hide in self-referential tests.

- 2026-06-10 (Phase 1): Mockup drill screen has INVERTED Hi-Lo hint labels (−1 zone shows "2·3·4·5·6… wait, no", +1 shows "10·J·Q·K·A") with an editor's note left in at 18:34. Engine HI_LO tags are ground truth: 2–6→+1 (emerald), 10/J/Q/K/A→−1 (red). ISC-61 derives UI labels from engine tags so the visual spec can never teach a wrong count.
- 2026-06-10 (Phase 1): Navigation is a Zustand-driven screen switch (no react-navigation/expo-router yet) — zero extra native deps, fully unit-testable, sufficient for a 4-screen MVP. Revisit at Phase 3 when challenge-a-friend deep links require real routing.
- 2026-06-10 (Phase 1): Supabase auth+sync ships as offline-first scaffold behind env placeholders (no project credentials exist yet). Queue-and-drain sync is unit-tested against a mock; live sync is DEFERRED-VERIFY (ISC-69 companion). Founder action: create Supabase project, fill .env.
- 2026-06-10 (Phase 1): show-your-math (delegation floor 1/2): app layer is single-author greenfield over a verified engine — no search targets, no parallel write surfaces. Forge covers the E3 coding binding as adversarial reviewer of gate/streak/drill logic.

- 2026-06-11 (Forge review): verdict FAIL — runtime-proven CRITICAL: answering one card then letting the 120s cap fire passed a 95% mastery gate (accuracy computed over cards ANSWERED, not dealt). Plus 4 MAJOR (corrupt-blob startup brick, unguarded queue parse, unbounded queue, peeks dropped from sync). No conflict with empirical results — findings reproduced, so fixed directly rather than re-calling advisor. All 5 fixed + 8 regression tests added.
- 2026-06-11 (web deploy): chose GitHub Pages over Cloudflare Pages (the documented default) — no CF auth present on this machine, but `gh` was authed as remelofrontal-dev with repo scope. Pages is fully autonomous given gh auth. Two Expo-on-Pages requirements handled: experiments.baseUrl="/count-trainer" (project pages serve under a subpath) and .nojekyll (Pages otherwise strips Expo's _expo/ underscore dir). Site is a single-route SPA (Zustand screen switch, no URL routing) so no deep-link 404 problem. Repo is PUBLIC (free-tier Pages requires it) — no secrets present. Migration path to Cloudflare stays open per [[default-client-stack]].
- 2026-06-11 (web deploy): commit emails rewritten to GitHub noreply (263505833+remelofrontal-dev@users.noreply.github.com) via filter-branch — initial push was rejected by GitHub's email-privacy protection on the iCloud address.

- 2026-06-11 (brief v2 + tester slice): founder dropped an expanded brief (BRIEF_2) restructuring into Track A (build-to-testable, no store/billing/push) and Track B (launch infra), and broadening positioning to beginner→counter (beginners = volume segment). What shipped earlier = "Phase A1". Founder chose a LEAN tester slice over full Phase A2. Built increment 1: name gate (founder-directed tester tracking — deliberate deviation from the brief's "no forms before cards"; revert for public launch), placement onboarding (3 personas + inline check), Coach Insight v1, mock entitlement + Dev Menu. Deferred to increment 2: Level 0 + Basic Strategy/True Count drills (need drill-engine generalization).
- 2026-06-11 (tracking): static GitHub Pages can't receive POSTs, so the deployed app can't collect tester names server-side without a collector. Built TesterRegistry as a seam (local-only now); founder must pick a collector (Formspree/Worker/Supabase) for names to reach them. Flagged as ISC-92.
- 2026-06-11 (verification): full new flow proven on the LIVE url via headless-Chrome CDP walk — name→placement→home("Hey {name}")→drill→results with a data-driven Coach Insight ("Ten-value cards trip you up — missed 7 of 7"). Local-serve note: the baseUrl="/count-trainer" build 404s its JS when served at localhost root (SPA fallback returns HTML → "Unexpected token '<'"); must serve under /count-trainer/ to test locally. Not an app bug.

## Changelog

- **conjectured:** exhaustive-coverage + diff-set + spot-check tests were sufficient to verify strategy-table correctness.
  **refuted by:** Forge review (2026-06-10) — the harness is self-referential; a systematic error duplicated in table and spot-checks would pass undetected.
  **learned:** internal consistency ≠ external correctness for transcribed reference data; correctness-critical lookup tables need an independently sourced golden fixture.
  **criterion now:** ISC-33's diff-set test plus Forge's external cell-by-cell verification stand for Phase 0; Phase 1 adds a golden-chart fixture ISC asserting all 370 cells against an independent transcription.

## Verification

- ISC-1: Bash — `git log --oneline` → `637fd51 Phase 0: Expo+TS scaffold...` (1 commit)
- ISC-2: Grep — package.json matches expo/react-native/typescript/count-trainer (4/4)
- ISC-3: Grep — tsconfig.json contains `"strict": true`
- ISC-4: Grep — App.tsx contains `import { theme } from './src/theme'`
- ISC-5: Grep — app.json: 4 matches for #0C1512 + userInterfaceStyle dark
- ISC-6: Grep — eas.json: 6 matches across development/preview/production profiles
- ISC-7: Grep — ci.yml contains `run: bun test --coverage` on push/PR via oven-sh/setup-bun
- ISC-8: Grep — tokens.ts contains all 8 brief hexes (9 matches incl. doc comment)
- ISC-9: bun test — "emerald reachable ONLY through semantic progress/win keys" PASS
- ISC-10: Grep + bun test — "Big Shoulders Display" and "Outfit" present, typography test PASS
- ISC-11: bun test — enforcement test "raw emerald hex nowhere in src/ outside tokens.ts" PASS
- ISC-12..19: bun test — deck.test.ts all PASS (52 cards, no dupes, 52×n, seeded determinism, draw/empty-throw, cut card at 234/312, decksRemaining 0.5)
- ISC-20..23: bun test — counting.test.ts PASS (per-rank tags, full-deck and 6-deck RC=0 incl. shuffled)
- ISC-24..27: bun test — TC exact (6/3=2), trunc-toward-zero (±5/2=±2), sub-deck (2/0.5=4), 0-decks throws
- ISC-28..31: bun test — hand.test.ts PASS (soft 17, multi-ace promotion/demotion, BJ 2-cards-only, pair-by-rank, bust)
- ISC-32: bun test — exhaustive loops: 18 hard ×10, 9 soft ×10, 10 pair ×10 cells + 13×13×13 two-card routing, both rulesets, 0 undefined
- ISC-33: bun test — H17/S17 diff-enumeration equals exactly {hard 11vA, 15vA, 17vA, soft 18v2, 19v6, pair 8vA}
- ISC-34..36: bun test — all spot-check cells PASS (12v2 H, 12v4 S, 16vT Rh, 9v3 D, 11v6 D, A7/A8 cells, pair rules, no-DAS adjustments)
- ISC-37..38: bun test — scoring PASS (no NaN, monotonic bounded speed, 60/40 composite, peek −5 floor 0)
- ISC-39: Bash — `bun test`: 62 pass, 0 fail, 5715 expect() calls, exit 0
- ISC-40: Bash — `bun test --coverage`: 100.00% Funcs / 100.00% Lines on every src/engine/* file
- ISC-41: Grep + bun test — 0 react/react-native/expo imports in src/engine/
- ISC-42: Grep — "stripe" 0 matches in package.json + src + App.tsx
- ISC-43: Grep — #3DDC84 outside tokens.ts: 0 files
- ISC-44: Bash — no package-lock.json / yarn.lock present
- ISC-45: Bash — `find . -name "*.py"`: 0 files

### Phase 1 (2026-06-10)
- ISC-46..48: bun test — levels.test.ts PASS (defs, gate boundaries 0.95/1500 exact, sequential unlock, skip-gate rejected)
- ISC-49..52: bun test — drill.test.ts PASS (deal/grade/latency, tag grading all modes, runningCountSoFar matches engine, peek, no-op after finish)
- ISC-50: bun test — peek −5 lands in session score (peeked.score = clean − 10 for 2 peeks)
- ISC-51: bun test — cap boundary: running at 119999ms, finished at 120000ms
- ISC-53..54: bun test — streak.test.ts PASS (first/repeat/consecutive/reset; month + year boundaries; localDay midnight + zero-padding)
- ISC-55..56: bun test — progress round-trip lossless; version guard throws; InMemory adapter full cycle; asyncStorageAdapter conformance enforced by tsc strict (KVStorage-typed)
- ISC-57: bun test — best-of-last-10: 90 forgotten after 10×60 sessions, window length 10
- ISC-58: Bash — all four screen files exist; ui.test asserts raw-hex-free UI (theme tokens only)
- ISC-59: bun test — DRILL_INTERACTIVE_TOP_FRACTION=0.55 ≥ 0.5 and wired into DrillScreen
- ISC-60: bun test — zero Alert references under src/ui
- ISC-61: bun test — zone hints derived from HI_LO: minus="10 · J · Q · K · A", plus="2 · 3 · 4 · 5 · 6", rank-by-rank agreement loop
- ISC-62: bun test — "ONE MORE ROUND" exactly once in ResultsScreen
- ISC-63: bun test — store flow: onboarding → drill with no auth; promptAccount true only at first results; returning user → home
- ISC-64: Grep — AppRoot switches all four screen cases; App.tsx mounts AppRoot
- ISC-65: Bash — `bunx tsc --noEmit` exit 0 (strict); deps installed via bun
- ISC-66: Bash — 119 pass / 0 fail / 5877 assertions; engine files all 100.00% Funcs+Lines
- ISC-67: bun test — sync: null-client no-op, queue intact; success drains+clears; failure retains; env parsing null-safe
- ISC-68: Bash — #3DDC84 outside tokens.ts: 0 files (enforcement test also green)
- ISC-69: DEFERRED-VERIFY — requires device; follow-up: founder runs `bunx expo start`, walks install→result→streak day 2

### Phase 1.1 + 1.2 (2026-06-11)
- ISC-70: bun test — levels.test "incomplete session fails the gate" + store.test "1 card then timeout does NOT pass gate / next level still locked" PASS
- ISC-71: bun test — progress.test "loadProgress never throws on corrupt blob" + store.test "init recovers from corrupted progress blob" PASS
- ISC-72: bun test — sync.test "corrupt queue never throws" + "queue capped at MAX_QUEUE dropping oldest" PASS
- ISC-73: bun test — store.test "synced score event carries the peek count" → pushed[0].peeks === 1
- ISC-74: Bash — `bunx expo export -p web` → "Exported: dist", index.html + AppEntry-*.js (376 kB), 0 errors
- ISC-75: Bash — curl https://remelofrontal-dev.github.io/count-trainer/ → HTTP 200, body references _expo/static
- ISC-76: headless Chrome screenshot /tmp/ct-live.png — onboarding renders: felt bg, brass eyebrow, "ZERO TO CASINO READY" display headline, emerald "DEAL ME IN", disclaimer
- ISC-77: CDP click-through (node WebSocket) — BEFORE=onboarding; click "DEAL ME IN"; AFTER="CARD VALUES ⏱ 2:00 8 ♦ ... PEEK −1 ... +1 ..."; tapping +1 zone → ANSWERED
- ISC-78: CDP DOM read on live URL — zones: "−1 → 10 · J · Q · K · A", "+1 → 2 · 3 · 4 · 5 · 6" (engine truth, mockup inversion corrected)
- ISC-79: Bash — git ls-files shows only .env.example (empty placeholders); secret-pattern grep returns nothing
- post-fix suite: 126 pass / 0 fail / 5900 assertions; tsc --noEmit exit 0; engine coverage 100%
