// Browser-side database: SQLite compiled to WebAssembly (sql.js), persisted to
// IndexedDB. This mirrors the subset of the @tauri-apps/plugin-sql `Database`
// API the app uses (`select` + `execute`) so db.ts can stay identical across
// the desktop (Tauri) and PWA (browser) builds.
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

// Same schema the Tauri build applies via src-tauri/src/lib.rs migrations.
// Every statement is idempotent (IF NOT EXISTS / OR IGNORE), so it is safe to
// run on every load — that's also how new migrations roll out to existing DBs.
const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    user_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    quality INTEGER NOT NULL,
    response_time_ms INTEGER,
    mistake_type TEXT
);
CREATE TABLE IF NOT EXISTS srs_state (
    exercise_id INTEGER PRIMARY KEY,
    easiness_factor REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 1,
    repetitions INTEGER NOT NULL DEFAULT 0,
    next_review TEXT NOT NULL DEFAULT (date('now')),
    last_review TEXT
);
CREATE TABLE IF NOT EXISTS profile (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT NOT NULL DEFAULT (datetime('now')),
    end_time TEXT,
    exercises_completed INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    focus_skills TEXT
);
CREATE INDEX IF NOT EXISTS idx_attempts_timestamp ON attempts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_srs_next_review ON srs_state(next_review);
INSERT OR IGNORE INTO profile (key, value) VALUES ('streak', '0');
INSERT OR IGNORE INTO profile (key, value) VALUES ('total_xp', '0');
INSERT OR IGNORE INTO profile (key, value) VALUES ('current_level', 'A2');
INSERT OR IGNORE INTO profile (key, value) VALUES ('daily_goal', '15');

CREATE TABLE IF NOT EXISTS achievement_unlocks (
    id TEXT PRIMARY KEY,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS weekly_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    challenge_type TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    target_topic TEXT,
    current_value INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 50
);
CREATE INDEX IF NOT EXISTS idx_challenges_week ON weekly_challenges(week_start);
CREATE INDEX IF NOT EXISTS idx_attempts_exercise ON attempts(exercise_id);

CREATE TABLE IF NOT EXISTS npc_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id TEXT NOT NULL UNIQUE,
    city_id TEXT NOT NULL,
    messages TEXT NOT NULL DEFAULT '[]',
    last_interaction TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_npc_conv_npc ON npc_conversations(npc_id);

CREATE TABLE IF NOT EXISTS npc_hearts (
    npc_id TEXT PRIMARY KEY,
    city_id TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    heart_level INTEGER NOT NULL DEFAULT 0,
    last_interaction TEXT
);
CREATE TABLE IF NOT EXISTS city_visits (
    city_id TEXT PRIMARY KEY,
    visit_count INTEGER NOT NULL DEFAULT 0,
    last_visit TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_npc_hearts_city ON npc_hearts(city_id);
`;

const IDB_NAME = 'sabia-sqlite';
const IDB_STORE = 'db';
const IDB_KEY = 'user.db';

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<Uint8Array | null> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(bytes: Uint8Array): Promise<void> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// plugin-sql uses $1, $2, … positional params; sql.js speaks named params.
// Rewrite to :vN and build a matching bind object (reused params stay in sync).
function toNamed(sql: string, params: unknown[]): { sql: string; binds: Record<string, unknown> } {
  const binds: Record<string, unknown> = {};
  params.forEach((v, i) => {
    binds[`:v${i + 1}`] = v ?? null;
  });
  const rewritten = sql.replace(/\$(\d+)/g, (_, n) => `:v${n}`);
  return { sql: rewritten, binds };
}

export interface BrowserDb {
  select<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number; lastInsertId: number }>;
}

let instance: BrowserDb | null = null;

export async function loadBrowserDb(): Promise<BrowserDb> {
  if (instance) return instance;

  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const existing = await idbGet();
  const sqlite: SqlJsDatabase = existing ? new SQL.Database(existing) : new SQL.Database();

  // Apply schema (idempotent). exec() runs multiple statements at once.
  sqlite.exec(MIGRATIONS);

  let persistQueued = false;
  const persist = async () => {
    // Coalesce bursts of writes into a single export/store.
    if (persistQueued) return;
    persistQueued = true;
    await Promise.resolve();
    persistQueued = false;
    await idbPut(sqlite.export());
  };
  // Persist the freshly-created/migrated DB once up front.
  await idbPut(sqlite.export());

  instance = {
    async select<T = unknown>(sql: string, params: unknown[] = []): Promise<T> {
      const { sql: q, binds } = toNamed(sql, params);
      const stmt = sqlite.prepare(q);
      try {
        stmt.bind(binds);
        const rows: unknown[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        return rows as T;
      } finally {
        stmt.free();
      }
    },
    async execute(sql: string, params: unknown[] = []) {
      const { sql: q, binds } = toNamed(sql, params);
      const stmt = sqlite.prepare(q);
      try {
        stmt.bind(binds);
        stmt.step();
      } finally {
        stmt.free();
      }
      const rowsAffected = sqlite.getRowsModified();
      const res = sqlite.exec('SELECT last_insert_rowid() AS id');
      const lastInsertId = Number(res[0]?.values?.[0]?.[0] ?? 0);
      await persist();
      return { rowsAffected, lastInsertId };
    },
  };
  return instance;
}
