/**
 * NPC conversation system.
 * Handles persistence and Claude API calls for city NPCs.
 * Same API pattern as claude.ts.
 */

import { fetch } from '@tauri-apps/plugin-http';
import { getDb } from './db';
import { getApiKey, type ChatMessage } from './claude';
import type { NpcDef } from './cities';
import { getSeasonalDialogueHint } from './seasons';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_HISTORY = 20;

// Heart level thresholds (message count → heart level)
const HEART_THRESHOLDS = [0, 1, 5, 15, 30, 50]; // 0-5 hearts

export interface HeartState {
  npcId: string;
  cityId: string;
  messageCount: number;
  heartLevel: number;
}

/** Compute heart level from message count */
function computeHeartLevel(messageCount: number): number {
  let level = 0;
  for (let i = HEART_THRESHOLDS.length - 1; i >= 0; i--) {
    if (messageCount >= HEART_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

/** Increment message count and update heart level for an NPC */
export async function incrementHeartProgress(npcId: string, cityId: string): Promise<HeartState> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO npc_hearts (npc_id, city_id, message_count, heart_level, last_interaction)
       VALUES ($1, $2, 1, 1, datetime('now'))
       ON CONFLICT(npc_id) DO UPDATE SET
         message_count = message_count + 1,
         last_interaction = datetime('now')`,
      [npcId, cityId]
    );
    // Recompute heart level
    const rows: { message_count: number }[] = await db.select(
      'SELECT message_count FROM npc_hearts WHERE npc_id = $1',
      [npcId]
    );
    const count = rows[0]?.message_count || 1;
    const level = computeHeartLevel(count);
    await db.execute(
      'UPDATE npc_hearts SET heart_level = $1 WHERE npc_id = $2',
      [level, npcId]
    );
    return { npcId, cityId, messageCount: count, heartLevel: level };
  } catch {
    return { npcId, cityId, messageCount: 0, heartLevel: 0 };
  }
}

/** Get heart state for a single NPC */
export async function getHeartLevel(npcId: string): Promise<HeartState | null> {
  try {
    const db = await getDb();
    const rows: { npc_id: string; city_id: string; message_count: number; heart_level: number }[] =
      await db.select('SELECT npc_id, city_id, message_count, heart_level FROM npc_hearts WHERE npc_id = $1', [npcId]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return { npcId: r.npc_id, cityId: r.city_id, messageCount: r.message_count, heartLevel: r.heart_level };
  } catch {
    return null;
  }
}

/** Get heart states for all NPCs */
export async function getAllHeartLevels(): Promise<Map<string, HeartState>> {
  const map = new Map<string, HeartState>();
  try {
    const db = await getDb();
    const rows: { npc_id: string; city_id: string; message_count: number; heart_level: number }[] =
      await db.select('SELECT npc_id, city_id, message_count, heart_level FROM npc_hearts');
    for (const r of rows) {
      map.set(r.npc_id, { npcId: r.npc_id, cityId: r.city_id, messageCount: r.message_count, heartLevel: r.heart_level });
    }
  } catch {
    // DB not ready
  }
  return map;
}

/** Next heart threshold messages needed */
export function nextHeartThreshold(currentLevel: number): number | null {
  if (currentLevel >= 5) return null;
  return HEART_THRESHOLDS[currentLevel + 1];
}

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

  // Enhance system prompt with relationship + seasonal context
  let systemPrompt = npc.systemPrompt;
  const heartState = await getHeartLevel(npc.id);
  if (heartState && heartState.messageCount > 1) {
    systemPrompt += `\n\nRELATIONSHIP CONTEXT: Chris has talked with you ${heartState.messageCount} times before. Treat him accordingly — if he's talked to you many times, be more familiar, reference past conversations, and use inside jokes naturally.`;
  }
  const seasonHint = getSeasonalDialogueHint();
  if (seasonHint) {
    systemPrompt += `\n\nSEASON: ${seasonHint}`;
  }

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
        system: systemPrompt,
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
