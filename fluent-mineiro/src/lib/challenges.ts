/**
 * Weekly Challenges system.
 *
 * Generates 2-3 challenges per week based on user's recent performance.
 * Challenges expire at the end of the calendar week (Monday start).
 */

import { getDb, getProfile } from './db';
import { SEED_EXERCISES } from './content';
import { getCurrentSeason } from './seasons';

export interface Challenge {
  id: number;
  weekStart: string;
  challengeType: string;
  targetValue: number;
  targetTopic: string | null;
  currentValue: number;
  completed: boolean;
  xpReward: number;
  label: string; // Human-readable description
}

/** Get the Monday of the current week as ISO date string */
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/** Generate human-readable label for a challenge */
function challengeLabel(type: string, target: number, topic: string | null): string {
  switch (type) {
    case 'exercise_count':
      return `Complete ${target} exercícios esta semana`;
    case 'session_count':
      return `Faça ${target} sessões esta semana`;
    case 'accuracy_topic':
      return `Acerte 80%+ em ${topic || 'tema'} esta semana`;
    case 'seasonal':
      return topic || `Desafio da estação (${target})`;
    default:
      return `Complete o desafio (${target})`;
  }
}

/** Load active challenges for this week. Generate if none exist. */
export async function getActiveChallenges(): Promise<Challenge[]> {
  const d = await getDb();
  const weekStart = getCurrentWeekStart();

  // Check if challenges exist for this week
  const existing: any[] = await d.select(
    'SELECT * FROM weekly_challenges WHERE week_start = $1',
    [weekStart]
  );

  if (existing.length > 0) {
    return existing.map(r => ({
      id: r.id,
      weekStart: r.week_start,
      challengeType: r.challenge_type,
      targetValue: r.target_value,
      targetTopic: r.target_topic,
      currentValue: r.current_value,
      completed: r.completed === 1,
      xpReward: r.xp_reward,
      label: challengeLabel(r.challenge_type, r.target_value, r.target_topic),
    }));
  }

  // No challenges this week — generate new ones
  return await generateWeeklyChallenges(d, weekStart);
}

/** Generate 2-3 challenges based on recent performance */
async function generateWeeklyChallenges(d: any, weekStart: string): Promise<Challenge[]> {
  const challenges: { type: string; target: number; topic: string | null; xp: number }[] = [];

  // Challenge 1: Always an exercise count challenge
  const dailyGoal = parseInt(await getProfile('daily_goal') || '15');
  challenges.push({
    type: 'exercise_count',
    target: dailyGoal * 5, // 5 days worth
    topic: null,
    xp: 50,
  });

  // Challenge 2: Session count
  challenges.push({
    type: 'session_count',
    target: 5,
    topic: null,
    xp: 30,
  });

  // Challenge 3: Accuracy on a weak topic (if one exists)
  try {
    const weakRows: { topic: string; accuracy: number }[] = await d.select(`
      SELECT topic, AVG(is_correct) as accuracy FROM (
        SELECT a.is_correct, e_topic as topic
        FROM attempts a
        JOIN (
          SELECT exercise_id, topic as e_topic FROM (
            VALUES ${SEED_EXERCISES.slice(0, 50).map(e => `(${e.id}, '${e.topic.replace(/'/g, "''")}')`).join(',')}
          )
        ) ex ON a.exercise_id = ex.exercise_id
        WHERE a.timestamp >= date('now', '-14 days')
      )
      GROUP BY topic
      HAVING COUNT(*) >= 5 AND AVG(is_correct) < 0.7
      ORDER BY accuracy ASC
      LIMIT 1
    `);
    if (weakRows.length > 0) {
      challenges.push({
        type: 'accuracy_topic',
        target: 80, // 80% accuracy
        topic: weakRows[0].topic,
        xp: 50,
      });
    }
  } catch {
    // Skip topic challenge if query fails
  }

  // Challenge 4: Seasonal (if active season)
  const season = getCurrentSeason();
  if (season) {
    challenges.push({
      type: 'seasonal',
      target: season.challengeTarget,
      topic: season.challengeLabel,
      xp: 60,
    });
  }

  // Insert into DB
  const result: Challenge[] = [];
  for (const c of challenges) {
    const res = await d.execute(
      'INSERT INTO weekly_challenges (week_start, challenge_type, target_value, target_topic, xp_reward) VALUES ($1, $2, $3, $4, $5)',
      [weekStart, c.type, c.target, c.topic, c.xp]
    );
    result.push({
      id: res.lastInsertId ?? 0,
      weekStart,
      challengeType: c.type,
      targetValue: c.target,
      targetTopic: c.topic,
      currentValue: 0,
      completed: false,
      xpReward: c.xp,
      label: challengeLabel(c.type, c.target, c.topic),
    });
  }

  return result;
}

/** Update challenge progress after a session */
export async function updateChallengeProgress(sessionTotal: number): Promise<Challenge[]> {
  const d = await getDb();
  const weekStart = getCurrentWeekStart();

  const rows: any[] = await d.select(
    'SELECT * FROM weekly_challenges WHERE week_start = $1 AND completed = 0',
    [weekStart]
  );

  const updated: Challenge[] = [];

  for (const row of rows) {
    let newValue = row.current_value;

    switch (row.challenge_type) {
      case 'exercise_count':
        newValue += sessionTotal;
        break;
      case 'session_count':
        newValue += 1;
        break;
      case 'seasonal': {
        // Seasonal challenges track same as exercise_count or session_count
        // based on the season's challengeType
        const season = getCurrentSeason();
        if (season) {
          if (season.challengeType === 'exercise_count') newValue += sessionTotal;
          else if (season.challengeType === 'session_count') newValue += 1;
          else if (season.challengeType === 'npc_chats') {
            // Count NPC conversations this week
            const chatRows: { cnt: number }[] = await d.select(
              "SELECT COUNT(*) as cnt FROM npc_conversations WHERE last_interaction >= $1",
              [weekStart]
            );
            newValue = chatRows[0]?.cnt || 0;
          }
        }
        break;
      }
      case 'accuracy_topic': {
        // Recompute accuracy from attempts this week
        if (row.target_topic) {
          const topicExIds = SEED_EXERCISES
            .filter(e => e.topic === row.target_topic)
            .map(e => e.id);
          if (topicExIds.length > 0) {
            const accRows: { accuracy: number }[] = await d.select(
              `SELECT AVG(is_correct) * 100 as accuracy FROM attempts
               WHERE exercise_id IN (${topicExIds.join(',')})
               AND timestamp >= $1`,
              [weekStart]
            );
            newValue = Math.round(accRows[0]?.accuracy ?? 0);
          }
        }
        break;
      }
    }

    const completed = newValue >= row.target_value ? 1 : 0;
    await d.execute(
      'UPDATE weekly_challenges SET current_value = $1, completed = $2 WHERE id = $3',
      [newValue, completed, row.id]
    );

    // Award XP on completion
    if (completed && row.completed === 0) {
      const currentXp = parseInt(await getProfile('total_xp') || '0');
      const { setProfile } = await import('./db');
      await setProfile('total_xp', String(currentXp + row.xp_reward));
    }

    updated.push({
      id: row.id,
      weekStart: row.week_start,
      challengeType: row.challenge_type,
      targetValue: row.target_value,
      targetTopic: row.target_topic,
      currentValue: newValue,
      completed: completed === 1,
      xpReward: row.xp_reward,
      label: challengeLabel(row.challenge_type, row.target_value, row.target_topic),
    });
  }

  return updated;
}
