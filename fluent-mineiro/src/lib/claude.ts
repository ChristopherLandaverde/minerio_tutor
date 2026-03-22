/**
 * Claude API client for conversation practice.
 * Uses Tauri HTTP plugin to bypass CORS.
 * API key stored in local SQLite profile table.
 */

import { fetch } from '@tauri-apps/plugin-http';
import { getProfile, setProfile } from './db';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001'; // Fast + cheap for conversation practice

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a friendly Mineiro Portuguese conversation partner for Chris, an English/Spanish speaker learning Brazilian Portuguese with a focus on the Minas Gerais dialect.

RULES:
- Speak primarily in Portuguese (Mineiro style), with English translations in parentheses when Chris might not understand
- Use Mineiro features naturally: uai, trem, cê, bão, sô, nó!, dropped gerund d (falano instead of falando)
- Keep responses short (2-4 sentences) — this is a conversation, not a lecture
- When Chris makes a mistake, gently correct it inline: "Ah, cê quis dizer 'estou' né? (you meant 'estou' — temporary state uses ESTAR)"
- Adapt to Chris's level — if he struggles, simplify. If he's doing well, challenge more
- Suggest topics naturally: daily life, food, travel in Minas, culture, work
- Be warm, encouraging, and patient — like a friend at a boteco in BH
- If Chris writes in English, respond in Portuguese but simpler, and encourage him to try in Portuguese
- Flag Spanish interference when you notice it: "Cuidado! Em português dizemos X, não Y como em espanhol"

START the conversation if there are no messages yet. Greet Chris warmly in Mineiro style.`;

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
