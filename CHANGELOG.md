# Changelog

All notable changes to Fluent Mineiro will be documented in this file.

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
