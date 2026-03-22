# Changelog

All notable changes to Fluent Mineiro will be documented in this file.

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
