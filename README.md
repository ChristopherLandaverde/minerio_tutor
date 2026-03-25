# Sabiá — Mineiro Portuguese Learning App

A desktop app for learning Brazilian Portuguese with a Minas Gerais dialect focus. Built with Tauri + SvelteKit. Powered by Claude AI.

**1,063 exercises** across A2 to C1. RPG-style road trip through 8 Mineiro cities. 11 NPCs to befriend. Spaced repetition. Adaptive difficulty. All offline-first with AI conversation when you want it.

---

## What It Does

- **Adaptive sessions** — SM-2 spaced repetition picks what you need to practice. Reviews first, weak topics next, new content last.
- **6 exercise types** — vocab flashcards, cloze fill-in, multiple choice, error correction, sentence reorder, true/false.
- **RPG map** — Travel through Minas Gerais: BH, Ouro Preto, Mariana, Tiradentes, Diamantina, Serra da Canastra, Juiz de Fora, Uberaba, Congonhas. Each city has topics, NPCs, and a mastery system.
- **11 NPCs** — Chat with Seu Ze the bartender, Dona Lourdes the guide, Professor Helio the teacher, and more. Each has a unique personality, CEFR-appropriate vocabulary, and relationship hearts (0-5).
- **AI conversation** — Free-form chat with Claude in Mineiro dialect. Writing feedback with corrections. NPC conversations powered by Claude Haiku.
- **Gamification** — Streaks, 16 achievement badges, weekly challenges, travel journal (stamps, slang collection, NPC gifts), seasonal events tied to real calendar months.
- **Voice** — Optional ElevenLabs TTS for listening mode and NPC speech.
- **Offline-first** — All exercises, scoring, and SRS run locally in SQLite. Claude API only needed for conversation and writing feedback.

## Screenshots

The app features a Mineiro-themed design: terracotta earth tones, serra green, ouro gold, with Fraunces display font and Plus Jakarta Sans body text.

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop runtime | [Tauri](https://tauri.app) (Rust) |
| Frontend | [SvelteKit](https://kit.svelte.dev) (Svelte 5, SSG) |
| Database | SQLite via `tauri-plugin-sql` |
| AI | Claude API (Haiku for NPCs, conversation) |
| Voice | ElevenLabs TTS (optional) |
| Styling | Tailwind CSS v4 with custom Mineiro design tokens |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs)
- [Bun](https://bun.sh) (for build tooling)

### Development

```bash
cd fluent-mineiro
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Produces `Sabiá.app` and `.dmg` in `src-tauri/target/release/bundle/`.

### API Keys (optional)

In Settings (gear icon):
- **Anthropic API key** — enables conversation, writing feedback, NPC chat, and coaching notes
- **ElevenLabs API key** — enables voice/listening mode

Without API keys, all offline features work: exercises, SRS, map progression, achievements, challenges.

## Content

| Level | Exercises | Topics |
|-------|-----------|--------|
| A2 | 678 | greetings, daily routine, food, family, transport, shopping |
| B1 | 227 | emotions, dialogue, nature, work, education, clothing |
| B2 | 85 | idioms, cultural knowledge, advanced verbs, ser/estar |
| C1 | 73 | subjunctive, personal infinitive, formal register, Mineiro deep cuts |

**Total: 1,063 exercises** + 8 reading passages + 10 writing prompts.

## Mineiro Dialect

The app teaches standard Brazilian Portuguese with Minas Gerais flavor:

| Expression | Meaning |
|------------|---------|
| uai | universal interjection (surprise, agreement) |
| trem | "thing" — replaces any noun |
| ce | contracted "voce" (you) |
| bao | "bom" (good) — Ce ta bao? |
| so | vocative — like "buddy" |
| no! | exclamation (short for "Nossa Senhora!") |
| -no gerunds | falano, comeno, fazeno (dropped d) |

## Project Structure

```
fluent-mineiro/
  src/
    routes/          # 10 pages: dashboard, session, lesson, review,
                     # conversation, writing, reading, progress,
                     # achievements, settings
    lib/
      components/    # ExercisePlayer, MinasMap, NpcChat, Toast
      content-*.ts   # Exercise banks (A2, B1, B2, C1)
      db.ts          # SQLite helpers
      sm2.ts         # SM-2 spaced repetition algorithm
      npc.ts         # NPC conversation + hearts
      cities.ts      # 8 cities + 11 NPC definitions
      seasons.ts     # Seasonal events
      ...
  src-tauri/
    src/lib.rs       # Rust backend + DB migrations
```

## License

MIT
