# Lesson Arc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape `/session` from a shuffled drill list into a guided, themed lesson that escalates **Teach → Recognize → Produce → Capstone**, with emoji on concrete vocab and SRS reviews as an optional warm-up.

**Architecture:** A pure `lesson.ts` picks one theme (pluggable `chooseTheme` seam) and assembles the four stages from `SEED_EXERCISES`; a pure `emoji-map.ts` resolves emoji by vocab answer at render time (no exercise-schema change). The session route orchestrates the stages, reusing the existing `ExercisePlayer` for the warm-up and the Recognize/Produce stages (so SRS still updates automatically) and seeding the existing `/conversation` route for the Capstone via `sessionStorage`.

**Tech Stack:** SvelteKit + Svelte 5 runes, TypeScript, vitest (node env, `test/**/*.test.ts`), Tauri (unchanged).

## Global Constraints

- Package manager **npm**; frontend commands run from `fluent-mineiro/`. Tests: `npm run test`; type-check: `npm run check`.
- Tests live under `fluent-mineiro/test/**/*.test.ts` (vitest, node env). Mock Tauri modules (`@tauri-apps/plugin-sql`, `@tauri-apps/api/core`) — never hit the runtime.
- Stage types (verbatim): teach = `vocab`; recognize = `multiple_choice`, `true_false`; produce = `cloze`, `reorder`, `error_correction`.
- Scored-item target = `max(5, dailyGoal)`, split **~40% Recognize / 60% Produce**, each stage ≥1 when items exist. Produce-heavy is intentional (the "advance" lever).
- Theme selection is behind a pluggable `chooseTheme` seam; the default (this slice) is weakest-topic. The 4/16-week curriculum (slice 2) will replace `chooseTheme` — do not inline theme logic into `planLesson`.
- Emoji is resolved at render time via `lookupEmoji(answer)`; **no field is added to the 1,000+ exercise objects**.
- SRS: reviews run as an optional warm-up before the lesson; every scored answer still flows through `ExercisePlayer` → `processAnswer` → `srs_state`. Do not bypass that path.
- No plaintext/secret handling here. `/review` and `/lesson` routes are unchanged.
- Work on branch `feat/lesson-arc` (already created off `main`; contains the spec).
- Spec: `docs/superpowers/specs/2026-07-01-lesson-arc-design.md`.

## File structure

- Create `src/lib/emoji-map.ts` — `lookupEmoji(answer)` + curated map. One job: vocab→emoji.
- Create `src/lib/lesson.ts` — types, `chooseTheme` (seam), `assembleLesson`, `planLesson`. One job: assemble a themed lesson.
- Create `src/lib/components/TeachCard.svelte` — one teach card (word/meaning/emoji/note).
- Create `src/lib/components/StageProgress.svelte` — the "Teach · Practice · Conversa" phase indicator.
- Modify `src/routes/conversation/+page.svelte` — read a `sessionStorage` capstone seed on mount.
- Modify `src/routes/session/+page.svelte` — orchestrate the staged flow.
- Tests: `test/emoji-map.test.ts`, `test/lesson.test.ts`.

---

### Task 1: Emoji vocab map

**Files:**
- Create: `fluent-mineiro/src/lib/emoji-map.ts`
- Test: `fluent-mineiro/test/emoji-map.test.ts`

**Interfaces:**
- Produces: `lookupEmoji(answer: string): string | null`

- [ ] **Step 1: Write the failing test**

Create `fluent-mineiro/test/emoji-map.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lookupEmoji } from '../src/lib/emoji-map';

describe('lookupEmoji', () => {
  it('maps a known concrete noun', () => {
    expect(lookupEmoji('pão de queijo')).toBe('🧀');
  });
  it('is case- and accent-insensitive', () => {
    expect(lookupEmoji('PÃO DE QUEIJO')).toBe('🧀');
    expect(lookupEmoji('pao de queijo')).toBe('🧀');
    expect(lookupEmoji('  cafezinho  ')).toBe('☕');
  });
  it('returns null for an unmapped word', () => {
    expect(lookupEmoji('saudade')).toBeNull();
    expect(lookupEmoji('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- test/emoji-map.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/emoji-map'`.

- [ ] **Step 3: Implement `emoji-map.ts`**

Create `fluent-mineiro/src/lib/emoji-map.ts`. The map is keyed by the normalized Portuguese `answer`. This is a starter set covering the highest-frequency concrete nouns; expand it over time — unmapped words simply return `null` (render no icon).

