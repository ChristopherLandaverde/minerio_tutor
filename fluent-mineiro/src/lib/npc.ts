/**
 * NPC conversation system.
 * Handles persistence and Claude API calls for city NPCs.
 * Same API pattern as claude.ts.
 */

import { fetch } from '@tauri-apps/plugin-http';
import { getDb } from './db';
import { getApiKey, type ChatMessage } from './claude';
import type { NpcDef } from './cities';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_HISTORY = 20;

/** Load conversation history for an NPC */
export async function loadNpcConversation(npcId: string): Promise<ChatMessage[]> {
  try {
    const db = await getDb();
    const rows: { messages: string }[] = await db.select(
      'SELECT messages FROM npc_conversations WHERE npc_id = $1',
      [npcId]
    );
    if (rows.length > 0 && rows[0].messages) {
      const parsed = JSON.parse(rows[0].messages);
      return parsed.map((m: any) => ({ role: m.role, content: m.content }));
    }
  } catch {
    // DB not ready or parse error
  }
  return [];
}

/** Save conversation history for an NPC (upsert, cap at MAX_HISTORY messages) */
export async function saveNpcConversation(
  npcId: string,
  cityId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    const db = await getDb();
    // Cap history
    const trimmed = messages.slice(-MAX_HISTORY);
    const json = JSON.stringify(
      trimmed.map(m => ({ role: m.role, content: m.content, timestamp: new Date().toISOString() }))
    );

    await db.execute(
      `INSERT INTO npc_conversations (npc_id, city_id, messages, last_interaction)
       VALUES ($1, $2, $3, datetime('now'))
       ON CONFLICT(npc_id) DO UPDATE SET
         messages = $3,
         last_interaction = datetime('now')`,
      [npcId, cityId, json]
    );
  } catch {
    // Fail silently — conversation still works in-memory
  }
}

/** Send a message to an NPC via Claude API. Falls back to canned greeting on failure. */
export async function sendNpcMessage(
  npc: NpcDef,
  history: ChatMessage[],
  userInput: string
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) return npc.greeting;

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userInput },
  ];

  try {
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
        system: npc.systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text || 'Desculpa, não entendi. Pode repetir?';
  } catch {
    return npc.greeting;
  }
}

/** Reset conversation history for an NPC */
export async function resetNpcConversation(npcId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.execute('DELETE FROM npc_conversations WHERE npc_id = $1', [npcId]);
  } catch {
    // Fail silently
  }
}
