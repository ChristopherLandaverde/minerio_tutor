import { describe, it, expect } from 'vitest';
import { COACHING_FALLBACKS, getRandomFallback } from '../src/lib/coaching-fallbacks';

describe('coaching fallbacks', () => {
  it('has at least 10 fallback messages', () => {
    expect(COACHING_FALLBACKS.length).toBeGreaterThanOrEqual(10);
  });

  it('all fallbacks are non-empty strings', () => {
    for (const msg of COACHING_FALLBACKS) {
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(10);
    }
  });

  it('getRandomFallback returns a string from the pool', () => {
    const result = getRandomFallback();
    expect(COACHING_FALLBACKS).toContain(result);
  });

  it('fallbacks contain Mineiro flavor words', () => {
    const mineiroWords = ['uai', 'bão', 'sô', 'trem', 'cê', 'nó'];
    const hasMineiro = COACHING_FALLBACKS.some(msg =>
      mineiroWords.some(word => msg.toLowerCase().includes(word))
    );
    expect(hasMineiro).toBe(true);
  });
});
