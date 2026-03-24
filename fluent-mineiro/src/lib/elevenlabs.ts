/**
 * ElevenLabs API client for voice features.
 * TTS: Convert text to speech (Brazilian Portuguese voice)
 * STT: Transcribe recorded audio to text
 */

import { fetch } from '@tauri-apps/plugin-http';
import { getProfile, setProfile } from './db';

const TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const VOICES_URL = 'https://api.elevenlabs.io/v1/voices';

// Default to a good multilingual model
const TTS_MODEL = 'eleven_multilingual_v2';
const STT_MODEL = 'scribe_v2';

// In-memory TTS cache: avoids re-synthesizing the same text within a session.
// Key = "voiceId:text", Value = audio Blob.
// SRS reviews repeat sentences — this prevents duplicate API calls.
const ttsCache = new Map<string, Blob>();
const MAX_CACHE_ENTRIES = 200;

function ttsCacheKey(text: string, voiceId: string): string {
  return `${voiceId}:${text}`;
}

/** Track characters sent to ElevenLabs TTS for cost monitoring */
async function trackTtsUsage(charCount: number): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const monthKey = today.slice(0, 7); // YYYY-MM
    const dailyRaw = await getProfile(`tts_chars_${today}`);
    const monthlyRaw = await getProfile(`tts_chars_${monthKey}`);
    await setProfile(`tts_chars_${today}`, String((parseInt(dailyRaw || '0') || 0) + charCount));
    await setProfile(`tts_chars_${monthKey}`, String((parseInt(monthlyRaw || '0') || 0) + charCount));
  } catch {}
}

/** Get TTS usage stats */
export async function getTtsUsage(): Promise<{ today: number; month: number }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthKey = today.slice(0, 7);
    const dailyRaw = await getProfile(`tts_chars_${today}`);
    const monthlyRaw = await getProfile(`tts_chars_${monthKey}`);
    return {
      today: parseInt(dailyRaw || '0') || 0,
      month: parseInt(monthlyRaw || '0') || 0,
    };
  } catch {
    return { today: 0, month: 0 };
  }
}

/** Get TTS cache stats */
export function getTtsCacheStats(): { entries: number; maxEntries: number } {
  return { entries: ttsCache.size, maxEntries: MAX_CACHE_ENTRIES };
}

export async function getElevenLabsKey(): Promise<string | null> {
  try {
    return await getProfile('elevenlabs_key');
  } catch {
    return null;
  }
}

export async function setElevenLabsKey(key: string): Promise<void> {
  await setProfile('elevenlabs_key', key);
}

/** Get available voices, filtered to Portuguese-compatible ones */
export async function getVoices(apiKey: string): Promise<{ voice_id: string; name: string }[]> {
  const response = await fetch(VOICES_URL, {
    method: 'GET',
    headers: { 'xi-api-key': apiKey },
  });
  if (!response.ok) throw new Error('Failed to fetch voices');
  const data = await response.json();
  return data.voices?.map((v: any) => ({ voice_id: v.voice_id, name: v.name })) || [];
}

/** Get the saved voice ID, or return a default */
export async function getSelectedVoice(): Promise<string> {
  const saved = await getProfile('elevenlabs_voice_id');
  // Default: "Rachel" — a good multilingual voice. User can change in settings.
  return saved || 'EXAVITQu4vr4xnSDxMaL';
}

export async function setSelectedVoice(voiceId: string): Promise<void> {
  await setProfile('elevenlabs_voice_id', voiceId);
}

/**
 * Text-to-Speech: Convert text to audio.
 * Returns an audio Blob (mp3). Uses in-memory cache to avoid
 * re-synthesizing the same text within a session.
 */
export async function textToSpeech(
  text: string,
  apiKey: string,
  voiceId?: string
): Promise<Blob> {
  const voice = voiceId || await getSelectedVoice();
  const cacheKey = ttsCacheKey(text, voice);

  // Return cached audio if available
  const cached = ttsCache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${TTS_URL}/${voice}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TTS error ${response.status}: ${err}`);
  }

  const blob = await response.blob();

  // Cache the result (evict oldest if full)
  if (ttsCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = ttsCache.keys().next().value;
    if (firstKey) ttsCache.delete(firstKey);
  }
  ttsCache.set(cacheKey, blob);

  // Track usage for cost monitoring
  trackTtsUsage(text.length);

  return blob;
}

/**
 * Speech-to-Text: Transcribe audio to text.
 * Accepts a Blob of audio data.
 * Returns the transcribed text.
 */
export async function speechToText(
  audioBlob: Blob,
  apiKey: string
): Promise<string> {
  const formData = new FormData();
  const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
  formData.append('file', audioBlob, `recording.${ext}`);
  formData.append('model_id', STT_MODEL);
  formData.append('language_code', 'por'); // Portuguese

  const response = await fetch(`${STT_URL}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`STT error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.text || '';
}

/** Play audio blob through the browser */
export function playAudio(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback failed'));
    };
    audio.play();
  });
}

/**
 * Record audio from the microphone.
 * Returns a promise that resolves with the audio Blob when recording stops.
 */
export function startRecording(): {
  stop: () => void;
  promise: Promise<Blob>;
} {
  let mediaRecorder: MediaRecorder;
  let resolve: (blob: Blob) => void;
  let reject: (err: Error) => void;

  const promise = new Promise<Blob>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const chunks: Blob[] = [];
      // Use mp4 on Safari/WKWebView, webm elsewhere
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };

      mediaRecorder.onerror = () => {
        stream.getTracks().forEach(t => t.stop());
        reject(new Error('Recording failed'));
      };

      mediaRecorder.start();
    })
    .catch(err => reject(err));

  return {
    stop: () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    },
    promise,
  };
}
