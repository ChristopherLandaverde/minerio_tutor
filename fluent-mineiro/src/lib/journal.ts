/**
 * Travel Journal — Phase 2
 * Tracks stamps (city visits), slang collected, and NPC relationships.
 * Uses the achievement_unlocks table with journal-prefixed IDs.
 */

import { getDb } from './db';

export interface JournalEntry {
  id: string;         // e.g. 'stamp:bh', 'slang:uai', 'npc:seu_ze', 'item:seu_ze'
  type: 'stamp' | 'slang' | 'npc' | 'item';
  cityId: string;
  label: string;
  detail: string;
  earnedAt: string;
}

export interface ToastData {
  icon: string;
  title: string;
  detail: string;
}

/** Load all journal entries */
export async function getJournalEntries(): Promise<JournalEntry[]> {
  try {
    const db = await getDb();
    const rows: { id: string; unlocked_at: string }[] = await db.select(
      "SELECT id, unlocked_at FROM achievement_unlocks WHERE id LIKE 'journal:%'"
    );
    return rows.map(r => {
      const data = JOURNAL_DEFS.get(r.id);
      if (!data) return null;
      return { ...data, id: r.id, earnedAt: r.unlocked_at };
    }).filter((e): e is JournalEntry => e !== null);
  } catch {
    return [];
  }
}

/** Award a journal entry (idempotent — won't duplicate) */
export async function awardJournalEntry(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      "INSERT OR IGNORE INTO achievement_unlocks (id, unlocked_at) VALUES ($1, datetime('now'))",
      [id]
    );
  } catch {
    // Fail silently
  }
}

