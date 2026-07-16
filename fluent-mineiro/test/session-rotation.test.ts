import { describe, it, expect } from 'vitest';
import { assembleLesson, RECOGNIZE_TYPES, PRODUCE_TYPES } from '../src/lib/lesson';
import { findThinPools } from '../src/lib/content-audit';
import { getAvailableLevels } from '../src/lib/adaptive';
import { SEED_EXERCISES } from '../src/lib/content';

// Automated version of the manual "run a session, run it again, diff the
// questions" QA pass done for the repeat-questions fix (2026-07-16). For
// every real topic/level in the content bank, simulates two consecutive
// sessions on the same theme (session 2's seenIds = everything session 1
// showed) and checks the rotation guarantee: if a pool has at least 2x the
// session cap, the second session must show zero repeats. Thin pools (see
// content-audit.test.ts) are expected to repeat and are excluded here —
// that's a content gap, not an algorithm regression.
function eligibleThemes(level: string): string[] {
  const counts = new Map<string, number>();
  for (const e of SEED_EXERCISES) {
    if (e.cefr_level !== level) continue;
    if (RECOGNIZE_TYPES.includes(e.type) || PRODUCE_TYPES.includes(e.type)) {
      counts.set(e.topic, (counts.get(e.topic) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, n]) => n >= 3).map(([t]) => t);
}

describe('session rotation across the full content bank', () => {
  for (const level of getAvailableLevels()) {
    it(`${level}: every non-thin theme fully rotates on a second session`, () => {
      const thin = findThinPools(level);
      const isThin = (topic: string, kind: 'recognize' | 'produce') =>
        thin.some(g => g.topic === topic && g.kind === kind);

      for (const theme of eligibleThemes(level)) {
        const first = assembleLesson(theme, level, 'r', 15);
        const seenIds = new Set([...first.recognize, ...first.produce].map(e => e.id));
        const second = assembleLesson(theme, level, 'r', 15, seenIds);

        if (!isThin(theme, 'recognize')) {
          const overlap = second.recognize.filter(e => seenIds.has(e.id));
          expect(overlap, `${level}/${theme} recognize repeated: ${overlap.map(e => e.id)}`).toEqual([]);
        }
        if (!isThin(theme, 'produce')) {
          const overlap = second.produce.filter(e => seenIds.has(e.id));
          expect(overlap, `${level}/${theme} produce repeated: ${overlap.map(e => e.id)}`).toEqual([]);
        }
      }
    });
  }
});
