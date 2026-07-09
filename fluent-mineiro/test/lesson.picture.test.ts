import { describe, it, expect } from 'vitest';
import { assembleLesson } from '../src/lib/lesson';
import { SEED_EXERCISES } from '../src/lib/content';
import { lookupEmoji } from '../src/lib/emoji-map';
import { lookupImage } from '../src/lib/image-map';

// Themes/levels that actually have seed content, derived from the data so the
// test doesn't hardcode assumptions about the curriculum.
const combos = Array.from(
  new Set(SEED_EXERCISES.map((e) => `${e.topic}::${e.cefr_level}`))
).map((k) => {
  const [topic, level] = k.split('::');
  return { topic, level };
});

describe('picture → type-the-word exercise', () => {
  it('is synthesized for at least one concrete-noun theme', () => {
    const withPictures = combos
      .map(({ topic, level }) => assembleLesson(topic, level, 'test', 15))
      .filter((lesson) => lesson.produce.some((e) => e.type === 'picture'));

    expect(withPictures.length).toBeGreaterThan(0);
  });

  it('every picture exercise has a visual (image or emoji) and a real answer', () => {
    for (const { topic, level } of combos) {
      const lesson = assembleLesson(topic, level, 'test', 15);
      for (const ex of lesson.produce.filter((e) => e.type === 'picture')) {
        expect(ex.answer.trim().length).toBeGreaterThan(0);
        const hasVisual = !!(lookupImage(ex.answer) || lookupEmoji(ex.answer));
        expect(hasVisual, `no visual for "${ex.answer}"`).toBe(true);
      }
    }
  });

  it('caps picture exercises per lesson so they do not flood the produce phase', () => {
    for (const { topic, level } of combos) {
      const lesson = assembleLesson(topic, level, 'test', 15);
      const pictureCount = lesson.produce.filter((e) => e.type === 'picture').length;
      expect(pictureCount).toBeLessThanOrEqual(2);
    }
  });
});
