/**
 * Claude API client for conversation practice.
 * Uses Tauri HTTP plugin to bypass CORS.
 * API key stored in local SQLite profile table.
 */

import { fetch } from '@tauri-apps/plugin-http';
import { getProfile, setProfile } from './db';
import { getRandomFallback } from './coaching-fallbacks';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001'; // Fast + cheap for conversation practice

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a Mineiro Portuguese conversation partner. Chris speaks English/Spanish and is learning Brazilian Portuguese (Minas Gerais dialect).

CRITICAL — CHAT STYLE:
- Reply in 1-2 SHORT sentences max. This is texting, not an essay.
- Ask only ONE question per message. Never multiple questions.
- Never list things. Never use bullet points. Never lecture.
- Match the energy of what Chris said. "Hi" gets a short "hi" back, not 5 questions.

LANGUAGE:
- Speak in Portuguese (Mineiro style) with English in parentheses only when needed
- Use Mineiro naturally: uai, trem, cê, bão, sô, nó!, dropped gerund d (falano not falando)
- If Chris makes a mistake, correct it casually inline — one correction max per message
- If Chris writes in English, reply in simple Portuguese and nudge him to try
- Flag Spanish interference briefly when you notice it

PERSONALITY:
- Like a friend texting from a boteco in BH — casual, warm, brief
- Adapt to Chris's level naturally
- Use emojis freely! 😄🔥👏🇧🇷☕ Like real Brazilian texting — expressive and fun
- React with emojis to show excitement, encouragement, or humor
- Brazilian texting style: "kkk" for laughing, "rs" for haha, emojis after most messages`;

export async function getApiKey(): Promise<string | null> {
  try {
    return await getProfile('api_key');
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  await setProfile('api_key', key);
}

export async function sendMessage(
  messages: ChatMessage[],
  apiKey: string
): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || 'Desculpa, não entendi. Pode repetir?';
}

/**
 * Analyze pronunciation by comparing expected text with STT transcription.
 * Returns structured feedback on specific sounds and Mineiro features.
 */
export async function analyzePronunciation(
  expected: string,
  transcribed: string,
  apiKey: string
): Promise<{ score: number; feedback: string; tips: string[] }> {
  const prompt = `You are a Mineiro Portuguese pronunciation coach. Compare what the student SHOULD have said vs what speech recognition heard them say.

Expected: "${expected}"
Heard: "${transcribed}"

Respond in this exact JSON format (no markdown, no code fences):
{"score":N,"feedback":"one sentence in Portuguese about their pronunciation","tips":["tip1","tip2"]}

Score 1-5: 5=perfect match, 4=minor differences, 3=understandable but noticeable errors, 2=significant errors, 1=very different.
Feedback: Be encouraging, in Portuguese. Reference specific words they got right or wrong.
Tips: 1-2 short tips about specific Mineiro sounds (nasal vowels, lh→i, dropped d in gerunds, ão vs am). If score is 5, give one tip to sound even more Mineiro.`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);

  const data = await response.json();
  const text = data.content[0]?.text || '';

  try {
    const parsed = JSON.parse(text);
    return {
      score: Math.min(5, Math.max(1, parsed.score || 3)),
      feedback: parsed.feedback || 'Boa tentativa!',
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 2) : [],
    };
  } catch {
    return { score: 3, feedback: 'Boa tentativa! Continue praticando.', tips: [] };
  }
}

/**
 * Generate a personalized coaching note for today's session.
 * Cache-first: checks profile for today's cached note before calling API.
 * Falls back to predefined messages on failure or missing API key.
 */
export async function generateCoachingNote(context: {
  mistakePatterns: string[];
  currentLevel: string;
  streak: number;
  todayTopics: string[];
}): Promise<string> {
  // Check cache first
  try {
    const cached = await getProfile('coaching_note');
    if (cached) {
      const parsed = JSON.parse(cached);
      const today = new Date().toISOString().split('T')[0];
      if (parsed.date === today && parsed.note) {
        return parsed.note;
      }
    }
  } catch {
    // Cache miss or parse error — continue
  }

  // Try API
  const apiKey = await getApiKey();
  if (!apiKey) return getRandomFallback();

  try {
    const prompt = `Generate a 2-3 sentence coaching note for a Portuguese language learner. Write in Portuguese (Mineiro dialect) with English in parentheses for grammar terms.

Context:
- CEFR Level: ${context.currentLevel}
- Streak: ${context.streak} days
- Today's focus topics: ${context.todayTopics.join(', ') || 'mixed review'}
- Recent mistake patterns: ${context.mistakePatterns.join(', ') || 'none yet'}

Be warm, encouraging, and specific. Use Mineiro features (uai, cê, bão, sô). Reference the topics or mistakes specifically. Never guilt-trip about missed days.`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const note = data.content[0]?.text || getRandomFallback();

    // Cache for today
    const today = new Date().toISOString().split('T')[0];
    await setProfile('coaching_note', JSON.stringify({ date: today, note }));

    return note;
  } catch {
    return getRandomFallback();
  }
}
