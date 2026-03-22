/**
 * Hardcoded seed content for Phase 1.
 * This replaces the Python content generation pipeline for now —
 * enough exercises to practice for 2 weeks.
 *
 * In Phase 4, this will be replaced by SQLite content DB (fluent.db).
 */

import type { Exercise } from './exercises';

let nextId = 1;
function ex(partial: Omit<Exercise, 'id'>): Exercise {
  return { id: nextId++, ...partial };
}

export const SEED_EXERCISES: Exercise[] = [
  // === VOCAB: Food (A2) ===
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'food', prompt: 'bread (the round cheese bread from Minas)', answer: 'pão de queijo', distractors: null, explanation: 'The most iconic Mineiro food. Made with polvilho (tapioca starch) and queijo minas.', mineiro_note: 'Uai, pão de queijo é trem bão demais!', tags: '["food"]', difficulty: 2 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'food', prompt: 'coffee (small strong cup)', answer: 'cafezinho', distractors: null, explanation: 'Diminutive of café. Mineiros take their coffee strong and sweet.', mineiro_note: 'In Minas, offering cafezinho is a sign of hospitality.', tags: '["food"]', difficulty: 1 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'food', prompt: 'rice and beans (daily staple)', answer: 'arroz com feijão', distractors: null, explanation: 'The base of every Mineiro meal. Feijão in Minas is usually carioca (brown beans).', mineiro_note: null, tags: '["food"]', difficulty: 1 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'food', prompt: 'chicken (the meat)', answer: 'frango', distractors: null, explanation: 'Frango com quiabo (chicken with okra) is a classic Mineiro dish.', mineiro_note: null, tags: '["food"]', difficulty: 1 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'food', prompt: 'market / open-air market', answer: 'feira', distractors: null, explanation: 'Feiras are weekly open-air markets with fresh produce, cheese, and street food.', mineiro_note: 'In BH, the Mercado Central is the most famous feira.', tags: '["food","shopping"]', difficulty: 2 }),

  // === VOCAB: Mineiro Expressions ===
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'mineiro', prompt: '(interjection) surprise, emphasis, filler — uniquely Mineiro', answer: 'uai', distractors: null, explanation: 'The most iconic Mineiro word. Can express surprise, agreement, or be a conversation filler.', mineiro_note: 'Uai is to Mineiros what "like" is to Californians — everywhere.', tags: '["mineiro"]', difficulty: 1 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'mineiro', prompt: '"thing" or "stuff" (Mineiro replacement for coisa)', answer: 'trem', distractors: null, explanation: 'In standard BP, trem means train. In Minas, it means anything — object, situation, event.', mineiro_note: '"Esse trem tá bão" = "This thing is good"', tags: '["mineiro"]', difficulty: 2 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'mineiro', prompt: '"you" (informal Mineiro contraction of você)', answer: 'cê', distractors: null, explanation: 'Contracted form of você, used in casual Mineiro speech.', mineiro_note: '"Cê tá bão?" = "Você está bom?" (Are you good?)', tags: '["mineiro"]', difficulty: 2 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'mineiro', prompt: '"good" (Mineiro way to say bom)', answer: 'bão', distractors: null, explanation: 'Contracted form of bom. Used constantly in Minas Gerais.', mineiro_note: '"Bão demais da conta!" = "Really, really good!"', tags: '["mineiro"]', difficulty: 1 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'mineiro', prompt: '"wow!" (short for Nossa Senhora!)', answer: 'nó!', distractors: null, explanation: 'Exclamation of surprise, short for "Nossa Senhora!" (Our Lady!).', mineiro_note: '"Nó, que trem bonito!" = "Wow, what a beautiful thing!"', tags: '["mineiro"]', difficulty: 1 }),

  // === CLOZE: Ser vs Estar (A2) ===
  ex({ type: 'cloze', cefr_level: 'A2', topic: 'ser_estar', prompt: 'Eu ___ cansado. (I am tired — temporary state)', answer: 'estou', distractors: null, explanation: 'Use ESTAR for temporary states/feelings. "Estou cansado" = I am tired right now.', mineiro_note: 'Mineiro: "Cê tá cansado, sô?"', tags: '["ser_estar"]', difficulty: 2 }),
  ex({ type: 'cloze', cefr_level: 'A2', topic: 'ser_estar', prompt: 'Ela ___ professora. (She is a teacher — profession)', answer: 'é', distractors: null, explanation: 'Use SER for professions, identity, permanent characteristics.', mineiro_note: null, tags: '["ser_estar"]', difficulty: 2 }),
  ex({ type: 'cloze', cefr_level: 'A2', topic: 'ser_estar', prompt: 'Nós ___ em Belo Horizonte. (We are in BH — location)', answer: 'estamos', distractors: null, explanation: 'Use ESTAR for location. Where you ARE (estar) vs what you ARE (ser).', mineiro_note: 'BH = Belo Horizonte, capital of Minas Gerais.', tags: '["ser_estar"]', difficulty: 3 }),
  ex({ type: 'cloze', cefr_level: 'A2', topic: 'ser_estar', prompt: 'O café ___ quente. (The coffee is hot — current state)', answer: 'está', distractors: null, explanation: 'Use ESTAR for states that can change. The coffee is hot NOW but will cool.', mineiro_note: null, tags: '["ser_estar"]', difficulty: 2 }),
  ex({ type: 'cloze', cefr_level: 'A2', topic: 'ser_estar', prompt: 'Minas Gerais ___ um estado grande. (MG is a big state — characteristic)', answer: 'é', distractors: null, explanation: 'Use SER for inherent characteristics. MG is permanently large.', mineiro_note: 'Minas Gerais is the 4th largest state in Brazil by area.', tags: '["ser_estar"]', difficulty: 2 }),

  // === CLOZE: Prepositions (A2) ===
  ex({ type: 'cloze', cefr_level: 'A2', topic: 'prepositions', prompt: 'Eu moro ___ Belo Horizonte. (I live in BH)', answer: 'em', distractors: null, explanation: '"Morar em" = to live in. Portuguese uses "em" where Spanish uses "en".', mineiro_note: null, tags: '["preposition"]', difficulty: 2 }),
  ex({ type: 'cloze', cefr_level: 'A2', topic: 'prepositions', prompt: 'Vou ___ o mercado. (I\'m going to the market)', answer: 'ao', distractors: null, explanation: '"Ir ao" = to go to the (masculine). "ao" = a + o (contraction).', mineiro_note: null, tags: '["preposition"]', difficulty: 3 }),

  // === MULTIPLE CHOICE: False Cognates (A2) ===
  ex({ type: 'multiple_choice', cefr_level: 'A2', topic: 'false_cognates', prompt: 'What does "esquisito" mean in Portuguese?', answer: 'strange/weird', distractors: '["exquisite","exclusive","essential"]', explanation: 'False cognate! Spanish "exquisito" = exquisite, but PT "esquisito" = strange/weird.', mineiro_note: null, tags: '["false_cognate"]', difficulty: 3 }),
  ex({ type: 'multiple_choice', cefr_level: 'A2', topic: 'false_cognates', prompt: 'What does "embaraçada" mean in Portuguese?', answer: 'pregnant', distractors: '["embarrassed","embraced","embedded"]', explanation: 'False cognate! Spanish "embarazada" = pregnant. PT "embaraçada" also = pregnant. "Embarrassed" in PT = "envergonhada".', mineiro_note: null, tags: '["false_cognate"]', difficulty: 3 }),
  ex({ type: 'multiple_choice', cefr_level: 'A2', topic: 'false_cognates', prompt: 'What does "polvo" mean in Portuguese?', answer: 'octopus', distractors: '["dust","powder","chicken"]', explanation: 'False cognate! Spanish "polvo" = dust, but PT "polvo" = octopus. PT "dust" = "poeira".', mineiro_note: null, tags: '["false_cognate"]', difficulty: 3 }),

  // === VOCAB: Greetings (A2) ===
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'greetings', prompt: 'good morning', answer: 'bom dia', distractors: null, explanation: 'Literally "good day". Used until around noon.', mineiro_note: null, tags: '["greetings"]', difficulty: 1 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'greetings', prompt: 'how are you? (informal)', answer: 'tudo bem?', distractors: null, explanation: 'Literally "everything good?" Most common informal greeting.', mineiro_note: 'Mineiro version: "Cê tá bão?"', tags: '["greetings"]', difficulty: 1 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'greetings', prompt: 'please', answer: 'por favor', distractors: null, explanation: 'Same structure as Spanish "por favor".', mineiro_note: null, tags: '["greetings"]', difficulty: 1 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'greetings', prompt: 'thank you (masculine speaker)', answer: 'obrigado', distractors: null, explanation: 'Men say "obrigado", women say "obrigada". Comes from "I am obliged".', mineiro_note: null, tags: '["greetings"]', difficulty: 1 }),
  ex({ type: 'vocab', cefr_level: 'A2', topic: 'greetings', prompt: 'excuse me / sorry', answer: 'com licença', distractors: null, explanation: '"Com licença" = excuse me (permission). "Desculpa" = sorry (apology).', mineiro_note: null, tags: '["greetings"]', difficulty: 2 }),
];
