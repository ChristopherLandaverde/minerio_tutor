/**
 * Seasonal events — Mineiro calendar.
 * Real calendar months drive banners, NPC awareness, and bonus challenges.
 */

export interface Season {
  id: string;
  name: string;
  months: number[];       // JS Date months (0-indexed)
  banner: string;
  icon: string;
  color: string;          // Tailwind color class for banner accent
  challengeLabel: string;
  challengeTarget: number;
  challengeType: string;  // 'npc_chats' | 'exercise_count' | 'session_count'
  npcHint: string;        // Appended to NPC system prompts
}

export const SEASONS: Season[] = [
  {
    id: 'carnaval',
    name: 'Carnaval',
    months: [1], // February
    banner: 'É Carnaval, uai! Bora sambar!',
    icon: '🎭',
    color: 'bg-terracotta/10 border-terracotta/20 text-terracotta',
    challengeLabel: 'Converse com 3 NPCs esta semana',
    challengeTarget: 3,
    challengeType: 'npc_chats',
    npcHint: 'It\'s Carnaval season! Mention blocos, samba, fantasia, or Carnaval de BH naturally if the topic comes up.',
  },
  {
    id: 'semana_santa',
    name: 'Semana Santa',
    months: [2, 3], // March-April
    banner: 'Semana Santa em Minas — tempo de tradição',
    icon: '⛪',
    color: 'bg-serra/10 border-serra/20 text-serra',
    challengeLabel: 'Complete 30 exercícios esta semana',
    challengeTarget: 30,
    challengeType: 'exercise_count',
    npcHint: 'It\'s Semana Santa. Mention traditions like procissões, tapetes de serragem, or bacalhau if the topic comes up.',
  },
  {
    id: 'colheita_cafe',
    name: 'Colheita do Café',
    months: [4], // May
    banner: 'Época da colheita do café mineiro',
    icon: '☕',
    color: 'bg-ouro/10 border-ouro/20 text-cafe',
    challengeLabel: 'Faça 7 sessões esta semana',
    challengeTarget: 7,
    challengeType: 'session_count',
    npcHint: 'It\'s coffee harvest season in Minas. Mention café, colheita, or fazendas de café naturally if the topic comes up.',
  },
  {
    id: 'festa_junina',
    name: 'Festa Junina',
    months: [5, 6], // June-July
    banner: 'Arraiá! Festas juninas por todo interior',
    icon: '🌽',
    color: 'bg-ouro/10 border-ouro/20 text-ouro',
    challengeLabel: 'Converse com 5 NPCs esta semana',
    challengeTarget: 5,
    challengeType: 'npc_chats',
    npcHint: 'It\'s Festa Junina season! Mention fogueira, quadrilha, pamonha, quentão, or arraial naturally if the topic comes up.',
  },
  {
    id: 'primavera',
    name: 'Primavera Mineira',
    months: [8, 9], // September-October
    banner: 'Primavera na Serra — flores e cachoeiras',
    icon: '🌸',
    color: 'bg-serra/10 border-serra/20 text-serra',
    challengeLabel: 'Complete 40 exercícios esta semana',
    challengeTarget: 40,
    challengeType: 'exercise_count',
    npcHint: 'It\'s spring in Minas. Mention flores, cachoeiras, or the beautiful weather naturally if the topic comes up.',
  },
  {
    id: 'natal',
    name: 'Natal Mineiro',
    months: [11], // December
    banner: 'Natal mineiro — presépio e mesa farta',
    icon: '🎄',
    color: 'bg-terracotta/10 border-terracotta/20 text-terracotta',
    challengeLabel: 'Faça 7 sessões esta semana',
    challengeTarget: 7,
    challengeType: 'session_count',
    npcHint: 'It\'s Christmas season. Mention Natal, presépio, rabanada, or ceia de Natal naturally if the topic comes up.',
  },
];

/** Get the current season based on today's date (or null if no special season) */
export function getCurrentSeason(): Season | null {
  const month = new Date().getMonth();
  return SEASONS.find(s => s.months.includes(month)) || null;
}

/** Get the seasonal dialogue hint for NPC system prompts */
export function getSeasonalDialogueHint(): string | null {
  const season = getCurrentSeason();
  return season?.npcHint || null;
}
