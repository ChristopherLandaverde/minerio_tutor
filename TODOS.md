# TODOS

## Native Audio Recording for Pronunciation Feedback
**What:** Replace browser `getUserMedia` with native Rust audio recording via a Tauri command. Then wire up the pronunciation feedback UI (already built: Claude analysis, star rating, Mineiro tips).
**Why:** WKWebView on macOS does not reliably support `getUserMedia` — fails with `OverconstrainedError` even with HTTPS scheme and entitlements. The pronunciation UI, Claude analysis function (`analyzePronunciation` in claude.ts), and ElevenLabs STT are all ready — only the recording capture is blocked.
**Pros:** Native recording bypasses all WebView limitations. Works on macOS and Windows. Higher audio quality.
**Cons:** Requires a Rust crate for audio capture (e.g., `cpal`) and a Tauri command to bridge to the frontend. ~100 lines of Rust.
**Context:** Attempted browser-based recording on 2026-03-24. Tried: useHttpsScheme, Info.plist, Entitlements.plist, explicit constraints, mp4 mimeType — all failed on WKWebView. The `analyzePronunciation()` function in `claude.ts` is ready and tested. Design doc has full Phase 2-5 roadmap.
**Depends on:** Nothing — can be done anytime.
**Added:** 2026-03-24 via /ship

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

