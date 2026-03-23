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
 * Returns an audio Blob (mp3).
 */
export async function textToSpeech(
  text: string,
  apiKey: string,
  voiceId?: string
): Promise<Blob> {
  const voice = voiceId || await getSelectedVoice();

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

  return await response.blob();
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
  formData.append('file', audioBlob, 'recording.webm');
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
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
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
