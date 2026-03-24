# Changelog

All notable changes to Sabiá (formerly Fluent Mineiro) will be documented in this file.

## [0.4.1.0] - 2026-03-24 — Voice Everywhere

### Added
- ElevenLabs settings panel: API key input, voice selector dropdown, "Testar voz" button
- Speaker button on all exercise types (vocab, cloze, multiple choice, error correction, true/false, reorder)
- "Ouvir" button next to correct answer when wrong — hear the pronunciation
- Listening mode: audio-first exercises via `/lesson?type=vocab&mode=listening` — hear prompt, type answer
- Listening mode includes both vocab and cloze exercises for variety
- Dashboard "Prática de escuta" card (only visible when ElevenLabs key configured)
- Voice status indicator in dashboard header (speaker icon when active, link to settings when not)

### Fixed
- Listening mode vocab scoring: now uses text comparison instead of self-rating (was always marking answers incorrect)
- Auto-play effect guarded by exercise index to prevent retry storms on TTS failure
- Removed unused `listeningPlayed` state variable

## [0.4.0.0] - 2026-03-23

### Added
- Smart session planner: "Start Today's Session" button auto-assembles daily workouts (SRS reviews first, weak topics, new content, variety mixing)
- AI coaching notes: Claude Haiku generates personalized daily coaching messages with Mineiro flavor, cached per day with 12 fallback messages
- Achievement system: 16 badges across 6 categories (streak, exercises, accuracy, CEFR, mastery, special) with bronze/silver/gold tiers
- Achievement celebration overlay with confetti animation and carousel for multiple unlocks
- Weekly challenges: auto-generated 2-3 challenges per week based on performance, with progress tracking and XP rewards
- CEFR progress map on dashboard showing journey from A1 → C1
- WhatsApp-style conversation page (serra green header, message tails, read receipts, typing indicator)
- Sticker picker with 4 Mineiro-themed packs (Mineiro, Comida, Reações, Estudo) — 24 stickers total
- Emoji-only messages render large like WhatsApp stickers
- Bilingual UI labels: Portuguese primary with English subtitles on all navigation, headings, and key buttons
- Shared ExercisePlayer component (DRY refactor from lesson + review pages)
- /session route for auto-generated sessions with achievement + challenge integration
- /achievements route with badge grid, progress bars, and unlock dates
- DB migration v2: achievement_unlocks and weekly_challenges tables
- Unit tests: 29 tests across SM-2, exercise scoring, adaptive difficulty, and coaching fallbacks

### Changed
- Renamed from "Fluent Mineiro" to "Sabiá" (the Brazilian songbird) throughout app
- Conversation prompt tuned for short, texting-style replies (1-2 sentences, one question max, emoji-heavy)
- Dashboard redesigned with session card → challenges → stats → goal → CEFR map → lessons hierarchy
- CLAUDE.md updated from stale JSON-file references to current SQLite architecture

### Fixed
- Review page missing true_false and reorder exercise types
- Multiple-choice options reshuffling on every state change (now shuffles once per exercise)
- Double-submission race condition (submitting guard added)
- $effect → onMount in lesson page (prevents session re-init on reactive updates)
- JSON.parse(distractors) unguarded in $effect (now wrapped in try-catch)
- JSON.parse(tags) unguarded in scoreExercise
- Stale version string in settings page
- getTopicStats() hardcoded exercise ID logic
- 6 accessibility warnings resolved (aria-labels, dialog focus, button wrappers)

## [0.3.0.0] - 2026-03-22

### Added
- 990 exercises across 3 CEFR levels (A2: 678, B1: 227, B2: 85) and 6 types
- 25+ topic areas: food, family, travel, work, emotions, nature, transport, clothing, sports, education, technology, house, shopping, body/health, weather, colors, time, Mineiro expressions, cultural knowledge, politics, environment, media, dialogues, and more
- 6 exercise types: vocab flashcards, cloze fill-in, multiple choice, true/false, sentence reorder, error correction
- 8 reading comprehension passages (A2-B2) with Mineiro cultural content
- 10 writing prompts (A2-B2) with Claude-powered evaluation
- Claude conversation practice (Haiku model, ~$0.01/session) with Mineiro tutor personality
- Progress page: XP, streak, accuracy, CEFR level, 90-day streak calendar, content coverage, mistake patterns, session history
- Adaptive difficulty: rolling accuracy tracking, auto CEFR progression, C1 ceiling cap
- Session tracking: start/end sessions, XP per session, streak system
- Daily goal tracking on dashboard with progress bar
- Dark mode with warm Mineiro theme (browns, not grays)
- Editable settings: CEFR level selector, daily goal, theme toggle, API key management, progress reset
- Reading comprehension page with vocabulary helper and comprehension questions
- Writing practice with structured prompts and Claude evaluation
- Responsive mobile layout with hamburger menu
- Content split into 3 files by CEFR level for maintainability

### Changed
- Dashboard redesigned with dynamic topic-grouped lesson cards
- Content architecture: split from single file to content-a2.ts, content-b1.ts, content-b2.ts

### Fixed
- Svelte 5 page rune migration for reactive URL tracking
- Topic labels showing raw keys instead of Portuguese names
- Empty API call on conversation start
- CORS header for Anthropic API in Tauri webview
- Two Svelte type errors (lastInsertId, variable redeclaration)

### Removed
- TECH-SPEC.md (superseded by Tauri+Svelte architecture)

## [0.1.0.0] - 2026-03-22

### Added
- Initial Tauri v2 + SvelteKit 5 desktop app scaffold
- 27 seed exercises
- SM-2 spaced repetition algorithm
- SQLite database
- DESIGN.md with Mineiro-themed design system
