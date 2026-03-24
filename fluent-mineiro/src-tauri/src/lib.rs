use tauri_plugin_sql::{Migration, MigrationKind};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};

// Global recording state
static RECORDING: AtomicBool = AtomicBool::new(false);
static AUDIO_DATA: once_cell::sync::Lazy<Arc<Mutex<Vec<f32>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(Vec::new())));
static SAMPLE_RATE: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(44100);

#[tauri::command]
fn start_recording() -> Result<String, String> {
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

    if RECORDING.load(Ordering::SeqCst) {
        return Err("Already recording".into());
    }

    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or("No microphone found.")?;
    let config = device.default_input_config()
        .map_err(|e| format!("Mic config error: {}", e))?;

    let channels = config.channels() as usize;
    let sample_rate = config.sample_rate().0;
    let sample_format = config.sample_format();

    AUDIO_DATA.lock().unwrap().clear();
    SAMPLE_RATE.store(sample_rate, Ordering::SeqCst);
    // Set RECORDING true BEFORE spawning thread to avoid race
    RECORDING.store(true, Ordering::SeqCst);

    let (tx, rx) = std::sync::mpsc::channel();
    let data = AUDIO_DATA.clone();
    let format_name = format!("{:?}", sample_format);

    std::thread::spawn(move || {
        use cpal::SampleFormat;

        // Build stream matching the device's native sample format
        let stream = match sample_format {
            SampleFormat::I16 => device.build_input_stream(
                &config.into(),
                move |samples: &[i16], _: &cpal::InputCallbackInfo| {
                    if !RECORDING.load(Ordering::SeqCst) { return; }
                    let mut buf = data.lock().unwrap();
                    for chunk in samples.chunks(channels.max(1)) {
                        let mono: f32 = chunk.iter().map(|&s| s as f32 / 32768.0).sum::<f32>() / channels as f32;
                        buf.push(mono);
                    }
                },
                |err| eprintln!("Audio input error: {}", err),
                None,
            ),
            SampleFormat::I32 => device.build_input_stream(
                &config.into(),
                move |samples: &[i32], _: &cpal::InputCallbackInfo| {
                    if !RECORDING.load(Ordering::SeqCst) { return; }
                    let mut buf = data.lock().unwrap();
                    for chunk in samples.chunks(channels.max(1)) {
                        let mono: f32 = chunk.iter().map(|&s| s as f32 / 2147483648.0).sum::<f32>() / channels as f32;
                        buf.push(mono);
                    }
                },
                |err| eprintln!("Audio input error: {}", err),
                None,
            ),
            _ => device.build_input_stream(
                &config.into(),
                move |samples: &[f32], _: &cpal::InputCallbackInfo| {
                    if !RECORDING.load(Ordering::SeqCst) { return; }
                    let mut buf = data.lock().unwrap();
                    if channels == 1 {
                        buf.extend_from_slice(samples);
                    } else {
                        for chunk in samples.chunks(channels.max(1)) {
                            let mono: f32 = chunk.iter().sum::<f32>() / channels as f32;
                            buf.push(mono);
                        }
                    }
                },
                |err| eprintln!("Audio input error: {}", err),
                None,
            ),
        };

        match stream {
            Ok(s) => {
                let _ = s.play();
                let _ = tx.send(Ok(()));
                // Pump the CoreAudio run loop so audio callbacks fire on this thread
                extern "C" {
                    static kCFRunLoopDefaultMode: *const std::ffi::c_void;
                    fn CFRunLoopRunInMode(mode: *const std::ffi::c_void, seconds: f64, returnAfterSourceHandled: u8) -> i32;
                }
                while RECORDING.load(Ordering::SeqCst) {
                    unsafe { CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.05, 0); }
                }
                // Stream drops here
            }
            Err(e) => {
                let _ = tx.send(Err(format!("Stream error: {}", e)));
            }
        }
    });

    // Wait for confirmation that stream is running (up to 2s)
    match rx.recv_timeout(std::time::Duration::from_secs(2)) {
        Ok(Ok(())) => Ok(format!("Recording at {}Hz, {}ch, fmt={}", sample_rate, channels, format_name)),
        Ok(Err(e)) => {
            RECORDING.store(false, Ordering::SeqCst);
            Err(e)
        }
        Err(_) => {
            RECORDING.store(false, Ordering::SeqCst);
            Err("Mic timeout — no audio stream started".into())
        }
    }
}

#[tauri::command]
async fn stop_recording(api_key: String) -> Result<String, String> {
    RECORDING.store(false, Ordering::SeqCst);
    std::thread::sleep(std::time::Duration::from_millis(100));

    let samples = AUDIO_DATA.lock().unwrap().clone();
    let rate = SAMPLE_RATE.load(Ordering::SeqCst);
    if samples.is_empty() {
        return Err("No audio data captured".into());
    }

    // Encode as WAV
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: rate,
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
    let wav_bytes = buf.into_inner();

    // Send to ElevenLabs STT directly from Rust (bypasses WebView FormData issues)
    let client = reqwest::Client::new();
    let part = reqwest::multipart::Part::bytes(wav_bytes)
        .file_name("recording.wav")
        .mime_str("audio/wav")
        .map_err(|e| format!("MIME error: {}", e))?;

    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("model_id", "scribe_v2")
        .text("language_code", "por");

    let resp = client
        .post("https://api.elevenlabs.io/v1/speech-to-text")
        .header("xi-api-key", &api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("STT request error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("STT error {}: {}", status, body));
    }

    let body = resp.text().await.map_err(|e| format!("STT read error: {}", e))?;
    let data: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("STT JSON error: {} body: {}", e, &body[..200.min(body.len())]))?;

    let text = data["text"].as_str().unwrap_or("").to_string();

    // Debug: include sample stats
    let max_amp = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    let non_zero = samples.iter().filter(|s| s.abs() > 0.001).count();
    if text.is_empty() {
        Ok(format!("[DEBUG: {}samples, max_amp={:.4}, non_zero={}, rate={}] {}",
            samples.len(), max_amp, non_zero, rate, text))
    } else {
        Ok(text)
    }
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
