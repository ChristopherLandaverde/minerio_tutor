import { describe, it, expect } from 'vitest';
import { scoreExercise } from '../src/lib/exercises';

describe('scoreExercise', () => {
  it('vocab with self-rating >= 3 is correct', () => {
    const result = scoreExercise('vocab', 'anything', 'answer', 4);
    expect(result.isCorrect).toBe(true);
    expect(result.quality).toBe(4);
  });

  it('vocab with self-rating < 3 is incorrect', () => {
    const result = scoreExercise('vocab', 'anything', 'answer', 2);
    expect(result.isCorrect).toBe(false);
    expect(result.quality).toBe(2);
  });

  it('cloze exact match is quality 4', () => {
    const result = scoreExercise('cloze', 'está', 'está');
    expect(result.isCorrect).toBe(true);
    expect(result.quality).toBe(4);
  });

  it('cloze accent-stripped match is quality 3 (close match)', () => {
    const result = scoreExercise('cloze', 'esta', 'está');
    expect(result.isCorrect).toBe(true);
    expect(result.quality).toBe(3);
  });

  it('cloze wrong answer is quality 1', () => {
    const result = scoreExercise('cloze', 'ser', 'estar');
    expect(result.isCorrect).toBe(false);
    expect(result.quality).toBe(1);
  });

  it('multiple choice correct is quality 4', () => {
    const result = scoreExercise('multiple_choice', 'café', 'café');
    expect(result.isCorrect).toBe(true);
    expect(result.quality).toBe(4);
  });

  it('true_false correct is quality 4', () => {
    const result = scoreExercise('true_false', 'true', 'true');
    expect(result.isCorrect).toBe(true);
    expect(result.quality).toBe(4);
  });

  it('reorder exact match is quality 5', () => {
    const result = scoreExercise('reorder', 'Eu gosto de café', 'Eu gosto de café');
    expect(result.isCorrect).toBe(true);
    expect(result.quality).toBe(5);
  });

  it('detects spanish interference with false_cognate tag', () => {
    const result = scoreExercise('cloze', 'embarazada', 'embaraçada', undefined, '["false_cognate"]');
    expect(result.isCorrect).toBe(false);
    expect(result.mistakeType).toBe('spanish_interference');
  });

  it('incorrect answer without interference tag gets grammar mistake type', () => {
    const result = scoreExercise('cloze', 'wrong', 'right');
    expect(result.isCorrect).toBe(false);
    expect(result.mistakeType).toBe('grammar');
  });

  it('correct answer has null mistake type', () => {
    const result = scoreExercise('cloze', 'right', 'right');
    expect(result.isCorrect).toBe(true);
    expect(result.mistakeType).toBeNull();
  });

  it('handles malformed tags JSON gracefully', () => {
    const result = scoreExercise('cloze', 'wrong', 'right', undefined, 'not-json');
    expect(result.isCorrect).toBe(false);
    expect(result.mistakeType).toBe('grammar');
  });
});
