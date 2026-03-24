<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { SEED_EXERCISES } from '$lib/content';
  import ExercisePlayer, { type SessionStats } from '$lib/components/ExercisePlayer.svelte';
  import type { Exercise } from '$lib/exercises';
  import { startSession, endSession, updateStreak } from '$lib/db';
  import { applyAdaptation } from '$lib/adaptive';

  let exercises: Exercise[] = $state([]);
  let sessionId = $state<number | null>(null);
  let sessionDone = $state(false);
  let sessionStats = $state<SessionStats | null>(null);
  let sessionStreak = $state(0);
  let levelChange = $state<string | null>(null);
  let loaded = $state(false);
  let listening = $state(false);

  // Track URL to detect navigation between lesson types
  let lastUrl = $state('');

  $effect(() => {
    const url = page.url.toString();
    if (url === lastUrl) return; // same URL, don't re-init
    lastUrl = url;

    const type = page.url.searchParams.get('type') || 'vocab';
    const topic = page.url.searchParams.get('topic');
    listening = page.url.searchParams.get('mode') === 'listening';
    let filtered = SEED_EXERCISES.filter(e => e.type === type && (!topic || e.topic === topic));
    if (listening) {
      filtered = filtered.filter(e => ['vocab', 'cloze'].includes(e.type));
    }
    exercises = filtered.sort(() => Math.random() - 0.5);
    sessionDone = false;
    sessionStats = null;
    loaded = true;
    startSession().then(id => { sessionId = id; }).catch(() => {});
  });

  async function handleSessionEnd(stats: SessionStats) {
    sessionStats = stats;
    sessionDone = true;
    try {
      if (sessionId) await endSession(sessionId, stats.total, stats.correct, stats.xp);
      sessionStreak = await updateStreak();
      const prevLevel = exercises[0]?.cefr_level || 'A2';
      const newLevel = await applyAdaptation();
      if (newLevel !== prevLevel) levelChange = newLevel;
    } catch {}
  }
</script>

<div class="max-w-xl mx-auto p-6">
  {#if sessionDone && sessionStats}
    <div class="text-center py-12">
      <div class="text-5xl mb-4">🎉</div>
      <h2 class="font-display text-2xl font-bold mb-2">Sessão completa!</h2>
      <div class="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
        <div class="bg-white border border-border rounded-xl p-3 text-center">
          <div class="font-display text-xl font-bold text-serra">{sessionStats.correct}/{sessionStats.total}</div>
          <div class="text-xs text-cafe-muted">Corretas</div>
        </div>
        <div class="bg-white border border-border rounded-xl p-3 text-center">
          <div class="font-display text-xl font-bold text-ouro">+{sessionStats.xp}</div>
          <div class="text-xs text-cafe-muted">XP</div>
        </div>
        <div class="bg-white border border-border rounded-xl p-3 text-center">
          <div class="font-display text-xl font-bold text-terracotta">🔥 {sessionStreak}</div>
          <div class="text-xs text-cafe-muted">Streak</div>
        </div>
      </div>
      {#if levelChange}
        <div class="mb-6 px-4 py-3 bg-ouro/15 border border-ouro/30 rounded-xl text-center">
          <span class="text-lg font-bold text-ouro">🎯 Nível atualizado para {levelChange}!</span>
          <p class="text-xs text-cafe-secondary mt-1">Sua precisão mudou — o conteúdo vai se adaptar.</p>
        </div>
      {/if}
      <a href="/" class="inline-flex px-6 py-3 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors">
        Voltar ao Dashboard
      </a>
    </div>
  {:else if exercises.length > 0}
    <ExercisePlayer {exercises} onSessionEnd={handleSessionEnd} listeningMode={listening} />
  {:else if loaded}
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-3xl mb-3">📚</div>
      <p class="text-sm text-cafe-muted">Nenhum exercício encontrado para este tipo/tópico.</p>
      <a href="/" class="inline-block mt-4 px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta-dark transition-colors">
        Voltar ao Dashboard
      </a>
    </div>
  {:else}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {/if}
</div>
