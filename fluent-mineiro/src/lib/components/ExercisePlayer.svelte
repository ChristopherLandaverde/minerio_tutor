<script lang="ts">
  import { scoreExercise, processAnswer, type Exercise } from '$lib/exercises';
  import { getElevenLabsKey, getSelectedVoice, textToSpeech, playAudio } from '$lib/elevenlabs';

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
    listeningMode?: boolean;
  }

  let { exercises, onSessionEnd, listeningMode = false }: Props = $props();

  // Voice state
  let voiceAvailable = $state(false);
  let elevenKey = $state<string | null>(null);
  let speaking = $state(false);

  $effect(() => {
    getElevenLabsKey().then(key => {
      elevenKey = key;
      voiceAvailable = !!key;
    }).catch(() => {});
  });

  function getTextToSpeak(exercise: Exercise): string {
    return exercise.type === 'vocab' ? exercise.answer : exercise.prompt;
  }

  async function speakText(text: string) {
    if (!elevenKey || speaking) return;
    speaking = true;
    try {
      const blob = await textToSpeech(text, elevenKey);
      await playAudio(blob);
    } catch {} finally {
      speaking = false;
    }
  }

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

  // Listening mode: auto-play audio when exercise changes
  let listeningPlayed = $state(false);
  $effect(() => {
    if (listeningMode && voiceAvailable && current && !showFeedback) {
      listeningPlayed = false;
      speakText(getTextToSpeak(current)).then(() => { listeningPlayed = true; });
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !showFeedback && (listeningMode || (current?.type !== 'vocab' && current?.type !== 'multiple_choice' && current?.type !== 'true_false'))) {
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
      <div class="flex items-center justify-center gap-2 mb-4">
        <span class="text-xs uppercase tracking-wider text-cafe-muted font-semibold">
          {current.type === 'vocab' ? 'Vocabulário' : current.type === 'cloze' ? 'Cloze' : current.type === 'error_correction' ? 'Correção' : current.type === 'true_false' ? 'Verdadeiro ou Falso' : current.type === 'reorder' ? 'Reordene' : 'Quiz'} · {topicLabels[current.topic] || current.topic}
        </span>
        {#if voiceAvailable && !listeningMode}
          <button
            onclick={() => speakText(getTextToSpeak(current))}
            disabled={speaking}
            class="inline-flex items-center justify-center w-7 h-7 rounded-full border border-border hover:border-terracotta hover:bg-terracotta/5 transition-colors disabled:opacity-40"
            aria-label="Ouvir pronúncia"
            title="Ouvir pronúncia"
          >
            <svg class="w-3.5 h-3.5 text-cafe-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z"/></svg>
          </button>
        {/if}
      </div>

      {#if listeningMode && !showFeedback}
        <!-- Listening mode: audio-first prompt -->
        <div class="flex flex-col items-center gap-4 py-4">
          <div class="w-16 h-16 rounded-full bg-serra/10 flex items-center justify-center {speaking ? 'animate-pulse' : ''}">
            <svg class="w-8 h-8 text-serra" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-3.14a.75.75 0 011.28.53v12.72a.75.75 0 01-1.28.53l-4.72-3.14H3.75A.75.75 0 013 15v-6a.75.75 0 01.75-.75h3z"/></svg>
          </div>
          <p class="text-sm text-cafe-muted">Ouça e escreva o que você ouvir</p>
          <button
            onclick={() => speakText(getTextToSpeak(current))}
            disabled={speaking}
            class="px-4 py-2 border border-serra/30 text-serra text-sm font-semibold rounded-lg hover:bg-serra/5 transition-colors disabled:opacity-40"
          >
            {speaking ? 'Ouvindo...' : '🔊 Repetir'}
          </button>
        </div>
        <input
          bind:value={userAnswer}
          placeholder="Escreva o que ouviu..."
          class="w-64 px-4 py-3 border-2 border-border rounded-xl text-center font-body text-base bg-pedra focus:border-terracotta outline-none"
        />

      {:else if current.type === 'vocab'}
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
    {#if !showFeedback && (listeningMode || current.type === 'cloze' || current.type === 'error_correction' || current.type === 'reorder')}
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
              <div class="text-sm text-cafe-secondary mt-1 flex items-center gap-1.5 flex-wrap">
                Resposta: <strong class="text-serra">{current.answer}</strong>
                {#if voiceAvailable}
                  <button
                    onclick={() => speakText(current.answer)}
                    disabled={speaking}
                    class="inline-flex items-center gap-1 text-xs text-serra hover:underline disabled:opacity-40"
                  >
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z"/></svg>
                    Ouvir
                  </button>
                {/if}
              </div>
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
