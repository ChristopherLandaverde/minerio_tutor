<script lang="ts">
  import { page } from '$app/stores';
  import { SEED_EXERCISES } from '$lib/content';
  import { scoreExercise, processAnswer, type Exercise } from '$lib/exercises';

  // Filter exercises by type from URL param
  let exercises: Exercise[] = $state([]);
  let currentIndex = $state(0);
  let userAnswer = $state('');
  let showFeedback = $state(false);
  let lastResult: { quality: number; isCorrect: boolean; mistakeType: string | null } | null = $state(null);
  let sessionCorrect = $state(0);
  let sessionTotal = $state(0);
  let sessionDone = $state(false);
  let startTime = $state(0);

  // Vocab flashcard state
  let showAnswer = $state(false);

  $effect(() => {
    const type = $page.url.searchParams.get('type') || 'vocab';
    const topic = $page.url.searchParams.get('topic');
    exercises = SEED_EXERCISES.filter(e => e.type === type && (!topic || e.topic === topic)).sort(() => Math.random() - 0.5);
    currentIndex = 0;
    sessionCorrect = 0;
    sessionTotal = 0;
    sessionDone = false;
    showFeedback = false;
    showAnswer = false;
    userAnswer = '';
    startTime = Date.now();
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
    if (result.isCorrect) sessionCorrect++;

    try {
      await processAnswer(current, ans, result, responseTime);
    } catch {
      // DB may not be ready in dev mode
    }
  }

  async function rateVocab(quality: number) {
    if (!current) return;
    const responseTime = Date.now() - startTime;
    const result = { quality, isCorrect: quality >= 3, mistakeType: quality < 3 ? 'vocabulary' : null };
    lastResult = result;
    showFeedback = true;
    sessionTotal++;
    if (result.isCorrect) sessionCorrect++;

    try {
      await processAnswer(current, current.answer, result, responseTime);
    } catch {}
  }

  function nextExercise() {
    if (currentIndex + 1 >= exercises.length) {
      sessionDone = true;
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
    // Number keys for vocab rating
    if (showAnswer && current?.type === 'vocab' && e.key >= '1' && e.key <= '5') {
      rateVocab(parseInt(e.key));
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="max-w-xl mx-auto p-6">
  {#if sessionDone}
    <!-- Session Complete -->
    <div class="text-center py-12">
      <div class="text-5xl mb-4">🎉</div>
      <h2 class="font-display text-2xl font-bold mb-2">Sessão completa!</h2>
      <p class="text-cafe-secondary mb-6">
        {sessionCorrect}/{sessionTotal} corretas ({sessionTotal > 0 ? Math.round(sessionCorrect/sessionTotal*100) : 0}%)
      </p>
      <a href="/" class="inline-flex px-6 py-3 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors">
        Voltar ao Dashboard
      </a>
    </div>
  {:else if current}
    <!-- Progress Bar -->
    <div class="h-1 bg-pedra-subtle rounded-full mb-6 overflow-hidden">
      <div class="h-full bg-serra rounded-full transition-all duration-300" style="width: {progress}%"></div>
    </div>

    <!-- Exercise Card -->
    <div class="bg-white border border-border rounded-2xl overflow-hidden">
      <div class="p-8 text-center">
        <div class="text-xs uppercase tracking-wider text-cafe-muted font-semibold mb-4">
          {current.type === 'vocab' ? 'Vocabulário' : current.type === 'cloze' ? 'Cloze' : current.type === 'error_correction' ? 'Correção' : 'Quiz'} · {current.topic}
        </div>

        {#if current.type === 'vocab'}
          <!-- Vocab Flashcard -->
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
          <!-- Cloze Fill-in -->
          <div class="font-mono text-lg bg-pedra-subtle p-4 rounded-xl mb-6">
            {current.prompt}
          </div>
          {#if !showFeedback}
            <input
              bind:value={userAnswer}
              placeholder="Sua resposta..."
              class="w-64 px-4 py-3 border-2 border-border rounded-xl text-center font-body text-base bg-pedra focus:border-terracotta outline-none"
              autofocus
            />
          {/if}

        {:else if current.type === 'multiple_choice'}
          <!-- Multiple Choice -->
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
          <!-- Error Correction -->
          <p class="text-xs text-cafe-muted mb-2">Corrija a frase abaixo:</p>
          <div class="font-mono text-lg bg-error/5 border border-error/20 p-4 rounded-xl mb-6 text-error">
            {current.prompt}
          </div>
          {#if !showFeedback}
            <input
              bind:value={userAnswer}
              placeholder="Frase corrigida..."
              class="w-full max-w-md px-4 py-3 border-2 border-border rounded-xl text-center font-body text-base bg-pedra focus:border-terracotta outline-none"
              autofocus
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

    <div class="text-center mt-4 text-xs text-cafe-muted">
      {currentIndex + 1} / {exercises.length} · Esc para sair
    </div>
  {/if}
</div>
