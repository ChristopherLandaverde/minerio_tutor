<script lang="ts">
  import { scoreExercise, processAnswer, type Exercise } from '$lib/exercises';

  export interface SessionStats {
    correct: number;
    total: number;
    xp: number;
  }

  const topicLabels: Record<string, string> = {
    food: 'Comida', mineiro: 'Mineiro', greetings: 'Cumprimentos',
    travel: 'Viagem', family: 'Família', daily_routine: 'Rotina',
    body_health: 'Saúde', emotions: 'Emoções', shopping: 'Compras',
    work: 'Trabalho', ser_estar: 'Ser vs Estar', verbs_present: 'Presente',
    verbs_past: 'Passado', prepositions: 'Preposições',
    false_cognates: 'Falsos Cognatos', mineiro_vs_standard: 'Mineiro vs Padrão',
    cultural: 'Cultura', error_correction: 'Erros Comuns',
    true_false: 'Verdadeiro/Falso', reorder: 'Reordene',
    transport: 'Transporte', clothing: 'Roupas', sports_leisure: 'Esportes',
    food_drinks: 'Comida & Bebida', nature: 'Natureza', house: 'Casa',
    education: 'Educação', technology: 'Tecnologia', time_numbers: 'Tempo',
    weather: 'Clima', colors: 'Cores', dialogue: 'Diálogos',
  };

  interface Props {
    exercises: Exercise[];
    onSessionEnd: (stats: SessionStats) => void;
  }

  let { exercises, onSessionEnd }: Props = $props();

  let currentIndex = $state(0);
  let userAnswer = $state('');
  let showFeedback = $state(false);
  let lastResult: { quality: number; isCorrect: boolean; mistakeType: string | null } | null = $state(null);
  let sessionCorrect = $state(0);
  let sessionTotal = $state(0);
  let sessionXp = $state(0);
  let submitting = $state(false);
  let startTime = $state(Date.now());
  let showAnswer = $state(false);

  const current = $derived(exercises[currentIndex]);
  const progress = $derived(exercises.length > 0 ? ((currentIndex) / exercises.length) * 100 : 0);
  let mcOptions = $state<string[]>([]);

  $effect(() => {
    if (current?.distractors) {
      try {
        mcOptions = [...JSON.parse(current.distractors), current.answer].sort(() => Math.random() - 0.5);
      } catch {
        mcOptions = [current.answer];
      }
    } else {
      mcOptions = [];
    }
  });

  async function submitAnswer(answer?: string) {
    if (!current || submitting) return;
    submitting = true;
    const responseTime = Date.now() - startTime;
    const ans = answer || userAnswer;
    const result = scoreExercise(current.type, ans, current.answer, undefined, current.tags);
    lastResult = result;
    showFeedback = true;
    sessionTotal++;
    if (result.isCorrect) {
      sessionCorrect++;
      sessionXp += 10;
    }
    try {
      await processAnswer(current, ans, result, responseTime);
    } catch {}
    submitting = false;
  }

  async function rateVocab(quality: number) {
    if (!current || submitting) return;
    submitting = true;
    const responseTime = Date.now() - startTime;
    const result = { quality, isCorrect: quality >= 3, mistakeType: quality < 3 ? 'vocabulary' : null };
    lastResult = result;
    showFeedback = true;
    sessionTotal++;
    if (result.isCorrect) {
      sessionCorrect++;
      sessionXp += 10;
    }
    try {
      await processAnswer(current, current.answer, result, responseTime);
    } catch {}
    submitting = false;
  }

  function nextExercise() {
    if (currentIndex + 1 >= exercises.length) {
      onSessionEnd({ correct: sessionCorrect, total: sessionTotal, xp: sessionXp });
      return;
    }
    currentIndex++;
    userAnswer = '';
    showFeedback = false;
    showAnswer = false;
    lastResult = null;
    startTime = Date.now();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !showFeedback && current?.type !== 'vocab' && current?.type !== 'multiple_choice' && current?.type !== 'true_false') {
      submitAnswer();
    }
    if (e.key === 'Enter' && showFeedback) {
      nextExercise();
    }
    if (e.key === 'Escape') {
      window.location.href = '/';
    }
    if (showAnswer && current?.type === 'vocab' && e.key >= '1' && e.key <= '5') {
      rateVocab(parseInt(e.key));
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if current}
  <!-- Progress Bar -->
  <div class="h-1 bg-pedra-subtle rounded-full mb-6 overflow-hidden">
    <div class="h-full bg-serra rounded-full transition-all duration-300" style="width: {progress}%"></div>
  </div>

  <!-- Exercise Card -->
  <div class="bg-white border border-border rounded-2xl overflow-hidden">
    <div class="p-8 text-center">
      <div class="text-xs uppercase tracking-wider text-cafe-muted font-semibold mb-4">
        {current.type === 'vocab' ? 'Vocabulário' : current.type === 'cloze' ? 'Cloze' : current.type === 'error_correction' ? 'Correção' : current.type === 'true_false' ? 'Verdadeiro ou Falso' : current.type === 'reorder' ? 'Reordene' : 'Quiz'} · {topicLabels[current.topic] || current.topic}
      </div>

      {#if current.type === 'vocab'}
        <p class="font-display text-xl font-semibold mb-6">{current.prompt}</p>
        {#if !showAnswer && !showFeedback}
          <button
            onclick={() => showAnswer = true}
            class="px-6 py-3 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors"
          >
            Mostrar resposta
          </button>
        {:else if showAnswer && !showFeedback}
          <div class="mb-6">
            <div class="font-mono text-2xl font-medium text-serra mb-2">{current.answer}</div>
            <p class="text-sm text-cafe-secondary">{current.explanation}</p>
            {#if current.mineiro_note}
              <div class="mt-3 px-3 py-2 bg-ouro/10 rounded-lg text-sm text-ouro-light">
                💛 {current.mineiro_note}
              </div>
            {/if}
          </div>
          <p class="text-xs text-cafe-muted mb-3">Como foi? (ou use teclas 1-5)</p>
          <div class="flex gap-2 justify-center">
            {#each [1, 2, 3, 4, 5] as q}
              <button
                onclick={() => rateVocab(q)}
                class="min-w-[44px] min-h-[44px] rounded-lg border font-semibold text-sm transition-colors
                  {q <= 2 ? 'border-error/30 text-error hover:bg-error/10' : q === 3 ? 'border-ouro/30 text-ouro hover:bg-ouro/10' : 'border-serra/30 text-serra hover:bg-serra/10'}"
              >
                {q}
              </button>
            {/each}
          </div>
        {/if}

      {:else if current.type === 'cloze'}
        <div class="font-mono text-lg bg-pedra-subtle p-4 rounded-xl mb-6">
          {current.prompt}
        </div>
        {#if !showFeedback}
          <input
            bind:value={userAnswer}
            placeholder="Sua resposta..."
            class="w-64 px-4 py-3 border-2 border-border rounded-xl text-center font-body text-base bg-pedra focus:border-terracotta outline-none"
          />
        {/if}

      {:else if current.type === 'multiple_choice'}
        <p class="font-display text-lg font-semibold mb-6">{current.prompt}</p>
        {#if !showFeedback}
          <div class="space-y-2">
            {#each mcOptions as option}
              <button
                onclick={() => submitAnswer(option)}
                class="w-full p-3 text-left border border-border rounded-xl hover:border-terracotta transition-colors font-medium text-sm"
              >
                {option}
              </button>
            {/each}
          </div>
        {/if}

      {:else if current.type === 'error_correction'}
        <p class="text-xs text-cafe-muted mb-2">Corrija a frase abaixo:</p>
        <div class="font-mono text-lg bg-error/5 border border-error/20 p-4 rounded-xl mb-6 text-error">
          {current.prompt}
        </div>
        {#if !showFeedback}
          <input
            bind:value={userAnswer}
            placeholder="Frase corrigida..."
            class="w-full max-w-md px-4 py-3 border-2 border-border rounded-xl text-center font-body text-base bg-pedra focus:border-terracotta outline-none"
          />
        {/if}

      {:else if current.type === 'true_false'}
        <p class="font-display text-lg font-semibold mb-6">{current.prompt}</p>
        {#if !showFeedback}
          <div class="flex gap-3 justify-center">
            <button
              onclick={() => submitAnswer('true')}
              class="px-8 py-3 border-2 border-serra/30 rounded-xl text-serra font-semibold hover:bg-serra/10 transition-colors"
            >
              ✅ Verdadeiro
            </button>
            <button
              onclick={() => submitAnswer('false')}
              class="px-8 py-3 border-2 border-error/30 rounded-xl text-error font-semibold hover:bg-error/10 transition-colors"
            >
              ❌ Falso
            </button>
          </div>
        {/if}

      {:else if current.type === 'reorder'}
        <p class="text-xs text-cafe-muted mb-2">Reordene as palavras para formar uma frase correta:</p>
        <div class="font-mono text-lg bg-ouro/10 border border-ouro/20 p-4 rounded-xl mb-6 text-cafe">
          {current.prompt}
        </div>
        {#if !showFeedback}
          <input
            bind:value={userAnswer}
            placeholder="Escreva a frase na ordem correta..."
            class="w-full max-w-md px-4 py-3 border-2 border-border rounded-xl text-center font-body text-base bg-pedra focus:border-terracotta outline-none"
          />
        {/if}
      {/if}
    </div>

    <!-- Submit button for text input types -->
    {#if !showFeedback && (current.type === 'cloze' || current.type === 'error_correction' || current.type === 'reorder')}
      <div class="p-4 border-t border-border flex justify-center">
        <button
          onclick={() => submitAnswer()}
          disabled={!userAnswer.trim()}
          class="px-8 py-2.5 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Verificar
        </button>
      </div>
    {/if}

    <!-- Feedback -->
    {#if showFeedback && lastResult}
      <div class="p-4 border-t-[3px] {lastResult.isCorrect ? 'border-serra bg-serra/5' : 'border-error bg-error/5'}">
        <div class="flex items-start gap-3">
          <span class="text-2xl">{lastResult.isCorrect ? '✅' : '❌'}</span>
          <div>
            <div class="font-bold text-sm">{lastResult.isCorrect ? 'Correto!' : 'Incorreto'}</div>
            {#if !lastResult.isCorrect}
              <div class="text-sm text-cafe-secondary mt-1">Resposta: <strong class="text-serra">{current.answer}</strong></div>
            {/if}
            <div class="text-sm text-cafe-secondary mt-1">{current.explanation}</div>
            {#if lastResult.mistakeType === 'spanish_interference'}
              <div class="mt-2 px-3 py-1.5 bg-ouro/15 rounded-lg text-xs text-ouro font-medium">
                ⚠️ Cuidado! Isso é interferência do espanhol.
              </div>
            {/if}
            {#if current.mineiro_note && current.type !== 'vocab'}
              <div class="mt-2 px-3 py-1.5 bg-ouro/10 rounded-lg text-xs text-ouro">
                💛 {current.mineiro_note}
              </div>
            {/if}
          </div>
        </div>
      </div>
      <div class="p-4 border-t border-border flex justify-center">
        <button
          onclick={nextExercise}
          class="px-8 py-2.5 bg-serra text-white font-semibold rounded-xl hover:bg-serra-dark transition-colors"
        >
          Continuar →
        </button>
      </div>
    {/if}
  </div>

  <div class="text-center mt-4 text-xs text-cafe-muted">
    {currentIndex + 1} / {exercises.length} · Esc para sair
  </div>
{/if}
