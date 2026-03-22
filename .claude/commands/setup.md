---
description: Interactive onboarding - Set up your personalized language learning profile
allowed-tools: Read, Write
---

# Language Learning Setup

Read `data/learner-profile.json` first. If Chris's profile exists, show the **Profile Updates** menu. If no profile exists, run **New Learner Onboarding**.

---

## Profile Updates (Returning User)

```markdown
# 👋 Welcome back, {name}!

I see you already have a learning profile.

What would you like to do?

1. **Update profile** - Change your goals, timeline, or preferences
2. **View current plan** - See your learning schedule
3. **Reset progress** - Start fresh (⚠️ this will erase your progress!)
4. **Cancel** - Keep everything as is

**Type 1, 2, 3, or 4:**
```

For option 2, show the recommended schedule for Portuguese:

```markdown
## 📋 Recommended Schedule for Portuguese

**Daily (Every day):**
- 🔄 `/review` - Spaced repetition (5-10 min)
- 📚 `/vocab` - New vocabulary (10 min)

**Alternating Days:**
- 📝 `/writing` - Writing practice (Mon/Wed/Fri)
- 🗣️ `/speaking` - Conversation (Tue/Thu/Sat)
- 📖 `/reading` - Reading comprehension (Sun)

**Weekly:**
- 📊 `/progress` - Check your stats (5 min)
```

For option 3, re-initialize all database files from `data-examples/` templates.

---

## New Learner Onboarding

If no profile exists, briefly collect: name, target language, native language, other languages, current level, target level, daily minutes, and learning goal. Use `data-examples/learner-profile-template.json` as the template for the profile and `data-examples/` for all other database files. Save everything to `data/`.

After saving, show the personalized plan and suggest `/learn` to start.

---

## Formula for Calculations

**Months to target level:**
```
Level gaps:
A1 → A2: ~100 hours
A2 → B1: ~150 hours
B1 → B2: ~200 hours
B2 → C1: ~300 hours
C1 → C2: ~400 hours

Months = Total hours needed ÷ (Daily minutes ÷ 60) ÷ 30 days
```

**Adjust based on:**
- Learning style efficiency
- Native language similarity to target
- Number of other languages known (boost: +10% speed)
