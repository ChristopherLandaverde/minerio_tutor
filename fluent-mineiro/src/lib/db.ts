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
  return result.lastInsertId ?? 0;
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

export async function getDueReviewIds(): Promise<number[]> {
  const d = await getDb();
  const rows: { exercise_id: number }[] = await d.select(
    "SELECT exercise_id FROM srs_state WHERE next_review <= date('now') ORDER BY next_review ASC"
  );
  return rows.map(r => r.exercise_id);
}

export async function updateStreak(): Promise<number> {
  const d = await getDb();
  // Check if there's already a session today
  const todaySessions: { count: number }[] = await d.select(
    "SELECT COUNT(*) as count FROM sessions WHERE date(start_time) = date('now') AND end_time IS NOT NULL"
  );
  if (todaySessions[0]?.count > 1) {
    // Already practiced today — streak already counted
    return parseInt(await getProfile('streak') || '0');
  }
  // Check if yesterday had a completed session
  const yesterdaySessions: { count: number }[] = await d.select(
    "SELECT COUNT(*) as count FROM sessions WHERE date(start_time) = date('now', '-1 day') AND end_time IS NOT NULL"
  );
  const currentStreak = parseInt(await getProfile('streak') || '0');
  let newStreak: number;
  if (yesterdaySessions[0]?.count > 0) {
    newStreak = currentStreak + 1;
  } else {
    // Streak broken — restart at 1
    newStreak = 1;
  }
  await setProfile('streak', String(newStreak));
  return newStreak;
}

// Progress stats
export async function getTopicStats(topicMap: Map<number, string>): Promise<{ topic: string; total: number; correct: number }[]> {
  const d = await getDb();
  const rows: { exercise_id: number; is_correct: number }[] = await d.select(
    'SELECT exercise_id, is_correct FROM attempts'
  );
  const stats = new Map<string, { total: number; correct: number }>();
  for (const row of rows) {
    const topic = topicMap.get(row.exercise_id) || 'other';
    const entry = stats.get(topic) || { total: 0, correct: 0 };
    entry.total++;
    entry.correct += row.is_correct;
    stats.set(topic, entry);
  }
  return Array.from(stats.entries()).map(([topic, s]) => ({ topic, total: s.total, correct: s.correct }));
}

export async function getMistakePatterns(): Promise<{ mistake_type: string; count: number }[]> {
  const d = await getDb();
  return await d.select(
    "SELECT mistake_type, COUNT(*) as count FROM attempts WHERE mistake_type IS NOT NULL AND is_correct = 0 GROUP BY mistake_type ORDER BY count DESC LIMIT 10"
  );
}

export async function getSessionHistory(): Promise<{ date: string; exercises: number; correct: number; xp: number }[]> {
  const d = await getDb();
  return await d.select(
    "SELECT date(start_time) as date, SUM(exercises_completed) as exercises, SUM(correct_count) as correct, SUM(xp_earned) as xp FROM sessions WHERE end_time IS NOT NULL GROUP BY date(start_time) ORDER BY date DESC LIMIT 14"
  );
}

export async function getTotalAttempts(): Promise<{ total: number; correct: number; exerciseCount: number }> {
  const d = await getDb();
  const rows: any[] = await d.select(
    "SELECT COUNT(*) as total, SUM(is_correct) as correct, COUNT(DISTINCT exercise_id) as exerciseCount FROM attempts"
  );
  return {
    total: rows[0]?.total ?? 0,
    correct: rows[0]?.correct ?? 0,
    exerciseCount: rows[0]?.exerciseCount ?? 0,
  };
}

export async function getStreakCalendar(days: number = 90): Promise<{ date: string; count: number }[]> {
  const d = await getDb();
  return await d.select(
    `SELECT date(timestamp) as date, COUNT(*) as count FROM attempts
     WHERE timestamp >= date('now', '-' || $1 || ' days')
     GROUP BY date(timestamp) ORDER BY date ASC`,
    [days]
  );
}

export async function getTodayStats(): Promise<{ total: number; correct: number }> {
  const d = await getDb();
  const rows: any[] = await d.select(
    "SELECT COUNT(*) as total, SUM(is_correct) as correct FROM attempts WHERE date(timestamp) = date('now')"
  );
  return { total: rows[0]?.total ?? 0, correct: rows[0]?.correct ?? 0 };
}

// City visit helpers
export async function incrementCityVisit(cityId: string): Promise<{ visitCount: number; xpAwarded: boolean }> {
  const d = await getDb();
  // Upsert visit count
  await d.execute(
    `INSERT INTO city_visits (city_id, visit_count, last_visit)
     VALUES ($1, 1, datetime('now'))
     ON CONFLICT(city_id) DO UPDATE SET
       visit_count = visit_count + 1,
       last_visit = datetime('now')`,
    [cityId]
  );
  // Check if XP already awarded today for this city
  const rows: { last_visit: string; visit_count: number }[] = await d.select(
    'SELECT last_visit, visit_count FROM city_visits WHERE city_id = $1',
    [cityId]
  );
  const visitCount = rows[0]?.visit_count || 1;
  // Award 2 XP if first visit of the day (simple: check if visit_count just changed)
  // We'll award XP conservatively — only on first open per session
  const xpAwarded = visitCount <= 1; // First ever visit gets XP
  if (xpAwarded) {
    const currentXp = parseInt(await getProfile('total_xp') || '0');
    await setProfile('total_xp', String(currentXp + 2));
  }
  return { visitCount, xpAwarded };
}

export async function getCityVisitCounts(): Promise<Map<string, number>> {
  const d = await getDb();
  const map = new Map<string, number>();
  try {
    const rows: { city_id: string; visit_count: number }[] = await d.select(
      'SELECT city_id, visit_count FROM city_visits'
    );
    for (const r of rows) {
      map.set(r.city_id, r.visit_count);
    }
  } catch {
    // Table might not exist yet
  }
  return map;
}
