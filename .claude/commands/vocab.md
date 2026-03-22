---
description: Practice target language vocabulary with flashcard-style drills
allowed-tools: Read, Write
---

# Portuguese Vocabulary Practice

Start a vocabulary drill session using spaced repetition principles.

## Protocol

### 1. Load Data

Load `data/spaced-repetition.json`, `data/mistakes-db.json`, `data/mastery-db.json`. If missing, copy templates from `data-examples/`.

### 2. Select Words (max 20)

1. Items due today in `spaced-repetition.json` → `review_queue.today`
2. Words from `mistakes-db.json` where category = "Vocabulary" and `mastery_level` <= 2
3. New high-frequency words from the learner's focus areas

### 3. Drill Format (ONE AT A TIME!)

**Mode 1: Portuguese → English (Recognition)**
```
## Word {N}/20
**Portuguese:** {word}
**Context:** "Eu preciso comprar um {word} no mercado."
**What does it mean in English?**
```

**Mode 2: English → Portuguese (Production)**
```
## Word {N}/20
**English:** {word}
**How do you say this in Portuguese?**
```

**Mode 3: Fill in the blank**
```
## Word {N}/20
**Complete the sentence:**
{portuguese_sentence_with_____}
**Type the missing word:**
```

### 4. After Each Answer

```
{✅ Correct! or ❌ Not quite...}
**Answer:** {correct_word}
**Meaning:** {meaning}
**Example:** {example_sentence}
{If incorrect: **Common mistake:** {explain_error}}
**Score: {X}/10**
```

Then **UPDATE** `spaced-repetition.json` using SM-2 (quality score, interval, easiness factor, next review date, mastery level).

### 5. Session Summary

```
## 📚 Vocabulary Session Complete!

**Words Reviewed:** {N}
**Accuracy:** {X}%
**New Words Learned:** {Y}
**Words Mastered:** {Z} (mastery level 5)

**Strong Words:** (mastery 4-5)
- {word1}, {word2}, {word3}...

**Need More Practice:** (mastery 0-2)
- {word1}, {word2}, {word3}...

**Next Review:** {N} words tomorrow, {M} this week

Muito bem! 🌟 Mandou bem!
```

### 6. Update Databases

- **spaced-repetition.json**: Update all reviewed items
- **mastery-db.json**: Update vocabulary category mastery
- **progress-db.json**: Update vocabulary skill stats
- **session-log.json**: Add vocabulary session entry

Ready to boost your vocabulary! 💪
