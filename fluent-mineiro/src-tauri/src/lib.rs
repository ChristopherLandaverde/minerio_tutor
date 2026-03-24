use tauri_plugin_sql::{Migration, MigrationKind};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};

// Global recording state
static RECORDING: AtomicBool = AtomicBool::new(false);
static AUDIO_DATA: once_cell::sync::Lazy<Arc<Mutex<Vec<f32>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(Vec::new())));

#[tauri::command]
fn start_recording() -> Result<String, String> {
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

    if RECORDING.load(Ordering::SeqCst) {
        return Err("Already recording".into());
    }

    // Verify mic access synchronously before spawning the thread
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or("No microphone found. Check System Settings > Privacy > Microphone.")?;
    let config = device.default_input_config()
        .map_err(|e| format!("Mic config error: {}. Check microphone permissions.", e))?;

    let channels = config.channels() as usize;
    let sample_rate = config.sample_rate().0;

    // Test that we can actually open a stream (catches permission denied)
    let test_stream = device.build_input_stream(
        &config.clone().into(),
        |_: &[f32], _: &cpal::InputCallbackInfo| {},
        |_| {},
        None,
    ).map_err(|e| format!("Cannot access microphone: {}. Grant mic permission in System Settings.", e))?;
    test_stream.play().map_err(|e| format!("Cannot start mic: {}", e))?;
    drop(test_stream);

    // Mic works — start real recording
    AUDIO_DATA.lock().unwrap().clear();
    RECORDING.store(true, Ordering::SeqCst);

    let data = AUDIO_DATA.clone();

    std::thread::spawn(move || {
        let stream = device
            .build_input_stream(
                &config.into(),
                move |samples: &[f32], _: &cpal::InputCallbackInfo| {
                    if !RECORDING.load(Ordering::SeqCst) {
                        return;
                    }
                    let mut buf = data.lock().unwrap();
                    if channels == 1 {
                        buf.extend_from_slice(samples);
                    } else {
                        for chunk in samples.chunks(channels) {
                            let mono: f32 = chunk.iter().sum::<f32>() / channels as f32;
                            buf.push(mono);
                        }
                    }
                },
                |err| eprintln!("Audio input error: {}", err),
                None,
            )
            .ok();

        if let Some(s) = &stream {
            let _ = s.play();
            while RECORDING.load(Ordering::SeqCst) {
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
        }
    });

    Ok(format!("Recording at {}Hz, {} channels", sample_rate, channels))
}

#[tauri::command]
fn stop_recording() -> Result<Vec<u8>, String> {
    RECORDING.store(false, Ordering::SeqCst);

    // Give the recording thread time to finish
    std::thread::sleep(std::time::Duration::from_millis(100));

    let samples = AUDIO_DATA.lock().unwrap().clone();
    if samples.is_empty() {
        return Err("No audio data captured".into());
    }

    // Encode as WAV
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 44100,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut buf = std::io::Cursor::new(Vec::new());
    {
        let mut writer = hound::WavWriter::new(&mut buf, spec)
            .map_err(|e| format!("WAV encode error: {}", e))?;
        for &sample in &samples {
            let s16 = (sample * 32767.0).clamp(-32768.0, 32767.0) as i16;
            writer.write_sample(s16).map_err(|e| format!("WAV write error: {}", e))?;
        }
        writer.finalize().map_err(|e| format!("WAV finalize error: {}", e))?;
    }

    Ok(buf.into_inner())
}

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
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:user.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![start_recording, stop_recording])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
