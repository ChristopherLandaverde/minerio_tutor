# TODOS

## TTS/STT Voice Features
**What:** Add speech-to-text (for speaking practice) and text-to-speech (for pronunciation modeling) using ElevenLabs or browser Web Speech API.
**Why:** Speaking is the hardest language skill to practice alone. Without voice, the app is limited to reading/writing — which covers only half of language learning.
**Pros:** Transforms the app from a flashcard tool into a real conversation partner. ElevenLabs has good Portuguese voices. Browser Web Speech API is free but lower quality.
**Cons:** TTS APIs cost money per character. STT accuracy for Portuguese accents varies. Significant new UI (audio controls, waveform display). Tauri app needs microphone permissions.
**Context:** Design doc defers to "Future Phases." ElevenLabs or browser Web Speech API are the two viable approaches. Start with Web Speech API (free) and upgrade to ElevenLabs if quality isn't sufficient.
**Depends on:** Phase 3 Claude integration must be working first.
**Added:** 2026-03-22 via /plan-eng-review

---

## Retire TECH-SPEC.md
**What:** Delete or archive `TECH-SPEC.md` — it describes a Python CLI architecture that's been fully superseded by the Tauri+Svelte design doc.
**Why:** Two conflicting architecture docs in the repo will confuse future sessions. TECH-SPEC says Python CLI; the approved design doc says Tauri+Svelte.
**Pros:** Clean repo, no stale docs misleading future work.
**Cons:** Loses the decision log and cost estimates (though these are also in HYBRID-PLAN.md and the design doc).
**Context:** The decision log in TECH-SPEC.md (why SQLite, why 2 DB files, cost estimates) is still valid — just the platform changed. Move the decision log to the design doc or CLAUDE.md before deleting.
**Depends on:** Nothing — can be done anytime.
**Added:** 2026-03-22 via /plan-eng-review

---

## Fix Critical Failure Mode Gaps (Phase 2)
**What:** Address 3 critical gaps found during eng review:
1. **Adaptive difficulty CEFR fallback:** When target CEFR level has no exercises (e.g., seed only has A2 but success rate triggers B1), fall back to nearest available level instead of returning empty.
2. **SRS state upsert:** Use `INSERT OR REPLACE` instead of `UPDATE` for `srs_state` table — first-time exercises won't have existing rows.
3. **CEFR ceiling cap:** Adaptive difficulty must cap at C1. If rolling success >70% at C1, stay at C1 instead of trying to bump to a non-existent level.

**Why:** Without these, the app will silently break in 3 guaranteed scenarios: using seed content only, encountering any exercise for the first time, and reaching C1 mastery.
**Pros:** Prevents 3 silent failures. Each fix is 1-5 lines of code.
**Cons:** None.
**Context:** These should be part of the Phase 2 implementation (SM-2 + adaptive difficulty), not deferred to later. They are implementation requirements, not optional enhancements.
**Depends on:** Phase 2 implementation.
**Added:** 2026-03-22 via /plan-eng-review
