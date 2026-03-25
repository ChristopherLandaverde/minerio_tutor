# Mineiro Portuguese Learning System

**Purpose:** Complete methodology guide for teaching Chris Mineiro Portuguese (Minas Gerais dialect of Brazilian Portuguese). Covers algorithms, tracking, pedagogy, and dialect-specific instruction.

---

## Core Methodology (Evidence-Based)

1. **Active Recall** - Always ask before showing answers. Force retrieval from memory.
2. **Spaced Repetition (SM-2)** - Review intervals based on performance. See algorithm below.
3. **Immediate Feedback** - Correct within seconds. Explain WHY. Show correct version.
4. **Interleaving** - Mix topics in same session. Don't drill one pattern for 20 minutes.
5. **Comprehensible Input (i+1)** - Slightly above current level. Aim for 60-70% success rate.
6. **Desirable Difficulty** - Easy -> medium -> hard. Too easy = no learning, too hard = frustration.

---

## Mineiro Portuguese: Dialect-Specific Teaching Notes

### Common Mineiro Expressions
Teach these alongside standard Brazilian Portuguese:

| Mineiro | Standard BP | English |
|---------|------------|---------|
| uai | (interjection, no equivalent) | expression of surprise/emphasis |
| trem | coisa / negocio | thing / stuff |
| ce / oce | voce | you |
| so | (vocative particle) | buddy / pal (end of sentence) |
| no! | nossa! | wow! |
| bao | bom / legal | good / cool |
| bao demais | muito bom | really good |

### Gerund 'd' Dropping
Mineiro speakers drop the 'd' in gerunds (-ndo -> -no):
- falando -> falano
- comendo -> comeno
- fazendo -> fazeno

**Teach both forms.** Standard for writing, Mineiro for conversational/speaking practice.

### Spanish Interference (Critical)
Chris speaks Spanish natively alongside English. Watch for:
- **False cognates:** esquisito (PT: strange / ES: exquisite), embaracada (PT: pregnant / ES: embarrassed), polvo (PT: octopus / ES: dust)
- **Portunhol blending:** mixing Spanish grammar/vocab into Portuguese
- **Ser/estar differences:** Usage differs between Spanish and Portuguese
- **Preposition confusion:** Portuguese "em" vs Spanish "en", "para" vs "por"
- **Verb conjugation spillover:** Spanish patterns imposed on Portuguese verbs

When Chris makes a Spanish-influenced error, explicitly flag it: "Cuidado! Isso e interferencia do espanhol."

---

## Data Files

### Database (SQLite via Tauri)

All data lives in `user.db` via `tauri-plugin-sql`. See CLAUDE.md for table schema.

---

## SM-2 Spaced Repetition Algorithm

### Core Formula
```
If quality >= 3 (correct):
    if repetitions == 0: interval = 1 day
    elif repetitions == 1: interval = 6 days
    else: interval = previous_interval * easiness_factor
    repetitions += 1

If quality < 3 (incorrect):
    repetitions = 0
    interval = 1 day

Easiness Factor update:
    EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    EF' = max(1.3, EF')

Next review date = today + interval
```

### Quality Scale (map from exercise score)
| Score | Quality | Meaning |
|-------|---------|---------|
| 10/10 | 5 | Perfect, instant recall |
| 8-9/10 | 4 | Correct after hesitation |
| 6-7/10 | 3 | Correct with difficulty |
| 4-5/10 | 2 | Incorrect but recognized when shown |
| 2-3/10 | 1 | Incorrect, vaguely familiar |
| 0-1/10 | 0 | Complete blank |

### Mastery Level Updates
- 5+ consecutive correct -> mastery_level up (max 5)
- 3+ consecutive incorrect -> mastery_level down (min 0)

---

## Adaptive Difficulty

```
mastery 0-1:           -> easy (expect 70%+ success)
mastery 2, acc > 0.60: -> medium; else easy
mastery 3:             -> medium
mastery 4+, acc > 0.80 -> hard; else medium
```

### Live Difficulty Adjustment (mid-session)
- If accuracy **>80%** during session → increase difficulty
- If accuracy **<40%** during session → decrease difficulty, add scaffolding
- Target **60-70%** success rate for optimal learning

### Drill Time Allocation
- **50%** on 0-1 star patterns (critical weaknesses)
- **30%** on 2-3 star patterns (consolidation)
- **20%** on full scenarios (integration)

---

## Exercise Types

**Writing:** Fill-in-blanks, translation (EN->PT), error correction, full email/letter, sentence reordering
**Speaking:** Answer questions, describe situations, role-play scenarios (typed conversation)
**Vocabulary:** Flashcard PT->EN, reverse EN->PT, context clues, word associations, synonyms/antonyms
**Reading:** Short text + comprehension questions, fill missing words, true/false, summarization
**Listening:** Comprehension of spoken Portuguese (describe audio scenarios, dictation exercises)

---

## Exercise UX Guidelines

- Present one question at a time in the UI
- Immediate feedback after each answer (inline, not a separate page)
- Score each question out of 10
- Use Portuguese in exercise content; English in UI chrome
- Error severity levels: CRITICAL (breaks communication) | MODERATE (understandable) | MINOR (spelling/accents)

## Gamification & Achievements

| Achievement | Condition |
|-------------|-----------|
| First Steps | First session completed |
| 3-Day Streak | 3 consecutive days |
| 7-Day Streak | 7 consecutive days |
| 30-Day Streak | 30 consecutive days |
| 100-Day Streak | 100 consecutive days |
| Skill Master | Any skill reaches mastery level 5 |
| Century | 100 exercises completed |
| 500 Club | 500 exercises completed |
| Perfect Five | 10/10 on 5 consecutive questions |
| Comeback Kid | Pattern goes from mastery 1 to mastery 4 |
| Polyglot Power | Successfully uses Spanish knowledge to learn Portuguese |
