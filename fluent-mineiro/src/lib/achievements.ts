/**
 * Achievement system — definitions in code, unlocks in DB.
 *
 * 16 badges across 6 categories: streak, exercises, accuracy, mastery, cefr, special.
 * Each has a check function that computes whether the threshold is met.
 */

import { getDb, getProfile } from './db';
import { SEED_EXERCISES } from './content';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  category: 'streak' | 'exercises' | 'accuracy' | 'mastery' | 'cefr' | 'special';
  threshold: number;
  hint: string;
}

export interface AchievementStatus extends AchievementDef {
  unlockedAt: string | null;
  currentValue: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Streak
  { id: 'streak_7', title: 'Fogo Mineiro', description: '7 dias seguidos de prática', icon: '🔥', tier: 'bronze', category: 'streak', threshold: 7, hint: 'Pratique por 7 dias seguidos' },
  { id: 'streak_30', title: 'Consistência', description: '30 dias seguidos de prática', icon: '🔥', tier: 'silver', category: 'streak', threshold: 30, hint: 'Pratique por 30 dias seguidos' },
  { id: 'streak_100', title: 'Dedicação', description: '100 dias seguidos de prática', icon: '🔥', tier: 'gold', category: 'streak', threshold: 100, hint: 'Pratique por 100 dias seguidos' },

  // Exercise milestones
  { id: 'exercises_10', title: 'Primeiro Passo', description: 'Complete 10 exercícios', icon: '📝', tier: 'bronze', category: 'exercises', threshold: 10, hint: 'Complete 10 exercícios' },
  { id: 'exercises_100', title: 'Praticante', description: 'Complete 100 exercícios', icon: '📝', tier: 'silver', category: 'exercises', threshold: 100, hint: 'Complete 100 exercícios' },
  { id: 'exercises_500', title: 'Mestre', description: 'Complete 500 exercícios', icon: '📝', tier: 'gold', category: 'exercises', threshold: 500, hint: 'Complete 500 exercícios' },
  { id: 'exercises_1000', title: 'Lenda', description: 'Complete 1000 exercícios', icon: '📝', tier: 'gold', category: 'exercises', threshold: 1000, hint: 'Complete 1000 exercícios' },

  // Accuracy
  { id: 'perfect_session', title: 'Sessão Perfeita', description: '100% de acertos em uma sessão de 10+', icon: '🎯', tier: 'bronze', category: 'accuracy', threshold: 1, hint: 'Acerte tudo em uma sessão de 10+ exercícios' },
  { id: 'strong_week', title: 'Semana Forte', description: '80%+ de acertos por 7 dias', icon: '🎯', tier: 'silver', category: 'accuracy', threshold: 7, hint: 'Mantenha 80%+ de precisão por 7 dias' },
  { id: 'max_precision', title: 'Precisão Máxima', description: '90%+ nos últimos 100 exercícios', icon: '🎯', tier: 'gold', category: 'accuracy', threshold: 90, hint: 'Acerte 90+ dos últimos 100 exercícios' },

  // CEFR progression
  { id: 'cefr_a2_complete', title: 'A2 Completo', description: 'Todos os exercícios A2 praticados', icon: '📚', tier: 'bronze', category: 'cefr', threshold: 1, hint: 'Pratique todos os exercícios A2' },
  { id: 'cefr_b1', title: 'B1 Alcançado', description: 'Chegou ao nível B1', icon: '📚', tier: 'silver', category: 'cefr', threshold: 1, hint: 'Alcance o nível B1' },
  { id: 'cefr_b2', title: 'B2 Alcançado', description: 'Chegou ao nível B2', icon: '📚', tier: 'gold', category: 'cefr', threshold: 1, hint: 'Alcance o nível B2' },

  // Special
  { id: 'first_writing', title: 'Primeiro Texto', description: 'Completou a primeira escrita', icon: '✍️', tier: 'bronze', category: 'special', threshold: 1, hint: 'Complete um exercício de escrita' },
  { id: 'first_conversation', title: 'Primeira Conversa', description: 'Primeira conversa com Claude', icon: '💬', tier: 'bronze', category: 'special', threshold: 1, hint: 'Inicie uma conversa' },
  { id: 'false_friends', title: 'Falsos Amigos', description: 'Dominou os falsos cognatos', icon: '⚠️', tier: 'silver', category: 'special', threshold: 1, hint: 'Acerte 90%+ em falsos cognatos' },
];

/** Get all achievements with their current unlock status and progress */
export async function getAllAchievements(): Promise<AchievementStatus[]> {
  const d = await getDb();
  const unlocks: { id: string; unlocked_at: string }[] = await d.select(
    'SELECT id, unlocked_at FROM achievement_unlocks'
  );
  const unlockMap = new Map(unlocks.map(u => [u.id, u.unlocked_at]));

  const results: AchievementStatus[] = [];
  for (const def of ACHIEVEMENTS) {
    const unlockedAt = unlockMap.get(def.id) || null;
    let currentValue = 0;
    if (!unlockedAt) {
      currentValue = await computeProgress(d, def);
    } else {
      currentValue = def.threshold;
    }
    results.push({ ...def, unlockedAt, currentValue });
  }
  return results;
}

