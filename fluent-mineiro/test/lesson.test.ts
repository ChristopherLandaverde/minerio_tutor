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
});
