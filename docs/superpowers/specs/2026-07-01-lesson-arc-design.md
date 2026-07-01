# Design: The Lesson Arc (guided, escalating lessons + emoji vocab)

**Date:** 2026-07-01
**Status:** Approved (brainstorming) — ready for implementation plan
**Component:** Sabiá (fluent-mineiro) — session/lesson experience
**Audience:** single user (Chris); personal tool, not a productized new-user flow

## Problem

A daily session is a shuffled pile of exercises the planner interleaves (SRS-due + weakest topics + new items). That is good for memory but it does not *feel* like a lesson — items are unconnected, and the app cold-tests (asks before it ever teaches). The user's framing: give the **cohesion and guidance Duolingo gives a beginner, but aimed at making an advanced learner** — specifically toward the goal of **understanding and speaking real Mineiro**. It is also fully text; the user wants **pictures** to learn what concrete words mean.

## Goal

Reshape `/session` into a **guided, themed, escalating Lesson Arc** that ends in *producing and using* the language, and add **emoji pictures** to concrete vocabulary. This is slice 1 of a larger vision (later slices: shadowing, native mic + pronunciation grading — explicitly out of scope here).

## Decisions (locked)

1. **Reshape `/session`** into a 4-stage arc: **Teach → Recognize → Produce → Capstone**, escalating in difficulty.
2. A lesson is built around **one theme** = one existing `topic` tag. The planner picks today's theme (weakest topic at level, else next topic with unseen items).
3. **Pictures = emoji only**, on concrete-noun vocab, from a curated offline map. No new API, no image files.
4. **SRS reviews run as an optional warm-up** *before* the themed lesson (or via the existing `/review`). Other-topic reviews are NOT shuffled into the lesson. Every scored answer still updates `srs_state`.
5. **Capstone = a short themed AI conversation**; a scripted mini-dialogue fallback when no Claude key is set.
6. Keep `/review` and `/lesson` as-is. Reuse `ExercisePlayer` (Recognize/Produce) and the conversation component (Capstone).

**Out of scope (own future slices):** the **4/16-week fixed-curriculum program + progress/accounting** (the *next* slice — plugs into the `chooseTheme` seam above), shadowing/repeat-after-me, native mic recording + pronunciation grading, curated/AI/stock images, mobile/web, new-user onboarding.

## Architecture

Four units with clear boundaries.

### 1. Emoji vocab map — `src/lib/emoji-map.ts` (new)

A curated `Record<string, string>` mapping a normalized Portuguese `answer` (lowercased, accent-stripped, trimmed) → an emoji, plus a `lookupEmoji(answer: string): string | null` helper.

- Covers concrete-noun topics only: `food`, `house`, `body_health`, `clothing`, `transport`, `nature`, `family` (and obvious concrete items elsewhere). No match → `null` (render no icon).
- Initial coverage target: the ~120 highest-frequency concrete nouns across those topics. Populating the map is a build task; the mechanism must not require every item to have an entry.
- No schema change to the exercise data is required — emoji is resolved at render time by `lookupEmoji(answer)`. (Chosen over adding an `emoji` field to 1,000+ inline exercise objects: a lookup keeps the change to one file.)

### 2. Lesson assembly — `src/lib/lesson.ts` (new; may call into `session-planner.ts`)

`planLesson(profile, attempts, srsState): Lesson` where:

```ts
type LessonStage = 'teach' | 'recognize' | 'produce';
interface TeachItem { answer: string; meaning: string; mineiroNote: string | null; emoji: string | null; }
interface Lesson {
  theme: string;                 // the chosen topic
  reason: string;                // e.g. "your food accuracy is 55%"
  teach: TeachItem[];            // 3–6, not scored
  recognize: Exercise[];         // easy items (multiple_choice, true_false), difficulty asc
  produce: Exercise[];           // harder items (cloze, vocab-typed, error_correction, reorder), difficulty asc
  capstone: CapstonePrompt;      // themed conversation seed (see unit 4)
}
```

**Theme selection is a pluggable seam.** `planLesson` delegates the choice to:

`chooseTheme(profile, attempts, srsState): { theme: string; reason: string }`

- **Default implementation (this slice):** lowest recent-accuracy topic (last 30d, <60%) at the current CEFR level that has ≥1 item in each of teach/recognize/produce roles; else the next topic with unseen items; else any topic with items. `reason` is the one-line human string for the lesson header.
- **Next slice (the 4/16-week curriculum)** supplies an alternative `chooseTheme` that returns the theme scheduled for the current program week/day, plus a "Week X of Y" progress view — dropping into this seam **without changing the Arc**. Design the seam now so that work isn't thrown away.

