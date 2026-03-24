<script lang="ts">
  import { onMount } from 'svelte';
  import { SEED_EXERCISES } from '$lib/content';
  import { getElevenLabsKey, textToSpeech, playAudio, startNativeRecording, stopNativeRecording } from '$lib/elevenlabs';
  import { getApiKey } from '$lib/claude';
  import { startSession, endSession, updateStreak } from '$lib/db';
  import type { Exercise } from '$lib/exercises';

  let exercises: Exercise[] = $state([]);
  let currentIndex = $state(0);
  let elevenKey = $state<string | null>(null);
  let claudeKey = $state<string | null>(null);
  let loaded = $state(false);
  let sessionId = $state<number | null>(null);

  // Playback state
  let playing = $state(false);
  let speed = $state<0.75 | 1 | 1.25>(1);
  let step = $state<'listen' | 'record' | 'compare' | 'done'>('listen');

  // Recording state
  let recording = $state(false);
  let userAudioBlob = $state<Blob | null>(null);
  let nativeAudioBlob = $state<Blob | null>(null);

  const current = $derived(exercises[currentIndex]);
  const progress = $derived(exercises.length > 0 ? (currentIndex / exercises.length) * 100 : 0);

  onMount(async () => {
    elevenKey = await getElevenLabsKey();
    claudeKey = await getApiKey();

    // Pick vocab + cloze exercises with good shadowing sentences
    const candidates = SEED_EXERCISES.filter(e =>
      ['vocab', 'cloze'].includes(e.type) && e.answer.length > 3
    );
    exercises = candidates.sort(() => Math.random() - 0.5).slice(0, 20);
    loaded = true;
    startSession().then(id => { sessionId = id; }).catch(() => {});
  });

  function getTextForExercise(ex: Exercise): string {
    // For vocab: shadow the Portuguese answer
    // For cloze: shadow the full sentence (prompt with blank filled)
    if (ex.type === 'cloze') {
      return ex.prompt.replace(/___+/, ex.answer);
    }
    return ex.answer;
  }

  async function playNative() {
    if (!elevenKey || playing) return;
    playing = true;
    try {
      const text = getTextForExercise(current);
      const blob = await textToSpeech(text, elevenKey);
      nativeAudioBlob = blob;
      await playAudioAtSpeed(blob, speed);
    } catch {} finally {
      playing = false;
    }
  }

  async function playAudioAtSpeed(blob: Blob, rate: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = rate;
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(); };
      audio.play();
    });
  }

  async function startRecord() {
    if (recording) return;
    recording = true;
    userAudioBlob = null;
    try {
      await startNativeRecording();
    } catch {
      recording = false;
    }
  }

  async function stopRecord() {
    if (!recording || !elevenKey) return;
    recording = false;
    try {
      // stopNativeRecording returns transcription, but we also want the audio
      // For shadowing, we just need the recording to play back
      // Use the transcription result but don't need it for comparison display
      await stopNativeRecording(elevenKey);
      // Mark that we recorded (even if we can't play it back due to the Rust pipeline)
      step = 'compare';
    } catch {
      step = 'compare'; // Continue anyway so user can re-listen to native
    }
  }

  async function playComparison() {
    if (!nativeAudioBlob || playing) return;
    playing = true;
    try {
      // Play native audio so user can compare mentally with what they just said
      await playAudioAtSpeed(nativeAudioBlob, speed);
    } catch {} finally {
      playing = false;
    }
  }

  function nextSentence() {
    if (currentIndex + 1 >= exercises.length) {
      step = 'done';
      if (sessionId) endSession(sessionId, exercises.length, exercises.length, exercises.length * 5).catch(() => {});
      updateStreak().catch(() => {});
      return;
    }
    currentIndex++;
    step = 'listen';
    userAudioBlob = null;
    nativeAudioBlob = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') window.location.href = '/';
    if (e.key === ' ' && step !== 'done') {
      e.preventDefault();
      if (step === 'listen') { playNative().then(() => { step = 'record'; }); }
      else if (step === 'record' && !recording) { startRecord(); }
      else if (step === 'record' && recording) { stopRecord(); }
      else if (step === 'compare') { nextSentence(); }
    }
    if (e.key === 'Enter' && step === 'compare') nextSentence();
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
  {:else if !elevenKey}
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-3xl mb-3">🔇</div>
      <p class="text-sm text-cafe-muted">Configure sua chave ElevenLabs em Configurações para usar o modo shadowing.</p>
      <a href="/settings" class="inline-block mt-4 px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta-dark transition-colors">
        Ir para Configurações
      </a>
    </div>
  {:else if step === 'done'}
    <div class="text-center py-12">
      <div class="text-5xl mb-4">🎉</div>
      <h2 class="font-display text-2xl font-bold mb-2">Shadowing completo!</h2>
      <p class="text-sm text-cafe-secondary mb-6">{exercises.length} frases praticadas</p>
      <a href="/" class="inline-flex px-6 py-3 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors">
        Voltar ao Dashboard
      </a>
    </div>
  {:else if current}
    <!-- Progress -->
    <div class="h-1 bg-pedra-subtle rounded-full mb-6 overflow-hidden">
      <div class="h-full bg-serra rounded-full transition-all duration-300" style="width: {progress}%"></div>
    </div>

    <!-- Shadowing Card -->
    <div class="bg-white border border-border rounded-2xl overflow-hidden">
      <div class="p-8 text-center">
        <div class="text-xs uppercase tracking-wider text-cafe-muted font-semibold mb-2">
          Shadowing · {currentIndex + 1}/{exercises.length}
        </div>

        <!-- Speed selector -->
        <div class="flex justify-center gap-2 mb-6">
          {#each [0.75, 1, 1.25] as s}
            <button
              onclick={() => speed = s as 0.75 | 1 | 1.25}
              class="px-3 py-1 rounded-full text-xs font-semibold transition-colors {speed === s
                ? 'bg-serra text-white'
                : 'bg-pedra-subtle text-cafe-muted hover:bg-pedra'}"
            >
              {s}x
            </button>
          {/each}
        </div>

        <!-- Step: Listen -->
        {#if step === 'listen'}
          <div class="flex flex-col items-center gap-4 py-4">
            <div class="w-20 h-20 rounded-full bg-serra/10 flex items-center justify-center {playing ? 'animate-pulse' : ''}">
              <svg class="w-10 h-10 text-serra" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-3.14a.75.75 0 011.28.53v12.72a.75.75 0 01-1.28.53l-4.72-3.14H3.75A.75.75 0 013 15v-6a.75.75 0 01.75-.75h3z"/>
              </svg>
            </div>
            <p class="font-display text-lg font-semibold text-cafe">{current.prompt}</p>
            <p class="text-xs text-cafe-muted">Ouça a pronúncia nativa</p>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              onmousedown={() => playNative().then(() => { step = 'record'; })}
              class="inline-flex items-center gap-2 px-6 py-3 bg-serra text-white font-semibold rounded-xl hover:bg-serra-dark transition-colors cursor-pointer select-none"
            >
              {playing ? 'Ouvindo...' : '🔊 Ouvir'}
              <kbd class="text-[10px] px-1.5 py-0.5 bg-white/20 rounded font-mono">espaço</kbd>
            </div>
          </div>

        <!-- Step: Record -->
        {:else if step === 'record'}
          <div class="flex flex-col items-center gap-4 py-4">
            <div class="w-20 h-20 rounded-full {recording ? 'bg-error/20 animate-pulse' : 'bg-terracotta/10'} flex items-center justify-center">
              <svg class="w-10 h-10 {recording ? 'text-error' : 'text-terracotta'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
              </svg>
            </div>
            <p class="font-mono text-xl font-medium text-serra">{getTextForExercise(current)}</p>
            <p class="text-xs text-cafe-muted">
              {recording ? 'Gravando... pressione espaço para parar' : 'Agora repita! Pressione espaço para gravar'}
            </p>
            {#if current.mineiro_note}
              <div class="px-3 py-2 bg-ouro/10 rounded-lg text-xs text-ouro">
                💛 {current.mineiro_note}
              </div>
            {/if}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              onmousedown={() => recording ? stopRecord() : startRecord()}
              class="inline-flex items-center gap-2 px-6 py-3 {recording ? 'bg-error' : 'bg-terracotta'} text-white font-semibold rounded-xl transition-colors cursor-pointer select-none {recording ? 'animate-pulse' : 'hover:bg-terracotta-dark'}"
            >
              {recording ? '⏹ Parar' : '🎤 Gravar'}
              <kbd class="text-[10px] px-1.5 py-0.5 bg-white/20 rounded font-mono">espaço</kbd>
            </div>
            <button
              onclick={() => { step = 'compare'; }}
              class="text-xs text-cafe-muted hover:text-cafe transition-colors"
            >
              Pular gravação →
            </button>
          </div>

        <!-- Step: Compare -->
        {:else if step === 'compare'}
          <div class="flex flex-col items-center gap-4 py-4">
            <div class="w-20 h-20 rounded-full bg-ouro/10 flex items-center justify-center">
              <span class="text-3xl">🔄</span>
            </div>
            <p class="font-mono text-xl font-medium text-serra">{getTextForExercise(current)}</p>
            <p class="text-sm text-cafe-secondary">{current.explanation}</p>

            <div class="flex gap-3">
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                onmousedown={playComparison}
                class="inline-flex items-center gap-2 px-4 py-2 border border-serra/30 text-serra text-sm font-semibold rounded-lg hover:bg-serra/5 transition-colors cursor-pointer select-none"
              >
                {playing ? 'Ouvindo...' : '🔊 Ouvir de novo'}
              </div>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                onmousedown={() => { step = 'record'; }}
                class="inline-flex items-center gap-2 px-4 py-2 border border-terracotta/30 text-terracotta text-sm font-semibold rounded-lg hover:bg-terracotta/5 transition-colors cursor-pointer select-none"
              >
                🎤 Tentar de novo
              </div>
            </div>

            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              onmousedown={nextSentence}
              class="inline-flex items-center gap-2 px-6 py-3 bg-serra text-white font-semibold rounded-xl hover:bg-serra-dark transition-colors cursor-pointer select-none"
            >
              Próxima →
              <kbd class="text-[10px] px-1.5 py-0.5 bg-white/20 rounded font-mono">espaço</kbd>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="text-center mt-4 text-xs text-cafe-muted">
      Esc para sair · Espaço para avançar
    </div>
  {/if}
</div>
