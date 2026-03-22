use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_user_tables",
            sql: "
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

                -- Seed profile defaults
                INSERT OR IGNORE INTO profile (key, value) VALUES ('streak', '0');
                INSERT OR IGNORE INTO profile (key, value) VALUES ('total_xp', '0');
                INSERT OR IGNORE INTO profile (key, value) VALUES ('current_level', 'A2');
                INSERT OR IGNORE INTO profile (key, value) VALUES ('daily_goal', '15');
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:user.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
