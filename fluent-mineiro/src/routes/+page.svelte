<script lang="ts">
  import { onMount } from 'svelte';
  import { getProfile, getDueReviewCount, getTodayStats } from '$lib/db';
  import { SEED_EXERCISES } from '$lib/content';

  let streak = $state(0);
  let totalXp = $state(0);
  let currentLevel = $state('A2');
  let dueReviews = $state(0);
  let todayTotal = $state(0);
  let todayCorrect = $state(0);
  let loaded = $state(false);

  onMount(async () => {
    try {
      streak = parseInt(await getProfile('streak') || '0');
      totalXp = parseInt(await getProfile('total_xp') || '0');
      currentLevel = await getProfile('current_level') || 'A2';
      dueReviews = await getDueReviewCount();
      const stats = await getTodayStats();
      todayTotal = stats.total;
      todayCorrect = stats.correct;
    } catch {
      // DB not ready yet
    }
    loaded = true;
  });

  const accuracy = $derived(todayTotal > 0 ? Math.round((todayCorrect / todayTotal) * 100) : 0);
  const xpProgress = $derived(Math.min(100, (totalXp % 1000) / 10));
</script>

<div class="max-w-3xl mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="font-display text-2xl font-bold">Bom dia!</h2>
      <p class="text-sm text-cafe-secondary">Nível {currentLevel} · Vamos praticar</p>
    </div>
    <div class="flex items-center gap-2 text-ouro font-bold">
      🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
    </div>
  </div>

  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <!-- XP Bar -->
    <div class="mb-6">
      <div class="flex justify-between text-xs text-cafe-muted mb-1">
        <span>Nível {currentLevel}</span>
        <span>{totalXp % 1000} / 1000 XP</span>
      </div>
      <div class="h-2 bg-pedra-subtle rounded-full overflow-hidden">
        <div class="h-full bg-serra rounded-full transition-all duration-500" style="width: {xpProgress}%"></div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-8">
      <div class="bg-white border border-border rounded-xl p-4 text-center">
        <div class="font-display text-2xl font-bold text-terracotta">{streak}</div>
        <div class="text-xs text-cafe-muted uppercase tracking-wider mt-1">Streak</div>
      </div>
      <div class="bg-white border border-border rounded-xl p-4 text-center">
        <div class="font-display text-2xl font-bold text-serra">{accuracy}%</div>
        <div class="text-xs text-cafe-muted uppercase tracking-wider mt-1">Acertos hoje</div>
      </div>
      <div class="bg-white border border-border rounded-xl p-4 text-center">
        <div class="font-display text-2xl font-bold text-ouro">{dueReviews}</div>
        <div class="text-xs text-cafe-muted uppercase tracking-wider mt-1">Revisões</div>
      </div>
    </div>

    <!-- Lesson Queue -->
    <h3 class="text-sm text-cafe-muted uppercase tracking-wider font-semibold mb-3">Prática de hoje</h3>
    <div class="space-y-3">
      <a href="/lesson?type=vocab" class="flex items-center justify-between p-4 bg-white border border-border rounded-xl hover:border-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-lg">📚</div>
          <div>
            <div class="font-semibold text-sm">Vocabulário: Comida & Mineiro</div>
            <div class="text-xs text-cafe-muted">{SEED_EXERCISES.filter(e => e.type === 'vocab').length} palavras</div>
          </div>
        </div>
        <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-pedra-subtle text-serra">A2</span>
      </a>

      <a href="/lesson?type=cloze" class="flex items-center justify-between p-4 bg-white border border-border rounded-xl hover:border-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center text-lg">✏️</div>
          <div>
            <div class="font-semibold text-sm">Cloze: Ser vs Estar & Preposições</div>
            <div class="text-xs text-cafe-muted">{SEED_EXERCISES.filter(e => e.type === 'cloze').length} exercícios</div>
          </div>
        </div>
        <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-pedra-subtle text-terracotta">Revisão</span>
      </a>

      <a href="/lesson?type=multiple_choice" class="flex items-center justify-between p-4 bg-white border border-border rounded-xl hover:border-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-lg">🧠</div>
          <div>
            <div class="font-semibold text-sm">Falsos Cognatos (PT vs ES)</div>
            <div class="text-xs text-cafe-muted">{SEED_EXERCISES.filter(e => e.type === 'multiple_choice').length} questões</div>
          </div>
        </div>
        <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-pedra-subtle text-info">Quiz</span>
      </a>
    </div>
  {/if}
</div>
