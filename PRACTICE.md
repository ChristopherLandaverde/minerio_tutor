# Practice Analysis Guide: Mineiro Portuguese

**Purpose:** How to analyze session results, categorize errors, and track patterns for Chris's Brazilian Portuguese learning (English native, Spanish speaker).

---

## Analyzing Session Results

### After Each Session
1. Read the latest session file from `/results/session-*.md`
2. Categorize every error using the tables below
3. Count frequency per pattern (1x = possible typo, 2-3x = emerging, 4+ = critical weakness)
4. Note strengths (consistent correct usage, improvements from prior sessions)
5. Update `/data/mistakes-db.json` and `/data/mastery-db.json`

### Building the Pattern Database
After extracting errors, update this mental model:

| Error Type | Specific Pattern | Count | Severity | Example |
|------------|-----------------|-------|----------|---------|
| Grammar | ser/estar confusion | 3 | CRITICAL | "Eu sou cansado" → "Eu estou cansado" |
| Spanish | false cognate | 1 | MODERATE | "embaraçado" ≠ "grávida" |

---

## Error Categories for Portuguese

### 1. Grammar (verb conjugation, agreement, prepositions)
- **ser/estar**: "Ela é bonita" (permanent) vs "Ela está bonita" (today)
- **ter/haver**: "Tem muita gente" (colloquial) vs "Há muita gente" (formal)
- **Gender agreement**: "a problema" → "o problema", "o cidade" → "a cidade"
- **Prepositions por/para**: "Fiz isso por você" (because of) vs "Fiz isso para você" (for/intended)
- **Prepositions em/a**: "Vou no mercado" (colloquial) vs "Vou ao mercado" (standard)

### 2. Spanish Interference (portunhol)
- **False cognates**: embarazada ≠ embarrassed (grávida), exquisito ≠ exquisite (esquisito = weird)
- **Portunhol mixing**: Spanish verb forms, using "pero" instead of "mas", "y" instead of "e"
- **Spelling bleed**: escribir → escrever, también → também, hoy → hoje
- **Pronoun placement**: Spanish-style placement vs Portuguese clitic rules

### 3. Accent Marks (diacritics)
- **Til (ã, õ)**: "irmão", "coração", "não", "ões" (plural)
- **Acute (á, é, ó)**: "café", "está", "avó"
- **Circumflex (â, ê, ô)**: "você", "três", "avô"
- **Cedilha (ç)**: "começar", "França", "almoço"
- Missing accents that change meaning: "avó" (grandmother) vs "avô" (grandfather)

### 4. Mineiro Dialect Awareness
- **cê/você**: "Cê tá bem?" = informal Mineiro; "Você está bem?" = standard
- **tá/está**: "Tá bom" is universal colloquial; use "está" in writing
- **trem**: Mineiro for "coisa/thing" — understand it, note when it appears
- **uai**: Mineiro interjection — recognition only, not a production target
- **Verb clipping**: "fazeno" (fazendo), "falano" (falando) — understand but write standard

### 5. Verb Tenses (Portuguese-specific challenges)
- **Subjunctive**: "Espero que você **venha**" (not "vem") — far more common in PT than EN/ES
- **Personal infinitive**: "Para **nós fazermos**" — unique to Portuguese, no Spanish equivalent
- **Future subjunctive**: "Quando eu **for**" — exists in PT but extinct in Spanish
- **Continuous forms**: "Estou fazendo" (BR) vs "Estou a fazer" (EU) — use Brazilian form

### 6. Pronunciation Patterns (for typed exercises)
- **Nasal vowels**: ã, ão, ões, ãe — common spelling errors when nasalization is missed
- **lh/nh digraphs**: "trabalho", "amanhã" — don't confuse with Spanish ll/ñ
- **Final -e**: often reduced in speech (cidad**e** → "cidadji"), but always written

---

## Severity Levels

### CRITICAL (must fix — causes misunderstanding)
- ser/estar confusion in key contexts
- Gender errors on common nouns
- Spanish words used instead of Portuguese
- Wrong verb tense (subjunctive vs indicative) changing meaning
- Missing "não" in negation

### MODERATE (work on — noticeable but understandable)
- Preposition errors (por/para, em/a)
- Accent marks missing or wrong
- Pronoun placement (proclisis vs enclisis)
- Subjunctive in less common triggers
- Personal infinitive avoidance

### MINOR (low priority — acceptable at current level)
- Mineiro vs standard mixing in casual writing
- Minor spelling slips
- Punctuation differences (Portuguese quotation style)
- Advanced clitic combinations (lho, lha)

---

## Tracking Tables Format

### Error Pattern Summary (per session)

```markdown
| Category | Pattern | Count | Severity | Example |
|----------|---------|-------|----------|---------|
| Grammar | ser/estar | 2 | CRITICAL | "Eu sou triste" → "Eu estou triste" |
| Spanish | false cognate | 1 | MODERATE | "assistir a aula" (attend) ≠ "assist" |
| Accents | missing til | 3 | MODERATE | "nao" → "não" |
```

### Strength Tracking (per session)

```markdown
| Skill | Evidence | Confidence |
|-------|----------|------------|
| Verb conjugation (present) | 8/10 correct | ⭐⭐⭐⭐☆ |
| Greeting formulas | Natural usage | ⭐⭐⭐⭐⭐ |
```

### Progress Over Time

```markdown
| Session | Date | Score | Critical | Moderate | Minor |
|---------|------|-------|----------|----------|-------|
| 001 | 2026-03-21 | 65% | 3 | 4 | 2 |
```

---

## Success Metrics

### Track These Over Time
- Overall accuracy % (target: 70%+)
- Critical error count (target: <2 per session)
- Moderate error count (target: <5 per session)
- Spanish interference frequency (target: decreasing trend)
- Subjunctive accuracy (target: 80%+ by B2)

### Session Success =
- Learner improved on at least 1 weakness from last session
- Learner maintained existing strengths
- Learner completed all planned exercises
- Learner understands what to practice next
- Error severity trending downward over time

---

**Last Updated:** 2026-03-21
**Focus:** Session analysis & error tracking for Mineiro Portuguese
