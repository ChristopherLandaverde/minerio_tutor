```
# Fluent Mineiro: Hybrid Language Learning System

## Overview

Fluent Mineiro is a **local-first Portuguese learning engine** designed for practical, real-world fluency in Brazilian Portuguese (with a Mineiro focus), using:

- A massive offline lexical database
- Adaptive local drill generation
- Personal learning memory tracking
- Claude as a high-value coaching layer

This system prioritizes:
- Low cost
- High control
- Personalization
- Real conversational ability

---

## Core Philosophy

- Local system = brain  
- Claude = coach  
- Database = source of truth  

The system is designed to:
- Minimize API usage  
- Maximize structured learning  
- Reflect real Brazilian speech (especially Minas Gerais)  
- Account for English-native + Spanish interference patterns  

---

## System Architecture

### 1. Layered Model

#### Layer A: Core Lexicon (Database)
The foundation of the system.

Contains:
- Words
- Phrases
- Idioms
- Grammar patterns
- Dialect variations (Mineiro-specific)
- Pronunciation notes
- Common learner errors
- Example sentences

#### Layer B: Content Assets
Generated or authored learning materials:
- Flashcards (Anki)
- Cloze exercises
- Conjugation drills
- Dialogues
- Reading passages
- Dictation scripts

#### Layer C: User State
Tracks personal learning progress:
- Known vs unknown items
- Mistakes
- Weak areas
- Recall history
- Confidence levels
- Spanish interference patterns

---

## Data Design

### Lexicon Entry Schema

```json
{
  "lemma": "trem",
  "type": "noun | phrase | grammar",
  "meaning_bp": "thing/object (generic)",
  "meaning_mineiro": "any object or situation",
  "english": "thing",
  "spanish_note": "avoid confusion with 'tren'",
  "level": "A1-C1",
  "tags": ["daily-life", "mineiro", "informal"],
  "examples": [],
  "dialect_variants": [],
  "pronunciation": "",
  "common_errors": [],
  "related_grammar": [],
  "linked_content": []
}
```

------

## Storage Strategy

| Data Type | Storage Format |
| --------- | -------------- |
| Lexicon   | SQLite         |
| Progress  | JSON           |
| Mistakes  | JSON           |
| Sessions  | JSON           |
| Readings  | Markdown       |
| Dialogues | Markdown       |
| Audio     | Files          |

------

## Retrieval & Ranking System

Before any session, the system selects relevant content using:

### Ranking Factors

- Recent mistakes
- Spaced repetition timing
- Topic relevance
- Difficulty fit
- Dialect exposure
- Spanish interference risk

### Example Scoring

```
score = 
  weakness_weight +
  topic_match +
  spacing_due +
  dialect_match -
  mastered_penalty
```

------

## Exercise Generation

Instead of relying only on static content, the system uses **templates**.

### Example: Conjugation Template

Inputs:

- Verb
- Tense
- Pronoun
- Sentence frame

Generated outputs:

- Fill in the blank
- Multiple choice
- Negative form
- Question form
- Dialect variation

------

## Claude Integration

Claude is used **only for high-value tasks**.

### Claude Responsibilities

- Conversation simulation
- Writing correction
- Error explanation
- Cultural context
- Adaptive teaching

### Claude Does NOT Handle

- Basic drills
- Flashcard generation
- Scoring
- Repetition scheduling

------

## Teaching Packet System

Before calling Claude, the system generates a compact context:

```
{
  "mode": "boteco conversation",
  "target_vocab": ["trem", "ficar", "uai"],
  "grammar_focus": "ser vs estar",
  "recent_mistakes": [],
  "dialect": "mineiro",
  "complexity_limit": "no subjunctive",
  "recall_targets": []
}
```

This ensures:

- Low token usage
- High relevance
- Consistent teaching behavior

------

## Learning Modes

### 1. Vocabulary Training

- Flashcards (Anki)
- Recall drills
- Cloze sentences

### 2. Grammar Practice

- Conjugation drills
- Error correction
- Sentence transformations

### 3. Reading

- Short passages
- Real-life texts
- Mineiro dialogue samples

### 4. Listening

- Dictation exercises
- Audio comprehension

### 5. Conversation (Claude)

- Scenario-based interaction
- Real-time correction
- Adaptive difficulty

------

## Personal Learning Model

Tracks deeper learning signals:

- Mistakes
- Avoidance patterns
- Confidence levels
- Recall success
- Productive vs receptive knowledge
- Spanish interference
- Dialect exposure

------

## Project Structure

```
fluent_mineiro/
  app/
    cli.py
    config.py

  core/
    lexicon.py
    retrieval.py
    ranking.py
    generator.py
    scoring.py

  tutor/
    claude_client.py
    prompt_builder.py
    feedback_parser.py

  content/
    lexicon.db
    readings/
    dialogues/
    stories/
    audio/

  user/
    profile.json
    mistakes.json
    progress.json
    mastery.json
    sessions.json

  exports/
    anki/

  tools/
    import_csv.py
    validate_content.py
    dedupe_entries.py
```

------

## Validation System

To maintain quality, the system includes validation scripts:

- Duplicate detection
- Missing translations
- Incorrect tagging
- Broken exercises
- Inconsistent dialect labeling

------

## API Roadmap

### Core APIs

- Claude → tutor, correction, conversation
- Speech-to-Text (Deepgram or similar) → speaking practice
- Text-to-Speech (ElevenLabs or similar) → audio + immersion
- Translation API (Google Cloud) → optional hints

### Usage Principles

- Keep Claude as the main tutor
- Use STT/TTS for immersion
- Use translation only as a fallback tool
- Avoid unnecessary API complexity

------

## UI Vision: Mineiro Farmer Interface

A cozy, game-inspired interface centered around a Mineiro farmer character.

### Goals

- Make learning feel like a world, not a tool
- Tie language progress to environment and interaction
- Reinforce immersion and motivation

### Example Interactions

- Talk to neighbors (conversation mode)
- Buy items at the market (vocab practice)
- Help on the farm (task-based language use)
- Chat at the boteco (casual dialogue)

### System Integration

- Progress unlocks new areas
- Mistakes affect dialogue difficulty
- Mastery changes NPC behavior
- Dialect exposure increases naturally

------

## House Style (What Makes This Unique)

### Teaching Style

- Practical, real-world Portuguese
- Minas Gerais focus
- Direct but supportive correction
- Culture-first learning

### System Identity

- Not a generic AI tutor
- A structured language engine
- Personalized to the user
- Built around real Brazilian speech

------

## Development Roadmap

### Phase 1

- Build lexicon database
- Implement core drills
- Set up Anki integration

### Phase 2

- Add retrieval + ranking
- Introduce Claude tutor layer
- Track mistakes and progress

### Phase 3

- Add speech (STT + TTS)
- Introduce conversation mode
- Expand content (dialogues, readings)

### Phase 4

- Build Mineiro farmer UI
- Connect progress to world/game states
- Improve immersion

### Phase 5

- Add validation tools
- Optimize generation system
- Refine teaching packet logic

------

## Final Positioning

Fluent Mineiro is a **local-first, structured Portuguese learning engine with a Mineiro focus**, combining offline intelligence with Claude-powered coaching for high-quality, personalized fluency training.

```
---

If you want next step, I can generate:
- the **SQLite schema**
- or the **first working Python CLI**
- or the **Claude prompt templates**

Just tell me 👍
```