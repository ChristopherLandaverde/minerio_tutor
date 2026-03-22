---
description: Practice target language writing (emails, letters, forms)
allowed-tools: Read, Write
---

# Brazilian Portuguese Writing Practice (Mineiro Flavor)

Practice writing emails, letters, and forms at your current level.

## Protocol

### 1. Load Writing Context

```
data/learner-profile.json
data/mistakes-db.json
data/mastery-db.json
```

**Note:** If any files don't exist in `/data`, check `data-examples/` for templates and copy them over.

Check weak patterns related to writing: formal/informal register, email structure, accent marks, ser vs estar, por vs para.

### 2. Select Scenario Type

Based on `mastery-db.json` → `skills_mastery`:
- **Formal email** (mastery < 4)
- **Informal email** (mastery < 4)
- **Form filling** (mastery < 4)
- **Personal message / WhatsApp** (mastery < 3)
- **Mixed scenarios** (all mastery >= 4)

### 3. Present Writing Task

```markdown
## ✍️ Writing Exercise

**Scenario:** {clear_description_in_English}
**Task:** Write a {type_of_text} in Portuguese.
**Requirements:**
- Length: {X-Y} words/sentences
- Include: {must_include_elements}
- Level: {learner_level} (match complexity accordingly)

**Example structure:** (optional, for difficult tasks)
{show_template_if_needed}

**Write your {text_type} below:**
```

### 4. Wait for Response

Let the learner write the complete text before giving feedback.

### 5. Analyze Response

Check for these error categories:
1. **Grammar** (verb conjugation, ser/estar, por/para, subjunctive usage)
2. **Register mixing** (senhor(a)/você confusion, formal + informal in same text)
3. **Accent marks** (é vs ê, ó vs ô, missing tildes on ã/õ)
4. **Spanish interference** (false cognates like "exquisito", "todavía", "desde luego")
5. **Missing elements** (greeting, closing, required content)
6. **Structure** (organization, paragraph flow)

### 6. Provide Detailed Feedback

```markdown
## Feedback

### ✅ What You Did Well
- {strength1}
- {strength2}

### ❌ Areas to Improve

**Critical Issues:** 🔴
- {issue}: "{wrong}" → "{correct}"
  - **Why:** {explanation}

**Moderate Issues:** 🟡
- {issue}: {explanation}

**Minor Issues:** 🟢
- {accent/spelling notes}

### 📝 Corrected Version
{Fully corrected text}

**Overall Score: {X}/10**
- Grammar: {Y}/10
- Vocabulary: {Z}/10
- Structure: {W}/10
- Communication: {V}/10
```

### 7. Update Databases

For each error found, update:
- **mistakes-db.json**: increment `frequency`, add example (`your_answer`, `correct_answer`, `context`, `date`), recalculate `mastery_level`, update `difficulty_score`, set `next_review` via SM-2
- **mastery-db.json**: update writing sub-skills (greeting, body, closing, grammar, register) and recalculate overall writing mastery
- **progress-db.json**: increment `exercises_completed`, update `accuracy_trend[]`, recalculate accuracy metrics

### 8. Optional Rewrite

If score < 7/10, offer a rewrite opportunity. "Quer tentar de novo? 💪"

### 9. Session Summary

```markdown
## 📊 Writing Session Summary

**Text Type:** {type} | **Score:** {X}/10
**Key Takeaways:** {learning_points}
**Next Focus:** {specific_weakness}

Muito bem! / Bão demais! Keep writing! ✍️
```

## Writing Tips

**Formal:**
- Use "senhor(a)" or "o(a) senhor(a)" — avoid "você" in formal writing
- Open: "Prezado(a) Senhor(a) {NAME},"
- Body: "Venho por meio desta solicitar...", "Gostaria de informar que..."
- Close: "Atenciosamente," or "Cordialmente," + full name

**Informal:**
- Use "você" or Mineiro "cê/ocê" (spoken only — write "você")
- Open: "Oi {NAME}," or "E aí {NAME},"
- Casual language, contractions OK
- Close: "Beijos," "Abraços," or "Até mais,"

**Common Mistakes for English/Spanish Speakers:**
- ❌ Accent marks matter: "avó" (grandmother) vs "avô" (grandfather), "é" (open) vs "ê" (closed)
- ❌ ser vs estar: "Ele é bonito" (inherent) vs "Ele está bonito" (today)
- ❌ por vs para: "por" (cause/through) vs "para" (purpose/destination)
- ❌ Spanish false cognates: "esquisito" = weird (not exquisite), "polvo" = octopus (not powder), "largo" = wide (not long)
- ❌ Don't mix registers — pick formal or informal and stay consistent
