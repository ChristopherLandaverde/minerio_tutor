import { describe, it, expect } from 'vitest';
import { chooseTheme, assembleLesson, RECOGNIZE_TYPES } from '../src/lib/lesson';
import { SEED_EXERCISES } from '../src/lib/content';

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
    for (const e of lesson.produce) expect(['cloze', 'reorder', 'error_correction', 'picture']).toContain(e.type);
    // difficulty ascending within each stage
    const asc = (a: number[]) => a.every((v, i) => i === 0 || v >= a[i - 1]);
    expect(asc(lesson.recognize.map(e => e.difficulty))).toBe(true);
    expect(asc(lesson.produce.map(e => e.difficulty))).toBe(true);
    // capstone present
    expect(lesson.capstone.scenario.length).toBeGreaterThan(0);
    expect(lesson.capstone.opener.length).toBeGreaterThan(0);
  });

  it('produce-heavy split: produce gets >= recognize for a normal goal', () => {
    // NOTE: 'food' (used in the test above) has more recognize items (5) than
    // produce items (2) at A2 in the real seed content, so it can't exercise
    // this assertion honestly. 'travel' has 1 recognize + 2 produce at A2,
    // which genuinely demonstrates produce >= recognize without relying on a
    // 0-vs-something degenerate case.
    const lesson = assembleLesson('travel', 'A2', 'r', 10);
    expect(lesson.produce.length).toBeGreaterThanOrEqual(lesson.recognize.length);
  });

  it('a pure-grammar theme yields a pattern teach card, not emoji cards', () => {
    // verbs_present has no `vocab` items → teach should be a single pattern card
    const lesson = assembleLesson('verbs_present', 'A2', 'r', 10);
    expect(lesson.teach.length).toBe(1);
    expect(lesson.teach[0].isPattern).toBe(true);
  });

  it('binds both caps when items are plentiful (produce-heavy 40/60)', () => {
    // verbs_present @ A2 has 7 recognize + 82 produce items — both exceed the
    // caps, so the split RATIO is exercised (a reversed 60/40 would fail this).
    const lesson = assembleLesson('verbs_present', 'A2', 'r', 10); // recognizeCap=4, produceCap=6
    expect(lesson.recognize.length).toBe(4);
    expect(lesson.produce.length).toBe(6);
  });

  it('rotates recognize away from already-attempted exercises when the pool is large enough', () => {
    // false_cognates @ A2 has 15 recognize items — comfortably more than 2x
    // the recognizeCap (4), so a full rotation is achievable with zero overlap.
    const first = assembleLesson('false_cognates', 'A2', 'r', 10);
    const seenIds = new Set(first.recognize.map(e => e.id));
    const second = assembleLesson('false_cognates', 'A2', 'r', 10, seenIds);
    const overlap = second.recognize.filter(e => seenIds.has(e.id));
    expect(overlap.length).toBe(0);
  });

  it('rotates produce away from already-attempted exercises when the pool is large enough', () => {
    // verbs_present @ A2 has 82 produce items — ample headroom for a full rotation.
    const first = assembleLesson('verbs_present', 'A2', 'r', 10);
    const seenIds = new Set(first.produce.map(e => e.id));
    const second = assembleLesson('verbs_present', 'A2', 'r', 10, seenIds);
    const overlap = second.produce.filter(e => seenIds.has(e.id));
    expect(overlap.length).toBe(0);
  });

  it('backfills produce when recognize runs dry, instead of repeating', () => {
    // verbs_present @ A2 has only 7 recognize items against a cap of 4
    // (dailyGoal 10) — mark all 7 seen. Recognize should shrink toward 0
    // rather than repeat, and produce (82 items, ample) absorbs the slack
    // so the session doesn't get smaller. This is the actual fix for the
    // "same lesson every time" repeat a thin recognize pool used to cause.
    const first = assembleLesson('verbs_present', 'A2', 'r', 10);
    const allRecognize = SEED_EXERCISES.filter(
      e => e.topic === 'verbs_present' && e.cefr_level === 'A2' && RECOGNIZE_TYPES.includes(e.type)
    );
    const seenIds = new Set(allRecognize.map(e => e.id));

    const second = assembleLesson('verbs_present', 'A2', 'r', 10, seenIds);
    expect(second.recognize.length).toBe(0);
    expect(second.recognize.filter(e => seenIds.has(e.id))).toEqual([]);
    // Total session size is preserved — produce made up the difference.
    expect(second.recognize.length + second.produce.length).toBe(first.recognize.length + first.produce.length);
  });

  it('degrades gracefully (no crash, no duplicate ids) when both pools are thin', () => {
    // 'travel' @ A2 has only 1 recognize + 2 produce item total — a genuine
    // content shortage neither pool can backfill for the other. The lesson
    // should still return without error or duplicate exercises, even though
    // it can't hit the full target size.
    const first = assembleLesson('travel', 'A2', 'r', 10);
    const seenIds = new Set([...first.recognize, ...first.produce].map(e => e.id));

    const second = assembleLesson('travel', 'A2', 'r', 10, seenIds);
    const allIds = [...second.recognize, ...second.produce].map(e => e.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('recognize stays difficulty-ascending even when unseen/seen exercises are interleaved', () => {
    const inTheme = assembleLesson('verbs_present', 'A2', 'r', 10);
    // Mark every other recognize exercise "seen" to force interleaving.
    const seenIds = new Set(inTheme.recognize.filter((_, i) => i % 2 === 0).map(e => e.id));
    const lesson = assembleLesson('verbs_present', 'A2', 'r', 10, seenIds);
    const diffs = lesson.recognize.map(e => e.difficulty);
    expect(diffs.every((v, i) => i === 0 || v >= diffs[i - 1])).toBe(true);
  });
});
