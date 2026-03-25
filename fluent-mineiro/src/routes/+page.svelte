<script lang="ts">
  import { onMount } from 'svelte';
  import { getDb, getProfile, getDueReviewCount, getTodayStats } from '$lib/db';
  import { SEED_EXERCISES } from '$lib/content';
  import { planSession, type SessionPlan } from '$lib/session-planner';
  import { generateCoachingNote, getApiKey } from '$lib/claude';
  import { getMistakePatterns } from '$lib/db';
  import { getActiveChallenges, type Challenge } from '$lib/challenges';
  import { getElevenLabsKey } from '$lib/elevenlabs';

  let streak = $state(0);
  let totalXp = $state(0);
  let currentLevel = $state('A2');
  let dueReviews = $state(0);
  let todayTotal = $state(0);
  let todayCorrect = $state(0);
  let dailyGoal = $state(15);
  let loaded = $state(false);

  // Session planner
  let sessionPlan = $state<SessionPlan | null>(null);
  let coachingNote = $state<string | null>(null);
  let noteLoading = $state(true);

  // Challenges
  let challenges = $state<Challenge[]>([]);

  // Voice
  let hasVoice = $state(false);

  onMount(async () => {
    try {
      streak = parseInt(await getProfile('streak') || '0');
      totalXp = parseInt(await getProfile('total_xp') || '0');
      currentLevel = await getProfile('current_level') || 'A2';
      dailyGoal = parseInt(await getProfile('daily_goal') || '15');
      dueReviews = await getDueReviewCount();
      const stats = await getTodayStats();
      todayTotal = stats.total;
      todayCorrect = stats.correct;

      // Plan today's session
      const db = await getDb();
      sessionPlan = await planSession(db);

      // Load challenges
      challenges = await getActiveChallenges();

      // Check voice availability
      hasVoice = !!(await getElevenLabsKey());
    } catch {}
    loaded = true;

    // Load coaching note async (don't block dashboard)
    loadCoachingNote();
  });

  async function loadCoachingNote() {
    try {
      const mistakeRows = await getMistakePatterns();
      const patterns = mistakeRows.map(m => m.mistake_type);
      const topics = sessionPlan?.exercises.slice(0, 5).map(e => e.topic) || [];
      const uniqueTopics = [...new Set(topics)];
      coachingNote = await generateCoachingNote({
        mistakePatterns: patterns,
        currentLevel,
        streak,
        todayTopics: uniqueTopics,
      });
    } catch {
      coachingNote = null;
    }
    noteLoading = false;
  }

  const accuracy = $derived(todayTotal > 0 ? Math.round((todayCorrect / todayTotal) * 100) : 0);
  const xpProgress = $derived(Math.min(100, (totalXp % 1000) / 10));
  const goalProgress = $derived(Math.min(100, (todayTotal / dailyGoal) * 100));
  const goalMet = $derived(todayTotal >= dailyGoal);

  // CEFR progress map data
  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const cefrOrder = $derived(cefrLevels.map(level => ({
    level,
    isCurrent: level === currentLevel,
    isPast: cefrLevels.indexOf(level) < cefrLevels.indexOf(currentLevel),
    isFuture: cefrLevels.indexOf(level) > cefrLevels.indexOf(currentLevel),
  })));

  // Lesson cards (existing)
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
    transport: { label: 'Transporte', icon: '🚌', bg: 'bg-zinc-50' },
    clothing: { label: 'Roupas', icon: '👕', bg: 'bg-fuchsia-50' },
    sports_leisure: { label: 'Esportes & Lazer', icon: '⚽', bg: 'bg-green-50' },
    food_drinks: { label: 'Comida & Bebida', icon: '🍹', bg: 'bg-amber-50' },
    nature: { label: 'Natureza & Animais', icon: '🌿', bg: 'bg-lime-50' },
    house: { label: 'Casa & Lar', icon: '🏠', bg: 'bg-stone-50' },
    education: { label: 'Educação', icon: '📚', bg: 'bg-blue-50' },
    technology: { label: 'Tecnologia', icon: '📱', bg: 'bg-gray-50' },
    time_numbers: { label: 'Tempo & Números', icon: '🕐', bg: 'bg-blue-50' },
    weather: { label: 'Clima', icon: '🌤️', bg: 'bg-sky-50' },
    colors: { label: 'Cores', icon: '🎨', bg: 'bg-pink-50' },
    true_false: { label: 'Verdadeiro ou Falso', icon: '✅', bg: 'bg-lime-50' },
    reorder: { label: 'Reordene a Frase', icon: '🔀', bg: 'bg-fuchsia-50' },
    dialogue: { label: 'Diálogos', icon: '💬', bg: 'bg-sky-50' },
  };

  const typeMeta: Record<string, { label: string; badge: string; badgeColor: string }> = {
    vocab: { label: 'Vocabulário', badge: 'palavras', badgeColor: 'text-serra' },
    cloze: { label: 'Gramática', badge: 'exercícios', badgeColor: 'text-terracotta' },
    multiple_choice: { label: 'Quiz', badge: 'questões', badgeColor: 'text-info' },
    error_correction: { label: 'Correção', badge: 'exercícios', badgeColor: 'text-ouro' },
    true_false: { label: 'Verdadeiro/Falso', badge: 'questões', badgeColor: 'text-serra' },
    reorder: { label: 'Reordene', badge: 'exercícios', badgeColor: 'text-terracotta' },
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

  const typeOrder = ['vocab', 'cloze', 'multiple_choice', 'error_correction', 'true_false', 'reorder'];
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
      <div>
        <h2 class="font-display text-2xl font-bold">{new Date().getHours() < 12 ? 'Bom dia!' : new Date().getHours() < 18 ? 'Boa tarde!' : 'Boa noite!'}</h2>
        <p class="text-[10px] text-cafe-muted/50">{new Date().getHours() < 12 ? 'Good morning!' : new Date().getHours() < 18 ? 'Good afternoon!' : 'Good evening!'}</p>
      </div>
      <p class="text-sm text-cafe-secondary">Nível {currentLevel} · Vamos praticar</p>
    </div>
    <div class="flex items-center gap-3">
      {#if hasVoice}
        <span class="text-xs text-serra flex items-center gap-1" title="Voz ativada">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z"/></svg>
        </span>
      {:else}
        <a href="/settings" class="text-xs text-cafe-muted hover:text-terracotta transition-colors" title="Configurar voz">
          <svg class="w-3.5 h-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" /><path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
        </a>
      {/if}
      <div class="flex items-center gap-2 text-ouro font-bold">
        🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
      </div>
    </div>
  </div>

  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <!-- 1ST: Start Today's Session Card -->
    {#if sessionPlan && sessionPlan.exercises.length > 0}
      <div class="bg-white border border-terracotta/20 rounded-2xl p-6 shadow-sm mb-6">
        <!-- Coaching Note -->
        {#if noteLoading}
          <div class="h-12 bg-pedra-subtle rounded-lg animate-pulse mb-4"></div>
        {:else if coachingNote}
          <p class="text-sm text-cafe-secondary italic font-display mb-4">{coachingNote}</p>
        {/if}

        <!-- Session Summary Pills -->
        <div class="flex flex-wrap gap-2 mb-4">
          {#if sessionPlan.reviewCount > 0}
            <span class="text-xs px-3 py-1 bg-pedra-subtle rounded-full text-cafe-secondary">{sessionPlan.reviewCount} revisões</span>
          {/if}
          {#if sessionPlan.weakTopicCount > 0}
            <span class="text-xs px-3 py-1 bg-pedra-subtle rounded-full text-cafe-secondary">{sessionPlan.weakTopicCount} reforço</span>
          {/if}
          {#if sessionPlan.newCount > 0}
            <span class="text-xs px-3 py-1 bg-pedra-subtle rounded-full text-cafe-secondary">{sessionPlan.newCount} novos</span>
          {/if}
          <span class="text-xs px-3 py-1 bg-pedra-subtle rounded-full text-cafe-secondary">{sessionPlan.exercises.length} total</span>
        </div>

        <!-- Start Button -->
        <a
          href="/session"
          class="block w-full py-3 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors text-center"
          aria-label="Começar sessão de hoje — {sessionPlan.exercises.length} exercícios"
        >
          Começar <span class="text-white/60 text-xs font-normal">Start</span>
        </a>
      </div>
    {:else}
      <div class="bg-white border border-border rounded-2xl p-6 mb-6 text-center">
        <div class="text-3xl mb-2">✅</div>
        <p class="text-sm text-cafe-muted">Nenhum exercício pendente! Tente o modo conversa ou escrita, ou volte amanhã.</p>
      </div>
    {/if}

    <!-- 2ND: Weekly Challenges -->
    {#if challenges.length > 0}
      <div class="flex gap-3 mb-6 overflow-x-auto">
        {#each challenges as challenge}
          <div class="min-w-[180px] flex-1 bg-white border border-border rounded-xl p-3">
            <p class="text-xs text-cafe font-medium line-clamp-2">{challenge.label}</p>
            <div class="mt-2 h-1.5 bg-pedra-subtle rounded-full overflow-hidden" role="progressbar" aria-valuenow={challenge.currentValue} aria-valuemax={challenge.targetValue} aria-label={challenge.label}>
              <div class="h-full bg-ouro rounded-full transition-all duration-300" style="width: {Math.min(100, (challenge.currentValue / challenge.targetValue) * 100)}%"></div>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-[10px] text-cafe-muted">{challenge.currentValue}/{challenge.targetValue}</span>
              {#if challenge.completed}
                <span class="text-[10px] font-semibold text-serra">✓ Completo</span>
              {:else}
                <span class="text-[10px] text-ouro">+{challenge.xpReward} XP</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-xs text-cafe-muted italic mb-6">Desafios começam na segunda-feira!</p>
    {/if}

    <!-- 3RD: Stats Row -->
    <div class="grid grid-cols-3 gap-4 mb-6">
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

    <!-- 4TH: Daily Goal -->
    <div class="mb-6 bg-white border border-border rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-semibold">{goalMet ? '🎯 Meta cumprida!' : '📋 Meta diária'} <span class="text-[10px] font-normal text-cafe-muted/50">{goalMet ? 'Goal met!' : 'Daily goal'}</span></span>
        <span class="text-xs text-cafe-muted">{todayTotal}/{dailyGoal} exercícios</span>
      </div>
      <div class="h-3 bg-pedra-subtle rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500 {goalMet ? 'bg-serra' : 'bg-terracotta'}" style="width: {goalProgress}%"></div>
      </div>
    </div>

    <!-- 5TH: CEFR Progress Map -->
    <div class="mb-6 bg-white border border-border rounded-xl p-4">
      <p class="text-xs text-cafe-muted uppercase tracking-wider font-semibold mb-3">Progresso CEFR <span class="font-normal opacity-50 normal-case">Progress</span></p>
      <div class="flex items-center justify-between">
        {#each cefrOrder as node, i}
          <div class="flex items-center" role="listitem" aria-label="{node.level} — {node.isCurrent ? 'nível atual' : node.isPast ? 'completo' : 'futuro'}">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              {node.isPast ? 'bg-serra text-white' : node.isCurrent ? 'bg-terracotta text-white ring-2 ring-terracotta/30 ring-offset-2' : 'bg-pedra-subtle text-cafe-muted'}">
              {node.level}
            </div>
            {#if i < cefrOrder.length - 1}
              <div class="w-8 sm:w-12 h-0.5 {node.isPast ? 'bg-serra' : 'bg-pedra-subtle'}"></div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- XP Bar -->
    <div class="mb-8">
      <div class="flex justify-between text-xs text-cafe-muted mb-1">
        <span>Nível {currentLevel}</span>
        <span>{totalXp % 1000} / 1000 XP</span>
      </div>
      <div class="h-2 bg-pedra-subtle rounded-full overflow-hidden">
        <div class="h-full bg-serra rounded-full transition-all duration-500" style="width: {xpProgress}%"></div>
      </div>
    </div>

    <!-- Listening Practice (voice only) -->
    {#if hasVoice}
      <a href="/lesson?type=vocab&mode=listening"
         class="flex items-center gap-3 p-4 bg-white border border-serra/20 rounded-xl hover:border-serra hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 mb-6">
        <div class="w-10 h-10 bg-serra/10 rounded-lg flex items-center justify-center text-lg">🎧</div>
        <div>
          <div class="font-semibold text-sm">Prática de escuta</div>
          <div class="text-xs text-cafe-muted">Ouça e escreva — treine seu ouvido</div>
        </div>
      </a>
    {/if}

    <!-- 6TH: Manual Lesson Cards -->
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
