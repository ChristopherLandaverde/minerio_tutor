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

## Thin exercise-type pools cause near-total repeats within a topic
**What:** A topic/level's `recognize` (multiple_choice/true_false) or `produce` (cloze/reorder/error_correction) pool needs at least 2x the session's cap (6 recognize + 9 produce at the default daily goal of 15) to guarantee zero repeats across two consecutive sessions on that theme — anything smaller falls back to repeats even with the seen/unseen rotation fix in `lesson.ts` (2026-07-16). Confirmed live: `verbs_present` @ A2 has only 7 recognize items — session 2 showed 5/6 repeats from session 1. Produce pools are generally fine (e.g. 82 items for verbs_present @ A2) — recognize is the thinner category almost everywhere.
**Scope:** Real, not just A2 — the audit (`src/lib/content-audit.ts`) finds 21 gaps at A2, 15 at B1, 3 at B2, 8 at C1 (47 total, mostly `recognize`). Full current list lives in `test/__snapshots__/content-audit.test.ts.snap` — that's the source of truth now, not a hand-copied list here, since it'll drift as content is added.
**Also found:** Some exercises have their `topic` field set to what looks like an exercise *type* (`error_correction`, `reorder`, `true_false` appear as topic values in the audit output) — smells like a content-authoring bug (topic/type mixup) rather than an intentional topic name. Worth a quick look in `content-a2.ts`/`content-b1.ts` before trusting those specific entries in the gap list.
**Why:** Content-authoring gap, not an algorithm bug — the rotation fix already prefers unseen exercises correctly; several topics just don't have enough material in one type to draw from.
**Fix options:** (1) Author more items for the thinnest topics/types. (2) Lower a phase's cap when its pool is small instead of always taking a fixed 40/60 split. (3) Let one phase backfill from the other when its pool runs dry. (4) Fix the topic/type mixup noted above, which may make some gaps disappear or reveal new ones.
**Guardrails already in place:** `test/content-audit.test.ts` snapshots the gap list per level (fails only on drift, not on existing debt). `test/session-rotation.test.ts` replays two consecutive sessions for every real topic/level in the content bank and asserts zero repeats wherever the pool isn't flagged thin — this is the automated version of the manual browser QA done for the original fix, runs on every `npm test`, and is already wired into CI via `.github/workflows/ci.yml`'s existing "Test" step (no new workflow needed).
**Context:** Found during live QA of the repeat-questions fix (`assembleLesson` seen/unseen rotation) in `lesson.ts`.
**Depends on:** Nothing — can be done anytime.
**Added:** 2026-07-16 via /browse QA

