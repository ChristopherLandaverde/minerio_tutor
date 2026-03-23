/**
 * Smart Session Planner
 *
 * Assembles a daily workout:
 * 1. SRS reviews first (due today)
 * 2. Weak topics (accuracy <60% in last 30 days, ranked by weakness_score)
 * 3. New content (unseen exercises at current CEFR level)
 * 4. Mix in variety (ensure 2+ exercise types)
 * 5. Cap at daily goal (min 5)
 * 6. Include reading/writing if goal >= 15/20
 */

import { getDueReviewIds, getProfile } from './db';
import { SEED_EXERCISES } from './content';
import { getAvailableLevels, nearestAvailableLevel } from './adaptive';
import type { Exercise } from './exercises';

interface WeakTopic {
  topic: string;
  accuracy: number;
  recencyWeight: number;
  weaknessScore: number;
}

export interface SessionPlan {
  exercises: Exercise[];
  reviewCount: number;
  newCount: number;
  weakTopicCount: number;
  includesReading: boolean;
  includesWriting: boolean;
}

/**
 * Query attempts to find topics with <60% accuracy in last 30 days,
 * ranked by weakness_score = (1 - accuracy) * recency_weight.
 */
async function getWeakTopics(db: any): Promise<WeakTopic[]> {
  const rows: { topic: string; total: number; correct: number; recent_days: number }[] = await db.select(`
    SELECT topic, COUNT(*) as total, SUM(is_correct) as correct,
      CAST(julianday('now') - julianday(MAX(timestamp)) AS INTEGER) as recent_days
    FROM (
      SELECT a.is_correct, a.timestamp, e_topic as topic
      FROM attempts a
      JOIN (
        SELECT exercise_id, topic as e_topic FROM (
          VALUES ${SEED_EXERCISES.map(e => `(${e.id}, '${e.topic.replace(/'/g, "''")}')`).join(',')}
        )
      ) ex ON a.exercise_id = ex.exercise_id
      WHERE a.timestamp >= date('now', '-30 days')
    )
    GROUP BY topic
    HAVING COUNT(*) >= 3
  `);

  return rows
    .map(r => {
      const accuracy = r.total > 0 ? r.correct / r.total : 0;
      const recencyWeight = r.recent_days <= 7 ? 1.0 : r.recent_days <= 14 ? 0.7 : 0.4;
      return {
        topic: r.topic,
        accuracy,
        recencyWeight,
        weaknessScore: (1 - accuracy) * recencyWeight,
      };
    })
    .filter(t => t.accuracy < 0.6)
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .slice(0, 3);
}

/**
 * Get exercise IDs the user has already attempted.
 */
async function getSeenExerciseIds(db: any): Promise<Set<number>> {
  const rows: { exercise_id: number }[] = await db.select(
    'SELECT DISTINCT exercise_id FROM attempts'
  );
  return new Set(rows.map(r => r.exercise_id));
}

/**
 * Assemble today's session plan.
 */
export async function planSession(db: any): Promise<SessionPlan> {
  const dailyGoal = parseInt(await getProfile('daily_goal') || '15');
  const currentLevel = await getProfile('current_level') || 'A2';
  const target = Math.max(5, dailyGoal); // minimum session size

  const plan: Exercise[] = [];
  let reviewCount = 0;
  let weakTopicCount = 0;
  let newCount = 0;

  const exerciseMap = new Map(SEED_EXERCISES.map(e => [e.id, e]));

  // Step 1: SRS reviews
  try {
    const dueIds = await getDueReviewIds();
    for (const id of dueIds) {
      if (plan.length >= target) break;
      const ex = exerciseMap.get(id);
      if (ex) {
        plan.push(ex);
        reviewCount++;
      }
    }
  } catch {
    // DB may not be ready
  }

  // Step 2: Weak topics
  if (plan.length < target) {
    try {
      const weakTopics = await getWeakTopics(db);
      const available = getAvailableLevels();
      const effectiveLevel = nearestAvailableLevel(currentLevel, available);

      for (const wt of weakTopics) {
        if (plan.length >= target) break;
        const topicExercises = SEED_EXERCISES.filter(
          e => e.topic === wt.topic && e.cefr_level === effectiveLevel
        );
        // Add up to 3 exercises per weak topic
        const usedIds = new Set(plan.map(e => e.id));
        let added = 0;
        for (const ex of topicExercises) {
          if (plan.length >= target || added >= 3) break;
          if (!usedIds.has(ex.id)) {
            plan.push(ex);
            weakTopicCount++;
            added++;
          }
        }
      }
    } catch {
      // Continue without weak topics
    }
  }

  // Step 3: New content (unseen exercises)
  if (plan.length < target) {
    try {
      const seen = await getSeenExerciseIds(db);
      const available = getAvailableLevels();
      const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'];
      const startIdx = CEFR_ORDER.indexOf(currentLevel);
      const usedIds = new Set(plan.map(e => e.id));

      // Try current level first, then move up
      for (let i = startIdx; i < CEFR_ORDER.length && plan.length < target; i++) {
        const level = CEFR_ORDER[i];
        if (!available.includes(level)) continue;
        const unseen = SEED_EXERCISES.filter(
          e => e.cefr_level === level && !seen.has(e.id) && !usedIds.has(e.id)
        );
        for (const ex of unseen) {
          if (plan.length >= target) break;
          plan.push(ex);
          newCount++;
          usedIds.add(ex.id);
        }
      }
    } catch {
      // Continue with what we have
    }
  }

  // Step 4: Mix in variety — ensure 2+ exercise types
  const types = new Set(plan.map(e => e.type));
  if (types.size < 2 && plan.length >= 5) {
    const dominantType = plan[0]?.type;
    const swapCount = Math.max(1, Math.floor(plan.length * 0.3));
    const usedIds = new Set(plan.map(e => e.id));
    const alternatives = SEED_EXERCISES.filter(
      e => e.type !== dominantType && !usedIds.has(e.id)
    );

    for (let i = 0; i < swapCount && i < alternatives.length; i++) {
      // Replace from the end of the plan
      const replaceIdx = plan.length - 1 - i;
      if (replaceIdx >= 0) {
        plan[replaceIdx] = alternatives[i];
      }
    }
  }

  // Step 5: Shuffle for interleaving (but keep SRS reviews loosely first)
  const reviews = plan.slice(0, reviewCount);
  const rest = plan.slice(reviewCount);
  // Shuffle rest
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  const includesReading = dailyGoal >= 15;
  const includesWriting = dailyGoal >= 20;

  return {
    exercises: [...reviews, ...rest],
    reviewCount,
    newCount,
    weakTopicCount,
    includesReading,
    includesWriting,
  };
}
