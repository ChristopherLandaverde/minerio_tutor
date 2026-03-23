/**
 * Fallback coaching messages when Claude API is unavailable or no API key is set.
 * Mineiro-flavored, warm, forward-looking. Never guilt-trips.
 */

export const COACHING_FALLBACKS: string[] = [
  'Uai, vamos lá! Hoje tem revisão de vocabulário e gramática nova. Bora praticar, sô!',
  'Bom dia! Que tal começar o dia com um cafezinho e um pouco de português mineiro? ☕',
  'Ô sô, hoje tem exercício bão demais! Vamos revisar o que cê aprendeu e conhecer trem novo.',
  'Nó, cê tá mandando bem! Vamos continuar praticando — cada dia um pouquinho, né?',
  'E aí, tudo bão? Hoje vamos misturar vocabulário, gramática e leitura. Diversão garantida!',
  'Bem-vindo de volta! Hoje tem revisão de itens pendentes e conteúdo novo no seu nível.',
  'Cê sabia que praticar todo dia é o segredo? Vamos lá — hoje tem exercícios variados esperando!',
  'Opa! Sessão de hoje: um mix de revisão e conteúdo novo. Vamos com tudo, sô!',
  'Bão demais da conta! Hoje vamos focar nos seus pontos fortes e desafiar um pouquinho mais.',
  'Que bom que cê voltou! Vamos revisar o que já sabe e aprender trem novo. Uai!',
  'Hoje é dia de praticar! Lembre: errar faz parte — o importante é tentar. Vamos nessa!',
  'Sô, cê tá no caminho certo! Hoje tem exercícios fresquinhos esperando por cê.',
];

/** Pick a random fallback message */
export function getRandomFallback(): string {
  return COACHING_FALLBACKS[Math.floor(Math.random() * COACHING_FALLBACKS.length)];
}
