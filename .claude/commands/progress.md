---
description: View your Language learning progress and statistics
allowed-tools: Read
---

# Portuguese Learning Progress

Show the learner comprehensive progress statistics with visualizations.

## Protocol

### 1. Load All Progress Data

```
data/learner-profile.json
data/progress-db.json
data/mastery-db.json
data/mistakes-db.json
data/spaced-repetition.json
data/session-log.json
```
**Note:** If any files are missing, check `data-examples/` for templates.

### 2. Generate Progress Report

```markdown
# 📊 Chris's Mineiro Portuguese Dashboard

**Last Updated:** {current_date}

---

## 🎯 Overview

**Current Level:** {current_level}
**Target Level:** C1 (Advanced)
**Progress to C1:** ▓▓▓▓▓▓▓▓░░░░░░░░░░░░ {percentage}%

**Days Studying:** {total_days}
**Current Streak:** 🔥 {streak_days} days {streak_message}
**Total Sessions:** {total_sessions}
**Total Study Time:** {total_minutes} minutes ({hours} hours)

---

## 💪 Skills Mastery

### Writing ✍️
**Level:** {mastery_level}/5 | **Accuracy:** {accuracy}%
**Progress:** ▓▓▓▓▓▓▓▓▓░░░░░░ | **Last Practiced:** {date}
**Sub-skills:** Formal emails: {level}/5 | Informal emails: {level}/5 | Forms: {level}/5 | Grammar: {level}/5

### Speaking 🗣️
**Level:** {mastery_level}/5 | **Accuracy:** {accuracy}%
**Progress:** ▓▓▓▓░░░░░░░░░░░░ | **Last Practiced:** {date or "Not yet"}

### Vocabulary 📚
**Level:** {mastery_level}/5 | **Words Known:** {words_known} | **Mastered:** {words_mastered}
**Progress:** ▓▓▓▓▓▓▓▓▓▓▓░░░░░ | **Last Practiced:** {date}

### Reading 👀
**Level:** {mastery_level}/5 | **Comprehension:** {percentage}%
**Progress:** ▓▓▓▓▓░░░░░░░░░░░ | **Last Practiced:** {date or "Not yet"}

---

## 📈 Progress Trends

### Accuracy Over Time
```
Week 1: ██████░░░░░░░░░░░░ {X}%
Week 2: ████████████░░░░░░ {Y}% (+{diff}%)
Week 3: ██████████████░░░░ {Z}% (+{diff}%)
```

### This Week
- **Sessions:** {count} | **Minutes:** {total} | **Exercises:** {count}
- **Accuracy:** {percentage}% | **Skills Practiced:** {list}

---

## 🎯 Focus Areas

- 🔴 **Critical (mastery 0-1):** {patterns from mistakes-db, high frequency}
- 🟡 **Working On (mastery 2-3):** {patterns making progress}
- 🟢 **Strong (mastery 4-5):** {patterns nearly mastered}

---

## 🔄 Spaced Repetition Status

- **Today:** {count} items | **Tomorrow:** {count} | **This Week:** {count} | **Later:** {count}
- **Mastered (no review needed):** {count}

---

## 🏆 Achievements

{List from learner-profile → achievements}

## 📅 Recent Sessions

| Date | Duration | Skill | Accuracy | Improvement |
|------|----------|-------|----------|-------------|
{Generate from session-log}

## 🎯 Goals

**Short-term (This Week):**
- [ ] Review all due SR items daily
- [ ] Maintain streak
- [ ] Practice weakest skill: {skill}

**Medium-term (This Month):**
- [ ] Reach {target_accuracy}% writing accuracy
- [ ] Master {frequent_mistake_pattern}
- [ ] Learn {N} new vocabulary words

**Long-term:**
- [ ] Reach C1
- [ ] Speak comfortably in Mineiro contexts
- [ ] Read native content fluently

## 💡 Recommendations

1. **{unpracticed_skill}** — hasn't been practiced recently
2. **{frequent_mistake}** — still appearing frequently
3. **Today's SR reviews** — {count} items due

---

Cê tá mandando bem, Chris! 💪🔥

`/learn` | `/review` | `/writing`
```

### 3. How to Read Your Stats

```markdown
**Mastery Levels:** ⭐ (1/5) Just started → ⭐⭐⭐ (3/5) Solid, occasional mistakes → ⭐⭐⭐⭐⭐ (5/5) Mastered
**Accuracy:** <40% needs work | 40-70% learning phase | 70-85% strong | 85%+ near mastery
**Streaks:** Even 15 minutes daily beats 2 hours weekly — consistency is everything.
```

Cê tá mandando bem! (You're killing it!) 🌟
