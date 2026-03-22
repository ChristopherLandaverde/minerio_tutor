# Hybrid Architecture Plan: Fluent Mineiro Portuguese Tutor

**Goal:** Heavy offline content (Anki decks, drill banks, reading library) so daily practice costs zero tokens. Claude comes in live as the teacher — reacting to your mistakes, running conversations, grading writing, and making it feel like a real tutor instead of a flashcard app.

**Status:** Planning
**Created:** 2026-03-21

---

## The Core Idea

```
┌──────────────────────────────────────────────────┐
│            OFFLINE (90% of volume)               │
│  Anki decks, grammar drills, reading passages,   │
│  vocab banks, error correction exercises,         │
│  Mineiro expression dictionary                    │
├──────────────────────────────────────────────────┤
│          LIVE CLAUDE (90% of value)              │
│  Conversation practice, writing feedback,         │
│  mistake-reactive teaching, difficulty adaptation,│
│  connecting dots across sessions                  │
└──────────────────────────────────────────────────┘
```

A typical session: 15 min of offline practice (flashcards, cloze, dialogues, reading), then 10 min with Claude for conversation or writing feedback (minimal tokens, maximum learning).

---

## Offline Content: What to Batch-Generate

### 1. Anki Decks (export as .apkg or .csv)

Let Anki handle SRS — it's battle-tested and already solves the flashcard problem. No need to rebuild it.

| Deck | Cards | Content |
|------|-------|---------|
| **Core Vocab by Topic** | ~1500 | food, travel, family, work, health, shopping, directions, emotions, home, city |
| **Mineiro Expressions** | ~100 | uai, trem, cê, nó, bão, sô + usage examples and standard BP equivalents |
| **False Cognates (PT vs ES)** | ~80 | esquisito, embaraçada, polvo, etc. — Spanish interference traps |
| **Verb Conjugations** | ~300 | Present, preterite, imperfect, future, subjunctive — regular + top 30 irregular |
| **Ser vs Estar** | ~60 | Targeted cards for the PT-specific rules (differs from Spanish usage) |
| **Prepositions** | ~80 | em/no/na, para/por, de/do/da, a/ao/à with context sentences |
| **Common Phrases by CEFR** | ~200 | A2→B1→B2 graded phrases for daily situations |
| **Gerund Forms** | ~40 | Standard (-ndo) + Mineiro (-no) pairs |

**Total: ~2,400 cards** across 8 decks.

**Card format:**
```
Front: English word/phrase + context sentence with blank
Back: Portuguese + full sentence + Mineiro variant (if applicable) + audio note
```

### 2. Cloze Deletions / Fill-in-Blank

More engaging than flashcards — you read a full sentence and fill the gap. Tests grammar in context, not isolated words. Auto-scorable.

| Type | Count | Example |
|------|-------|---------|
| **Ser/Estar in context** | ~60 | "Eu ___ (ser/estar) cansado." → "estou" |
| **Conjugation in context** | ~150 | "Ontem eu ___ (falar) com ela." → "falei" |
| **Preposition gaps** | ~80 | "Eu moro ___ Belo Horizonte." → "em" |
| **Vocabulary in context** | ~200 | "Vou comprar um ___ no mercado." (hint: fruit) → "abacaxi" |
| **Mineiro vs standard** | ~40 | "Ô ___, cê viu aquele trem?" → "sô" |

**Total: ~530 cloze exercises.**

### 3. Grammar Drill Bank

Auto-scorable exercises with fixed answers. Used by the CLI or Claude sessions.

| Type | Count | Example |
|------|-------|---------|
| **Multiple choice** | ~150 | "Polvo means: a) dust b) octopus c) powder" → b |
| **Error correction** | ~100 | "Eu sou cansado" → "Eu estou cansado" (state, not identity) |
| **Sentence reordering** | ~80 | "consulta / agendar / preciso / uma / eu" → "Eu preciso agendar uma consulta" |
| **True/false** | ~80 | "'Trem' in Mineiro means 'train'" → False (it means 'thing') |
| **Error spotting** | ~80 | "Find the 3 mistakes in this paragraph" — puzzle format, more engaging than single-sentence correction |

