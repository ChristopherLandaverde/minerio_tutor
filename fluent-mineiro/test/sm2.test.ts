import { describe, it, expect } from 'vitest';
import { computeNextReview } from '../src/lib/sm2';

describe('SM-2 Algorithm', () => {
  it('first correct answer gives interval of 1 day', () => {
    const result = computeNextReview(null, 4);
    expect(result.interval_days).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('second correct answer gives interval of 6 days', () => {
    const state = { easiness_factor: 2.5, interval_days: 1, repetitions: 1, next_review: '2026-01-01' };
    const result = computeNextReview(state, 4);
    expect(result.interval_days).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('third correct answer multiplies interval by EF', () => {
    const state = { easiness_factor: 2.5, interval_days: 6, repetitions: 2, next_review: '2026-01-01' };
    const result = computeNextReview(state, 4);
    expect(result.interval_days).toBe(15); // round(6 * 2.5)
    expect(result.repetitions).toBe(3);
  });

  it('incorrect answer resets to interval 1 and repetitions 0', () => {
    const state = { easiness_factor: 2.5, interval_days: 15, repetitions: 5, next_review: '2026-01-01' };
    const result = computeNextReview(state, 1);
    expect(result.interval_days).toBe(1);
    expect(result.repetitions).toBe(0);
  });

  it('easiness factor never drops below 1.3', () => {
    const state = { easiness_factor: 1.3, interval_days: 1, repetitions: 0, next_review: '2026-01-01' };
    const result = computeNextReview(state, 0);
    expect(result.easiness_factor).toBeGreaterThanOrEqual(1.3);
  });

  it('quality 5 increases easiness factor', () => {
    const state = { easiness_factor: 2.5, interval_days: 1, repetitions: 1, next_review: '2026-01-01' };
    const result = computeNextReview(state, 5);
    expect(result.easiness_factor).toBeGreaterThan(2.5);
  });

  it('next_review is a valid ISO date string', () => {
    const result = computeNextReview(null, 4);
    expect(result.next_review).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
