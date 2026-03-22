<script lang="ts">
  import { onMount } from 'svelte';
  import { SEED_EXERCISES } from '$lib/content';
  import { scoreExercise, processAnswer, type Exercise } from '$lib/exercises';
  import { getDueReviewIds, startSession, endSession, updateStreak } from '$lib/db';

  const topicLabels: Record<string, string> = {
    food: 'Comida', mineiro: 'Mineiro', greetings: 'Cumprimentos',
    travel: 'Viagem', family: 'Família', daily_routine: 'Rotina',
    body_health: 'Saúde', emotions: 'Emoções', shopping: 'Compras',
    work: 'Trabalho', ser_estar: 'Ser vs Estar', verbs_present: 'Presente',
    verbs_past: 'Passado', prepositions: 'Preposições',
    false_cognates: 'Falsos Cognatos', mineiro_vs_standard: 'Mineiro vs Padrão',
    cultural: 'Cultura', error_correction: 'Erros Comuns',
  };

  let exercises: Exercise[] = $state([]);
  let currentIndex = $state(0);
  let userAnswer = $state('');
  let showFeedback = $state(false);
  let lastResult: { quality: number; isCorrect: boolean; mistakeType: string | null } | null = $state(null);
  let sessionCorrect = $state(0);
  let sessionTotal = $state(0);
  let sessionDone = $state(false);
  let startTime = $state(0);
  let sessionId = $state<number | null>(null);
  let sessionXp = $state(0);
  let sessionStreak = $state(0);
  let showAnswer = $state(false);
  let loaded = $state(false);

  onMount(async () => {
    try {
      const dueIds = await getDueReviewIds();
      const exerciseMap = new Map(SEED_EXERCISES.map(e => [e.id, e]));
      exercises = dueIds
        .map(id => exerciseMap.get(id))
        .filter((e): e is Exercise => e !== undefined)
        .sort(() => Math.random() - 0.5); // Shuffle for interleaving
      if (exercises.length > 0) {
        sessionId = await startSession();
      }
    } catch {
      // DB not ready
    }
    startTime = Date.now();
    loaded = true;
  });

  const current = $derived(exercises[currentIndex]);
  const progress = $derived(exercises.length > 0 ? ((currentIndex) / exercises.length) * 100 : 0);
  const mcOptions = $derived(current?.distractors ? [...JSON.parse(current.distractors), current.answer].sort(() => Math.random() - 0.5) : []);

  async function submitAnswer(answer?: string) {
    if (!current) return;
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
  }

  async function rateVocab(quality: number) {
    if (!current) return;
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
  }

  async function nextExercise() {
    if (currentIndex + 1 >= exercises.length) {
      sessionDone = true;
      try {
        if (sessionId) await endSession(sessionId, sessionTotal, sessionCorrect, sessionXp);
        sessionStreak = await updateStreak();
      } catch {}
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
    if (e.key === 'Enter' && !showFeedback && current?.type !== 'vocab' && current?.type !== 'multiple_choice') {
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

<div class="max-w-xl mx-auto p-6">
  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>

  {:else if exercises.length === 0}
    <!-- No reviews due -->
    <h2 class="font-display text-2xl font-bold mb-2">🔄 Revisão</h2>
    <p class="text-sm text-cafe-secondary mb-8">Spaced repetition — revise no tempo certo</p>
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-4xl mb-4">✅</div>
      <h3 class="font-display text-xl font-bold mb-2">Tudo em dia!</h3>
      <p class="text-cafe-muted text-sm">Nenhuma revisão pendente. Volte mais tarde ou pratique uma lição nova.</p>
      <a href="/" class="inline-block mt-6 px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta/90 transition-colors">
        Praticar agora
      </a>
    </div>

  {:else if sessionDone}
    <!-- Session Complete -->
    <div class="text-center py-12">
      <div class="text-5xl mb-4">🎉</div>
      <h2 class="font-display text-2xl font-bold mb-2">Revisão completa!</h2>
      <div class="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
        <div class="bg-white border border-border rounded-xl p-3 text-center">
          <div class="font-display text-xl font-bold text-serra">{sessionCorrect}/{sessionTotal}</div>
          <div class="text-xs text-cafe-muted">Corretas</div>
        </div>
        <div class="bg-white border border-border rounded-xl p-3 text-center">
          <div class="font-display text-xl font-bold text-ouro">+{sessionXp}</div>
          <div class="text-xs text-cafe-muted">XP</div>
        </div>
        <div class="bg-white border border-border rounded-xl p-3 text-center">
          <div class="font-display text-xl font-bold text-terracotta">🔥 {sessionStreak}</div>
          <div class="text-xs text-cafe-muted">Streak</div>
        </div>
      </div>
      <a href="/" class="inline-flex px-6 py-3 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors">
        Voltar ao Dashboard
      </a>
    </div>

  {:else if current}
    <!-- Progress Bar -->
    <div class="flex items-center gap-3 mb-6">
      <span class="text-xs text-cafe-muted font-semibold">🔄 Revisão</span>
      <div class="flex-1 h-1 bg-pedra-subtle rounded-full overflow-hidden">
        <div class="h-full bg-serra rounded-full transition-all duration-300" style="width: {progress}%"></div>
      </div>
      <span class="text-xs text-cafe-muted">{currentIndex + 1}/{exercises.length}</span>
    </div>

    <!-- Exercise Card -->
    <div class="bg-white border border-border rounded-2xl overflow-hidden">
      <div class="p-8 text-center">
        <div class="text-xs uppercase tracking-wider text-cafe-muted font-semibold mb-4">
          {current.type === 'vocab' ? 'Vocabulário' : current.type === 'cloze' ? 'Cloze' : current.type === 'error_correction' ? 'Correção' : 'Quiz'} · {topicLabels[current.topic] || current.topic}
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
                  class="w-10 h-10 rounded-lg border font-semibold text-sm transition-colors
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
        {/if}
      </div>

      <!-- Submit button for cloze and error_correction -->
      {#if !showFeedback && (current.type === 'cloze' || current.type === 'error_correction')}
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
  {/if}
</div>