**Total: ~490 drills.**

### 4. Sentence Mining Bank

Full sentences from realistic content (not isolated words). You learn vocabulary and grammar through natural context. Each sentence is a mini-lesson.

Sources to mine from:
- Song lyrics (MPB, sertanejo, pagode mineiro)
- Podcast transcripts
- News headlines and snippets
- Informal social media / WhatsApp style messages
- Overheard-at-the-boteco dialogue

| Level | Sentences | Style |
|-------|-----------|-------|
| **A2** | ~150 | Simple daily life, short sentences, common verbs |
| **B1** | ~150 | Longer sentences, opinions, narrative past tenses |
| **B2** | ~100 | Complex grammar, idiomatic expressions, formal register |

Each sentence includes: translation, grammar note (why this structure matters), key vocab highlighted, Mineiro variant if applicable.

**Total: ~400 mined sentences.**

### 5. Dialogue Scripts

Pre-written two-person conversations for common situations. Read both parts, then try to reconstruct one side from memory. Bridges the gap between flashcards and live conversation.

| Scenario | Count | Level |
|----------|-------|-------|
| **At a boteco** | 5 | A2-B1 |
| **Doctor's appointment** | 3 | B1 |
| **Phone calls (formal/informal)** | 4 | A2-B2 |
| **Shopping / haggling at feira** | 3 | A2-B1 |
| **Meeting neighbors / small talk** | 4 | A2-B1 |
| **Job interview** | 2 | B2 |
| **Giving/getting directions** | 3 | A2 |
| **At the bank / post office** | 3 | B1 |
| **Arguing politely (complaint)** | 3 | B1-B2 |
| **Catching up with a friend** | 3 | B1 |

Each script includes: Mineiro dialect variant alongside standard BP, cultural notes (e.g., how Mineiros actually greet vs textbook), vocabulary list, a "your turn" prompt where you reconstruct one speaker's lines.

**Total: ~33 dialogue scripts.**

### 6. Reading Library

Pre-generated graded texts with comprehension questions. You read each one once, so no staleness problem.

| Level | Texts | Topics |
|-------|-------|--------|
| **A2** | 15 | Daily routines, ordering food, asking directions, simple stories |
| **B1** | 15 | News articles, travel blog posts, recipes, informal emails |
| **B2** | 10 | Opinion pieces, cultural essays, formal correspondence |

Each text includes: 3-5 comprehension questions (mix of MC and short answer), vocabulary list, Mineiro cultural notes where relevant.

**Total: 40 reading passages.**

### 7. Graded Readers (Short Stories)

Longer-form reading for acquisition through exposure. Not drill material — just enjoyable reading at your level. Vocab is absorbed naturally through repetition in context.

| Level | Stories | Length | Style |
|-------|---------|--------|-------|
| **A2** | 5 | ~300 words | Simple narratives, lots of dialogue, present tense heavy |
| **B1** | 5 | ~600 words | Past tense narratives, more description, some Mineiro flavor |
| **B2** | 3 | ~1000 words | Complex plots, mixed tenses, cultural themes (festas juninas, Minas food culture, saudade) |

Each story includes: glossary of new words (inline or footnote style), 2-3 discussion questions for use with Claude later.

**Total: 13 short stories.**

### 8. Dictation Exercises

Listen to a sentence, write it down. Tests listening + spelling + grammar + accents simultaneously. Pre-generate audio clips using TTS.

| Level | Clips | Focus |
|-------|-------|-------|
| **A2** | 30 | Short sentences, clear pronunciation, common words |
| **B1** | 30 | Longer sentences, connected speech, accent marks matter |
| **B2** | 20 | Natural speed, Mineiro pronunciation (dropped -d gerunds, contractions) |

Each clip includes: audio file, correct transcript, scoring rubric (exact match with accent tolerance).

**Total: 80 dictation exercises.** (Depends on TTS integration — can start as text-only "read and type from memory" exercises.)

### 9. Mineiro Expression Guide

A reference file (not flashcards) with:
- Expression, meaning, standard BP equivalent
- 3 usage examples per expression (casual, semi-formal, humorous)
- Regional notes (more common in rural vs urban MG)
- Audio pronunciation notes

