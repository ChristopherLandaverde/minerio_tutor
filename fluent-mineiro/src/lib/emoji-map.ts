/**
 * Emoji for concrete vocabulary, resolved at render time by the exercise's
 * `answer`. Keys are normalized (lowercase, accent-stripped, trimmed).
 * Unmapped words return null → render no icon. Concrete nouns only.
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const EMOJI_MAP: Record<string, string> = {
  // food & drink
  'pao de queijo': '🧀', 'cafezinho': '☕', 'cafe': '☕', 'queijo minas': '🧀',
  'queijo': '🧀', 'feijao': '🫘', 'feijao tropeiro': '🫘', 'arroz': '🍚',
  'pao': '🍞', 'bolo': '🍰', 'doce de leite': '🍮', 'carne': '🥩', 'frango': '🍗',
  'ovo': '🥚', 'leite': '🥛', 'agua': '💧', 'cerveja': '🍺', 'fruta': '🍎',
  'banana': '🍌', 'laranja': '🍊',
  // house
  'casa': '🏠', 'porta': '🚪', 'janela': '🪟', 'cama': '🛏️', 'cadeira': '🪑',
  'mesa': '🪑', 'cozinha': '🍳', 'banheiro': '🚽', 'chave': '🔑',
  // family / people
  'familia': '👪', 'mae': '👩', 'pai': '👨', 'filho': '👦', 'filha': '👧',
  'irmao': '👦', 'irma': '👧', 'avo': '👴', 'bebe': '👶', 'amigo': '🧑‍🤝‍🧑',
  // body / health
  'cabeca': '🧠', 'mao': '✋', 'pe': '🦶', 'olho': '👁️', 'boca': '👄',
  'coracao': '❤️', 'dente': '🦷', 'remedio': '💊', 'medico': '🧑‍⚕️',
  // clothing
  'camisa': '👕', 'calca': '👖', 'sapato': '👟', 'vestido': '👗', 'chapeu': '🎩',
  // transport
  'carro': '🚗', 'onibus': '🚌', 'aviao': '✈️', 'trem': '🚆', 'bicicleta': '🚲', 'moto': '🏍️',
  // nature
  'sol': '☀️', 'chuva': '🌧️', 'arvore': '🌳', 'flor': '🌸', 'rio': '🏞️',
  'montanha': '⛰️', 'cachorro': '🐶', 'gato': '🐱', 'passaro': '🐦',
};

export function lookupEmoji(answer: string): string | null {
  if (!answer) return null;
  return EMOJI_MAP[normalize(answer)] ?? null;
}
