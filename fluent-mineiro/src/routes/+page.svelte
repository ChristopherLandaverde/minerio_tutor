<script lang="ts">
  import { onMount } from 'svelte';
  import { getDb, getProfile, getDueReviewCount, getTodayStats } from '$lib/db';
  import { SEED_EXERCISES } from '$lib/content';
  import { planSession, type SessionPlan } from '$lib/session-planner';
  import { generateCoachingNote, getApiKey } from '$lib/claude';
  import { getMistakePatterns } from '$lib/db';
  import { getActiveChallenges, type Challenge } from '$lib/challenges';
  import { getElevenLabsKey } from '$lib/elevenlabs';
  import MinasMap from '$lib/components/MinasMap.svelte';
  import NpcChat from '$lib/components/NpcChat.svelte';
  import { CITIES, CITY_MAP, TOPIC_TO_CITY, type CityDef, type NpcDef } from '$lib/cities';
  import { computeCityStates, type CityState } from '$lib/city-state';

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

  // Map state
  let cityStates = $state<CityState[]>([]);
  let selectedCity = $state<CityDef | null>(null);
  let selectedNpc = $state<NpcDef | null>(null);
  let cityPanelOpen = $state(false);

  // Topic metadata
  const topicMeta: Record<string, { label: string; icon: string }> = {
    food: { label: 'Comida Mineira', icon: '🍽️' },
    mineiro: { label: 'Expressões Mineiras', icon: '🏔️' },
    greetings: { label: 'Cumprimentos', icon: '👋' },
    travel: { label: 'Viagem & Direções', icon: '🗺️' },
    family: { label: 'Família', icon: '👨‍👩‍👧' },
    daily_routine: { label: 'Rotina Diária', icon: '☀️' },
    transport: { label: 'Transporte', icon: '🚌' },
    emotions: { label: 'Emoções', icon: '💛' },
    cultural: { label: 'Cultura Mineira', icon: '🎭' },
    food_drinks: { label: 'Comida & Bebida', icon: '🍹' },
    dialogue: { label: 'Diálogos', icon: '💬' },
  };

  // CEFR progress
  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const cefrOrder = $derived(cefrLevels.map(level => ({
    level,
    isCurrent: level === currentLevel,
    isPast: cefrLevels.indexOf(level) < cefrLevels.indexOf(currentLevel),
    isFuture: cefrLevels.indexOf(level) > cefrLevels.indexOf(currentLevel),
  })));

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

      const db = await getDb();
      sessionPlan = await planSession(db);
      cityStates = await computeCityStates(db);
      challenges = await getActiveChallenges();
      hasVoice = !!(await getElevenLabsKey());
    } catch {}
    loaded = true;
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

  // "What Sabiá thinks" recommendations
  const sabiaRecommendations = $derived(() => {
    if (!sessionPlan) return [];
    const seen = new Set<string>();
    const recs: { type: string; topic: string; cityName: string; topicLabel: string; icon: string }[] = [];
    for (const ex of sessionPlan.exercises) {
      const key = `${ex.type}:${ex.topic}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cityId = TOPIC_TO_CITY.get(ex.topic);
      const city = cityId ? CITY_MAP.get(cityId) : undefined;
      const tm = topicMeta[ex.topic];
      recs.push({
        type: ex.type,
        topic: ex.topic,
        cityName: city?.name || 'Minas Gerais',
        topicLabel: tm?.label || ex.topic,
        icon: tm?.icon || '📖',
      });
      if (recs.length >= 3) break;
    }
    return recs;
  });

  function handleCityClick(cityId: string) {
    const city = CITY_MAP.get(cityId);
    if (!city) return;
    selectedCity = city;
    selectedNpc = null;
    // Trigger animation
    setTimeout(() => { cityPanelOpen = true; }, 10);
  }

  function handleNpcClick(npc: NpcDef) {
    selectedNpc = npc;
  }

  function handleNpcClose() {
    selectedNpc = null;
  }

  function closeCityPanel() {
    cityPanelOpen = false;
    setTimeout(() => {
      selectedCity = null;
      selectedNpc = null;
    }, 200);
  }

  function getCityState(cityId: string): CityState | undefined {
    return cityStates.find(s => s.cityId === cityId);
  }

  function getStatusBadge(status: string): { label: string; color: string; dot: string } {
    switch (status) {
      case 'locked': return { label: 'Bloqueada', color: 'bg-cafe-muted/20 text-cafe-muted', dot: 'bg-cafe-muted' };
      case 'open': return { label: 'Aberta', color: 'bg-terracotta/15 text-terracotta', dot: 'bg-terracotta' };
      case 'fading': return { label: 'Precisa revisão', color: 'bg-ouro/15 text-ouro', dot: 'bg-ouro' };
      case 'mastered': return { label: 'Dominada', color: 'bg-serra/15 text-serra', dot: 'bg-serra' };
      default: return { label: status, color: 'bg-pedra-subtle text-cafe-muted', dot: 'bg-cafe-muted' };
    }
  }
</script>

<div class="max-w-3xl mx-auto p-4 md:p-6">
  <!-- Header -->
  <div class="flex items-center justify-between mb-5">
    <div>
      <h2 class="font-display text-2xl font-bold">{new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, Krissss!</h2>
      <p class="text-[10px] text-cafe-muted/50 mt-0.5">{new Date().getHours() < 12 ? 'Good morning!' : new Date().getHours() < 18 ? 'Good afternoon!' : 'Good evening!'}</p>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5 text-ouro font-bold text-sm">
        🔥 {streak}
      </div>
      <span class="text-xs font-semibold px-2 py-1 rounded-full bg-terracotta/10 text-terracotta">{currentLevel}</span>
    </div>
  </div>

  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <!-- Session action bar -->
    <div class="bg-white border border-border rounded-2xl p-4 mb-4 flex items-center gap-4">
      {#if noteLoading}
        <div class="flex-1 h-4 bg-pedra-subtle rounded animate-pulse"></div>
      {:else if coachingNote}
        <p class="flex-1 text-sm text-cafe-secondary italic font-display">{coachingNote}</p>
      {:else}
        <p class="flex-1 text-sm text-cafe-secondary">
          {#if sessionPlan && sessionPlan.exercises.length > 0}
            {sessionPlan.exercises.length} exercícios preparados para hoje
          {:else}
            Explore o mapa e pratique!
          {/if}
        </p>
      {/if}
      <a
        href="/session"
        class="shrink-0 px-5 py-2 bg-terracotta text-white text-sm font-semibold rounded-xl hover:bg-terracotta-dark transition-colors"
      >
        Começar <span class="text-white/60 text-[10px]">Start</span>
      </a>
    </div>

    <!-- Map -->
    <div class="relative mb-4">
      <MinasMap {cityStates} onCityClick={handleCityClick} />

      <!-- "Sabiá recomenda" overlay -->
      {#if sabiaRecommendations().length > 0}
        <div class="absolute bottom-3 left-3 md:max-w-[280px] bg-white/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg">
          <p class="text-[10px] text-cafe-muted uppercase tracking-wider font-semibold mb-2">🐦 Sabiá recomenda</p>
          <div class="space-y-1">
            {#each sabiaRecommendations() as rec}
              <a href="/lesson?type={rec.type}&topic={rec.topic}" class="flex items-center gap-2 py-1 text-xs text-cafe hover:text-terracotta transition-colors">
                <span class="text-sm">{rec.icon}</span>
                <span class="font-medium">{rec.topicLabel}</span>
                <span class="text-cafe-muted/60 text-[10px]">{rec.cityName}</span>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Stats + Progress row -->
    <div class="grid grid-cols-4 gap-3 mb-4">
      <div class="bg-white border border-border rounded-xl p-3 text-center">
        <div class="font-display text-lg font-bold text-terracotta">{streak}</div>
        <div class="text-[10px] text-cafe-muted uppercase tracking-wider">Streak</div>
      </div>
      <div class="bg-white border border-border rounded-xl p-3 text-center">
        <div class="font-display text-lg font-bold text-serra">{accuracy}%</div>
        <div class="text-[10px] text-cafe-muted uppercase tracking-wider">Acertos</div>
      </div>
      <div class="bg-white border border-border rounded-xl p-3 text-center">
        <div class="font-display text-lg font-bold text-ouro">{dueReviews}</div>
        <div class="text-[10px] text-cafe-muted uppercase tracking-wider">Revisões</div>
      </div>
      <div class="bg-white border border-border rounded-xl p-3 text-center">
        <div class="font-display text-lg font-bold text-cafe">{totalXp}</div>
        <div class="text-[10px] text-cafe-muted uppercase tracking-wider">XP</div>
      </div>
    </div>

    <!-- Daily goal + CEFR -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      <!-- Daily goal -->
      <div class="bg-white border border-border rounded-xl p-3">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-semibold">{goalMet ? '🎯 Meta!' : '📋 Meta diária'}</span>
          <span class="text-[10px] text-cafe-muted">{todayTotal}/{dailyGoal}</span>
        </div>
        <div class="h-2 bg-pedra-subtle rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500 {goalMet ? 'bg-serra' : 'bg-terracotta'}" style="width: {goalProgress}%"></div>
        </div>
      </div>

      <!-- CEFR progress -->
      <div class="bg-white border border-border rounded-xl p-3">
        <span class="text-[11px] font-semibold mb-1.5 block">Progresso CEFR</span>
        <div class="flex items-center justify-between">
          {#each cefrOrder as node, i}
            <div class="flex items-center">
              <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                {node.isPast ? 'bg-serra text-white' : node.isCurrent ? 'bg-terracotta text-white ring-1 ring-terracotta/30 ring-offset-1' : 'bg-pedra-subtle text-cafe-muted'}">
                {node.level.replace('A', '').replace('B', '').replace('C', '')}
              </div>
              {#if i < cefrOrder.length - 1}
                <div class="w-3 h-0.5 {node.isPast ? 'bg-serra' : 'bg-pedra-subtle'}"></div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Quick actions row -->
    <div class="flex gap-2 mb-4">
      {#if dueReviews > 0}
        <a href="/review" class="flex-1 flex items-center gap-2 p-3 bg-white border border-ouro/30 rounded-xl hover:border-ouro hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
          <span class="text-lg">🔄</span>
          <div>
            <div class="text-xs font-semibold">{dueReviews} revisões</div>
            <div class="text-[10px] text-cafe-muted">pendentes</div>
          </div>
        </a>
      {/if}
      {#if hasVoice}
        <a href="/lesson?type=vocab&mode=listening" class="flex-1 flex items-center gap-2 p-3 bg-white border border-serra/20 rounded-xl hover:border-serra hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
          <span class="text-lg">🎧</span>
          <div>
            <div class="text-xs font-semibold">Escuta</div>
            <div class="text-[10px] text-cafe-muted">Ouça e escreva</div>
          </div>
        </a>
      {/if}
      <a href="/conversation" class="flex-1 flex items-center gap-2 p-3 bg-white border border-border rounded-xl hover:border-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
        <span class="text-lg">💬</span>
        <div>
          <div class="text-xs font-semibold">Conversa</div>
          <div class="text-[10px] text-cafe-muted">Bate-papo livre</div>
        </div>
      </a>
    </div>

    <!-- Weekly challenges -->
    {#if challenges.length > 0}
      <div class="flex gap-2 overflow-x-auto pb-1">
        {#each challenges as challenge}
          <div class="min-w-[160px] flex-1 bg-white border border-border rounded-xl p-2.5">
            <p class="text-[11px] text-cafe font-medium line-clamp-1">{challenge.label}</p>
            <div class="mt-1.5 h-1 bg-pedra-subtle rounded-full overflow-hidden">
              <div class="h-full bg-ouro rounded-full transition-all" style="width: {Math.min(100, (challenge.currentValue / challenge.targetValue) * 100)}%"></div>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-[9px] text-cafe-muted">{challenge.currentValue}/{challenge.targetValue}</span>
              {#if challenge.completed}
                <span class="text-[9px] font-semibold text-serra">✓</span>
              {:else}
                <span class="text-[9px] text-ouro">+{challenge.xpReward} XP</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- City detail side panel -->
{#if selectedCity}
  {@const state = getCityState(selectedCity.id)}
  {@const badge = getStatusBadge(state?.status || 'open')}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/30 z-30 transition-opacity duration-200"
    class:opacity-0={!cityPanelOpen}
    class:opacity-100={cityPanelOpen}
    onclick={closeCityPanel}
    role="presentation"
  ></div>

  <!-- Panel -->
  <div
    class="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-pedra z-40 shadow-2xl overflow-y-auto transition-transform duration-200 ease-out"
    class:translate-x-0={cityPanelOpen}
    class:translate-x-full={!cityPanelOpen}
  >
    <!-- City hero header -->
    <div class="bg-gradient-to-b from-terracotta/8 to-transparent p-6 pb-4">
      <button
        onclick={closeCityPanel}
        class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-cafe-muted hover:text-cafe hover:bg-white transition-all"
        aria-label="Fechar"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div class="flex items-center gap-4 mb-3">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-white border border-border shadow-sm">
          {selectedCity.npcs[0]?.icon || '📍'}
        </div>
        <div>
          <h2 class="font-display text-2xl font-bold">{selectedCity.name}</h2>
          <p class="text-xs text-cafe-secondary">{selectedCity.region} · {selectedCity.cefr}</p>
        </div>
      </div>

      <!-- Status + mastery -->
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full {badge.color}">
          <span class="w-1.5 h-1.5 rounded-full {badge.dot}"></span>
          {badge.label}
        </span>
        {#if state && state.masteryPercent > 0}
          <span class="text-xs text-serra font-semibold">{state.masteryPercent}%</span>
        {/if}
      </div>

      <!-- Mastery bar -->
      {#if state}
        <div class="mt-3 h-1.5 bg-pedra-subtle rounded-full overflow-hidden">
          <div class="h-full bg-serra rounded-full transition-all duration-500" style="width: {state.masteryPercent}%"></div>
        </div>
        <div class="flex justify-between mt-1">
          <span class="text-[9px] text-cafe-muted">{state.masteredExercises} de {state.totalTopicExercises} exercícios</span>
          <span class="text-[9px] text-serra font-semibold">{state.masteryPercent}% dominado</span>
        </div>
      {/if}
    </div>

    <div class="px-6 pb-6">
      <!-- Cultural fact -->
      <div class="bg-ouro/8 border border-ouro/15 rounded-xl p-3.5 mb-5">
        <p class="text-[11px] text-ouro font-semibold uppercase tracking-wider mb-1">📜 Você sabia?</p>
        <p class="text-xs text-cafe-secondary leading-relaxed">{selectedCity.culturalFact}</p>
      </div>

      <!-- Topics -->
      <h3 class="text-[10px] text-cafe-muted uppercase tracking-wider font-semibold mb-2">Temas para praticar</h3>
      <div class="space-y-1.5 mb-5">
        {#each selectedCity.topics as topic}
          {@const tm = topicMeta[topic] || { label: topic, icon: '📖' }}
          <a
            href="/lesson?type=vocab&topic={topic}"
            class="flex items-center justify-between p-3 bg-white border border-border rounded-xl hover:border-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
          >
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 bg-pedra-subtle rounded-lg flex items-center justify-center text-sm">{tm.icon}</div>
              <span class="text-sm font-medium">{tm.label}</span>
            </div>
            <svg class="w-4 h-4 text-cafe-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        {/each}
      </div>

      <!-- NPC -->
      {#each selectedCity.npcs as npc}
        <h3 class="text-[10px] text-cafe-muted uppercase tracking-wider font-semibold mb-2">Conversar com personagem</h3>
        <button
          onclick={() => handleNpcClick(npc)}
          class="w-full flex items-center gap-3 p-4 bg-serra/5 border border-serra/20 rounded-xl hover:border-serra hover:bg-serra/10 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 text-left mb-5"
        >
          <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm border border-border">{npc.icon}</div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm">{npc.name}</div>
            <div class="text-xs text-cafe-muted truncate">{npc.role}</div>
            <div class="text-[10px] text-serra mt-0.5">{npc.personality.split(',')[0]}</div>
          </div>
          <div class="shrink-0 w-8 h-8 bg-serra/10 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-serra" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </button>
      {/each}

      <!-- Action buttons -->
      <div class="space-y-2">
        <a
          href="/session"
          class="block w-full py-3 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors text-center text-sm"
        >
          Praticar exercícios
        </a>
        <a
          href="/lesson?topic={selectedCity.topics[0]}"
          class="block w-full py-3 bg-white border border-border text-cafe font-semibold rounded-xl hover:border-terracotta transition-colors text-center text-sm"
        >
          Lição de {topicMeta[selectedCity.topics[0]]?.label || selectedCity.topics[0]}
        </a>
      </div>
    </div>
  </div>
{/if}

<!-- NPC Chat overlay -->
{#if selectedNpc}
  <NpcChat npc={selectedNpc} onClose={handleNpcClose} />
{/if}