---

## Live Claude: The Teacher Layer

This is what makes it feel like a tutor, not a deck of cards.

### What Claude Does Live

| Role | When | Why It Can't Be Offline |
|------|------|------------------------|
| **Conversation partner** | Speaking practice | Must respond naturally to what you say |
| **Writing evaluator** | After you write an email/letter | Needs to understand intent, grade nuance, suggest natural phrasing |
| **Mistake coach** | After reviewing your Anki/drill results | "You missed 4 ser/estar cards today — here's the pattern I see and a targeted exercise" |
| **Difficulty adapter** | Mid-session | "That was easy for you, let's try subjunctive in the same context" |
| **Dot connector** | Any session | "Remember last week you confused 'polvo'? It showed up naturally in your writing today — you got it!" |
| **Cultural context** | When relevant | Explain WHY something is said that way in Minas, not just what to say |
| **Exercise generator** | When the bank runs dry | Fresh content for topics you've mastered the bank's exercises on |

### Minimal Prompt Pattern

Each Claude call sends ~50-100 tokens of context, not 800+ lines of system files:

```
Chris is A2→B1 Mineiro Portuguese learner (English native, speaks Spanish).
Today's mistakes: ser/estar in location (3x), missing accent on "é" (2x).
Session type: conversation practice — ordering at a boteco.
Dialect: standard BP with Mineiro flavor (uai, trem, cê, bão, dropped gerund -d).
Be encouraging, correct every error, flag Spanish interference.
```

### Session Types with Claude

**Conversation (speaking):**
Claude plays a role (waiter, neighbor, coworker). You chat in Portuguese. Claude corrects inline and keeps the conversation going naturally.

**Writing feedback:**
You write an email/letter/message. Claude returns corrections with:
- Color-coded severity (critical/moderate/minor)
- Side-by-side: your version vs natural version
- Spanish interference flags
- Mineiro alternatives where relevant

**Mistake review:**
You tell Claude what you got wrong in Anki today. Claude:
1. Identifies the underlying pattern
2. Explains the rule clearly
3. Gives 2-3 targeted exercises
4. Connects it to things you already know (especially Spanish parallels that help rather than hurt)

**Adaptive drill:**
Claude generates fresh exercises targeting your weak spots — things the pre-built bank can't anticipate because they depend on YOUR specific error patterns.

---

## Data & Tracking

### What Stays in JSON (current `/data/` files)

Keep the existing tracking system but simplify what gets tracked:

| File | Keep? | Notes |
|------|-------|-------|
| `learner-profile.json` | Yes | Streak, level, preferences |
| `progress-db.json` | Yes | Session stats, accuracy trends |
| `mistakes-db.json` | Yes | Error patterns — this is what feeds Claude's live coaching |
| `mastery-db.json` | Yes | Skill levels |
| `session-log.json` | Yes | Session history |
| `spaced-repetition.json` | **Simplify** | Anki handles SRS for vocab/grammar. This file only tracks error patterns and writing/speaking items that Claude needs to revisit |

### What Moves to Anki

All vocab and grammar SRS. Anki already does SM-2 (and SM-18/FSRS). No point rebuilding it.

### What's New

| File/Dir | Purpose |
|----------|---------|
| `/content/anki/` | Generated .csv or .apkg deck files |
| `/content/cloze/` | JSON cloze deletion exercises by topic |
| `/content/drills/` | JSON drill banks (MC, error correction, reordering, true/false, error spotting) |
| `/content/sentences/` | JSON sentence mining bank by level |
| `/content/dialogues/` | Markdown two-person conversation scripts by scenario |
| `/content/reading/` | Markdown reading passages with comprehension questions |
| `/content/stories/` | Markdown graded readers (short stories) by level |
| `/content/dictation/` | JSON dictation exercises (+ audio files when TTS added) |
| `/content/mineiro-guide.md` | Mineiro expression reference |

---

## Implementation Plan

### Phase 1: Content Generation (~3-5 days)

Use Claude API (or Claude Code batch) to generate all offline content:

