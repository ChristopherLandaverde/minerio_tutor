import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:user.db');
  }
  return db;
}

// Profile helpers
export async function getProfile(key: string): Promise<string | null> {
  const d = await getDb();
  const rows: { value: string }[] = await d.select('SELECT value FROM profile WHERE key = $1', [key]);
  return rows.length > 0 ? rows[0].value : null;
}

export async function setProfile(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO profile (key, value, updated_at) VALUES ($1, $2, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = datetime('now')",
    [key, value]
  );
}

// Attempts
export async function recordAttempt(
  exerciseId: number,
  userAnswer: string,
  isCorrect: boolean,
  quality: number,
  responseTimeMs: number | null,
  mistakeType: string | null
): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO attempts (exercise_id, user_answer, is_correct, quality, response_time_ms, mistake_type) VALUES ($1, $2, $3, $4, $5, $6)",
    [exerciseId, userAnswer, isCorrect ? 1 : 0, quality, responseTimeMs, mistakeType]
  );
}

// SRS state
export async function getSrsState(exerciseId: number): Promise<{
  easiness_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
} | null> {
  const d = await getDb();
  const rows: any[] = await d.select('SELECT * FROM srs_state WHERE exercise_id = $1', [exerciseId]);
  return rows.length > 0 ? rows[0] : null;
}

export async function upsertSrsState(
  exerciseId: number,
  ef: number,
  interval: number,
  reps: number,
  nextReview: string
): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO srs_state (exercise_id, easiness_factor, interval_days, repetitions, next_review, last_review) VALUES ($1, $2, $3, $4, $5, date('now')) ON CONFLICT(exercise_id) DO UPDATE SET easiness_factor = $2, interval_days = $3, repetitions = $4, next_review = $5, last_review = date('now')",
    [exerciseId, ef, interval, reps, nextReview]
  );
}

// Sessions
export async function startSession(): Promise<number> {
  const d = await getDb();
  const result = await d.execute("INSERT INTO sessions (start_time) VALUES (datetime('now'))");
  return result.lastInsertId;
}

export async function endSession(sessionId: number, exercisesCompleted: number, correctCount: number, xpEarned: number): Promise<void> {
  const d = await getDb();
  await d.execute(
    "UPDATE sessions SET end_time = datetime('now'), exercises_completed = $1, correct_count = $2, xp_earned = $3 WHERE id = $4",
    [exercisesCompleted, correctCount, xpEarned, sessionId]
  );
}

// Stats
export async function getRecentAttempts(limit: number): Promise<{ is_correct: number; exercise_id: number }[]> {
  const d = await getDb();
  return await d.select('SELECT is_correct, exercise_id FROM attempts ORDER BY timestamp DESC LIMIT $1', [limit]);
}

export async function getDueReviewCount(): Promise<number> {
  const d = await getDb();
  const rows: { count: number }[] = await d.select("SELECT COUNT(*) as count FROM srs_state WHERE next_review <= date('now')");
  return rows[0]?.count ?? 0;
}

export async function getTodayStats(): Promise<{ total: number; correct: number }> {
  const d = await getDb();
  const rows: any[] = await d.select(
    "SELECT COUNT(*) as total, SUM(is_correct) as correct FROM attempts WHERE date(timestamp) = date('now')"
  );
  return { total: rows[0]?.total ?? 0, correct: rows[0]?.correct ?? 0 };
}
