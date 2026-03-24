/**
 * Fallback coaching messages when Claude API is unavailable or no API key is set.
 * Mineiro-flavored, warm, forward-looking. Never guilt-trips.
 */

export const COACHING_FALLBACKS: string[] = [
  'Bora lá, sô! 🔥',
  'E aí, tudo bão? Bora praticar! 💪',
  'Ô sô, vamos nessa! 🚀',
  'Cafezinho e português? Bora! ☕',
  'Nó, cê voltou! Vamos lá! 🎉',
  'Bão demais! Bora treinar, uai! 🏔️',
  'Opa sô, sessão de hoje tá pronta! 📚',
  'Cê tá no caminho certo, uai! 🎯',
  'Vamos com tudo, sô! 💥',
  'Mais um dia, mais um trem novo! 🐦',
  'Bora aprender, cê tá demais! ⭐',
  'E aí sô, pronto pra treinar? 🔥',
];

/** Pick a random fallback message */
export function getRandomFallback(): string {
  return COACHING_FALLBACKS[Math.floor(Math.random() * COACHING_FALLBACKS.length)];
}
