# Fluent Mineiro: Technical Specification

**Status:** Ready to Build
**Author:** Chris (CTO) + Claude
**Date:** 2026-03-21
**Target:** AI agent buildable — every decision is made, no ambiguity.

---

## 1. What This Is

A **local-first Portuguese learning engine** with Mineiro dialect focus. Offline content handles 90% of daily practice volume (zero tokens). Claude handles 90% of learning value — live conversation, writing feedback, mistake coaching, adaptive teaching.

**User:** Chris — English native, speaks Spanish, learning Mineiro Portuguese A2→C1.
**Runtime:** Python 3.10+ on local machine (Linux/WSL). Single user, no multi-device sync.
**Platform:** CLI-only. Mobile practice via Anki mobile (offline decks) — no web/mobile app planned.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  CLI Entry Point (cli.py)                               │
│  fluent <command> [options]                              │
├──────────┬──────────┬───────────┬───────────────────────┤
│ OFFLINE  │ TRACKING │ LIVE      │ EXPORT                │
│ Engine   │ Engine   │ Engine    │ Engine                │
│          │          │ (Claude)  │ (Anki)                │
├──────────┴──────────┴───────────┴───────────────────────┤
│  Content (read-only)  User State (read-write)  Claude API │
│  content/fluent.db    data/user.db + *.json    Anthropic  │
└─────────────────────────────────────────────────────────┘
```

### Layer A: Content Store — SQLite (offline, read-only at runtime)
All pre-generated learning materials in a single `content/fluent.db` file. One portable file = easy to back up, version, and ship. SQL queries replace all the file-loading and filtering logic.

Markdown content (dialogues, reading passages, stories, mineiro guide) stays as `.md` files — they're long-form text meant to be read linearly, not queried. SQLite stores a pointer (`file_path`) to each one.

### Layer B: User State — SQLite + JSON (offline, read-write)
- `data/user.db` — exercise completion log (write-heavy, queryable, JOINs with content DB)
- `data/*.json` — progress, mistakes, mastery, profile, session log (small, human-readable for debugging)

### Layer C: Live Engine (Claude API)
Conversation, writing feedback, mistake coaching, adaptive drills. Called with minimal context (~50-100 token prompts).

### Layer D: Export Engine
Generate Anki-importable CSVs from SQLite. Anki owns SRS for vocab/grammar — don't rebuild it.

---

## 3. Requirements & Constraints

### Hard Requirements
- **Python 3.10+** — f-strings, match statements, `sqlite3` in stdlib. No compiled extensions needed.
- **Anthropic API key** — Required for live commands (`speak`, `write`, `review`) and content generation. Set via `ANTHROPIC_API_KEY` env var.
- **Anki installed** — SRS is fully delegated to Anki (desktop or mobile). The CLI generates CSVs; you import them. If you don't use Anki, you lose spaced repetition for vocab/grammar. No built-in SRS fallback — Anki is the tool for this.
- **Single user, single machine** — No auth, no sync, no multi-device. Practice on your phone via Anki mobile (offline decks export). CLI is local only.

### Cost Estimates

| Activity | Tokens | Cost (Sonnet 4.6 pricing) |
|----------|--------|---------------------------|
| **Content generation (one-time)** | ~2-3M input + ~1-2M output | **~$15-25 total** |
| **Weekly practice (ongoing)** | ~15-20K | **~$0.10-0.15/week** |
| **Regenerating exhausted content** | ~100-200K per batch | **~$1-2 per batch** |

Content generation is the big upfront cost. After that, weekly usage is essentially free.

### Decision Log

| Decision | Why |
|----------|-----|
| SQLite for content, JSON for user state | Content needs querying/filtering (6,400+ items, cross-referencing, ranking). User state is tiny, human-readable, and updated in-place. Best tool for each job. |
| Two SQLite files: `fluent.db` (content, read-only) + `user.db` (exercise log, read-write) | Content DB is immutable after generation — can be backed up, versioned, or regenerated independently. Exercise log is write-heavy and user-specific. Separating them means you can ship/replace the content DB without losing your history. |
| Markdown for long-form content | Dialogues, reading passages, stories are read linearly, not queried. SQLite stores metadata + file path pointer. |
| Anki required, no built-in SRS fallback | Anki's FSRS is state-of-the-art and battle-tested. Rebuilding SRS would add weeks of work for a worse result. Anki mobile gives you phone practice for free. |
| No desktop GUI | CLI + Anki covers everything. GUI is scope creep. |
| No TTS/STT at launch | Significant gap for listening practice. Mitigated: text-based dictation ("read, hide, type from memory") still builds spelling/grammar skills. TTS is Phase 4 — plug in ElevenLabs or Google TTS when ready. |
| Python not Node | Simple scripting, good Anthropic SDK, `sqlite3` in stdlib. |
| Single .db file not many .json content files | One file to back up, move, or regenerate. SQL handles all retrieval/ranking logic. Scales to 50K+ items with zero code changes. |

---

## 4. Project Structure

```
fluent/
├── cli.py                  # Entry point: `python cli.py <command>`
├── config.py               # API keys, paths, constants
├── requirements.txt        # anthropic, click (CLI framework)
│
├── core/
│   ├── __init__.py
│   ├── db.py               # SQLite connection, schema init, migrations
│   ├── drills.py           # Serve exercises from SQLite, auto-score
│   ├── retrieval.py        # SQL-based ranking + selection
│   ├── scoring.py          # Score answers, map to SM-2 quality scale
│   └── generator.py        # Template-based exercise generation (conjugation, cloze)
│
├── tutor/
│   ├── __init__.py
│   ├── claude_client.py    # Anthropic API wrapper, streaming support
│   ├── prompt_builder.py   # Build minimal prompts from user state
│   └── feedback_parser.py  # Extract scores/corrections from Claude responses
│
├── tracker/
│   ├── __init__.py
│   ├── progress.py         # Read/write progress-db.json
│   ├── mistakes.py         # Read/write mistakes-db.json, error pattern detection
│   ├── mastery.py          # Read/write mastery-db.json, level calculations
│   ├── profile.py          # Read/write learner-profile.json, streak logic
│   └── session.py          # Read/write session-log.json, session lifecycle
│
├── export/
│   ├── __init__.py
│   └── anki.py             # Generate Anki-importable CSVs from SQLite
│
├── tools/
│   ├── validate_content.py # Check DB for duplicates, missing fields, bad tags
│   ├── generate_batch.py   # Batch-generate content via Claude API → SQLite
│   └── import_csv.py       # Import external vocab lists into SQLite
│
├── content/                # OFFLINE CONTENT (read-only after generation)
│   ├── fluent.db           # SQLite — structured content (immutable, versionable)
│   ├── dialogues/          # Markdown dialogue scripts (referenced by DB)
│   ├── reading/            # Markdown reading passages (referenced by DB)
│   ├── stories/            # Markdown graded readers (referenced by DB)
│   └── mineiro-guide.md    # Mineiro expression reference document
│
├── data/                   # USER STATE (read-write)
│   ├── user.db             # SQLite — exercise_log (write-heavy, user-specific)
│   ├── learner-profile.json
│   ├── progress-db.json
│   ├── mistakes-db.json
│   ├── mastery-db.json
│   ├── spaced-repetition.json  # Only error patterns + writing/speaking (Anki handles vocab SRS)
│   └── session-log.json
│
└── results/                # Session result files (already exists)
    └── session-*.md
```

**Why two SQLite files:**
- `content/fluent.db` is **immutable after generation**. You can version it in git, regenerate it, or replace it without losing any user progress. Think of it like a game's asset bundle.
- `data/user.db` is **write-heavy and user-specific**. Contains `exercise_log` — every answer you've ever given. The CLI ATTACHes both at runtime so retrieval queries can JOIN across them.

### SQLite Schema (`content/fluent.db`)

```sql
-- Core vocabulary / lexicon entries
CREATE TABLE vocab (
    id              INTEGER PRIMARY KEY,
    lemma           TEXT NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('noun','verb','adjective','adverb','phrase','idiom','preposition','conjunction')),
    meaning_en      TEXT NOT NULL,
    meaning_es      TEXT,                    -- Spanish equivalent (for interference awareness)
    level           TEXT NOT NULL CHECK(level IN ('A1','A2','B1','B2','C1')),
    tags            TEXT NOT NULL DEFAULT '[]',  -- JSON array: ["food","daily-life","mineiro"]
    examples        TEXT NOT NULL DEFAULT '[]',  -- JSON array of example sentences
    mineiro_variant TEXT,                    -- Mineiro form if different (e.g., "trem" for "coisa")
    pronunciation   TEXT,                    -- IPA or phonetic notes
    spanish_trap    TEXT,                    -- False cognate / interference note
    UNIQUE(lemma, type)
);

-- Cloze deletion exercises
CREATE TABLE cloze (
    id              INTEGER PRIMARY KEY,
    topic           TEXT NOT NULL,           -- "ser-estar", "conjugation", "prepositions", "vocabulary", "mineiro"
    level           TEXT NOT NULL CHECK(level IN ('A1','A2','B1','B2','C1')),
    sentence        TEXT NOT NULL,           -- Sentence with blank: "Eu ___ cansado."
    blank_word      TEXT NOT NULL,           -- Correct answer: "estou"
    hint            TEXT,                    -- Optional hint: "ser/estar"
    options         TEXT NOT NULL,           -- JSON array: ["sou","estou","fui","estava"]
    explanation     TEXT NOT NULL,           -- Why this answer is correct
    spanish_trap    TEXT,                    -- Spanish interference note if applicable
    mineiro_variant TEXT,                    -- Mineiro version of sentence if different
    tags            TEXT NOT NULL DEFAULT '[]',
    flagged         BOOLEAN DEFAULT 0        -- Set to 1 via `fluent flag` if content is wrong
);

-- Grammar drills (MC, error correction, reordering, T/F, error spotting)
CREATE TABLE drills (
    id                      INTEGER PRIMARY KEY,
    type                    TEXT NOT NULL CHECK(type IN ('multiple_choice','error_correction','sentence_reordering','true_false','error_spotting')),
    level                   TEXT NOT NULL CHECK(level IN ('A1','A2','B1','B2','C1')),
    question                TEXT NOT NULL,
    options                 TEXT,            -- JSON array (for MC/TF) or NULL
    correct_answer          TEXT NOT NULL,
    explanation             TEXT NOT NULL,
    spanish_interference    BOOLEAN DEFAULT 0,
    tags                    TEXT NOT NULL DEFAULT '[]',
    flagged                 BOOLEAN DEFAULT 0
);

-- Sentence mining bank
CREATE TABLE sentences (
    id               INTEGER PRIMARY KEY,
    level            TEXT NOT NULL CHECK(level IN ('A1','A2','B1','B2','C1')),
    sentence_pt      TEXT NOT NULL,          -- Standard BP sentence
    sentence_mineiro TEXT,                   -- Mineiro variant
    translation_en   TEXT NOT NULL,
    grammar_note     TEXT,
    key_vocab        TEXT NOT NULL DEFAULT '[]',  -- JSON array
    source_style     TEXT,                   -- "daily-life", "song-lyric", "news", "social-media", "boteco"
    tags             TEXT NOT NULL DEFAULT '[]',
    flagged          BOOLEAN DEFAULT 0
);

-- Dictation exercises
CREATE TABLE dictation (
    id               INTEGER PRIMARY KEY,
    level            TEXT NOT NULL CHECK(level IN ('A1','A2','B1','B2','C1')),
    sentence         TEXT NOT NULL,
    translation_en   TEXT NOT NULL,
    focus            TEXT,                   -- "nasal vowels", "accent marks"
    accent_tolerance BOOLEAN DEFAULT 0,
    critical_words   TEXT NOT NULL DEFAULT '[]',  -- JSON array
    audio_file       TEXT,                   -- File path, NULL until TTS added
    flagged          BOOLEAN DEFAULT 0
);

-- Anki export cards (source of truth for CSV generation)
CREATE TABLE anki_cards (
    id      INTEGER PRIMARY KEY,
    deck    TEXT NOT NULL,                   -- "core-vocab", "mineiro-expressions", etc.
    front   TEXT NOT NULL,
    back    TEXT NOT NULL,
    tags    TEXT NOT NULL DEFAULT '[]',
    level   TEXT NOT NULL CHECK(level IN ('A1','A2','B1','B2','C1'))
);

-- Markdown content registry (dialogues, reading passages, stories)
CREATE TABLE markdown_content (
    id         INTEGER PRIMARY KEY,
    type       TEXT NOT NULL CHECK(type IN ('dialogue','reading','story')),
    title      TEXT NOT NULL,
    level      TEXT NOT NULL CHECK(level IN ('A1','A2','B1','B2','C1')),
    file_path  TEXT NOT NULL UNIQUE,         -- Relative: "dialogues/boteco-01.md"
    scenario   TEXT,                         -- For dialogues: "boteco", "doctor", "shopping"
    word_count INTEGER,
    tags       TEXT NOT NULL DEFAULT '[]',
    summary    TEXT
);

-- Indexes for retrieval/ranking
CREATE INDEX idx_cloze_level_topic ON cloze(level, topic);
CREATE INDEX idx_drills_level_type ON drills(level, type);
CREATE INDEX idx_sentences_level ON sentences(level);
CREATE INDEX idx_dictation_level ON dictation(level);
CREATE INDEX idx_anki_deck ON anki_cards(deck);
CREATE INDEX idx_markdown_type_level ON markdown_content(type, level);
CREATE INDEX idx_vocab_level ON vocab(level);
```

### User Database Schema (`data/user.db`)

```sql
-- Exercise completion log (user-specific, write-heavy)
CREATE TABLE exercise_log (
    id           INTEGER PRIMARY KEY,
    table_name   TEXT NOT NULL,              -- "cloze", "drills", "dictation", etc.
    exercise_id  INTEGER NOT NULL,           -- ID from the content DB table
    completed_at TEXT NOT NULL,              -- ISO timestamp
    score        INTEGER,                   -- 0-10
    quality      INTEGER,                   -- SM-2 quality 0-5
    user_answer  TEXT,                      -- What the user actually typed
    UNIQUE(table_name, exercise_id, completed_at)
);

CREATE INDEX idx_exercise_log_lookup ON exercise_log(table_name, exercise_id);
CREATE INDEX idx_exercise_log_date ON exercise_log(completed_at);
```

### Connecting Both DBs at Runtime

```python
# core/db.py
import sqlite3

def connect():
    """Open content DB read-only, attach user DB read-write."""
    conn = sqlite3.connect("file:content/fluent.db?mode=ro", uri=True)
    conn.execute("ATTACH DATABASE 'data/user.db' AS user")
    conn.row_factory = sqlite3.Row
    return conn

# Now queries can JOIN across both:
# SELECT c.* FROM cloze c
# LEFT JOIN user.exercise_log el ON el.table_name = 'cloze' AND el.exercise_id = c.id
# WHERE el.id IS NULL  -- not yet attempted
```

---

## 5. Offline Content Specification

### How to Generate the Content

**Method:** Use Claude API batch mode (`tools/generate_batch.py`). Send structured prompts for each content type. Generator inserts directly into `fluent.db` via parameterized SQL. Generate in batches of 50-100 items, validate, fix, repeat.

**Quality control:** After generation, run `tools/validate_content.py` to catch:
- Duplicate entries (SQL `UNIQUE` constraints + fuzzy match on text fields)
- Missing required fields (SQL `NOT NULL` constraints catch most)
- Incorrect CEFR level tags (SQL `CHECK` constraints)
- Mineiro accuracy issues (flag for manual review)
- Orphaned markdown files (referenced in DB but missing on disk)

### 5.1 Anki Cards — `anki_cards` table

~2,400 rows across 8 decks. Exported to CSV for Anki import. Anki handles all SRS scheduling.

| File | Cards | Description |
|------|-------|-------------|
| `core-vocab.csv` | ~1500 | 10 topics: food, travel, family, work, health, shopping, directions, emotions, home, city |
| `mineiro-expressions.csv` | ~100 | uai, trem, cê, nó, bão, sô + usage examples + standard BP equivalents |
| `false-cognates-pt-es.csv` | ~80 | Spanish interference traps: esquisito, embaraçada, polvo, etc. |
| `verb-conjugations.csv` | ~300 | Present, preterite, imperfect, future, subjunctive — regular + top 30 irregular |
| `ser-vs-estar.csv` | ~60 | PT-specific rules (differs from Spanish) |
| `prepositions.csv` | ~80 | em/no/na, para/por, de/do/da, a/ao/à with context sentences |
| `common-phrases-cefr.csv` | ~200 | A2→B1→B2 graded phrases for daily situations |
| `gerund-forms.csv` | ~40 | Standard (-ndo) + Mineiro (-no) pairs |

**CSV format (Anki-importable):**
```csv
front;back;tags
"English + blank sentence";"Portuguese + full sentence + Mineiro variant + pronunciation note";"deck::topic level::A2"
```

Delimiter: semicolon (`;`). Anki import settings: field separator `;`, allow HTML, tag column 3.

### 5.2 Cloze Exercises — `cloze` table

~530 rows across 5 topics.

| Topic | Count | Focus |
|-------|-------|-------|
| `ser-estar` | ~60 | Ser/estar in context |
| `conjugation` | ~150 | Verb conjugation in sentence context |
| `prepositions` | ~80 | Preposition selection |
| `vocabulary` | ~200 | Vocab in context (with hint) |
| `mineiro` | ~40 | Mineiro vs standard selection |

**Example row:**
```sql
INSERT INTO cloze (topic, level, sentence, blank_word, hint, options, explanation, spanish_trap, tags)
VALUES (
  'ser-estar', 'A2',
  'Eu ___ cansado depois do trabalho.',
  'estou', 'ser/estar',
  '["sou","estou","fui","estava"]',
  'Use ''estar'' for temporary states. Being tired is temporary, not an identity.',
  'Same rule as Spanish here — ''Estoy cansado'' — but watch for PT cases that differ.',
  '["ser-estar","A2","grammar"]'
);
```

### 5.3 Grammar Drills — `drills` table

~490 rows across 5 types (all in one table, filtered by `type` column).

| Type | Count | Description |
|------|-------|-------------|
| `multiple_choice` | ~150 | 4-option MC with explanation |
| `error_correction` | ~100 | Fix the error in the sentence |
| `sentence_reordering` | ~80 | Unscramble words into correct order |
| `true_false` | ~80 | True/false about grammar/vocab/culture |
| `error_spotting` | ~80 | Find N errors in a paragraph |

**Example queries:**
```sql
-- Get a random A2 multiple choice drill the user hasn't done
SELECT d.* FROM drills d
WHERE d.type = 'multiple_choice' AND d.level = 'A2'
  AND d.id NOT IN (SELECT exercise_id FROM exercise_log WHERE table_name = 'drills')
ORDER BY RANDOM() LIMIT 1;

-- For error_correction: question = sentence with error, correct_answer = fixed sentence
-- For sentence_reordering: question = JSON array of words, correct_answer = correct sentence
```

### 5.4 Sentence Mining Bank — `sentences` table

~400 rows across 3 levels.

| Level | Count | Style |
|-------|-------|-------|
| A2 | ~150 | Simple daily life, short, common verbs |
| B1 | ~150 | Longer, opinions, past tenses, some idiom |
| B2 | ~100 | Complex grammar, idiomatic, formal register |

**Example row:**
```sql
INSERT INTO sentences (level, sentence_pt, sentence_mineiro, translation_en, grammar_note, key_vocab, source_style, tags)
VALUES (
  'A2',
  'Eu vou no mercado comprar pão.',
  'Eu vô no mercado comprá pão, uai.',
  'I''m going to the market to buy bread.',
  '''Vou no'' is colloquial (standard: ''vou ao''). Very common in spoken BP.',
  '["mercado","comprar","pão"]',
  'daily-life',
  '["A2","shopping","colloquial"]'
);
```

### 5.5 Dialogue Scripts — `/content/dialogues/`

~33 Markdown files organized by scenario.

| Scenario | Count | Level |
|----------|-------|-------|
| `boteco-*.md` | 5 | A2-B1 |
| `doctor-*.md` | 3 | B1 |
| `phone-*.md` | 4 | A2-B2 |
| `shopping-*.md` | 3 | A2-B1 |
| `neighbors-*.md` | 4 | A2-B1 |
| `job-interview-*.md` | 2 | B2 |
| `directions-*.md` | 3 | A2 |
| `bank-postoffice-*.md` | 3 | B1 |
| `complaint-*.md` | 3 | B1-B2 |
| `catching-up-*.md` | 3 | B1 |

**Markdown format per dialogue:**
```markdown
# Dialogue: At the Boteco (1/5)
**Level:** A2-B1
**Scenario:** Ordering drinks and snacks at a bar in BH

## Standard Version
**Garçom:** Boa noite! O que vai ser?
**Cliente:** Boa noite! Quero uma cerveja e um pão de queijo, por favor.
**Garçom:** Pode ser Skol ou Antarctica?
**Cliente:** Skol, bem gelada.

## Mineiro Version
**Garçom:** Boa noite! Cê vai querê o quê?
**Cliente:** Boa noite, sô! Me vê uma cerveja e um pão de queijo, uai.
**Garçom:** Pode sê Skol ou Antarctica?
**Cliente:** Skol, bem gelada, tá bão.

## Cultural Notes
- "Me vê" = informal way to order (lit. "let me see" but means "give me")
- Pão de queijo is THE Mineiro snack — cheese bread made with polvilho
- Always specify "bem gelada" — Brazilians take cold beer seriously

## Vocabulary
| Word | Meaning |
|------|---------|
| garçom | waiter |
| cerveja | beer |
| bem gelada | very cold |
| pão de queijo | cheese bread |

## Your Turn
Cover the Cliente lines. Read the Garçom lines and try to reconstruct what the Cliente says from memory. Then check.
```

### 5.6 Reading Library — `/content/reading/`

40 Markdown files with comprehension questions.

| Level | Count | Naming |
|-------|-------|--------|
| A2 | 15 | `a2-01-daily-routine.md` ... `a2-15-*.md` |
| B1 | 15 | `b1-01-*.md` ... `b1-15-*.md` |
| B2 | 10 | `b2-01-*.md` ... `b2-10-*.md` |

**Markdown format:**
```markdown
# Reading: [Title]
**Level:** B1 | **Topic:** Travel | **Words:** ~250

---

[Portuguese text here — 200-400 words depending on level]

---

## Vocabulary
| Word | Meaning |
|------|---------|
| ... | ... |

## Comprehension Questions

1. (MC) Onde o protagonista foi nas férias?
   a) São Paulo  b) Ouro Preto  c) Rio de Janeiro  d) Salvador

2. (Short answer) Por que ele escolheu esse lugar?

3. (True/False) O protagonista viajou sozinho. (  )

4. (Opinion — for Claude discussion) Você já visitou uma cidade histórica? O que achou?

## Mineiro Notes
[Any dialect-relevant notes about the text]
```

### 5.7 Graded Readers — `/content/stories/`

13 Markdown files.

| Level | Count | Length | Naming |
|-------|-------|--------|--------|
| A2 | 5 | ~300 words | `a2-story-01.md` ... |
| B1 | 5 | ~600 words | `b1-story-01.md` ... |
| B2 | 3 | ~1000 words | `b2-story-01.md` ... |

Same Markdown format as reading but longer, narrative-focused, with inline glossary and 2-3 discussion questions for Claude sessions.

### 5.8 Dictation Exercises — `dictation` table

80 rows across 3 levels. Text-only at launch (TTS later).

| Level | Count | Focus |
|-------|-------|-------|
| A2 | 30 | Short sentences, clear pronunciation, common words |
| B1 | 30 | Longer sentences, connected speech, accent marks |
| B2 | 20 | Natural speed, Mineiro pronunciation |

**Example row:**
```sql
INSERT INTO dictation (level, sentence, translation_en, focus, accent_tolerance, critical_words)
VALUES (
  'A2',
  'Eu moro em Belo Horizonte.',
  'I live in Belo Horizonte.',
  'nasal vowels, ''em'' preposition',
  0,
  '["moro","Belo Horizonte"]'
);
```

### 5.9 Mineiro Guide — `/content/mineiro-guide.md`

Single reference document. Not drillable — just a reference.

```markdown
# Mineiro Expression Guide

## Expressions

### uai
**Meaning:** Universal interjection — surprise, agreement, emphasis, filler
**Standard BP:** (no direct equivalent — closest: "nossa", "é mesmo?")
**Usage:**
- Casual: "Uai, cê não sabia?"
- Agreement: "Uai, pode ser."
- Surprise: "Uai, sério?!"
**Regional:** Universal across MG, more frequent in rural areas
**Pronunciation:** /wai/ — one syllable, rising tone

[... repeat for each expression ...]
```

---

## 6. Content Generation Strategy

This is how you actually create 6,400+ items of offline content.

### Step 1: Build the generator script (`tools/generate_batch.py`)

```python
"""
Batch content generator using Claude API.

Usage:
  python tools/generate_batch.py --type anki --topic food --level A2 --count 50
  python tools/generate_batch.py --type cloze --topic ser-estar --count 30
  python tools/generate_batch.py --type drill --subtype multiple-choice --count 50
  python tools/generate_batch.py --type dialogue --scenario boteco --count 1
  python tools/generate_batch.py --type reading --level B1 --count 1
  python tools/generate_batch.py --type story --level A2 --count 1
  python tools/generate_batch.py --type dictation --level A2 --count 10
  python tools/generate_batch.py --type sentences --level A2 --count 50
"""
```

Each `--type` maps to a specific system prompt + output schema (the SQL schemas defined in Section 4). The script:
1. Builds a prompt with the table schema, topic, level, count, and Mineiro dialect instructions
2. Calls Claude API (claude-sonnet-4-6 for cost efficiency)
3. Parses JSON response, validates against table schema
4. Inserts rows into `fluent.db` (or writes .md files for dialogues/reading/stories + registers in `markdown_content` table)
5. Logs generation metadata (timestamp, model, token count)

### Step 2: Generation Order

Generate in this order (dependencies flow downward):

1. **Mineiro guide** — reference for all other generation (1 file)
2. **Core vocab CSV** — establishes word list (1500 words)
3. **Sentence mining bank** — uses vocab in context (400 sentences)
4. **Cloze exercises** — uses vocab + sentences as seeds (530 exercises)
5. **Grammar drills** — uses vocab + grammar patterns (490 drills)
6. **Remaining Anki decks** — specialized decks (900 cards)
7. **Dialogue scripts** — uses vocab + scenarios (33 scripts)
8. **Reading passages** — uses vocab + topics (40 passages)
9. **Graded readers** — uses vocab + cultural themes (13 stories)
10. **Dictation exercises** — uses sentences from above (80 exercises)

### Step 3: Validation Pass

Run `tools/validate_content.py` after each batch:
- Schema validation (SQLite constraints catch most — NOT NULL, CHECK, UNIQUE)
- Duplicate detection (fuzzy match on text fields beyond what UNIQUE catches)
- Level consistency (A2 content shouldn't use subjunctive — query + flag)
- Mineiro accuracy (flag expressions for manual spot-check)
- Cross-reference (`SELECT` vocab in exercises that don't exist in `vocab` table)
- Orphan check (markdown files referenced in `markdown_content` but missing on disk)

### Step 4: Quality Assurance (Portuguese Accuracy)

Claude-generated Portuguese is good but not perfect. The QA strategy:

**Automated checks (`validate_content.py`):**
- Run each Portuguese sentence through a second Claude call with the prompt: "Is this natural Brazilian Portuguese? Is the Mineiro dialect usage accurate? Rate 1-5 and flag issues." Use Haiku for cost (~$0.50 for all 6,400 items).
- Flag any item rated <4 for manual review.
- Check that Spanish interference notes are actually correct (e.g., "polvo" really does mean octopus in PT).

**Manual spot-check (~10% sample, ~640 items):**
- Natural-sounding Portuguese (not "textbook robot")
- Accurate Mineiro dialect usage
- Correct Spanish interference flags
- Appropriate difficulty for tagged level

**Ongoing correction:**
- Add a `fluent flag <exercise_id>` CLI command that marks an exercise as potentially wrong. Flagged items get a `flagged` column in the content DB.
- Periodically review flagged items and fix/regenerate.
- When you encounter a bad exercise during practice, flag it immediately — don't lose the feedback.

**What this does NOT include:** native speaker review. If you find a Mineiro speaker to review a batch, great, but the system doesn't depend on it.

### Step 5: Content Expansion (Leveling Up)

Content isn't generate-once-and-done. As you progress from A2→B1→B2→C1, you'll exhaust lower-level content and need more advanced material.

**How you know content is running low:**
```sql
-- Check content exhaustion per level
SELECT level, COUNT(*) as total,
  (SELECT COUNT(*) FROM user.exercise_log el
   WHERE el.table_name = 'cloze' AND el.exercise_id = c.id AND el.score >= 8) as mastered
FROM cloze c GROUP BY level;
-- When mastered/total > 0.8 for a level, generate more at the next level up
```

**`fluent status` command** shows content health:
```
Content Health:
  A2 cloze:    142/150 mastered (95%) — ⚠️ nearly exhausted
  A2 drills:    88/100 mastered (88%) — ⚠️ nearly exhausted
  B1 cloze:     23/150 mastered (15%) — ✅ plenty left
  B1 drills:    12/100 mastered (12%) — ✅ plenty left
  B2 cloze:      0/100 mastered (0%)  — ✅ untouched
```

**When content runs low:**
1. Run `python tools/generate_batch.py --type cloze --level B1 --count 50` — costs ~$0.50
2. Validate the new batch
3. Content DB grows incrementally — no full regeneration needed

---

## 7. CLI Commands

Built with Python `click` library.

| Command | What It Does | Offline/Live |
|---------|-------------|--------------|
| `fluent drill` | Random exercise from drill bank, auto-scored | Offline |
| `fluent cloze` | Cloze deletion exercise, auto-scored | Offline |
| `fluent dialogue` | Serve a dialogue script, quiz reconstruction | Offline |
| `fluent read` | Reading passage + comprehension questions | Offline |
| `fluent story` | Graded reader with glossary | Offline |
| `fluent dictation` | Show sentence briefly, type from memory | Offline |
| `fluent speak` | Conversation with Claude (role-play) | Live |
| `fluent write` | Writing exercise, Claude evaluates | Live |
| `fluent review` | Claude coaches on recent mistakes | Live |
| `fluent progress` | Stats dashboard from tracking files | Offline |
| `fluent status` | Content health — how much is mastered/remaining per level | Offline |
| `fluent flag <id>` | Flag a bad exercise for review/regeneration | Offline |
| `fluent export-anki` | Regenerate Anki CSVs from `anki_cards` table | Offline |

### Exercise Selection (Retrieval + Ranking)

When serving an exercise, don't pick randomly. Use SQL to rank and filter:

```sql
-- Example: select next cloze exercise, ranked by relevance
SELECT c.*,
  CASE WHEN c.topic IN (SELECT pattern FROM json_each(:weak_topics)) THEN 10 ELSE 0 END AS weakness_weight,
  CASE WHEN c.level = :user_level THEN 5 WHEN c.level < :user_level THEN 2 ELSE 0 END AS difficulty_fit,
  CASE WHEN c.mineiro_variant IS NOT NULL THEN 2 ELSE 0 END AS dialect_bonus,
  CASE WHEN el.score >= 8 THEN -15 ELSE 0 END AS mastered_penalty
FROM cloze c
LEFT JOIN user.exercise_log el ON el.table_name = 'cloze' AND el.exercise_id = c.id
WHERE c.level <= :user_level AND c.flagged = 0
ORDER BY (weakness_weight + difficulty_fit + dialect_bonus + mastered_penalty) DESC, RANDOM()
LIMIT 5;
```

Then pick one from the top 5 (randomness avoids predictability). The Python ranking logic from mistakes-db feeds `:weak_topics` as a JSON array.

### Auto-Scoring

For offline exercises, scoring is deterministic:

| Type | Scoring Method |
|------|---------------|
| Cloze | Exact match on `correct_answer` (case-insensitive, accent-sensitive) |
| Multiple choice | Exact match on `correct_answer` |
| True/false | Exact match |
| Error correction | Fuzzy match on `correct_sentence` (Levenshtein distance < 3) |
| Sentence reordering | Exact match on `correct_order` (ignore punctuation) |
| Dictation | Exact match, configurable accent tolerance |
| Error spotting | All errors found = 10/10, partial credit |

Map score to SM-2 quality (0-5) per the table in LEARNING_SYSTEM.md.

---

## 8. Claude Integration

### Prompt Builder (`tutor/prompt_builder.py`)

Every Claude call sends a compact context packet, NOT the full system files.

```python
def build_prompt(session_type: str, user_state: dict) -> str:
    """Build a ~50-100 token context prompt."""
    return f"""Chris is {user_state['level']} Mineiro Portuguese learner (English native, speaks Spanish).
Today's mistakes: {format_recent_mistakes(user_state['mistakes'], limit=5)}.
Session type: {session_type}.
Dialect: standard BP with Mineiro flavor (uai, trem, cê, bão, dropped gerund -d).
Be encouraging, correct every error, flag Spanish interference.
"""
```

### Session Types

**`fluent speak` (conversation):**
- Claude plays a character (waiter, neighbor, coworker, doctor)
- User chats in Portuguese
- Claude corrects inline, keeps conversation flowing
- Streaming responses for natural feel
- ~2,000-4,000 tokens per 10-minute session

**`fluent write` (writing feedback):**
- User writes an email/letter/message
- Claude returns: corrections (color-coded severity), side-by-side comparison, Spanish interference flags, Mineiro alternatives
- ~1,000-2,000 tokens per exercise

**`fluent review` (mistake coaching):**
- Reads mistakes-db.json, identifies patterns
- Explains the underlying rule
- Gives 2-3 targeted exercises
- Connects to Spanish parallels (helpful ones, not traps)
- ~500-1,000 tokens per session

### API Configuration

```python
# config.py
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
MODEL = "claude-sonnet-4-6"  # Cost-efficient for tutoring
MAX_TOKENS = 1024            # Keep responses focused
TEMPERATURE = 0.7            # Some variety in conversation
STREAM = True                # For conversation mode
```

---

## 9. Tracking System

### Existing files (keep as-is, already working)

| File | What Changes |
|------|-------------|
| `learner-profile.json` | Streak, level, preferences — update after every session |
| `progress-db.json` | Stats, accuracy trends — update after every exercise |
| `mistakes-db.json` | Error patterns — update after every mistake. **This is what feeds Claude's live coaching.** |
| `mastery-db.json` | Skill mastery 0-5 — update after each session |
| `session-log.json` | Session history — append after each session |

### What changes

`spaced-repetition.json` gets **simplified**. Anki handles vocab/grammar SRS. This file only tracks:
- Error patterns that need re-drilling (from mistakes-db)
- Writing/speaking items Claude flagged for revisit
- Offline exercise items that were answered incorrectly

### Update Protocol

After every exercise (offline or live):
1. INSERT into `exercise_log` table in `data/user.db` — records what was answered, score, quality
2. Update `progress-db.json` — increment correct/incorrect, recalculate accuracy
3. If mistake: update `mistakes-db.json` — increment frequency, add example, flag interference
4. If SM-2 item: update `spaced-repetition.json` — recalculate interval and next review date
5. End of session: update `mastery-db.json`, `session-log.json`, `learner-profile.json`

The `exercise_log` table in `data/user.db` is the bridge. At runtime, `core/db.py` ATTACHes `user.db` to the content DB connection, so retrieval queries can JOIN across both to exclude completed/mastered exercises while keeping the content DB immutable.

---

## 10. Token Budget

| Activity | Tokens/Session | Frequency | Weekly Total |
|----------|---------------|-----------|--------------|
| Anki review | 0 | Daily | 0 |
| Grammar drills (auto-scored) | 0 | Daily | 0 |
| Cloze exercises | 0 | Daily | 0 |
| Reading passages | 0 | 2-3x/week | 0 |
| Dialogue practice | 0 | 2-3x/week | 0 |
| Conversation practice (10 min) | ~3,000 | 3-4x/week | ~12,000 |
| Writing feedback | ~1,500 | 2-3x/week | ~4,500 |
| Mistake coaching | ~750 | 1-2x/week | ~1,500 |
| Fresh exercise generation | ~750 | When bank runs dry | ~750 |

**Estimated weekly: ~15,000-20,000 tokens** (down from ~30,000-50,000+ with full Claude sessions).

---

## 11. Implementation Phases

### Phase 1: Content Generation (Week 1)

**Goal:** All 6,400+ offline content items generated, validated, and ready.

Tasks:
1. Write `tools/generate_batch.py` — batch content generator with Claude API
2. Write `tools/validate_content.py` — schema + quality validation
3. Generate content in order (Section 6, Step 2)
4. Validate and fix each batch
5. Manual spot-check ~10% for quality

**Output:** Populated `content/fluent.db` + `content/dialogues/`, `content/reading/`, `content/stories/`, `content/mineiro-guide.md`.

**Agent instructions:** Use `claude-sonnet-4-6` for generation (cost-efficient). Have Claude output strict JSON arrays matching the table columns. Parse and INSERT into SQLite with parameterized queries. Generate in batches of 20-50 items per API call. Include Mineiro variants where applicable. Flag Spanish false cognates explicitly. For markdown content, write the .md file AND insert the metadata row into `markdown_content`.

### Phase 2: CLI + Offline Engine (Week 2)

**Goal:** `fluent drill`, `fluent cloze`, `fluent read`, `fluent dialogue`, `fluent story`, `fluent dictation`, `fluent progress`, `fluent status`, `fluent flag`, `fluent export-anki` all working.

Tasks:
1. Set up Python project — `click` CLI, project structure, `requirements.txt`
2. Implement `core/db.py` — dual SQLite connection (content read-only + user read-write via ATTACH), schema init for `data/user.db`
3. Implement `core/drills.py` — serve exercises from SQLite, auto-score
4. Implement `core/retrieval.py` — SQL-based ranking algorithm (JOIN across both DBs, exclude flagged)
5. Implement `core/scoring.py` — auto-scoring + SM-2 quality mapping
6. Implement `tracker/` modules — read/write JSON data files + INSERT to `user.exercise_log`
7. Implement `export/anki.py` — CSV generation from `anki_cards` table
8. Implement `fluent status` — content health dashboard (mastered/total per level per table)
9. Implement `fluent flag` — mark exercise as bad (UPDATE flagged=1 in content DB — only write operation allowed)
10. Wire up all CLI commands
11. Test: run 10 exercises of each type, verify scoring + tracking

**Output:** Working offline learning CLI.

### Phase 3: Claude Integration (Week 3)

**Goal:** `fluent speak`, `fluent write`, `fluent review` all working.

Tasks:
1. Implement `tutor/claude_client.py` — API wrapper with streaming
2. Implement `tutor/prompt_builder.py` — minimal context prompts
3. Implement `tutor/feedback_parser.py` — extract scores from Claude
4. Wire up live CLI commands
5. Test: run 3 conversations, 2 writing exercises, 1 review session

**Output:** Full hybrid system — offline + live.

### Phase 4: Audio + Listening (When Ready)

**Goal:** Real listening practice — the biggest gap in text-only launch.

Tasks:
1. Choose TTS provider — ElevenLabs (natural but paid) or Google TTS (cheap, decent quality)
2. Generate audio for all 80 dictation exercises → populate `audio_file` column
3. Generate audio for dialogue scripts (both speakers)
4. Add `fluent listen` command — play audio, user types what they hear, auto-scored
5. Consider generating audio for sentence mining bank (400 sentences = good passive listening)

**Cost estimate:** ElevenLabs ~$5-10 for all audio. Google TTS essentially free.

### Phase 5: Polish & Daily Use (Ongoing)

- Refine prompts based on real session quality
- Run `fluent status` weekly — regenerate content when mastered/total > 80% for a level
- Review flagged exercises, fix or regenerate
- Add new reading passages / stories as you level up to B2/C1
- Add achievement system if wanted
- Consider Mineiro farmer UI (game layer) as future enhancement

---

## 12. Files the Agent Should NOT Touch

- `CLAUDE.md` — system instructions for Claude Code sessions (different from CLI)
- `LEARNING_SYSTEM.md` — methodology reference (read-only for the agent)
- `.claude/commands/` — slash commands for Claude Code (separate system)
- `data/*.json` — existing user data (the agent reads schema, doesn't modify data)
- `HYBRID-PLAN.md`, `chatgpt_hybrid_plan.md` — superseded by this spec

---

## 13. Dependencies

```
# requirements.txt
anthropic>=0.40.0    # Claude API SDK
click>=8.0           # CLI framework
```

No other runtime dependencies. `sqlite3` ships with Python stdlib. Keep it minimal.

**External tools (not Python packages):**
- Anki (desktop or mobile) — required for SRS flashcard review
- Anthropic API key — required for live commands + content generation

---

## 14. Environment Variables

```bash
export ANTHROPIC_API_KEY="sk-ant-..."  # Required for live commands
export FLUENT_DATA_DIR="./data"        # Default: ./data
export FLUENT_CONTENT_DIR="./content"  # Default: ./content
```

---

## 15. Success Criteria

1. 30 min of daily practice with <5,000 tokens (~$0.03/day)
2. Anki decks comprehensive and accurate for A2→B1 (2,400 cards, <5% error rate after QA)
3. CLI exercises feel varied — `fluent status` shows >200 unseen exercises at current level
4. Claude conversations feel natural and responsive to actual weak spots
5. Mistake patterns tracked and addressed across sessions (mistakes-db feeds retrieval + Claude prompts)
6. Content scales: can add 500 new exercises with one `generate_batch.py` command (~$1)
7. Content DB is portable: can back up, regenerate, or replace `fluent.db` without losing user progress in `user.db`
8. Chris actually uses it daily (the best system is the one you stick with)
