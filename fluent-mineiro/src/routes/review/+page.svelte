<script lang="ts">
  import { onMount } from 'svelte';
  import { SEED_EXERCISES } from '$lib/content';
  import ExercisePlayer, { type SessionStats } from '$lib/components/ExercisePlayer.svelte';
  import type { Exercise } from '$lib/exercises';
  import { getDueReviewIds, startSession, endSession, updateStreak } from '$lib/db';
  import { applyAdaptation } from '$lib/adaptive';

  let exercises: Exercise[] = $state([]);
  let sessionId = $state<number | null>(null);
  let sessionDone = $state(false);
  let sessionStats = $state<SessionStats | null>(null);
  let sessionStreak = $state(0);
  let levelChange = $state<string | null>(null);
  let loaded = $state(false);

  onMount(async () => {
    try {
      const dueIds = await getDueReviewIds();
      const exerciseMap = new Map(SEED_EXERCISES.map(e => [e.id, e]));
      exercises = dueIds
        .map(id => exerciseMap.get(id))
        .filter((e): e is Exercise => e !== undefined)
        .sort(() => Math.random() - 0.5);
      if (exercises.length > 0) {
        sessionId = await startSession();
      }
    } catch {}
    loaded = true;
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
  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>

  {:else if exercises.length === 0}
    <h2 class="font-display text-2xl font-bold mb-1">🔄 Revisão</h2>
    <p class="text-[10px] text-cafe-muted/50 mb-2">Review</p>
    <p class="text-sm text-cafe-secondary mb-8">Spaced repetition — revise no tempo certo <span class="text-[10px] text-cafe-muted/50">Review at the right time</span></p>
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-4xl mb-4">✅</div>
      <h3 class="font-display text-xl font-bold mb-2">Tudo em dia!</h3>
      <p class="text-cafe-muted text-sm">Nenhuma revisão pendente. Volte mais tarde ou pratique uma lição nova.</p>
      <a href="/" class="inline-block mt-6 px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta/90 transition-colors">
        Praticar agora
      </a>
    </div>

  {:else if sessionDone && sessionStats}
    <div class="text-center py-12">
      <div class="text-5xl mb-4">🎉</div>
      <h2 class="font-display text-2xl font-bold mb-2">Revisão completa!</h2>
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

  {:else}
    <div class="flex items-center gap-3 mb-6">
      <span class="text-xs text-cafe-muted font-semibold">🔄 Revisão · {exercises.length} itens</span>
    </div>
    <ExercisePlayer {exercises} onSessionEnd={handleSessionEnd} />
  {/if}
</div>
