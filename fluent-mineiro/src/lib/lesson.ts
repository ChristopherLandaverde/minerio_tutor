/**
 * Lesson assembly: pick one theme (pluggable chooseTheme seam) and build the
 * escalating Teach → Recognize → Produce → Capstone arc from SEED_EXERCISES.
 * Slice 1 of the lessons redesign. The 4/16-week curriculum (slice 2) will
 * replace chooseTheme without touching assembleLesson.
 */
import { SEED_EXERCISES } from './content';
import { lookupEmoji } from './emoji-map';
import { lookupImage } from './image-map';
import { getProfile } from './db';
import { getAvailableLevels, nearestAvailableLevel } from './adaptive';
import type { Exercise } from './exercises';

export interface TeachItem {
  answer: string;
  meaning: string;
  mineiroNote: string | null;
  emoji: string | null;
  image: string | null;
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

export const RECOGNIZE_TYPES = ['multiple_choice', 'true_false'];
export const PRODUCE_TYPES = ['cloze', 'reorder', 'error_correction'];
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

// Put not-yet-attempted exercises first so repeated sessions on the same
// theme rotate through the pool instead of replaying the same slice.
// Falls back to already-seen ones only once the unseen pool runs out.
function preferUnseen(pool: Exercise[], seenIds: Set<number>): Exercise[] {
  const unseen = pool.filter(e => !seenIds.has(e.id));
  const seen = pool.filter(e => seenIds.has(e.id));
  return [...unseen, ...seen];
}

export function assembleLesson(
  theme: string,
  level: string,
  reason: string,
  dailyGoal: number,
  seenIds: Set<number> = new Set()
): Lesson {
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
      image: lookupImage(e.answer),
      isPattern: false,
    }));
  } else {
    const first = inTheme[0];
    teach = first
      ? [{ answer: '', meaning: first.explanation || `Padrão: ${label(theme)}`, mineiroNote: first.mineiro_note, emoji: null, image: null, isPattern: true }]
      : [];
  }

  const byDiff = (a: Exercise, b: Exercise) => a.difficulty - b.difficulty;
  const target = Math.max(5, dailyGoal);
  const recognizeCap = Math.max(1, Math.round(target * 0.4));
  const produceCap = Math.max(1, target - recognizeCap);

  // If the recognize pool doesn't have enough *unseen* items to fill its cap
  // (a thin pool, e.g. 7 items against a cap of 6 — repeats within 2 sessions
  // no matter how the slice is chosen), don't pad with repeats. Shrink
  // recognize to what's actually fresh and hand the difference to produce,
  // which has much deeper pools almost everywhere in the content bank — see
  // content-audit.ts. Session length stays the same; only the mix shifts.
  const recognizePool = preferUnseen(
    inTheme.filter(e => RECOGNIZE_TYPES.includes(e.type)).sort(byDiff),
    seenIds
  );
  const unseenRecognizeCount = recognizePool.filter(e => !seenIds.has(e.id)).length;
  const recognizeShortfall = Math.max(0, recognizeCap - Math.min(recognizeCap, unseenRecognizeCount));
  const recognize = recognizePool.slice(0, recognizeCap - recognizeShortfall).sort(byDiff);

  // Picture → type the word (dual-coding, production). Reuse concrete vocab that
  // has a picture — a bundled image or, until images land, its emoji fallback.
  // Render-time lookup decides which visual shows. Capped so it complements the
  // produce phase rather than flooding it. Draw from the full topic vocab pool
  // (not just the teach-capped slice) so pictures rotate independently.
  const PICTURE_CAP = 2;
  const picturePool = preferUnseen(
    inTheme.filter(e => e.type === 'vocab' && (lookupImage(e.answer) || lookupEmoji(e.answer))),
    seenIds
  );
  const pictures: Exercise[] = picturePool.slice(0, PICTURE_CAP).map(e => ({ ...e, type: 'picture' }));

  // Reserve slots for pictures, fill the rest with other produce (absorbing
  // recognize's shortfall, if any), then order the whole phase by difficulty
  // so it still escalates cleanly.
  const boostedProduceCap = produceCap + recognizeShortfall;
  const otherProduce = preferUnseen(
    inTheme.filter(e => PRODUCE_TYPES.includes(e.type)).sort(byDiff),
    seenIds
  );
  const other = otherProduce.slice(0, Math.max(0, boostedProduceCap - pictures.length));
  const produce = [...pictures, ...other].sort(byDiff).slice(0, boostedProduceCap);

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

  // Unseen count per eligible topic at this level, and the raw seen-id set so
  // assembleLesson can rotate exercises instead of replaying the same slice.
  const unseenCountByTopic: Record<string, number> = {};
  let seenIds = new Set<number>();
  try {
    const seenRows: { exercise_id: number }[] = await db.select('SELECT DISTINCT exercise_id FROM attempts');
    seenIds = new Set(seenRows.map(r => r.exercise_id));
    for (const e of SEED_EXERCISES) {
      if (e.cefr_level !== level || !eligibleThemes.includes(e.topic)) continue;
      if (!seenIds.has(e.id)) unseenCountByTopic[e.topic] = (unseenCountByTopic[e.topic] ?? 0) + 1;
    }
  } catch { /* no attempts yet */ }

  const { theme, reason } = chooseTheme({ eligibleThemes, accuracyByTopic, unseenCountByTopic });
  if (!theme) return null;
  return assembleLesson(theme, level, reason, dailyGoal, seenIds);
}
