/**
 * Adaptive difficulty system.
 * Tracks rolling accuracy and recommends CEFR level + difficulty.
 *
 * Rules:
 * - Accuracy >80% over last 20 attempts → bump CEFR level
 * - Accuracy <40% over last 20 attempts → drop CEFR level
 * - Target: 60-70% success rate (desirable difficulty)
 * - C1 is the ceiling — never bump beyond it
 * - Fall back to nearest available level if target has no exercises
 */

import { getRecentAttempts, getProfile, setProfile } from './db';
import { SEED_EXERCISES } from './content';

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'];
const WINDOW_SIZE = 20;

export interface AdaptiveState {
  currentLevel: string;
  rollingAccuracy: number;
  recommendation: 'stay' | 'up' | 'down';
  availableLevels: string[];
}

/** Get available CEFR levels that actually have exercises */
export function getAvailableLevels(): string[] {
  const levels = new Set(SEED_EXERCISES.map(e => e.cefr_level));
  return CEFR_ORDER.filter(l => levels.has(l));
}

/** Find the nearest available CEFR level to the target */
export function nearestAvailableLevel(target: string, available: string[]): string {
  if (available.includes(target)) return target;
  if (available.length === 0) return 'A2'; // absolute fallback

  const targetIdx = CEFR_ORDER.indexOf(target);
  // Search outward from target: try one below, one above, two below, etc.
  for (let dist = 1; dist < CEFR_ORDER.length; dist++) {
    const below = CEFR_ORDER[targetIdx - dist];
    if (below && available.includes(below)) return below;
    const above = CEFR_ORDER[targetIdx + dist];
    if (above && available.includes(above)) return above;
  }
  return available[0];
}

/** Compute rolling accuracy from recent attempts */
export async function computeAdaptiveState(): Promise<AdaptiveState> {
  const currentLevel = await getProfile('current_level') || 'A2';
  const available = getAvailableLevels();

  let rollingAccuracy = 0.5; // default 50% when no data
  let recommendation: 'stay' | 'up' | 'down' = 'stay';

  try {
    const recent = await getRecentAttempts(WINDOW_SIZE);
    if (recent.length >= 5) { // need at least 5 attempts for meaningful accuracy
      const correct = recent.filter(a => a.is_correct === 1).length;
      rollingAccuracy = correct / recent.length;

      if (rollingAccuracy > 0.8) {
        recommendation = 'up';
      } else if (rollingAccuracy < 0.4) {
        recommendation = 'down';
      }
    }
  } catch {
    // DB not ready
  }

  return { currentLevel, rollingAccuracy, recommendation, availableLevels: available };
}

/** Apply the adaptive recommendation — bump or drop CEFR level */
export async function applyAdaptation(): Promise<string> {
  const state = await computeAdaptiveState();
  const currentIdx = CEFR_ORDER.indexOf(state.currentLevel);
  let newLevel = state.currentLevel;

  if (state.recommendation === 'up' && currentIdx < CEFR_ORDER.length - 1) {
    // Cap at C1 — never go beyond
    const candidate = CEFR_ORDER[Math.min(currentIdx + 1, CEFR_ORDER.indexOf('C1'))];
    newLevel = nearestAvailableLevel(candidate, state.availableLevels);
  } else if (state.recommendation === 'down' && currentIdx > 0) {
    const candidate = CEFR_ORDER[currentIdx - 1];
    newLevel = nearestAvailableLevel(candidate, state.availableLevels);
  }

  if (newLevel !== state.currentLevel) {
    await setProfile('current_level', newLevel);
  }

  return newLevel;
}

/** Get exercises filtered by current adaptive level, with fallback */
export function getExercisesForLevel(level: string, type?: string, topic?: string) {
  const available = getAvailableLevels();
  const effectiveLevel = nearestAvailableLevel(level, available);

  return SEED_EXERCISES.filter(e => {
    if (e.cefr_level !== effectiveLevel) return false;
    if (type && e.type !== type) return false;
    if (topic && e.topic !== topic) return false;
    return true;
  });
}
