/**
 * Travel Journal — Phase 2
 * Tracks stamps (city visits), slang collected, and NPC relationships.
 * Uses the achievement_unlocks table with journal-prefixed IDs.
 */

import { getDb } from './db';

export interface JournalEntry {
  id: string;         // e.g. 'stamp:bh', 'slang:uai', 'npc:seu_ze'
  type: 'stamp' | 'slang' | 'npc';
  cityId: string;
  label: string;
  detail: string;
  earnedAt: string;
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
export async function getJournalStats(): Promise<{ stamps: number; slang: number; npcs: number; total: number }> {
  const entries = await getJournalEntries();
  const stamps = entries.filter(e => e.type === 'stamp').length;
  const slang = entries.filter(e => e.type === 'slang').length;
  const npcs = entries.filter(e => e.type === 'npc').length;
  return { stamps, slang, npcs, total: entries.length };
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
]);
