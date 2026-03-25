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
        Migration {
            version: 2,
            description: "add_gamification_tables",
            sql: "
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
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_npc_conversations",
            sql: "
                CREATE TABLE IF NOT EXISTS npc_conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    npc_id TEXT NOT NULL UNIQUE,
                    city_id TEXT NOT NULL,
                    messages TEXT NOT NULL DEFAULT '[]',
                    last_interaction TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_npc_conv_npc ON npc_conversations(npc_id);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_npc_hearts_and_city_visits",
            sql: "
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
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:user.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
