<script lang="ts">
  import { onMount } from 'svelte';
  import { getProfile, getDueReviewCount, getTotalAttempts, getMistakePatterns, getSessionHistory, getStreakCalendar } from '$lib/db';
  import { SEED_EXERCISES } from '$lib/content';
  import { computeAdaptiveState } from '$lib/adaptive';

  let loaded = $state(false);
  let totalXp = $state(0);
  let streak = $state(0);
  let currentLevel = $state('A2');
  let dueReviews = $state(0);
  let totalAttempts = $state(0);
  let totalCorrect = $state(0);
  let exercisesSeen = $state(0);
  let rollingAccuracy = $state(0);
  let recommendation = $state<string>('stay');
  let mistakes = $state<{ mistake_type: string; count: number }[]>([]);
  let sessions = $state<{ date: string; exercises: number; correct: number; xp: number }[]>([]);
  let calendarData = $state<Map<string, number>>(new Map());

  const totalExercises = SEED_EXERCISES.length;

  // Count exercises by type
  const typeCounts = Object.entries(
    SEED_EXERCISES.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  // Count exercises by CEFR level
  const cefrCounts = Object.entries(
    SEED_EXERCISES.reduce((acc, e) => {
      acc[e.cefr_level] = (acc[e.cefr_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([a], [b]) => a.localeCompare(b));

  const typeLabels: Record<string, string> = {
    vocab: 'Vocabulário',
    cloze: 'Gramática',
    multiple_choice: 'Quiz',
    error_correction: 'Correção',
  };

  const mistakeLabels: Record<string, string> = {
    spanish_interference: 'Interferência do Espanhol',
    grammar: 'Gramática',
    vocabulary: 'Vocabulário',
  };

  onMount(async () => {
    try {
      totalXp = parseInt(await getProfile('total_xp') || '0');
      streak = parseInt(await getProfile('streak') || '0');
      currentLevel = await getProfile('current_level') || 'A2';
      dueReviews = await getDueReviewCount();
      const stats = await getTotalAttempts();
      totalAttempts = stats.total;
      totalCorrect = stats.correct;
      exercisesSeen = stats.exerciseCount;
      mistakes = await getMistakePatterns();
      sessions = await getSessionHistory();
      const cal = await getStreakCalendar(90);
      calendarData = new Map(cal.map(d => [d.date, d.count]));
      const adaptive = await computeAdaptiveState();
      rollingAccuracy = Math.round(adaptive.rollingAccuracy * 100);
      recommendation = adaptive.recommendation;
    } catch {
      // DB not ready
    }
    loaded = true;
  });

  const overallAccuracy = $derived(totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0);
  const coveragePercent = $derived(Math.round((exercisesSeen / totalExercises) * 100));
</script>

<div class="max-w-3xl mx-auto p-6">
  <h2 class="font-display text-2xl font-bold mb-1">📊 Progresso</h2>
  <p class="text-[10px] text-cafe-muted/50 mb-2">Progress</p>
  <p class="text-sm text-cafe-secondary mb-6">Seu desempenho e estatísticas <span class="text-[10px] text-cafe-muted/50">Your stats & performance</span></p>

  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-24 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <!-- Overview Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <div class="bg-white border border-border rounded-xl p-4 text-center">
        <div class="font-display text-2xl font-bold text-terracotta">{totalXp}</div>
        <div class="text-xs text-cafe-muted uppercase tracking-wider mt-1">XP Total</div>
      </div>
      <div class="bg-white border border-border rounded-xl p-4 text-center">
        <div class="font-display text-2xl font-bold text-ouro">🔥 {streak}</div>
        <div class="text-xs text-cafe-muted uppercase tracking-wider mt-1">Streak</div>
      </div>
      <div class="bg-white border border-border rounded-xl p-4 text-center">
        <div class="font-display text-2xl font-bold text-serra">{overallAccuracy}%</div>
        <div class="text-xs text-cafe-muted uppercase tracking-wider mt-1">Precisão</div>
      </div>
      <div class="bg-white border border-border rounded-xl p-4 text-center">
        <div class="font-display text-2xl font-bold text-info">{totalAttempts}</div>
        <div class="text-xs text-cafe-muted uppercase tracking-wider mt-1">Respostas</div>
      </div>
    </div>

    <!-- CEFR Level & Adaptive -->
    <!-- Streak Calendar -->
    <div class="bg-white border border-border rounded-xl p-5 mb-6">
      <h3 class="font-semibold text-sm mb-3">Calendário de Prática (90 dias)</h3>
      <div class="grid grid-cols-13 gap-1">
        {#each Array(91) as _item, i}
          {@const d = new Date(Date.now() - (90 - i) * 86400000)}
          {@const dateStr = d.toISOString().split('T')[0]}
          {@const count = calendarData.get(dateStr) || 0}
          {@const isToday = i === 90}
          <div
            class="w-full aspect-square rounded-sm {isToday ? 'ring-1 ring-terracotta' : ''} {count === 0 ? 'bg-pedra-subtle' : count < 5 ? 'bg-serra/30' : count < 15 ? 'bg-serra/60' : 'bg-serra'}"
            title="{dateStr}: {count} exercícios"
          ></div>
        {/each}
      </div>
      <div class="flex items-center justify-end gap-2 mt-2 text-xs text-cafe-muted">
        <span>Menos</span>
        <div class="w-3 h-3 rounded-sm bg-pedra-subtle"></div>
        <div class="w-3 h-3 rounded-sm bg-serra/30"></div>
        <div class="w-3 h-3 rounded-sm bg-serra/60"></div>
        <div class="w-3 h-3 rounded-sm bg-serra"></div>
        <span>Mais</span>
      </div>
    </div>

    <!-- CEFR Level -->
    <div class="bg-white border border-border rounded-xl p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Nível CEFR</h3>
        <span class="text-lg font-display font-bold text-serra">{currentLevel}</span>
      </div>
      <div class="flex gap-1 mb-3">
        {#each ['A1', 'A2', 'B1', 'B2', 'C1'] as level}
          <div class="flex-1 h-2 rounded-full {level <= currentLevel ? 'bg-serra' : 'bg-pedra-subtle'}"></div>
        {/each}
      </div>
      <div class="flex items-center justify-between text-xs text-cafe-muted">
        <span>Precisão recente: {rollingAccuracy}%</span>
        <span>
          {#if recommendation === 'up'}
            📈 Pronto para subir
          {:else if recommendation === 'down'}
            📉 Precisa reforçar
          {:else}
            ✅ Nível adequado
          {/if}
        </span>
      </div>
    </div>

    <!-- Content Coverage -->
    <div class="bg-white border border-border rounded-xl p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Cobertura de Conteúdo</h3>
        <span class="text-xs text-cafe-muted">{exercisesSeen}/{totalExercises} exercícios praticados</span>
      </div>
      <div class="h-3 bg-pedra-subtle rounded-full overflow-hidden mb-4">
        <div class="h-full bg-terracotta rounded-full transition-all duration-500" style="width: {coveragePercent}%"></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        {#each typeCounts as [type, count]}
          <div class="flex items-center justify-between text-sm">
            <span class="text-cafe-secondary">{typeLabels[type] || type}</span>
            <span class="font-semibold">{count}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- CEFR Content Breakdown -->
    <div class="bg-white border border-border rounded-xl p-5 mb-6">
      <h3 class="font-semibold text-sm mb-3">Exercícios por Nível</h3>
      <div class="space-y-2">
        {#each cefrCounts as [level, count]}
          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold w-8 text-cafe-secondary">{level}</span>
            <div class="flex-1 h-2.5 bg-pedra-subtle rounded-full overflow-hidden">
              <div class="h-full bg-serra rounded-full" style="width: {(count / totalExercises) * 100}%"></div>
            </div>
            <span class="text-xs text-cafe-muted w-8 text-right">{count}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Mistake Patterns -->
    {#if mistakes.length > 0}
      <div class="bg-white border border-border rounded-xl p-5 mb-6">
        <h3 class="font-semibold text-sm mb-3">Padrões de Erros</h3>
        <div class="space-y-2">
          {#each mistakes as { mistake_type, count }}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-sm">{mistake_type === 'spanish_interference' ? '🇪🇸' : '📝'}</span>
                <span class="text-sm text-cafe-secondary">{mistakeLabels[mistake_type] || mistake_type}</span>
              </div>
              <span class="text-sm font-semibold text-error">{count}x</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Session History -->
    {#if sessions.length > 0}
      <div class="bg-white border border-border rounded-xl p-5 mb-6">
        <h3 class="font-semibold text-sm mb-3">Histórico de Sessões (últimos 14 dias)</h3>
        <div class="space-y-2">
          {#each sessions as session}
            {@const acc = session.exercises > 0 ? Math.round((session.correct / session.exercises) * 100) : 0}
            <div class="flex items-center justify-between py-1.5 border-b border-pedra-subtle last:border-0">
              <span class="text-sm text-cafe-secondary">{session.date}</span>
              <div class="flex items-center gap-4 text-sm">
                <span>{session.exercises} exercícios</span>
                <span class="{acc >= 70 ? 'text-serra' : acc >= 40 ? 'text-ouro' : 'text-error'} font-semibold">{acc}%</span>
                <span class="text-ouro font-semibold">+{session.xp} XP</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="bg-white border border-border rounded-xl p-8 text-center">
        <div class="text-3xl mb-3">📈</div>
        <p class="text-cafe-muted text-sm">Complete sua primeira sessão para ver estatísticas aqui.</p>
        <a href="/" class="inline-block mt-4 px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta/90 transition-colors">
          Começar a praticar
        </a>
      </div>
    {/if}

    <!-- Review Status -->
    <div class="bg-white border border-border rounded-xl p-5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-sm">Revisões Pendentes</h3>
          <p class="text-xs text-cafe-muted mt-0.5">Itens prontos para revisão (SM-2)</p>
        </div>
        {#if dueReviews > 0}
          <a href="/review" class="px-4 py-2 bg-terracotta text-white text-sm font-semibold rounded-lg hover:bg-terracotta/90 transition-colors">
            Revisar {dueReviews} {dueReviews === 1 ? 'item' : 'itens'}
          </a>
        {:else}
          <span class="text-sm text-serra font-semibold">✅ Em dia</span>
        {/if}
      </div>
    </div>
  {/if}
</div>