1. **Anki decks** — Generate as CSV (importable to Anki). 8 decks, ~2,400 cards.
2. **Cloze exercises** — Generate as JSON. ~530 fill-in-blank with context sentences.
3. **Grammar drills** — Generate as JSON. ~490 exercises (MC, error correction, reordering, true/false, error spotting).
4. **Sentence mining bank** — Generate as JSON. ~400 real-context sentences across A2-B2.
5. **Dialogue scripts** — Generate as Markdown. ~33 two-person conversations for common scenarios.
6. **Reading passages** — Generate as Markdown. 40 texts with comprehension questions.
7. **Graded readers** — Generate as Markdown. 13 short stories across A2-B2.
8. **Dictation exercises** — Generate as JSON (text-only initially, add audio later). 80 exercises.
9. **Mineiro guide** — Generate reference document.

**Total offline content: ~6,400+ items across 9 content types.**

Quality check: Review a sample from each category. Fix systematic errors (especially Mineiro accuracy). Regenerate bad batches.

**Output:** `/content/` directory with everything importable and usable.

### Phase 2: Lean CLI Orchestrator (~2-3 days)

Python script that ties offline content + live Claude together:

```
fluent/
├── cli.py           — Main entry point, session menu
├── drills.py        — Load and serve drills from JSON, auto-score
├── prompts.py       — Build minimal Claude prompts from mistake history
├── tracker.py       — Update JSON tracking files (progress, mistakes, mastery)
├── anki_export.py   — Generate/refresh Anki deck CSVs
└── content/         — All pre-generated content
```

Features:
- `fluent drill` — Random drill from bank (cloze, MC, error spotting, etc.), auto-scored, updates tracking
- `fluent dialogue` — Serve a dialogue script, quiz you on reconstructing one side
- `fluent read` — Serve a reading passage or short story with comprehension questions
- `fluent dictation` — Play/show a sentence, you type it back, auto-scored
- `fluent speak` — Conversation with Claude (minimal context prompt)
- `fluent write` — Writing exercise, Claude evaluates
- `fluent review` — Claude coaches on recent mistakes from any content type
- `fluent progress` — Stats from tracking files
- `fluent export-anki` — Regenerate Anki CSVs with new content

### Phase 3: Claude Integration (~1-2 days)

Wire up live Claude calls:
- Anthropic API SDK (`anthropic` package)
- Prompt builder that reads `mistakes-db.json` and `mastery-db.json` to build ~50-100 token context
- Streaming responses for conversation mode
- Score extraction from Claude's feedback for tracking updates

### Phase 4: Polish & Daily Use (~ongoing)

- Refine prompts based on real session quality
- Add new Anki cards for topics that come up in conversation
- Periodically regenerate drill bank for areas where you've exhausted content
- Add new reading passages as you level up

---

## Token Budget

| Activity | Tokens | Frequency |
|----------|--------|-----------|
| Anki review | 0 | Daily |
| Grammar drills (auto-scored) | 0 | Daily |
| Reading passages | 0 | 2-3x/week |
| Conversation practice (10 min) | ~2,000-4,000 | 3-4x/week |
| Writing feedback | ~1,000-2,000 | 2-3x/week |
| Mistake coaching | ~500-1,000 | As needed |
| Fresh exercise generation | ~500-1,000 | When bank runs dry |

**Estimated weekly token usage: ~10,000-15,000** (vs current ~30,000-50,000+ with full Claude sessions).

---

## What This Deliberately Doesn't Include

- **Custom flashcard UI** — Anki exists and is better than anything we'd build
- **Custom SRS engine** — Anki's FSRS algorithm is state-of-the-art
- **Desktop GUI (Tauri/Electron)** — Overkill for a single-user learning tool
- **TTS integration** — Nice-to-have for later, not needed to start learning
- **SQLite migration** — JSON files work fine for single-user tracking data
- **Achievement system** — Fun but not load-bearing. Add later if wanted.

---

## Success Criteria

1. Can do 30 min of daily practice with <5,000 tokens
2. Anki decks feel comprehensive and accurate for A2→B1
3. Claude conversations feel natural and responsive to your actual weak spots
4. Mistake patterns are tracked and addressed, not just repeated
5. You're actually using it daily (the best system is the one you stick with)
