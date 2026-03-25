<script lang="ts">
  import { onMount } from 'svelte';
  import ExercisePlayer, { type SessionStats } from '$lib/components/ExercisePlayer.svelte';
  import type { Exercise } from '$lib/exercises';
  import { getDb, startSession, endSession, updateStreak } from '$lib/db';
  import { applyAdaptation } from '$lib/adaptive';
  import { planSession } from '$lib/session-planner';
  import { checkAchievements, type AchievementStatus } from '$lib/achievements';
  import { updateChallengeProgress } from '$lib/challenges';
  import { checkSlangTriggers } from '$lib/journal';

  let exercises: Exercise[] = $state([]);
  let sessionId = $state<number | null>(null);
  let sessionDone = $state(false);
  let sessionStats = $state<SessionStats | null>(null);
  let sessionStreak = $state(0);
  let levelChange = $state<string | null>(null);
  let loaded = $state(false);
  let error = $state(false);

  // Achievement celebration
  let newAchievements = $state<AchievementStatus[]>([]);
  let showCelebration = $state(false);
  let celebrationIndex = $state(0);

  let errorMsg = $state('');

  onMount(async () => {
    try {
      const db = await getDb();
      const plan = await planSession(db);
      exercises = plan.exercises;
      if (exercises.length > 0) {
        sessionId = await startSession();
      }
    } catch (e: any) {
      error = true;
      errorMsg = e?.message || String(e);
      console.error('Session planner error:', e);
    }
    loaded = true;
  });

  async function handleSessionEnd(stats: SessionStats) {
    sessionStats = stats;
    sessionDone = true;
    try {
      if (sessionId) await endSession(sessionId, stats.total, stats.correct, stats.xp);
      sessionStreak = await updateStreak();
      const newLevel = await applyAdaptation();
      const currentLevel = exercises[0]?.cefr_level || 'A2';
      if (newLevel !== currentLevel) levelChange = newLevel;

      // Check achievements
      newAchievements = await checkAchievements({ total: stats.total, correct: stats.correct });
      if (newAchievements.length > 0) {
        showCelebration = true;
        celebrationIndex = 0;
      }

      // Update challenge progress
      await updateChallengeProgress(stats.total);

      // Check slang triggers (streak-based, exercise-count-based)
      await checkSlangTriggers();
    } catch {}
  }

  function dismissCelebration() {
    if (celebrationIndex < newAchievements.length - 1) {
      celebrationIndex++;
    } else {
      showCelebration = false;
    }
  }

  function handleCelebrationKeydown(e: KeyboardEvent) {
    if (showCelebration && (e.key === 'Escape' || e.key === 'Enter')) {
      dismissCelebration();
    }
  }
</script>

<svelte:window onkeydown={showCelebration ? handleCelebrationKeydown : undefined} />

<div class="max-w-xl mx-auto p-6">
  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>

  {:else if error}
    <div class="bg-white border border-error/20 rounded-xl p-8 text-center">
      <div class="text-3xl mb-3">😕</div>
      <h3 class="font-display text-lg font-bold mb-2">Erro ao carregar sessão</h3>
      <p class="text-sm text-cafe-muted mb-2">Não foi possível montar sua sessão de hoje.</p>
      {#if errorMsg}
        <p class="text-xs text-error font-mono bg-error/5 p-2 rounded mb-4 break-all">{errorMsg}</p>
      {/if}
      <a href="/" class="inline-block px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta-dark transition-colors">
        Voltar ao Dashboard
      </a>
    </div>

  {:else if exercises.length === 0}
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-4xl mb-4">✅</div>
      <h3 class="font-display text-xl font-bold mb-2">Tudo em dia!</h3>
      <p class="text-cafe-muted text-sm">Nenhum exercício pendente! Tente o modo conversa ou escrita, ou volte amanhã.</p>
      <div class="flex gap-3 justify-center mt-6">
        <a href="/conversation" class="px-5 py-2.5 border border-border font-semibold rounded-lg hover:bg-pedra-subtle transition-colors text-sm">
          💬 Conversa
        </a>
        <a href="/writing" class="px-5 py-2.5 border border-border font-semibold rounded-lg hover:bg-pedra-subtle transition-colors text-sm">
          ✍️ Escrita
        </a>
      </div>
    </div>

  {:else if sessionDone && sessionStats}
    <!-- Session Complete -->
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
        </div>
      {/if}
      {#if newAchievements.length > 0 && !showCelebration}
        <div class="mb-6 px-4 py-3 bg-ouro/10 border border-ouro/20 rounded-xl">
          <p class="text-sm font-semibold text-ouro">{newAchievements.length} conquista{newAchievements.length > 1 ? 's' : ''} desbloqueada{newAchievements.length > 1 ? 's' : ''}!</p>
        </div>
      {/if}
      <a href="/" class="inline-flex px-6 py-3 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors">
        Voltar ao Dashboard
      </a>
    </div>

  {:else}
    <ExercisePlayer {exercises} onSessionEnd={handleSessionEnd} />
  {/if}
</div>

<!-- Achievement Celebration Overlay -->
{#if showCelebration && newAchievements[celebrationIndex]}
  {@const badge = newAchievements[celebrationIndex]}
  <div
    class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-24"
    role="dialog"
    aria-modal="true"
    aria-labelledby="celebration-title"
    tabindex="-1"
  >
    <button
      class="absolute inset-0 w-full h-full cursor-default"
      onclick={dismissCelebration}
      aria-label="Fechar"
    ></button>
    <div
      class="relative max-w-sm w-full mx-4 bg-white rounded-2xl p-8 text-center shadow-xl z-10"
    >
      <div class="text-5xl mb-4">{badge.icon}</div>
      <p id="celebration-title" class="font-display text-2xl font-bold text-ouro">Parabéns!</p>
      <p class="font-semibold text-base text-cafe mt-2">{badge.title}</p>
      <span class="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-semibold
        {badge.tier === 'gold' ? 'bg-ouro/20 text-ouro' : badge.tier === 'silver' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}">
        {badge.tier}
      </span>
      <p class="text-sm text-cafe-secondary mt-3">{badge.description}</p>
      <button
        onclick={dismissCelebration}
        class="mt-6 px-8 py-2.5 bg-serra text-white font-semibold rounded-xl hover:bg-serra-dark transition-colors"
      >
        Continuar
      </button>
      {#if newAchievements.length > 1}
        <div class="flex gap-1.5 justify-center mt-4">
          {#each newAchievements as _, i}
            <button
              onclick={(e) => { e.stopPropagation(); celebrationIndex = i; }}
              class="w-2 h-2 rounded-full p-3 transition-colors {i === celebrationIndex ? 'bg-serra' : 'bg-pedra-subtle'}"
              aria-label="Badge {i + 1}"
            ></button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
