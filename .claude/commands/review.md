---
description: Review items due today (spaced repetition)
allowed-tools: Read, Write
---

# Spaced Repetition Review Session

Review items that are due today based on the SM-2 spaced repetition algorithm.

## Protocol

### 1. Load Review Queue

```
data/spaced-repetition.json
data/mistakes-db.json
data/mastery-db.json
```

**Note:** If any of these files don't exist in `/data`, check the `data-examples/` directory for template files (e.g., `spaced-repetition-template.json`). You may need to copy them to `/data` and initialize them.

### 2. Check Today's Reviews

From `spaced-repetition.json` → `review_queue.today`:
- Count total items due
- Sort by priority (critical → high → medium → low)
- Limit to `daily_limits.review_items_per_day` (usually 20)

### 3. Greet and Explain

```markdown
# 🔄 Revisão de Hoje

E aí, {learner}! Hora de revisar o que seu cérebro está prestes a esquecer. Bora manter tudo fresquinho! 🧠

**Itens para Hoje:** {count}
**Tempo Estimado:** ~{minutes} minutos

**Por que revisar?** Previne o esquecimento, move itens para memória de longo prazo, e constrói recall automático!

**Bora lá!** 💪
```

### 4. For Each Review Item

#### Item Structure
Each item in the queue has:
```json
{
  "item_id": "formal_informal_confusion",
  "item_type": "error_pattern",
  "review_type": "urgent",
  "easiness_factor": 1.3,
  "interval_days": 1,
  "repetitions": 0,
  "due_date": "2025-11-17",
  "priority": "critical"
}
```

#### Generate Appropriate Exercise

Based on `item_type`:

**If `item_type` = "error_pattern":**
- Load the pattern from `mistakes-db.json`
- Create targeted exercise testing that specific pattern

**If `item_type` = "vocabulary":**
- Show the word and ask for translation (Portuguese → English or vice versa)
- Or: Fill-in-blank sentence using the word

**If `item_type` = "grammar_rule":**
- Test application of the rule with a sentence completion or error correction

#### Present ONE Item at a Time

```markdown
## Review Item {N}/{total} - {Priority emoji}

**Type:** {error_pattern/vocabulary/grammar_rule}
**Last Reviewed:** {X} days ago
**Current Mastery:** {level}/5 ⭐

{Generate appropriate exercise based on item type}

**Manda a resposta!** ⏱️
```

### 5. Evaluate Response and Update

After the learner answers:

**Give Feedback:**
```markdown
{✅ Correct! or ❌ Not quite}

{If incorrect: explain the pattern/rule again}

**Score: {X}/10**

{If correct on first try: "Boa! Lembrou certinho! 🎉"}
{If struggled: "Valeu o esforço! Vamos revisar de novo em breve."}
```

**Update Spaced Repetition (SM-2):**
- New `easiness_factor`
- New `interval_days`
- New `repetitions` count
- New `due_date`
- Updated `mastery_level`

**Move item to appropriate queue:**
- If quality >= 3: Move to future queue (tomorrow/this_week/later)
- If quality < 3: Keep in today's queue (will review again soon)

### 6. Progress Updates During Session

Every 5 items, show quick progress:

```markdown
**Revisados:** {N}/{total} | **Acertos:** {percentage}% | ~{minutes} min restantes

Continua firme! 💪
```

### 7. Session Complete Summary

```markdown
## 🎉 Revisão Completa!

**Itens Revisados:** {count}
**Acertos:** {percentage}%
**Tempo:** {minutes} minutos

### Resultado

**Dominados:** {count} - Só voltam daqui a um tempão! 🎉
**Bom:** {count} - Revisão em {X} dias
**Precisa Praticar:** {count} - Voltam amanhã

### Próximas Revisões

- **Amanhã:** {count} itens
- **Esta Semana:** {count} itens
- **Semana que Vem:** {count} itens

**Streak:** 🔥 {X} dias! {motivational_message}

**Mandou bem, {learner}!** Continua com as revisões diárias! 🌟

---

Quer praticar algo novo?
- `/learn` - Nova sessão de aprendizado
- `/writing` - Praticar escrita
- `/vocab` - Aprender vocabulário novo
```

### 8. Update All Databases

After review session:

1. **spaced-repetition.json** - Update all reviewed items with new SM-2 parameters, move items between queues, recalculate mastery levels
2. **progress-db.json** - Update review statistics, add session to history
3. **session-log.json** - Add review session entry (items reviewed, accuracy, time, weak patterns)
4. **mistakes-db.json** - Update error patterns reviewed, adjust mastery based on performance

See LEARNING_SYSTEM.md for full SM-2 algorithm details and spaced repetition methodology.