/** Check for newly unlocked achievements after a session */
export async function checkAchievements(sessionStats: {
  total: number;
  correct: number;
}): Promise<AchievementStatus[]> {
  const d = await getDb();
  const unlocks: { id: string }[] = await d.select('SELECT id FROM achievement_unlocks');
  const alreadyUnlocked = new Set(unlocks.map(u => u.id));

  const newlyUnlocked: AchievementStatus[] = [];

  for (const def of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(def.id)) continue;
    const value = await computeProgress(d, def, sessionStats);
    if (value >= def.threshold) {
      await d.execute(
        "INSERT OR IGNORE INTO achievement_unlocks (id, unlocked_at) VALUES ($1, datetime('now'))",
        [def.id]
      );
      newlyUnlocked.push({
        ...def,
        unlockedAt: new Date().toISOString(),
        currentValue: value,
      });
    }
  }

  return newlyUnlocked;
}

/** Compute current progress for a specific achievement */
async function computeProgress(
  d: any,
  def: AchievementDef,
  sessionStats?: { total: number; correct: number }
): Promise<number> {
  switch (def.id) {
    // Streak
    case 'streak_7':
    case 'streak_30':
    case 'streak_100': {
      const streak = parseInt(await getProfile('streak') || '0');
      return streak;
    }

    // Exercise milestones
    case 'exercises_10':
    case 'exercises_100':
    case 'exercises_500':
    case 'exercises_1000': {
      const rows: { count: number }[] = await d.select('SELECT COUNT(*) as count FROM attempts');
      return rows[0]?.count ?? 0;
    }

    // Perfect session (binary — check current session)
    case 'perfect_session': {
      if (sessionStats && sessionStats.total >= 10 && sessionStats.correct === sessionStats.total) {
        return 1;
      }
      return 0;
    }

    // Strong week (days with 80%+ accuracy in last 7 days)
    case 'strong_week': {
      const rows: { day_acc: number }[] = await d.select(`
        SELECT AVG(is_correct) as day_acc
        FROM attempts
        WHERE timestamp >= date('now', '-7 days')
        GROUP BY date(timestamp)
        HAVING COUNT(*) >= 3
      `);
      return rows.filter(r => r.day_acc >= 0.8).length;
    }

    // Max precision (correct out of last 100)
    case 'max_precision': {
      const rows: { correct: number }[] = await d.select(
        'SELECT SUM(is_correct) as correct FROM (SELECT is_correct FROM attempts ORDER BY timestamp DESC LIMIT 100)'
      );
      return rows[0]?.correct ?? 0;
    }

    // CEFR A2 complete (all A2 exercises seen)
    case 'cefr_a2_complete': {
      const totalA2 = SEED_EXERCISES.filter(e => e.cefr_level === 'A2').length;
      const rows: { seen: number }[] = await d.select(
        `SELECT COUNT(DISTINCT exercise_id) as seen FROM attempts WHERE exercise_id IN (${
          SEED_EXERCISES.filter(e => e.cefr_level === 'A2').map(e => e.id).join(',')
        })`
      );
      return (rows[0]?.seen ?? 0) >= totalA2 ? 1 : 0;
    }

    // CEFR level reached
    case 'cefr_b1': {
      const level = await getProfile('current_level');
      return ['B1', 'B2', 'C1'].includes(level || '') ? 1 : 0;
    }
    case 'cefr_b2': {
      const level = await getProfile('current_level');
      return ['B2', 'C1'].includes(level || '') ? 1 : 0;
    }

    // Special: first writing
    case 'first_writing': {
      // Check if profile has a flag or if sessions table has writing sessions
      const flag = await getProfile('has_completed_writing');
      return flag === 'true' ? 1 : 0;
    }

    // Special: first conversation
    case 'first_conversation': {
      const flag = await getProfile('has_completed_conversation');
      return flag === 'true' ? 1 : 0;
    }

    // Special: false friends mastery
    case 'false_friends': {
      const fcExercises = SEED_EXERCISES.filter(e => e.topic === 'false_cognates');
      if (fcExercises.length === 0) return 0;
      const ids = fcExercises.map(e => e.id).join(',');
      const rows: { total: number; correct: number }[] = await d.select(
        `SELECT COUNT(*) as total, SUM(is_correct) as correct FROM attempts WHERE exercise_id IN (${ids})`
      );
      const total = rows[0]?.total ?? 0;
      const correct = rows[0]?.correct ?? 0;
      return total >= 20 && correct / total >= 0.9 ? 1 : 0;
    }

    default:
      return 0;
  }
}
