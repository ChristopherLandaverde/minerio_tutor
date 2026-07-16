/**
 * Pool-size audit: flags topics where a given exercise-type pool is too small
 * to survive a second session without repeats, even with the seen/unseen
 * rotation in lesson.ts (assembleLesson -> preferUnseen). A pool needs at
 * least 2x the session's cap to guarantee zero repeats across two
 * consecutive sessions on the same theme.
 */
import { SEED_EXERCISES } from './content';
import { RECOGNIZE_TYPES, PRODUCE_TYPES } from './lesson';

export interface PoolGap {
  topic: string;
  level: string;
  kind: 'recognize' | 'produce';
  poolSize: number;
  cap: number;
}

/** Session caps derived the same way assembleLesson computes them. */
export function sessionCaps(dailyGoal: number): { recognizeCap: number; produceCap: number } {
  const target = Math.max(5, dailyGoal);
  const recognizeCap = Math.max(1, Math.round(target * 0.4));
  return { recognizeCap, produceCap: Math.max(1, target - recognizeCap) };
}

/** Topics/levels whose recognize or produce pool can't fill two consecutive
 * sessions without repeating an already-seen exercise. Topics with zero
 * items of a given kind are not flagged for that kind — some themes are
 * legitimately grammar-only or vocab-only by design. */
export function findThinPools(level: string, dailyGoal = 15): PoolGap[] {
  const { recognizeCap, produceCap } = sessionCaps(dailyGoal);

  const counts = new Map<string, { recognize: number; produce: number }>();
  for (const e of SEED_EXERCISES) {
    if (e.cefr_level !== level) continue;
    const c = counts.get(e.topic) ?? { recognize: 0, produce: 0 };
    if (RECOGNIZE_TYPES.includes(e.type)) c.recognize++;
    if (PRODUCE_TYPES.includes(e.type)) c.produce++;
    counts.set(e.topic, c);
  }

  const gaps: PoolGap[] = [];
  for (const [topic, c] of counts) {
    if (c.recognize + c.produce < 3) continue; // not an eligible theme at all (see planLesson)
    if (c.recognize > 0 && c.recognize < recognizeCap * 2) {
      gaps.push({ topic, level, kind: 'recognize', poolSize: c.recognize, cap: recognizeCap });
    }
    if (c.produce > 0 && c.produce < produceCap * 2) {
      gaps.push({ topic, level, kind: 'produce', poolSize: c.produce, cap: produceCap });
    }
  }
  return gaps.sort((a, b) => a.topic.localeCompare(b.topic) || a.kind.localeCompare(b.kind));
}
