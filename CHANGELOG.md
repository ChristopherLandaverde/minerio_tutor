# Changelog

All notable changes to Fluent Mineiro will be documented in this file.

## [0.2.0.0] - 2026-03-22

### Added
- 193 exercises across 3 CEFR levels (A2: 150, B1: 31, B2: 12)
- 18 topics: food, travel, family, daily routine, body/health, emotions, shopping, work, Mineiro expressions, greetings, ser/estar, present verbs, past verbs, prepositions, false cognates, Mineiro vs standard, cultural, error correction
- Error correction exercise type (find and fix mistakes in sentences)
- Topic-based lesson filtering from dashboard cards
- Functional review page: queries SRS due items and serves mixed interleaved lessons
- Session tracking: start/end sessions, XP per session, session summary with stats
- Streak system: daily increment, reset on missed day
- Adaptive difficulty: rolling accuracy tracking (20-attempt window), auto CEFR level progression
- C1 ceiling cap and nearest-available-level fallback for adaptive difficulty
- Level-up notification in session summary
- Progress page: XP, streak, accuracy, total attempts, CEFR level visualization, content coverage, mistake patterns, session history (14 days), review status
- Claude conversation practice via Anthropic API (Haiku model, ~$0.01/session)
- Mineiro Portuguese conversation partner with inline mistake correction
- API key management in Settings page (stored locally in SQLite)
- Tauri HTTP plugin for CORS-free API calls

### Changed
- Dashboard redesigned with dynamic topic-grouped lesson cards (was 3 hardcoded cards)
- Switched lesson page from Svelte 4 $app/stores to Svelte 5 $app/state for reactive URL tracking
- Settings page now shows API key status and management

### Fixed
- Clicking lesson cards from dashboard not loading (Svelte 5 page rune migration)
- Topic labels showing raw keys (ERROR_CORRECTION) instead of Portuguese names (Erros Comuns)
- Empty API call on conversation start (requires at least one message)
- CORS header for Anthropic API in Tauri webview

## [0.1.0.0] - 2026-03-22

### Added
- Tauri v2 + SvelteKit 5 desktop app scaffold
- Dashboard with XP progress bar, streak counter, and daily stats
- Vocabulary flashcard lessons with SM-2 spaced repetition rating (1-5)
- Cloze (fill-in-the-blank) exercises with accent-tolerant matching
- Multiple choice quiz with false cognate detection (PT vs ES)
- SQLite database with attempts, SRS state, profile, and sessions tables
- 27 seed exercises covering food, Mineiro expressions, ser/estar, prepositions, and false cognates
- Spanish interference detection for common PT/ES confusion
- Review page with due-count display and empty state
- Conversation page (coming soon placeholder)
- Settings page showing current level, daily goal, and dialect
- Responsive sidebar with hamburger menu on mobile
- Active nav state with terracotta accent
- Card hover lift animation per DESIGN.md motion spec
- DESIGN.md with complete Mineiro-themed design system (terracotta, serra, ouro palette)

### Fixed
- Three nav links (Review, Conversation, Settings) returning 404
- Section heading "Prática de hoje" too small (12px → 14px)
- Sidebar not collapsing on mobile viewports
