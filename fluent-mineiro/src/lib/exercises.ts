/**
 * Centralized exercise scoring + SRS update.
 * Every exercise component calls these two functions.
 */

import { computeNextReview, type SrsState } from './sm2';
import { recordAttempt, getSrsState, upsertSrsState, setProfile, getProfile } from './db';

export interface Exercise {
  id: number;
  type: string;
  cefr_level: string;
  topic: string;
  prompt: string;
  answer: string;
  distractors: string | null;
  explanation: string;
  mineiro_note: string | null;
  tags: string | null;
  difficulty: number;
}

export interface ScoreResult {
  quality: number;
  isCorrect: boolean;
  mistakeType: string | null;
}

// Known Spanish false cognates
const SPANISH_FALSE_COGNATES: Record<string, string> = {
  esquisito: 'exquisito',
  embaraçada: 'embarazada',
  polvo: 'polvo',
  acordar: 'acordar',
  borracha: 'borracha',
};

export function scoreExercise(
  type: string,
  userAnswer: string,
  expectedAnswer: string,
  selfRating?: number, // only for vocab flashcards
  tags?: string | null
): ScoreResult {
  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedExpected = expectedAnswer.trim().toLowerCase();

  let quality: number;
  let isCorrect: boolean;
  let mistakeType: string | null = null;

  switch (type) {
    case 'vocab': {
      // User self-rates after seeing the answer
      quality = selfRating ?? 0;
      isCorrect = quality >= 3;
      break;
    }
    case 'cloze': {
      if (normalizedUser === normalizedExpected) {
        quality = 4;
        isCorrect = true;
      } else if (isCloseMatch(normalizedUser, normalizedExpected)) {
        quality = 3;
        isCorrect = true;
      } else {
        quality = 1;
        isCorrect = false;
      }
      break;
    }
    case 'multiple_choice': {
      isCorrect = normalizedUser === normalizedExpected;
      quality = isCorrect ? 4 : 1;
      break;
    }
    case 'error_correction': {
      if (normalizedUser === normalizedExpected) {
        quality = 5;
        isCorrect = true;
      } else if (isCloseMatch(normalizedUser, normalizedExpected)) {
        quality = 3;
        isCorrect = true;
      } else {
        quality = 1;
        isCorrect = false;
      }
      break;
    }
    default: {
      isCorrect = normalizedUser === normalizedExpected;
      quality = isCorrect ? 4 : 1;
    }
  }

  // Detect Spanish interference
  if (!isCorrect && tags) {
    const parsedTags: string[] = JSON.parse(tags);
    if (parsedTags.includes('false_cognate') || parsedTags.includes('ser_estar') || parsedTags.includes('preposition')) {
      mistakeType = 'spanish_interference';
    }
    // Check if the wrong answer matches a Spanish cognate
    for (const [pt, es] of Object.entries(SPANISH_FALSE_COGNATES)) {
      if (normalizedUser.includes(es) && normalizedExpected.includes(pt)) {
        mistakeType = 'spanish_interference';
        break;
      }
    }
  }
  if (!isCorrect && !mistakeType) {
    mistakeType = 'grammar';
  }
  if (isCorrect) {
    mistakeType = null;
  }

  return { quality, isCorrect, mistakeType };
}

/** Update SRS state and record the attempt */
export async function processAnswer(
  exercise: Exercise,
  userAnswer: string,
  result: ScoreResult,
  responseTimeMs: number | null
): Promise<void> {
  // Record the attempt
  await recordAttempt(
    exercise.id,
    userAnswer,
    result.isCorrect,
    result.quality,
    responseTimeMs,
    result.mistakeType
  );

  // Update SRS
  const currentSrs = await getSrsState(exercise.id);
  const newSrs = computeNextReview(currentSrs, result.quality);
  await upsertSrsState(
    exercise.id,
    newSrs.easiness_factor,
    newSrs.interval_days,
    newSrs.repetitions,
    newSrs.next_review
  );

  // Update XP
  if (result.isCorrect) {
    const currentXp = parseInt(await getProfile('total_xp') || '0');
    await setProfile('total_xp', String(currentXp + 10));
  }
}

/** Check for close match (accent/spelling tolerance) */
function isCloseMatch(a: string, b: string): boolean {
  const stripAccents = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return stripAccents(a) === stripAccents(b);
}