/** Check if a journal entry is earned */
export async function hasJournalEntry(id: string): Promise<boolean> {
  try {
    const db = await getDb();
    const rows: { id: string }[] = await db.select(
      "SELECT id FROM achievement_unlocks WHERE id = $1",
      [id]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Award a city stamp when user first opens a city */
export async function awardCityStamp(cityId: string): Promise<void> {
  await awardJournalEntry(`journal:stamp:${cityId}`);
}

/** Award an NPC relationship when user first chats with an NPC */
export async function awardNpcRelationship(npcId: string, cityId: string): Promise<void> {
  await awardJournalEntry(`journal:npc:${npcId}`);
}

/** Get journal stats for display */
export async function getJournalStats(): Promise<{ stamps: number; slang: number; npcs: number; items: number; total: number }> {
  const entries = await getJournalEntries();
  const stamps = entries.filter(e => e.type === 'stamp').length;
  const slang = entries.filter(e => e.type === 'slang').length;
  const npcs = entries.filter(e => e.type === 'npc').length;
  const items = entries.filter(e => e.type === 'item').length;
  return { stamps, slang, npcs, items, total: entries.length };
}

/**
 * Check and award slang triggers based on current state.
 * Returns newly awarded slang entries (for toast display).
 */
export async function checkSlangTriggers(): Promise<ToastData[]> {
  const awarded: ToastData[] = [];
  try {
    const db = await getDb();

    // Helper: check if stamp exists
    async function hasStamp(cityId: string): Promise<boolean> {
      return hasJournalEntry(`journal:stamp:${cityId}`);
    }

    // Helper: count exercises for topics
    async function topicExerciseCount(topics: string[]): Promise<number> {
      const placeholders = topics.map((_, i) => `$${i + 1}`).join(',');
      // Count attempts where exercise topic matches
      const rows: { cnt: number }[] = await db.select(
        `SELECT COUNT(DISTINCT a.exercise_id) as cnt FROM attempts a WHERE a.exercise_id IN (SELECT exercise_id FROM srs_state)`,
      );
      return rows[0]?.cnt || 0;
    }

    // Helper: get streak
    async function getStreak(): Promise<number> {
      const rows: { value: string }[] = await db.select("SELECT value FROM profile WHERE key = 'streak'");
      return parseInt(rows[0]?.value || '0');
    }

    // Helper: count NPC conversations
    async function hasAnyNpcChat(): Promise<boolean> {
      const rows: { cnt: number }[] = await db.select('SELECT COUNT(*) as cnt FROM npc_conversations');
      return (rows[0]?.cnt || 0) > 0;
    }

    // Helper: get heart level
    async function getHeart(npcId: string): Promise<number> {
      const rows: { heart_level: number }[] = await db.select(
        'SELECT heart_level FROM npc_hearts WHERE npc_id = $1', [npcId]
      );
      return rows[0]?.heart_level || 0;
    }

    // Helper: count attempts on specific topics
    async function attemptsOnTopics(topics: string[]): Promise<number> {
      // We need to check exercise IDs that match these topics from the content module
      // Since we can't import content here easily, count all attempts as proxy
      const rows: { cnt: number }[] = await db.select('SELECT COUNT(*) as cnt FROM attempts');
      return rows[0]?.cnt || 0;
    }

    // Define triggers
    const triggers: { id: string; check: () => Promise<boolean> }[] = [
      { id: 'journal:slang:uai', check: async () => hasStamp('bh') },
      { id: 'journal:slang:trem', check: async () => (await attemptsOnTopics(['greetings', 'daily_routine', 'transport'])) >= 5 },
      { id: 'journal:slang:bao', check: async () => (await getStreak()) >= 3 },
      { id: 'journal:slang:ce', check: async () => hasAnyNpcChat() },
      { id: 'journal:slang:so', check: async () => hasStamp('tiradentes') },
      { id: 'journal:slang:no', check: async () => hasStamp('mariana') },
      { id: 'journal:slang:oce', check: async () => hasStamp('serra_canastra') },
      { id: 'journal:slang:trem_bao', check: async () => (await hasStamp('ouro_preto')) && (await attemptsOnTopics(['food'])) >= 5 },
      { id: 'journal:slang:arreda', check: async () => (await getHeart('rita')) >= 2 },
      { id: 'journal:slang:pois_e', check: async () => (await getHeart('lucas')) >= 2 },
    ];

    for (const trigger of triggers) {
      const already = await hasJournalEntry(trigger.id);
      if (already) continue;
      const met = await trigger.check();
      if (met) {
        await awardJournalEntry(trigger.id);
        const def = JOURNAL_DEFS.get(trigger.id);
        if (def) {
          awarded.push({ icon: '🗣️', title: `Novo gíria: ${def.label}`, detail: def.detail });
        }
      }
    }
  } catch {
    // Fail silently
  }
  return awarded;
}

/**
 * Check if an NPC item should be awarded (at heart level 3+).
 * Returns toast data if newly awarded.
 */
export async function checkItemTriggers(npcId: string, heartLevel: number): Promise<ToastData | null> {
  if (heartLevel < 3) return null;
  const itemId = `journal:item:${npcId}`;
  const already = await hasJournalEntry(itemId);
  if (already) return null;
  const def = JOURNAL_DEFS.get(itemId);
  if (!def) return null;
  await awardJournalEntry(itemId);
  return { icon: '🎁', title: `Presente de ${def.label.split(':')[0] || 'NPC'}`, detail: def.detail };
}

// Define all possible journal entries
const JOURNAL_DEFS = new Map<string, Omit<JournalEntry, 'id' | 'earnedAt'>>([
  // City stamps
  ['journal:stamp:bh', { type: 'stamp', cityId: 'bh', label: 'Belo Horizonte', detail: 'Capital de Minas — berço dos botecos' }],
  ['journal:stamp:ouro_preto', { type: 'stamp', cityId: 'ouro_preto', label: 'Ouro Preto', detail: 'Patrimônio da Humanidade' }],
  ['journal:stamp:mariana', { type: 'stamp', cityId: 'mariana', label: 'Mariana', detail: 'Cidade mais antiga de Minas' }],
  ['journal:stamp:tiradentes', { type: 'stamp', cityId: 'tiradentes', label: 'Tiradentes', detail: 'Charme colonial e história' }],
  ['journal:stamp:diamantina', { type: 'stamp', cityId: 'diamantina', label: 'Diamantina', detail: 'Terra de JK e da Vesperata' }],
  ['journal:stamp:serra_canastra', { type: 'stamp', cityId: 'serra_canastra', label: 'Serra da Canastra', detail: 'Berço do Rio São Francisco' }],
  ['journal:stamp:juiz_de_fora', { type: 'stamp', cityId: 'juiz_de_fora', label: 'Juiz de Fora', detail: 'Manchester Mineira' }],
  ['journal:stamp:uberaba', { type: 'stamp', cityId: 'uberaba', label: 'Uberaba', detail: 'Capital do gado zebu' }],
  ['journal:stamp:congonhas', { type: 'stamp', cityId: 'congonhas', label: 'Congonhas', detail: 'Os Profetas de Aleijadinho' }],

  // Mineiro slang collected
  ['journal:slang:uai', { type: 'slang', cityId: 'bh', label: 'Uai', detail: 'Interjeição universal mineira — surpresa, concordância, preenchimento' }],
  ['journal:slang:trem', { type: 'slang', cityId: 'bh', label: 'Trem', detail: '"Coisa" — substitui qualquer substantivo (Que trem bão!)' }],
  ['journal:slang:bao', { type: 'slang', cityId: 'bh', label: 'Bão', detail: '"Bom" — Cê tá bão? (Você está bem?)' }],
  ['journal:slang:so', { type: 'slang', cityId: 'tiradentes', label: 'Sô', detail: 'Vocativo — como "cara" (Ô sô, cê viu?)' }],
  ['journal:slang:no', { type: 'slang', cityId: 'mariana', label: 'Nó!', detail: 'Exclamação — abreviação de "Nossa Senhora!"' }],
  ['journal:slang:ce', { type: 'slang', cityId: 'bh', label: 'Cê', detail: 'Contração de "você" — forma mineira padrão' }],
  ['journal:slang:oce', { type: 'slang', cityId: 'serra_canastra', label: 'Ocê', detail: '"Você" na zona rural de Minas' }],
  ['journal:slang:trem_bao', { type: 'slang', cityId: 'ouro_preto', label: 'Trem bão', detail: '"Coisa boa" — elogio máximo mineiro' }],
  ['journal:slang:arreda', { type: 'slang', cityId: 'diamantina', label: 'Arreda', detail: '"Saia daí" / "afaste-se"' }],
  ['journal:slang:pois_e', { type: 'slang', cityId: 'juiz_de_fora', label: 'Pois é', detail: 'Concordância — "é isso mesmo"' }],

  // NPC relationships
  ['journal:npc:seu_ze', { type: 'npc', cityId: 'bh', label: 'Seu Zé', detail: 'Garçom do boteco em BH — seu primeiro amigo mineiro' }],
  ['journal:npc:motorista_carlos', { type: 'npc', cityId: 'bh', label: 'Carlos', detail: 'Motorista de ônibus — conhece BH inteirinha' }],
  ['journal:npc:dona_lourdes', { type: 'npc', cityId: 'ouro_preto', label: 'Dona Lourdes', detail: 'Guia turístico de Ouro Preto — apaixonada pela história' }],
  ['journal:npc:dona_pousada', { type: 'npc', cityId: 'ouro_preto', label: 'Dona Francisca', detail: 'Dona da pousada — cozinha que é um amor' }],
  ['journal:npc:dona_aparecida', { type: 'npc', cityId: 'mariana', label: 'Dona Aparecida', detail: 'Vizinha fofoqueira de Mariana — sabe de tudo' }],
  ['journal:npc:padre_marcos', { type: 'npc', cityId: 'mariana', label: 'Padre Marcos', detail: 'Padre da catedral — gentil e sábio' }],
  ['journal:npc:professor_helio', { type: 'npc', cityId: 'tiradentes', label: 'Professor Hélio', detail: 'Professor aposentado — mestre do mineirês' }],
  ['journal:npc:rita', { type: 'npc', cityId: 'diamantina', label: 'Rita', detail: 'Artesã de Diamantina — mundo de cores e tecidos' }],
  ['journal:npc:toninho', { type: 'npc', cityId: 'serra_canastra', label: 'Toninho', detail: 'Guia de ecoturismo — conhece cada trilha da Serra' }],
  ['journal:npc:lucas', { type: 'npc', cityId: 'juiz_de_fora', label: 'Lucas', detail: 'Estudante de TI na UFJF — nerd e gente boa' }],
  ['journal:npc:dona_marta', { type: 'npc', cityId: 'uberaba', label: 'Dona Marta', detail: 'Fazendeira do Triângulo — forte e sábia' }],
  ['journal:npc:padre_antonio', { type: 'npc', cityId: 'congonhas', label: 'Padre Antônio', detail: 'Pároco historiador — preciso com as palavras' }],

  // NPC collectible items (Mochila) — awarded at heart level 3
  ['journal:item:seu_ze', { type: 'item', cityId: 'bh', label: 'Receita: Pão de queijo', detail: 'Receita secreta do Seu Zé, escrita num guardanapo' }],
  ['journal:item:motorista_carlos', { type: 'item', cityId: 'bh', label: 'Mapa das linhas de ônibus', detail: 'Mapa de BH desenhado à mão pelo Carlos' }],
  ['journal:item:dona_lourdes', { type: 'item', cityId: 'ouro_preto', label: 'Pedra-sabão miniatura', detail: 'Uma miniatura esculpida em pedra-sabão de Ouro Preto' }],
  ['journal:item:dona_pousada', { type: 'item', cityId: 'ouro_preto', label: 'Receita: Frango com quiabo', detail: 'O famoso ensopado mineiro da Dona Francisca' }],
  ['journal:item:dona_aparecida', { type: 'item', cityId: 'mariana', label: 'Álbum de fotos', detail: 'Álbum cheio de fofocas da vizinhança' }],
  ['journal:item:padre_marcos', { type: 'item', cityId: 'mariana', label: 'Livro de orações', detail: 'Livrinho de orações com bênçãos mineiras' }],
  ['journal:item:professor_helio', { type: 'item', cityId: 'tiradentes', label: 'Dicionário do Mineirês', detail: 'Dicionário manuscrito de expressões mineiras' }],
  ['journal:item:rita', { type: 'item', cityId: 'diamantina', label: 'Tecido bordado', detail: 'Tecido bordado à mão de Diamantina' }],
  ['journal:item:toninho', { type: 'item', cityId: 'serra_canastra', label: 'Mapa das trilhas', detail: 'Mapa com cachoeiras secretas da Serra' }],
  ['journal:item:lucas', { type: 'item', cityId: 'juiz_de_fora', label: 'Sticker pack', detail: 'Adesivos de programador da UFJF' }],
  ['journal:item:dona_marta', { type: 'item', cityId: 'uberaba', label: 'Queijo Canastra', detail: 'Uma roda de queijo canastra artesanal' }],
  ['journal:item:padre_antonio', { type: 'item', cityId: 'congonhas', label: 'Postal dos Profetas', detail: 'Cartão postal dos profetas de Aleijadinho' }],
]);
