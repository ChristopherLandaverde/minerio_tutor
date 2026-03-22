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

  const topicMeta: Record<string, { label: string; icon: string; bg: string }> = {
    food: { label: 'Comida Mineira', icon: '🍽️', bg: 'bg-green-50' },
    mineiro: { label: 'Expressões Mineiras', icon: '🏔️', bg: 'bg-amber-50' },
    greetings: { label: 'Cumprimentos', icon: '👋', bg: 'bg-blue-50' },
    travel: { label: 'Viagem & Direções', icon: '🗺️', bg: 'bg-sky-50' },
    family: { label: 'Família', icon: '👨‍👩‍👧', bg: 'bg-pink-50' },
    daily_routine: { label: 'Rotina Diária', icon: '☀️', bg: 'bg-orange-50' },
    body_health: { label: 'Corpo & Saúde', icon: '🏥', bg: 'bg-red-50' },
    emotions: { label: 'Emoções', icon: '💛', bg: 'bg-yellow-50' },
    shopping: { label: 'Compras', icon: '🛍️', bg: 'bg-purple-50' },
    work: { label: 'Trabalho', icon: '💼', bg: 'bg-slate-50' },
    ser_estar: { label: 'Ser vs Estar', icon: '⚖️', bg: 'bg-indigo-50' },
    verbs_present: { label: 'Verbos: Presente', icon: '📝', bg: 'bg-emerald-50' },
    verbs_past: { label: 'Verbos: Passado', icon: '⏮️', bg: 'bg-teal-50' },
    prepositions: { label: 'Preposições', icon: '🔗', bg: 'bg-cyan-50' },
    false_cognates: { label: 'Falsos Cognatos (PT vs ES)', icon: '⚠️', bg: 'bg-rose-50' },
    mineiro_vs_standard: { label: 'Mineiro vs Padrão', icon: '🗣️', bg: 'bg-amber-50' },
    cultural: { label: 'Cultura Mineira', icon: '🎭', bg: 'bg-violet-50' },
    error_correction: { label: 'Correção de Erros', icon: '🔧', bg: 'bg-orange-50' },
  };

  const typeMeta: Record<string, { label: string; badge: string; badgeColor: string }> = {
    vocab: { label: 'Vocabulário', badge: 'palavras', badgeColor: 'text-serra' },
    cloze: { label: 'Gramática', badge: 'exercícios', badgeColor: 'text-terracotta' },
    multiple_choice: { label: 'Quiz', badge: 'questões', badgeColor: 'text-info' },
    error_correction: { label: 'Correção', badge: 'exercícios', badgeColor: 'text-ouro' },
  };

  interface LessonCard { type: string; topic: string; count: number; cefr: string }

  const lessonCards = $derived(
    Object.entries(
      SEED_EXERCISES.reduce((acc, e) => {
        const key = `${e.type}:${e.topic}`;
        if (!acc[key]) acc[key] = { type: e.type, topic: e.topic, count: 0, cefr: e.cefr_level };
        acc[key].count++;
        return acc;
      }, {} as Record<string, LessonCard>)
    ).map(([, v]) => v)
  );

  const typeOrder = ['vocab', 'cloze', 'multiple_choice', 'error_correction'];
  const groupedByType = $derived(
    typeOrder.map(t => ({
      type: t,
      meta: typeMeta[t],
      cards: lessonCards.filter(c => c.type === t),
    })).filter(g => g.cards.length > 0)
  );
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
    {#each groupedByType as group}
      <h3 class="text-sm text-cafe-muted uppercase tracking-wider font-semibold mb-3 {group.type !== 'vocab' ? 'mt-6' : ''}">{group.meta.label}</h3>
      <div class="space-y-2">
        {#each group.cards as card}
          {@const tm = topicMeta[card.topic] || { label: card.topic, icon: '📖', bg: 'bg-gray-50' }}
          <a href="/lesson?type={card.type}&topic={card.topic}" class="flex items-center justify-between p-3.5 bg-white border border-border rounded-xl hover:border-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 {tm.bg} rounded-lg flex items-center justify-center text-base">{tm.icon}</div>
              <div>
                <div class="font-semibold text-sm">{tm.label}</div>
                <div class="text-xs text-cafe-muted">{card.count} {group.meta.badge}</div>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-pedra-subtle {group.meta.badgeColor}">{card.cefr}</span>
          </a>
        {/each}
      </div>
    {/each}
  {/if}
</div>