```ts
/**
 * Emoji for concrete vocabulary, resolved at render time by the exercise's
 * `answer`. Keys are normalized (lowercase, accent-stripped, trimmed).
 * Unmapped words return null → render no icon. Concrete nouns only.
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const EMOJI_MAP: Record<string, string> = {
  // food & drink
  'pao de queijo': '🧀', 'cafezinho': '☕', 'cafe': '☕', 'queijo minas': '🧀',
  'queijo': '🧀', 'feijao': '🫘', 'feijao tropeiro': '🫘', 'arroz': '🍚',
  'pao': '🍞', 'bolo': '🍰', 'doce de leite': '🍮', 'carne': '🥩', 'frango': '🍗',
  'ovo': '🥚', 'leite': '🥛', 'agua': '💧', 'cerveja': '🍺', 'fruta': '🍎',
  'banana': '🍌', 'laranja': '🍊',
  // house
  'casa': '🏠', 'porta': '🚪', 'janela': '🪟', 'cama': '🛏️', 'cadeira': '🪑',
  'mesa': '🪑', 'cozinha': '🍳', 'banheiro': '🚽', 'chave': '🔑',
  // family / people
  'familia': '👪', 'mae': '👩', 'pai': '👨', 'filho': '👦', 'filha': '👧',
  'irmao': '👦', 'irma': '👧', 'avo': '👴', 'bebe': '👶', 'amigo': '🧑‍🤝‍🧑',
  // body / health
  'cabeca': '🧠', 'mao': '✋', 'pe': '🦶', 'olho': '👁️', 'boca': '👄',
  'coracao': '❤️', 'dente': '🦷', 'remedio': '💊', 'medico': '🧑‍⚕️',
  // clothing
  'camisa': '👕', 'calca': '👖', 'sapato': '👟', 'vestido': '👗', 'chapeu': '🎩',
  // transport
  'carro': '🚗', 'onibus': '🚌', 'aviao': '✈️', 'trem': '🚆', 'bicicleta': '🚲', 'moto': '🏍️',
  // nature
  'sol': '☀️', 'chuva': '🌧️', 'arvore': '🌳', 'flor': '🌸', 'rio': '🏞️',
  'montanha': '⛰️', 'cachorro': '🐶', 'gato': '🐱', 'passaro': '🐦',
};

export function lookupEmoji(answer: string): string | null {
  if (!answer) return null;
  return EMOJI_MAP[normalize(answer)] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- test/emoji-map.test.ts`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/emoji-map.ts test/emoji-map.test.ts
git commit -m "feat(lesson): emoji lookup for concrete vocab (render-time, no schema change)"
```

---

### Task 2: Lesson assembly (chooseTheme seam + assembleLesson + planLesson)

**Files:**
- Create: `fluent-mineiro/src/lib/lesson.ts`
- Test: `fluent-mineiro/test/lesson.test.ts`

**Interfaces:**
- Consumes: `SEED_EXERCISES` (`content.ts`), `lookupEmoji` (Task 1), `getProfile`/`getDb` (`db.ts`), `getAvailableLevels`/`nearestAvailableLevel` (`adaptive.ts`), `Exercise` (`exercises.ts`).
- Produces:
  - `interface TeachItem { answer: string; meaning: string; mineiroNote: string | null; emoji: string | null; isPattern: boolean }`
  - `interface CapstonePrompt { scenario: string; opener: string }`
  - `interface Lesson { theme: string; reason: string; teach: TeachItem[]; recognize: Exercise[]; produce: Exercise[]; capstone: CapstonePrompt }`
  - `chooseTheme(input: ThemeInput): { theme: string; reason: string }` — the pluggable seam
  - `assembleLesson(theme: string, level: string, reason: string, dailyGoal: number): Lesson`
  - `planLesson(db: any): Promise<Lesson | null>` — null when no eligible theme exists

- [ ] **Step 1: Write the failing tests**

Create `fluent-mineiro/test/lesson.test.ts`. `assembleLesson` and `chooseTheme` are pure over the real `SEED_EXERCISES`, so they need no DB mock. Use a real theme known to have items across roles (`food`).

```ts
import { describe, it, expect } from 'vitest';
import { chooseTheme, assembleLesson } from '../src/lib/lesson';

describe('chooseTheme (default weakest-topic seam)', () => {
  const base = {
    eligibleThemes: ['food', 'family', 'house'],
    accuracyByTopic: {} as Record<string, { accuracy: number; attempts: number }>,
    unseenCountByTopic: {} as Record<string, number>,
  };

  it('picks the weakest eligible topic (>=3 attempts, <60%)', () => {
    const r = chooseTheme({
      ...base,
      accuracyByTopic: { food: { accuracy: 0.55, attempts: 8 }, family: { accuracy: 0.9, attempts: 8 } },
    });
    expect(r.theme).toBe('food');
    expect(r.reason).toMatch(/55%/);
  });

  it('ignores topics with too few attempts', () => {
    const r = chooseTheme({
      ...base,
      accuracyByTopic: { food: { accuracy: 0.1, attempts: 2 } }, // too few
      unseenCountByTopic: { family: 20, food: 0, house: 5 },
    });
    expect(r.theme).toBe('family'); // falls through to most-unseen
  });

  it('falls back to most-unseen eligible topic when nothing is weak', () => {
    const r = chooseTheme({ ...base, unseenCountByTopic: { food: 3, family: 30, house: 10 } });
    expect(r.theme).toBe('family');
  });

  it('falls back to the first eligible theme when nothing weak or unseen', () => {
    const r = chooseTheme({ ...base });
    expect(r.theme).toBe('food');
  });

  it('returns empty theme when no eligible themes', () => {
    expect(chooseTheme({ eligibleThemes: [], accuracyByTopic: {}, unseenCountByTopic: {} }).theme).toBe('');
  });
});

