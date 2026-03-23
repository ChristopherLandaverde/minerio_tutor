import { describe, it, expect } from 'vitest';
import { getAvailableLevels, nearestAvailableLevel } from '../src/lib/adaptive';

describe('getAvailableLevels', () => {
  it('returns levels that have exercises in SEED_EXERCISES', () => {
    const levels = getAvailableLevels();
    expect(levels.length).toBeGreaterThan(0);
    expect(levels).toContain('A2');
  });
});

describe('nearestAvailableLevel', () => {
  it('returns target if available', () => {
    expect(nearestAvailableLevel('A2', ['A2', 'B1', 'B2'])).toBe('A2');
  });

  it('falls back to nearest below when target unavailable', () => {
    expect(nearestAvailableLevel('B1', ['A2', 'B2'])).toBe('A2');
  });

  it('falls back to nearest above when nothing below', () => {
    expect(nearestAvailableLevel('A1', ['A2', 'B1'])).toBe('A2');
  });

  it('returns A2 as absolute fallback when no levels available', () => {
    expect(nearestAvailableLevel('C1', [])).toBe('A2');
  });

  it('returns first available when target is far from any', () => {
    expect(nearestAvailableLevel('C1', ['A2'])).toBe('A2');
  });
});
