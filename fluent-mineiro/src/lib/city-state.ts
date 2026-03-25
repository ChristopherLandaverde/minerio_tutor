/**
 * City State Engine
 * Computes locked/open/fading/mastered status per city
 * based on SRS state and exercise attempts.
 *
 * Recalculate on app mount and after each session completes.
 */

import type Database from '@tauri-apps/plugin-sql';
import { CITIES, type CityDef } from './cities';
import { SEED_EXERCISES } from './content';

export type CityStatus = 'locked' | 'open' | 'fading' | 'mastered';

export interface CityState {
  cityId: string;
  status: CityStatus;
  masteryPercent: number;
  overdueCount: number;
  totalTopicExercises: number;
  masteredExercises: number;
}

// Build exercise ID → topic map (in-memory, same pattern as session-planner.ts)
const exerciseTopicMap = new Map(SEED_EXERCISES.map(e => [e.id, e.topic]));

/** Get exercise IDs that belong to a city's topic cluster */
function getCityExerciseIds(city: CityDef): number[] {
  const topicSet = new Set(city.topics);
  return SEED_EXERCISES
    .filter(e => topicSet.has(e.topic))
    .map(e => e.id);
}

/** Compute city states for all cities */
export async function computeCityStates(db: Database): Promise<CityState[]> {
  // Batch-load all SRS states
  let srsRows: { exercise_id: number; easiness_factor: number; interval_days: number; next_review: string }[] = [];
  try {
    srsRows = await db.select('SELECT exercise_id, easiness_factor, interval_days, next_review FROM srs_state');
  } catch {
    // DB may not be ready
  }

  const srsMap = new Map(srsRows.map(r => [r.exercise_id, r]));
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  // First pass: compute raw states without prerequisite checks
  const rawStates = new Map<string, CityState>();

  for (const city of CITIES) {
    const exerciseIds = getCityExerciseIds(city);
    const total = exerciseIds.length;

    let masteredCount = 0;
    let overdueCount = 0;

    for (const exId of exerciseIds) {
      const srs = srsMap.get(exId);
      if (!srs) continue;

      // Check mastered: easiness_factor >= 2.5 AND interval_days >= 21
      if (srs.easiness_factor >= 2.5 && srs.interval_days >= 21) {
        masteredCount++;
      }

      // Check overdue: next_review is in the past by >= 7 days
      const nextReview = new Date(srs.next_review);
      if (nextReview <= sevenDaysAgo) {
        overdueCount++;
      }
    }

    const masteryPercent = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

    // Determine status (without prerequisite check)
    let status: CityStatus = 'open';
    if (total > 0 && masteryPercent >= 80) {
      status = 'mastered';
    } else if (overdueCount >= 3) {
      status = 'fading';
    }

    rawStates.set(city.id, {
      cityId: city.id,
      status,
      masteryPercent,
      overdueCount,
      totalTopicExercises: total,
      masteredExercises: masteredCount,
    });
  }

  // Second pass: apply prerequisite locks
  const results: CityState[] = [];
  for (const city of CITIES) {
    const state = rawStates.get(city.id)!;

    if (city.prerequisites.length > 0) {
      const allPrereqsMastered = city.prerequisites.every(prereqId => {
        const prereqState = rawStates.get(prereqId);
        return prereqState && prereqState.status === 'mastered';
      });
      if (!allPrereqsMastered) {
        state.status = 'locked';
      }
    }

    results.push(state);
  }

  return results;
}

/** Check if a road between two cities is unlocked */
export function isRoadUnlocked(fromCityId: string, states: CityState[]): boolean {
  const fromState = states.find(s => s.cityId === fromCityId);
  return fromState?.status === 'mastered';
}
