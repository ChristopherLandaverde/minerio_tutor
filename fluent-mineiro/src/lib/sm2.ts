/**
 * SM-2 Spaced Repetition Algorithm
 * Classic SuperMemo 2 variant.
 *
 * Quality scale: 0-5
 *   0 = no recall
 *   1 = wrong but recognized
 *   2 = wrong but close
 *   3 = correct with difficulty
 *   4 = correct with hesitation
 *   5 = instant recall
 */

export interface SrsState {
  easiness_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
}

export function computeNextReview(
  current: SrsState | null,
  quality: number
): SrsState {
  const ef = current?.easiness_factor ?? 2.5;
  const interval = current?.interval_days ?? 1;
  const reps = current?.repetitions ?? 0;

  let newEf: number;
  let newInterval: number;
  let newReps: number;

  if (quality >= 3) {
    // Correct
    if (reps === 0) {
      newInterval = 1;
    } else if (reps === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * ef);
    }
    newReps = reps + 1;
  } else {
    // Incorrect — reset
    newInterval = 1;
    newReps = 0;
  }

  // Update easiness factor (never below 1.3)
  newEf = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  // Calculate next review date
  const today = new Date();
  today.setDate(today.getDate() + newInterval);
  const nextReview = today.toISOString().split('T')[0];

  return {
    easiness_factor: newEf,
    interval_days: newInterval,
    repetitions: newReps,
    next_review: nextReview,
  };
}
