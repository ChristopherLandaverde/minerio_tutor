# TODOS

## Lesson Images (dual-coding) + memory-lever roadmap
**What:** Add bundled illustration support to lessons, mirroring the render-time `emoji-map.ts` pattern — a new `image-map.ts` keyed by the exercise `answer` (normalized), returning a path in `static/img/vocab/` or `null`. Emoji stays as automatic fallback (image → emoji → nothing). No DB/schema change. Curated bundled set (~80 concrete nouns already in emoji-map) so it works offline on the PWA.
**Placement:** (1) TeachCard — show illustration where `{#if item.emoji}` renders today. (2) New `picture → type the word` exercise (production, NOT multiple-choice, per active-recall). (3) Optional: image beside vocab/cloze prompts in ExercisePlayer.
**Pair with:** Audio on the teach card (ElevenLabs TTS already exists) — sight + sound + typing = triple encoding. Nearly free, ~2× the effect. Build together.
**Why:** Dual coding is a top-tier retention lever. Cheap because it reuses the emoji-map rail and existing TTS.
**Follow-ups (memory levers, ranked):**
  1. Personalized example sentences via Claude (elaboration + personal relevance — tie words to user's real life in Uberlândia). Biggest unlock; uses existing Claude integration.
  2. Force production over recognition everywhere images are used.
  3. Auto mnemonic hooks for hard words / the Spanish false cognates already tracked in `exercises.ts`.
**Cons:** Sourcing/generating the ~80 images once (CC0 or AI-generated for clean licensing + on-brand look). Bundle size grows modestly.
**Decision:** Source = bundled illustrations (works offline for the PWA). Confirmed 2026-07-08.
**Added:** 2026-07-08

---

## Voice Features — Phases 3-5
**What:** Shadowing mode (repeat-after-me), structured conversation scenarios, voice polish (preferences, heatmap, Web Speech API fallback).
**Why:** Phase 1 (TTS everywhere + listening mode) and TTS cache shipped. Phase 2 (pronunciation) blocked on native audio recording (see above). Phases 3-5 build on that foundation.
**Cons:** ElevenLabs costs accumulate during shadowing. Need data models for scenarios.
**Context:** Full design doc at `~/.gstack/projects/ChristopherLandaverde-minerio_tutor/christopherlandaverde-feat-voice-improvements-design-*.md`.
**Depends on:** Native audio recording TODO above.
**Added:** 2026-03-24 via /ship

---

## Migrate API Key to OS Keychain
**What:** Move API key storage from plaintext SQLite (`profile` table) to Tauri Stronghold (`tauri-plugin-stronghold`) which uses the OS keychain.
**Why:** API keys stored as plaintext in a SQLite file can be read by any process running as the same user. Security anti-pattern even for a single-user app.
**Pros:** Proper secret management, follows Tauri best practices, protects against accidental DB file sharing.
**Cons:** Adds a Tauri plugin dependency. Needs migration logic to move existing key from SQLite to Stronghold on first run.
**Context:** Found during /review adversarial pass (2026-03-23). Low urgency for a personal app but worth doing right.
**Depends on:** Nothing — can be done anytime.
**Added:** 2026-03-23 via /plan-eng-review

---

## Thin exercise-type pools cause near-total repeats within a topic — fixed
**What:** A topic/level's `recognize` (multiple_choice/true_false) or `produce` (cloze/reorder/error_correction) pool needs at least 2x the session's cap to guarantee zero repeats across two consecutive sessions on that theme. Confirmed live: `verbs_present` @ A2 has only 7 recognize items against a cap of 6 — session 2 showed 5/6 repeats from session 1, and the user directly reported it as "the exact same lesson."
**Algorithm fix shipped (2026-07-16):** `assembleLesson` in `lesson.ts` cross-fills — when recognize can't fill its cap with unseen items, the shortfall goes to produce (deep pools almost everywhere) instead of repeating. Session length is preserved; only the recognize/produce mix shifts. Verified live: `verbs_present` session 2 went from 6 recognize (5 repeats) + 9 produce to 1 recognize (genuinely new) + 14 produce (all fresh) — zero repeats end to end.
**Content fix shipped (2026-07-17):** the 12 topic/level pairs that were thin on *both* recognize and produce (unfixable by cross-fill — nothing to borrow from) got 249 new exercises authored directly: A2 `body_health`/`daily_routine`/`food`/`shopping`/`travel` (139 items), B1 `prepositions`/`ser_estar`/`verbs_present` (55), B2 `verbs_present` (8), C1 `prepositions`/`verbs_present` (47). All 12 confirmed cleared via `findThinPools()` and the `content-audit.test.ts` snapshot, which dropped from 47 flagged gaps to 27.
**Still open (lower severity):** 27 gaps remain, all single-sided (recognize-only, e.g. `verbs_present` @ A2 still has just 7 recognize items) — the cross-fill algorithm already handles these gracefully (proven by `session-rotation.test.ts`), so they weren't in the "both-sides-thin, actually breaks" scope this round. Also unresolved: some exercises have their `topic` field set to an exercise *type* instead of a real topic (`error_correction`, `reorder`, `true_false`, `mineiro_vs_standard` show up as topic values in the audit — e.g. a `true_false` item about `ser_estar` has `topic: 'true_false'`, `tags: '["ser_estar","true_false"]'`). This miscategorization hides real content from its actual topic's pool and is a likely quick win — worth fixing before authoring more content for the remaining 27 gaps, since some may already have "hidden" exercises sitting under the wrong topic.
**Guardrails:** `test/content-audit.test.ts` snapshots the gap list per level (fails only on drift). `test/session-rotation.test.ts` replays two consecutive sessions for every real topic/level and asserts zero repeats wherever the pool isn't flagged thin, plus a dedicated case proving the cross-fill (recognize shrinks to 0, produce absorbs, total session size unchanged). Both run on every `npm test`, wired into CI via `ci.yml`.
**Context:** Found during live QA of the repeat-questions fix; cross-fill shipped same day after the user hit it live in production and reported "same lesson" on the real deployed app. Content batch authored after the user asked to close all remaining gaps ("everything, all 4 levels").
**Depends on:** Nothing for the remaining 27 — the topic/type mixup fix should happen first since it may shrink the list for free.
**Added:** 2026-07-16 via /browse QA. Cross-fill fix same day. Content batch 2026-07-17.