Assembly rules (after the theme is chosen):
- **Teach items:** `vocab` items of the theme, prioritising unseen or low-accuracy, capped 3–6. `emoji = lookupEmoji(answer)`.
- **Recognize/Produce:** partition the theme's non-teach items by type into the two buckets, each sorted by `difficulty` ascending. Total scored items target `max(5, dailyGoal)`, split roughly 40% Recognize / 60% Produce (produce-heavy on purpose — production is the "advance" lever), rounded to whole items, each stage getting ≥1 when items exist.
- **Escalation:** stage order is fixed teach→recognize→produce; within recognize/produce, difficulty ascends.
- **Graceful degradation:** if the theme lacks items for a stage, that stage is shortened or skipped (never crash); if the theme has no `vocab` items (pure grammar topic), Teach shows a short pattern card built from the topic's first item `explanation`/`mineiro_note` instead of emoji cards.

### 3. Session UI — `src/routes/session/+page.svelte` (reshape)

Drive the stages sequentially:
1. **Warm-up (optional):** if SRS due-count > 0, show "N reviews due — warm up?" with Start/Skip. If started, play due items (cap 10) through `ExercisePlayer`; each answer updates `srs_state` via the existing scoring path. Then proceed to the lesson.
2. **Lesson header:** one line — `Hoje: {theme} — {reason}` (the Duolingo "you're on a path" cue).
3. **Teach:** render `TeachItem[]` via a new `TeachCard` component (word + meaning + emoji + Mineiro note; tap to advance). Not scored.
4. **Recognize** then **Produce:** play through `ExercisePlayer` as today, with a **stage-progress indicator** ("Recognize 2/4 · Produce · Capstone").
5. **Capstone:** render the conversation component seeded with the capstone prompt.
6. **Completion:** existing end-of-session logic (streak, adaptive check, achievements, challenges, journal) runs unchanged.

New small components: `TeachCard.svelte`, a `StageProgress.svelte` indicator.

### 4. Capstone conversation — reuse `src/lib/claude.ts` + conversation component

`CapstonePrompt` = `{ scenario: string; opener: string }` derived from the theme (e.g. food → "Você está num boteco em BH; peça um cafezinho e um pão de queijo."). Seed the existing conversation flow with `scenario` as system context and `opener` as the first assistant message.
- **No Claude key:** fall back to a **scripted mini-dialogue** — a fixed 3–4 turn exchange for the theme where the user picks/produces a reply and gets canned feedback. Themes without a scripted fallback show a "set your Claude key to unlock conversation" card and end the lesson.

## Data flow

`planLesson()` reads profile (level, dailyGoal), recent attempts (accuracy per topic), and SRS state → returns a `Lesson`. The session route walks warm-up → teach → recognize → produce → capstone. All scored answers flow through the existing `exercises.ts` scoring + `db.ts` SRS/attempt recording, so streaks/adaptive/achievements/challenges/SRS are unaffected.

## Error handling

- No emoji match → render no icon (never a broken image / placeholder).
- Theme too thin → shorten/skip stages, never crash; if *no* theme qualifies, fall back to today's existing shuffled planner output wrapped in the arc UI (teach stage empty).
- No Claude key → scripted capstone or a clear "unlock with a key" card; the rest of the lesson works fully offline.
- Warm-up is always skippable.

## Testing

- **`emoji-map` (unit):** `lookupEmoji` normalizes accents/case, returns the mapped emoji, returns `null` for unknown and for a non-concrete word.
- **`lesson.planLesson` (unit):** picks the weakest qualifying theme; teach cap 3–6; recognize/produce partitioned by type and sorted by difficulty ascending; total scored ≈ `max(5, dailyGoal)`; graceful degradation when a stage's items are missing; pure-grammar theme yields a pattern Teach card, not emoji.
- **SRS still updates (unit/integration):** answering a warm-up or lesson item calls the existing scoring path and writes `srs_state` (assert the existing update function is invoked).
- **Manual QA:** run a lesson end-to-end — themed header, emoji on food items, escalation feels right, capstone conversation works with a key and the scripted fallback without one; confirm streak/achievements still fire on completion.

## Rollout

Single PR, reshaping one screen plus two new lib modules and two small components. No data migration. `/review` and `/lesson` unchanged. This is **slice 1 (the Arc)**. The **4/16-week curriculum program** is slice 2 (plugs into `chooseTheme`, adds program progress/accounting); shadowing and native-mic pronunciation are later slices.
