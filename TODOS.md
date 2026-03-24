# TODOS

## TTS/STT Voice Features (Phase 2+)
**What:** Pronunciation feedback, shadowing mode, structured conversation scenarios, TTS audio caching.
**Why:** Phase 1 voice (TTS on exercises, listening mode, settings) shipped in v0.4.1.0. Remaining: pronunciation scoring via Claude STT comparison, repeat-after-me shadowing, and guided Mineiro conversation scenarios.
**Pros:** Transforms the app from exercises-with-audio into a complete spoken language tutor.
**Cons:** Pronunciation scoring via STT comparison has inherent accuracy limits. ElevenLabs costs accumulate during shadowing. Need data models for pronunciation history and scenarios.
**Context:** Full design doc at `~/.gstack/projects/ChristopherLandaverde-minerio_tutor/christopherlandaverde-feat-voice-improvements-design-*.md`. Phase 1 shipped. Phases 2-5 remain.
**Depends on:** Nothing — Phase 1 foundation is in place.
**Added:** 2026-03-22 via /plan-eng-review | **Updated:** 2026-03-24 via /ship (Phase 1 complete)

---

## Migrate API Key to OS Keychain
**What:** Move API key storage from plaintext SQLite (`profile` table) to Tauri Stronghold (`tauri-plugin-stronghold`) which uses the OS keychain.
**Why:** API keys stored as plaintext in a SQLite file can be read by any process running as the same user. Security anti-pattern even for a single-user app.
**Pros:** Proper secret management, follows Tauri best practices, protects against accidental DB file sharing.
**Cons:** Adds a Tauri plugin dependency. Needs migration logic to move existing key from SQLite to Stronghold on first run.
**Context:** Found during /review adversarial pass (2026-03-23). Low urgency for a personal app but worth doing right.
**Depends on:** Nothing — can be done anytime.
**Added:** 2026-03-23 via /plan-eng-review