describe('assembleLesson', () => {
  it('builds a themed lesson with escalating stages', () => {
    const lesson = assembleLesson('food', 'A2', 'test reason', 10);
    expect(lesson.theme).toBe('food');
    expect(lesson.reason).toBe('test reason');
    // teach = vocab items with emoji resolved
    expect(lesson.teach.length).toBeGreaterThan(0);
    expect(lesson.teach.length).toBeLessThanOrEqual(6);
    expect(lesson.teach[0].answer.length).toBeGreaterThan(0);
    // recognize types
    for (const e of lesson.recognize) expect(['multiple_choice', 'true_false']).toContain(e.type);
    // produce types
    for (const e of lesson.produce) expect(['cloze', 'reorder', 'error_correction']).toContain(e.type);
    // difficulty ascending within each stage
    const asc = (a: number[]) => a.every((v, i) => i === 0 || v >= a[i - 1]);
    expect(asc(lesson.recognize.map(e => e.difficulty))).toBe(true);
    expect(asc(lesson.produce.map(e => e.difficulty))).toBe(true);
    // capstone present
    expect(lesson.capstone.scenario.length).toBeGreaterThan(0);
    expect(lesson.capstone.opener.length).toBeGreaterThan(0);
  });

  it('produce-heavy split: produce gets >= recognize for a normal goal', () => {
    const lesson = assembleLesson('food', 'A2', 'r', 10);
    expect(lesson.produce.length).toBeGreaterThanOrEqual(lesson.recognize.length);
  });

  it('a pure-grammar theme yields a pattern teach card, not emoji cards', () => {
    // verbs_present has no `vocab` items → teach should be a single pattern card
    const lesson = assembleLesson('verbs_present', 'A2', 'r', 10);
    expect(lesson.teach.length).toBe(1);
    expect(lesson.teach[0].isPattern).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/lesson.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/lesson'`.

- [ ] **Step 3: Implement `lesson.ts`**

Create `fluent-mineiro/src/lib/lesson.ts`:

```ts
/**
 * Lesson assembly: pick one theme (pluggable chooseTheme seam) and build the
 * escalating Teach → Recognize → Produce → Capstone arc from SEED_EXERCISES.
 * Slice 1 of the lessons redesign. The 4/16-week curriculum (slice 2) will
 * replace chooseTheme without touching assembleLesson.
 */
import { SEED_EXERCISES } from './content';
import { lookupEmoji } from './emoji-map';
import { getProfile, getDb } from './db';
import { getAvailableLevels, nearestAvailableLevel } from './adaptive';
import type { Exercise } from './exercises';

export interface TeachItem {
  answer: string;
  meaning: string;
  mineiroNote: string | null;
  emoji: string | null;
  isPattern: boolean;
}
export interface CapstonePrompt { scenario: string; opener: string }
export interface Lesson {
  theme: string;
  reason: string;
  teach: TeachItem[];
  recognize: Exercise[];
  produce: Exercise[];
  capstone: CapstonePrompt;
}

const RECOGNIZE_TYPES = ['multiple_choice', 'true_false'];
const PRODUCE_TYPES = ['cloze', 'reorder', 'error_correction'];
const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'];
const TEACH_MIN = 3, TEACH_MAX = 6;

const TOPIC_LABELS: Record<string, string> = {
  food: 'comida', family: 'família', house: 'casa', body_health: 'saúde',
  clothing: 'roupas', transport: 'transporte', nature: 'natureza',
  verbs_present: 'presente', verbs_past: 'passado', ser_estar: 'ser vs estar',
  prepositions: 'preposições', emotions: 'emoções', shopping: 'compras',
  travel: 'viagem', daily_routine: 'rotina', work: 'trabalho',
  education: 'educação', technology: 'tecnologia', mineiro: 'mineirês',
  false_cognates: 'falsos cognatos', greetings: 'cumprimentos',
};
function label(topic: string): string { return TOPIC_LABELS[topic] ?? topic; }

const CAPSTONES: Record<string, CapstonePrompt> = {
  food: { scenario: 'Você está num boteco em Belo Horizonte pedindo comida e bebida.', opener: 'Ô sô, chegou! Senta aí. Que que ocê vai querer hoje?' },
  family: { scenario: 'Você está apresentando sua família pra um amigo mineiro.', opener: 'Uai, conta pra mim: como que é sua família?' },
  house: { scenario: 'Você está mostrando sua casa pra uma visita.', opener: 'Nossa, que casa boa! Me mostra ela, vai.' },
  shopping: { scenario: 'Você está fazendo compras numa feira em Minas.', opener: 'Bão dia! O que ocê tá procurando hoje?' },
  travel: { scenario: 'Você está planejando uma viagem por Minas Gerais.', opener: 'Uai, pra onde ocê quer ir aqui em Minas?' },
};
const DEFAULT_CAPSTONE: CapstonePrompt = {
  scenario: 'Um bate-papo casual em mineirês sobre o tema de hoje.',
  opener: 'Uai, e aí, sô? Bora bater um papo?',
};
function capstoneFor(theme: string): CapstonePrompt { return CAPSTONES[theme] ?? DEFAULT_CAPSTONE; }

// --- pluggable seam -------------------------------------------------------

export interface ThemeInput {
  eligibleThemes: string[];
  accuracyByTopic: Record<string, { accuracy: number; attempts: number }>;
  unseenCountByTopic: Record<string, number>;
}

/** Default theme picker (this slice): weakest → most-unseen → first eligible. */
export function chooseTheme(input: ThemeInput): { theme: string; reason: string } {
  const { eligibleThemes, accuracyByTopic, unseenCountByTopic } = input;
  if (eligibleThemes.length === 0) return { theme: '', reason: '' };

  const weak = eligibleThemes
    .map(t => ({ t, ...(accuracyByTopic[t] ?? { accuracy: 1, attempts: 0 }) }))
    .filter(x => x.attempts >= 3 && x.accuracy < 0.6)
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weak) return { theme: weak.t, reason: `sua precisão em ${label(weak.t)} está em ${Math.round(weak.accuracy * 100)}%` };

  const mostUnseen = eligibleThemes
    .map(t => ({ t, n: unseenCountByTopic[t] ?? 0 }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)[0];
  if (mostUnseen) return { theme: mostUnseen.t, reason: `conteúdo novo de ${label(mostUnseen.t)}` };

  return { theme: eligibleThemes[0], reason: `revisão de ${label(eligibleThemes[0])}` };
}

// --- assembly -------------------------------------------------------------

export function assembleLesson(theme: string, level: string, reason: string, dailyGoal: number): Lesson {
  const inTheme = SEED_EXERCISES.filter(e => e.topic === theme && e.cefr_level === level);

  // Teach: vocab items (concrete nouns) with emoji; else a single pattern card.
  const vocab = inTheme.filter(e => e.type === 'vocab').slice(0, TEACH_MAX);
  let teach: TeachItem[];
  if (vocab.length >= 1) {
    teach = vocab.slice(0, Math.max(TEACH_MIN, Math.min(TEACH_MAX, vocab.length))).map(e => ({
      answer: e.answer,
      meaning: e.prompt,
      mineiroNote: e.mineiro_note,
      emoji: lookupEmoji(e.answer),
      isPattern: false,
    }));
  } else {
    const first = inTheme[0];
    teach = first
      ? [{ answer: '', meaning: first.explanation || `Padrão: ${label(theme)}`, mineiroNote: first.mineiro_note, emoji: null, isPattern: true }]
      : [];
  }

  const byDiff = (a: Exercise, b: Exercise) => a.difficulty - b.difficulty;
  const target = Math.max(5, dailyGoal);
  const recognizeCap = Math.max(1, Math.round(target * 0.4));
  const produceCap = Math.max(1, target - recognizeCap);

  const recognize = inTheme.filter(e => RECOGNIZE_TYPES.includes(e.type)).sort(byDiff).slice(0, recognizeCap);
  const produce = inTheme.filter(e => PRODUCE_TYPES.includes(e.type)).sort(byDiff).slice(0, produceCap);

  return { theme, reason, teach, recognize, produce, capstone: capstoneFor(theme) };
}

// --- db-backed entry ------------------------------------------------------

/** Assemble today's lesson. Returns null if no eligible theme exists. */
export async function planLesson(db: any): Promise<Lesson | null> {
  const dailyGoal = parseInt((await getProfile('daily_goal')) || '15');
  const currentLevel = (await getProfile('current_level')) || 'A2';
  const level = nearestAvailableLevel(currentLevel, getAvailableLevels());

  // Topics with enough practiceable items at this level.
  const practiceCount = new Map<string, number>();
  for (const e of SEED_EXERCISES) {
    if (e.cefr_level !== level) continue;
    if (RECOGNIZE_TYPES.includes(e.type) || PRODUCE_TYPES.includes(e.type)) {
      practiceCount.set(e.topic, (practiceCount.get(e.topic) ?? 0) + 1);
    }
  }
  const eligibleThemes = [...practiceCount.entries()].filter(([, n]) => n >= 3).map(([t]) => t);

  // Accuracy per topic (last 30d) via in-memory topic map.
  const topicOf = new Map(SEED_EXERCISES.map(e => [e.id, e.topic]));
  const accuracyByTopic: Record<string, { accuracy: number; attempts: number }> = {};
  try {
    const rows: { exercise_id: number; is_correct: number }[] = await db.select(
      "SELECT exercise_id, is_correct FROM attempts WHERE timestamp >= date('now', '-30 days')"
    );
    const agg = new Map<string, { c: number; t: number }>();
    for (const r of rows) {
      const tp = topicOf.get(r.exercise_id);
      if (!tp) continue;
      const a = agg.get(tp) ?? { c: 0, t: 0 };
      a.t++; a.c += r.is_correct; agg.set(tp, a);
    }
    for (const [tp, a] of agg) accuracyByTopic[tp] = { accuracy: a.c / a.t, attempts: a.t };
  } catch { /* no attempts yet */ }

  // Unseen count per eligible topic at this level.
  const unseenCountByTopic: Record<string, number> = {};
  try {
    const seenRows: { exercise_id: number }[] = await db.select('SELECT DISTINCT exercise_id FROM attempts');
    const seen = new Set(seenRows.map(r => r.exercise_id));
    for (const e of SEED_EXERCISES) {
      if (e.cefr_level !== level || !eligibleThemes.includes(e.topic)) continue;
      if (!seen.has(e.id)) unseenCountByTopic[e.topic] = (unseenCountByTopic[e.topic] ?? 0) + 1;
    }
  } catch { /* no attempts yet */ }

  const { theme, reason } = chooseTheme({ eligibleThemes, accuracyByTopic, unseenCountByTopic });
  if (!theme) return null;
  return assembleLesson(theme, level, reason, dailyGoal);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/lesson.test.ts`
Expected: PASS — all `chooseTheme` + `assembleLesson` tests green.

> If the pure-grammar test fails because `verbs_present` has a different level distribution, adjust the test to a grammar topic that exists at `A2` with no `vocab` items (confirm with `grep "topic: 'verbs_present'" src/lib/content-a2.ts | grep "type: 'vocab'"` returning nothing). Do not weaken the assertion that a no-vocab theme yields one pattern card.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lesson.ts test/lesson.test.ts
git commit -m "feat(lesson): themed lesson assembly with pluggable chooseTheme seam"
```

---

### Task 3: Capstone seed into /conversation

**Files:**
- Modify: `fluent-mineiro/src/routes/conversation/+page.svelte` (onMount, near the existing `messages`/`onMount` setup)

**Interfaces:**
- Consumes: `CapstonePrompt` shape (`{ scenario, opener }`) written to `sessionStorage` under key `capstone_seed` by Task 5.
- Produces: on mount, if a seed exists, the conversation opens with the scenario as the first assistant message and clears the seed.

- [ ] **Step 1: Read the current onMount**

Run: `grep -n "onMount" src/routes/conversation/+page.svelte`
Note the existing `onMount(...)` block (it loads keys and any saved state).

- [ ] **Step 2: Add the seed read**

Inside the existing `onMount` in `src/routes/conversation/+page.svelte`, after the existing key-loading logic, add:

```ts
    // Capstone hand-off: a lesson can seed a themed opener.
    try {
      const raw = sessionStorage.getItem('capstone_seed');
      if (raw) {
        sessionStorage.removeItem('capstone_seed');
        const seed = JSON.parse(raw) as { scenario: string; opener: string };
        messages = [{ role: 'assistant', content: seed.opener, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }];
      }
    } catch { /* ignore malformed seed */ }
```

(If `messages` items require a `time` field per `DisplayMessage`, this matches it. If the existing time format differs, mirror whatever the page's own message-push code uses.)

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/conversation/+page.svelte
git commit -m "feat(lesson): conversation reads a capstone seed for a themed opener"
```

---

### Task 4: TeachCard + StageProgress components

**Files:**
- Create: `fluent-mineiro/src/lib/components/TeachCard.svelte`
- Create: `fluent-mineiro/src/lib/components/StageProgress.svelte`

**Interfaces:**
- Consumes: `TeachItem` (Task 2).
- Produces:
  - `TeachCard` props: `{ item: TeachItem }`
  - `StageProgress` props: `{ current: 'teach' | 'practice' | 'capstone' }`

- [ ] **Step 1: Create `TeachCard.svelte`**

```svelte
<script lang="ts">
  import type { TeachItem } from '$lib/lesson';
  let { item }: { item: TeachItem } = $props();
</script>

<div class="bg-white border border-border rounded-2xl p-8 text-center">
  {#if item.emoji}
    <div class="text-6xl mb-4">{item.emoji}</div>
  {/if}
  {#if item.isPattern}
    <p class="text-base text-cafe-secondary">{item.meaning}</p>
  {:else}
    <div class="font-display text-2xl font-bold text-terracotta mb-1">{item.answer}</div>
    <div class="text-sm text-cafe-muted mb-3">{item.meaning}</div>
  {/if}
  {#if item.mineiroNote}
    <p class="text-sm italic text-serra mt-3">“{item.mineiroNote}”</p>
  {/if}
</div>
```

- [ ] **Step 2: Create `StageProgress.svelte`**

```svelte
<script lang="ts">
  let { current }: { current: 'teach' | 'practice' | 'capstone' } = $props();
  const stages: { key: string; label: string }[] = [
    { key: 'teach', label: 'Aprender' },
    { key: 'practice', label: 'Praticar' },
    { key: 'capstone', label: 'Conversar' },
  ];
  const order = ['teach', 'practice', 'capstone'];
  function state(key: string): 'done' | 'active' | 'todo' {
    const ci = order.indexOf(current), ki = order.indexOf(key);
    return ki < ci ? 'done' : ki === ci ? 'active' : 'todo';
  }
</script>

<div class="flex items-center justify-center gap-2 mb-6">
  {#each stages as s}
    {@const st = state(s.key)}
    <div class="flex items-center gap-1.5 text-xs font-semibold
      {st === 'active' ? 'text-terracotta' : st === 'done' ? 'text-serra' : 'text-cafe-muted'}">
      <span class="w-2 h-2 rounded-full {st === 'active' ? 'bg-terracotta' : st === 'done' ? 'bg-serra' : 'bg-pedra-subtle'}"></span>
      {s.label}
    </div>
  {/each}
</div>
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors (components are valid even before the session page uses them).

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/TeachCard.svelte src/lib/components/StageProgress.svelte
git commit -m "feat(lesson): TeachCard + StageProgress components"
```

---

### Task 5: Reshape the session route into the Lesson Arc

**Files:**
- Modify: `fluent-mineiro/src/routes/session/+page.svelte` (full script + template reshape)

**Interfaces:**
- Consumes: `planLesson` + `Lesson`/`CapstonePrompt` (Task 2), `TeachCard`/`StageProgress` (Task 4), `getDueReviewIds`/`SEED_EXERCISES` for the warm-up, existing `ExercisePlayer`, and the existing end-of-session logic.

- [ ] **Step 1: Rewrite `src/routes/session/+page.svelte`**

Replace the whole file with the staged orchestration below. It preserves the existing completion logic (streak, adaptation, achievements, challenges, journal) and celebration overlay, and reuses `ExercisePlayer` for the warm-up and the combined Recognize→Produce practice (so SRS updates automatically).

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ExercisePlayer, { type SessionStats } from '$lib/components/ExercisePlayer.svelte';
  import TeachCard from '$lib/components/TeachCard.svelte';
  import StageProgress from '$lib/components/StageProgress.svelte';
  import type { Exercise } from '$lib/exercises';
  import { getDb, startSession, endSession, updateStreak, getDueReviewIds } from '$lib/db';
  import { applyAdaptation } from '$lib/adaptive';
  import { planLesson, type Lesson } from '$lib/lesson';
  import { SEED_EXERCISES } from '$lib/content';
  import { getApiKey } from '$lib/claude';
  import { checkAchievements, type AchievementStatus } from '$lib/achievements';
  import { updateChallengeProgress } from '$lib/challenges';
  import { checkSlangTriggers } from '$lib/journal';

  type Phase = 'loading' | 'warmup' | 'teach' | 'practice' | 'capstone' | 'done' | 'empty' | 'error';

  let phase = $state<Phase>('loading');
  let lesson = $state<Lesson | null>(null);
  let warmupExercises = $state<Exercise[]>([]);
  let teachIndex = $state(0);
  let sessionId = $state<number | null>(null);
  let sessionStats = $state<SessionStats | null>(null);
  let sessionStreak = $state(0);
  let levelChange = $state<string | null>(null);
  let hasKey = $state(false);
  let errorMsg = $state('');

  let newAchievements = $state<AchievementStatus[]>([]);
  let showCelebration = $state(false);
  let celebrationIndex = $state(0);

  const exerciseById = new Map(SEED_EXERCISES.map(e => [e.id, e]));

  onMount(async () => {
    try {
      const db = await getDb();
      lesson = await planLesson(db);
      hasKey = !!(await getApiKey());
      if (!lesson) { phase = 'empty'; return; }
      sessionId = await startSession();
      // Optional SRS warm-up: due reviews (cap 10), any topic.
      try {
        const due = await getDueReviewIds();
        warmupExercises = due.map(id => exerciseById.get(id)).filter((e): e is Exercise => !!e).slice(0, 10);
      } catch { warmupExercises = []; }
      phase = warmupExercises.length > 0 ? 'warmup' : 'teach';
    } catch (e: any) {
      errorMsg = e?.message || String(e);
      phase = 'error';
    }
  });

  function startWarmup() { phase = 'warmup'; }
  function skipWarmup() { phase = 'teach'; }
  function onWarmupEnd() { phase = 'teach'; }

  function nextTeach() {
    if (!lesson) return;
    if (teachIndex < lesson.teach.length - 1) teachIndex++;
    else phase = 'practice';
  }

  async function onPracticeEnd(stats: SessionStats) {
    sessionStats = stats;
    try {
      if (sessionId) await endSession(sessionId, stats.total, stats.correct, stats.xp);
      sessionStreak = await updateStreak();
      const newLevel = await applyAdaptation();
      const curLevel = lesson?.recognize[0]?.cefr_level || lesson?.produce[0]?.cefr_level || 'A2';
      if (newLevel !== curLevel) levelChange = newLevel;
      newAchievements = await checkAchievements({ total: stats.total, correct: stats.correct });
      await updateChallengeProgress(stats.total);
      await checkSlangTriggers();
    } catch {}
    phase = 'capstone';
  }

  function startCapstone() {
    if (!lesson) return;
    sessionStorage.setItem('capstone_seed', JSON.stringify(lesson.capstone));
    goto('/conversation');
  }

  function finishLesson() {
    if (newAchievements.length > 0) { showCelebration = true; celebrationIndex = 0; }
    phase = 'done';
  }

  function dismissCelebration() {
    if (celebrationIndex < newAchievements.length - 1) celebrationIndex++;
    else showCelebration = false;
  }
  function handleCelebrationKeydown(e: KeyboardEvent) {
    if (showCelebration && (e.key === 'Escape' || e.key === 'Enter')) dismissCelebration();
  }

  const practiceExercises = $derived(lesson ? [...lesson.recognize, ...lesson.produce] : []);
</script>

<svelte:window onkeydown={showCelebration ? handleCelebrationKeydown : undefined} />

<div class="max-w-xl mx-auto p-6">
  {#if phase === 'loading'}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}<div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>{/each}
    </div>

  {:else if phase === 'error'}
    <div class="bg-white border border-error/20 rounded-xl p-8 text-center">
      <div class="text-3xl mb-3">😕</div>
      <h3 class="font-display text-lg font-bold mb-2">Erro ao carregar a lição</h3>
      {#if errorMsg}<p class="text-xs text-error font-mono bg-error/5 p-2 rounded mb-4 break-all">{errorMsg}</p>{/if}
      <a href="/" class="inline-block px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg">Voltar ao Dashboard</a>
    </div>

  {:else if phase === 'empty'}
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-4xl mb-4">✅</div>
      <h3 class="font-display text-xl font-bold mb-2">Tudo em dia!</h3>
      <p class="text-cafe-muted text-sm">Nenhuma lição pendente. Tente conversa ou escrita, ou volte amanhã.</p>
      <div class="flex gap-3 justify-center mt-6">
        <a href="/conversation" class="px-5 py-2.5 border border-border font-semibold rounded-lg text-sm">💬 Conversa</a>
        <a href="/writing" class="px-5 py-2.5 border border-border font-semibold rounded-lg text-sm">✍️ Escrita</a>
      </div>
    </div>

  {:else if phase === 'warmup' && warmupExercises.length > 0}
    <div class="text-center mb-4">
      <p class="text-sm font-semibold text-serra">🔥 Aquecimento — {warmupExercises.length} revisão{warmupExercises.length > 1 ? 'ões' : ''}</p>
      <button onclick={skipWarmup} class="text-xs text-cafe-muted underline mt-1">Pular aquecimento</button>
    </div>
    <ExercisePlayer exercises={warmupExercises} onSessionEnd={onWarmupEnd} />

  {:else if phase === 'teach' && lesson}
    <StageProgress current="teach" />
    <p class="text-center text-sm text-cafe-muted mb-1">Hoje: <span class="font-semibold text-cafe">{lesson.theme}</span></p>
    <p class="text-center text-xs text-cafe-muted mb-6">{lesson.reason}</p>
    {#if lesson.teach.length > 0}
      <TeachCard item={lesson.teach[teachIndex]} />
      <div class="text-center mt-4 text-xs text-cafe-muted">{teachIndex + 1} / {lesson.teach.length}</div>
      <button onclick={nextTeach} class="mt-4 w-full py-3 bg-terracotta text-white font-semibold rounded-xl">
        {teachIndex < lesson.teach.length - 1 ? 'Próximo' : 'Praticar →'}
      </button>
    {:else}
      <button onclick={() => (phase = 'practice')} class="mt-4 w-full py-3 bg-terracotta text-white font-semibold rounded-xl">Praticar →</button>
    {/if}

  {:else if phase === 'practice' && lesson}
    <StageProgress current="practice" />
    <ExercisePlayer exercises={practiceExercises} onSessionEnd={onPracticeEnd} />

  {:else if phase === 'capstone' && lesson}
    <StageProgress current="capstone" />
    <div class="bg-white border border-border rounded-2xl p-8 text-center">
      <div class="text-4xl mb-3">💬</div>
      <h3 class="font-display text-xl font-bold mb-2">Hora de conversar!</h3>
      <p class="text-sm text-cafe-secondary mb-6">{lesson.capstone.scenario}</p>
      {#if hasKey}
        <button onclick={startCapstone} class="w-full py-3 bg-serra text-white font-semibold rounded-xl">Começar conversa →</button>
      {:else}
        <p class="text-xs text-cafe-muted mb-4">Configure sua chave do Claude nas configurações pra desbloquear a conversa.</p>
        <a href="/settings" class="inline-block px-5 py-2.5 border border-border font-semibold rounded-lg text-sm">Ir para Configurações</a>
      {/if}
      <button onclick={finishLesson} class="mt-3 w-full py-2 text-sm text-cafe-muted underline">Terminar lição</button>
    </div>

  {:else if phase === 'done' && sessionStats}
    <div class="text-center py-12">
      <div class="text-5xl mb-4">🎉</div>
      <h2 class="font-display text-2xl font-bold mb-2">Lição completa!</h2>
      <div class="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
        <div class="bg-white border border-border rounded-xl p-3"><div class="font-display text-xl font-bold text-serra">{sessionStats.correct}/{sessionStats.total}</div><div class="text-xs text-cafe-muted">Corretas</div></div>
        <div class="bg-white border border-border rounded-xl p-3"><div class="font-display text-xl font-bold text-ouro">+{sessionStats.xp}</div><div class="text-xs text-cafe-muted">XP</div></div>
        <div class="bg-white border border-border rounded-xl p-3"><div class="font-display text-xl font-bold text-terracotta">🔥 {sessionStreak}</div><div class="text-xs text-cafe-muted">Streak</div></div>
      </div>
      {#if levelChange}<div class="mb-6 px-4 py-3 bg-ouro/15 border border-ouro/30 rounded-xl"><span class="text-lg font-bold text-ouro">🎯 Nível atualizado para {levelChange}!</span></div>{/if}
      <a href="/" class="inline-flex px-6 py-3 bg-terracotta text-white font-semibold rounded-xl">Voltar ao Dashboard</a>
    </div>
  {/if}
</div>

{#if showCelebration && newAchievements[celebrationIndex]}
  {@const badge = newAchievements[celebrationIndex]}
  <div class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-24" role="dialog" aria-modal="true" tabindex="-1">
    <button class="absolute inset-0 w-full h-full cursor-default" onclick={dismissCelebration} aria-label="Fechar"></button>
    <div class="relative max-w-sm w-full mx-4 bg-white rounded-2xl p-8 text-center shadow-xl z-10">
      <div class="text-5xl mb-4">{badge.icon}</div>
      <p class="font-display text-2xl font-bold text-ouro">Parabéns!</p>
      <p class="font-semibold text-base text-cafe mt-2">{badge.title}</p>
      <p class="text-sm text-cafe-secondary mt-3">{badge.description}</p>
      <button onclick={dismissCelebration} class="mt-6 px-8 py-2.5 bg-serra text-white font-semibold rounded-xl">Continuar</button>
    </div>
  </div>
{/if}
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors. (If `goto` import path differs, it is `$app/navigation` in SvelteKit.)

- [ ] **Step 3: Commit**

```bash
git add src/routes/session/+page.svelte
git commit -m "feat(lesson): reshape /session into the guided Lesson Arc"
```

---

### Task 6: Full verification, docs

**Files:**
- Modify: `CLAUDE.md` (session description)

- [ ] **Step 1: Full frontend suite + type-check**

Run: `npm run test`  → all files green (emoji-map, lesson, plus pre-existing).
Run: `npm run check` → 0 errors.

- [ ] **Step 2: Manual QA (run the app)**

Launch: `npm run tauri dev`. Verify a lesson end-to-end:
  1. Dashboard → Começar → lesson header shows a theme + reason.
  2. (If reviews due) a skippable warm-up plays first.
  3. Teach cards show word + meaning + emoji (for a concrete theme like food) + Mineiro note.
  4. Practice runs Recognize then Produce; the streak/XP still update on completion.
  5. Capstone card appears; with a Claude key, "Começar conversa" opens `/conversation` with a themed opener; without a key, it shows the settings prompt.
  6. Finish → completion screen with correct/XP/streak; achievements still fire.
Record results in the PR.

- [ ] **Step 3: Update docs**

In `CLAUDE.md`, the routes row currently reads `session` among the SvelteKit pages. Update the `session-planner.ts` / routes description to note that `/session` now plays a themed Lesson Arc (Teach→Recognize→Produce→Capstone) assembled by `src/lib/lesson.ts`, with SRS reviews as a warm-up; the legacy `session-planner.ts` remains for reference. Keep it to one or two lines in the existing Key Files / architecture area.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: /session now plays the themed Lesson Arc"
```

- [ ] **Step 5: Push (PR opened separately after manual QA)**

```bash
git push -u origin feat/lesson-arc
```
Do NOT open the PR here — the controller prepares it and hands it to the user for GUI QA, per the session's agreed workflow.

---

## Self-Review

**Spec coverage:**
- 4-stage arc Teach→Recognize→Produce→Capstone → Tasks 2 (assembly) + 5 (orchestration). ✓
- One theme per lesson, pluggable `chooseTheme` seam → Task 2. ✓
- Emoji on concrete vocab, render-time lookup, no schema change → Task 1 + used in Task 2 teach + Task 4 TeachCard. ✓
- SRS reviews as optional warm-up; SRS still updates → Task 5 warm-up via `ExercisePlayer` (which calls `processAnswer`). ✓
- Capstone = themed conversation; no-key fallback → Task 3 (seed) + Task 5 (capstone card + settings prompt when no key). Note: slice 1 uses a seeded hand-off to `/conversation` + a "set your key" card (spec-allowed); scripted mini-dialogues are deferred. ✓
- Escalation (difficulty ascending; produce-heavy split) → Task 2 assembly + tests. ✓
- `/review` and `/lesson` unchanged → not modified by any task. ✓
- Graceful degradation (thin theme, pure-grammar teach card, no eligible theme → empty state) → Task 2 (`isPattern`, null return) + Task 5 (`empty` phase). ✓
- Testing (emoji lookup, lesson assembly, escalation, pure-grammar) → Tasks 1, 2. ✓; SRS-still-updates is covered structurally by reusing `ExercisePlayer` (manual QA step 4).

**Placeholder scan:** No TBD/vague steps; every code step has complete code. The emoji map is an explicit starter set (expansion noted, not a placeholder). ✓

**Type consistency:** `TeachItem`/`CapstonePrompt`/`Lesson`, `chooseTheme`/`assembleLesson`/`planLesson`, `lookupEmoji`, and the `capstone_seed` sessionStorage key match across Tasks 1–5. `ExercisePlayer` props (`exercises`, `onSessionEnd`) match its real signature. ✓
