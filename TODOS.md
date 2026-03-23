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

## Migrate API Key to OS Keychain
**What:** Move API key storage from plaintext SQLite (`profile` table) to Tauri Stronghold (`tauri-plugin-stronghold`) which uses the OS keychain.
**Why:** API keys stored as plaintext in a SQLite file can be read by any process running as the same user. Security anti-pattern even for a single-user app.
**Pros:** Proper secret management, follows Tauri best practices, protects against accidental DB file sharing.
**Cons:** Adds a Tauri plugin dependency. Needs migration logic to move existing key from SQLite to Stronghold on first run.
**Context:** Found during /review adversarial pass (2026-03-23). Low urgency for a personal app but worth doing right.
**Depends on:** Nothing — can be done anytime.
**Added:** 2026-03-23 via /plan-eng-review

