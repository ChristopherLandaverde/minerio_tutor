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
  let showCoachingPanel = $state(true);

  // Topic metadata for city detail panel
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

      // Compute city states
      cityStates = await computeCityStates(db);

      // Load challenges
      challenges = await getActiveChallenges();

      // Check voice availability
      hasVoice = !!(await getElevenLabsKey());
    } catch {}
    loaded = true;

    // Load coaching note async
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
  const goalProgress = $derived(Math.min(100, (todayTotal / dailyGoal) * 100));
  const goalMet = $derived(todayTotal >= dailyGoal);

  // "What Sabiá thinks you need now" — top 2 recommendations
  const sabiaRecommendations = $derived(() => {
    if (!sessionPlan) return [];
    const seen = new Set<string>();
    const recs: { type: string; topic: string; cityName: string; topicLabel: string }[] = [];
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
      });
      if (recs.length >= 2) break;
    }
    return recs;
  });

  function handleCityClick(cityId: string) {
    const city = CITY_MAP.get(cityId);
    if (!city) return;
    selectedCity = city;
    selectedNpc = null;
  }

  function handleNpcClick(npc: NpcDef) {
    selectedNpc = npc;
  }

  function handleNpcClose() {
    selectedNpc = null;
  }

  function closeCityPanel() {
    selectedCity = null;
    selectedNpc = null;
  }

  function getCityState(cityId: string): CityState | undefined {
    return cityStates.find(s => s.cityId === cityId);
  }

  function getStatusBadge(status: string): { label: string; color: string } {
    switch (status) {
      case 'locked': return { label: 'Bloqueada', color: 'bg-cafe-muted/20 text-cafe-muted' };
      case 'open': return { label: 'Aberta', color: 'bg-terracotta/15 text-terracotta' };
      case 'fading': return { label: 'Precisa revisão', color: 'bg-ouro/15 text-ouro' };
      case 'mastered': return { label: 'Dominada', color: 'bg-serra/15 text-serra' };
      default: return { label: status, color: 'bg-pedra-subtle text-cafe-muted' };
    }
  }
</script>

<div class="max-w-3xl mx-auto p-4 md:p-6">
  <!-- Compact top bar -->
  <div class="flex items-center justify-between mb-4">
    <div>
      <h2 class="font-display text-xl font-bold">{new Date().getHours() < 12 ? 'Bom dia, Krissss!' : new Date().getHours() < 18 ? 'Boa tarde, Krissss!' : 'Boa noite, Krissss!'}</h2>
      <p class="text-xs text-cafe-secondary">Nível {currentLevel} · 🔥 {streak} {streak === 1 ? 'dia' : 'dias'}</p>
    </div>
    <div class="flex items-center gap-3">
      <div class="text-right">
        <div class="text-xs text-cafe-muted">{todayTotal}/{dailyGoal}</div>
        <div class="w-16 h-1.5 bg-pedra-subtle rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500 {goalMet ? 'bg-serra' : 'bg-terracotta'}" style="width: {goalProgress}%"></div>
        </div>
      </div>
      <a href="/session" class="px-3 py-1.5 bg-terracotta text-white text-xs font-semibold rounded-lg hover:bg-terracotta-dark transition-colors">
        Praticar
      </a>
    </div>
  </div>

  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <!-- Map -->
    <div class="relative mb-4">
      <MinasMap {cityStates} onCityClick={handleCityClick} />

      <!-- "What Sabiá thinks" floating panel -->
      {#if showCoachingPanel && sabiaRecommendations().length > 0}
        <div class="absolute bottom-3 left-3 right-3 md:right-auto md:max-w-xs bg-white/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] text-cafe-muted uppercase tracking-wider font-semibold">🐦 Sabiá recomenda</p>
            <button onclick={() => showCoachingPanel = false} class="text-cafe-muted hover:text-cafe text-xs p-0.5" aria-label="Fechar">✕</button>
          </div>
          {#if noteLoading}
            <div class="h-4 bg-pedra-subtle rounded animate-pulse mb-2"></div>
          {:else if coachingNote}
            <p class="text-xs text-cafe-secondary italic mb-2">{coachingNote}</p>
          {/if}
          <div class="space-y-1.5">
            {#each sabiaRecommendations() as rec}
              <a href="/lesson?type={rec.type}&topic={rec.topic}" class="flex items-center gap-2 text-xs text-cafe hover:text-terracotta transition-colors">
                <span>{topicMeta[rec.topic]?.icon || '📖'}</span>
                <span class="font-medium">{rec.topicLabel}</span>
                <span class="text-cafe-muted">· {rec.cityName}</span>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Compact stats row -->
    <div class="grid grid-cols-3 gap-3 mb-4">
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
    </div>

    <!-- Weekly challenges (compact) -->
    {#if challenges.length > 0}
      <div class="flex gap-2 mb-4 overflow-x-auto">
        {#each challenges as challenge}
          <div class="min-w-[160px] flex-1 bg-white border border-border rounded-lg p-2.5">
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
  {@const badge = getStatusBadge(state?.status || 'locked')}
  <div
    class="fixed inset-0 bg-black/20 z-30"
    onclick={closeCityPanel}
    role="presentation"
  ></div>
  <div class="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-pedra z-40 shadow-2xl overflow-y-auto">
    <div class="p-6">
      <!-- Close button -->
      <button
        onclick={closeCityPanel}
        class="absolute top-4 right-4 text-cafe-muted hover:text-cafe transition-colors"
        aria-label="Fechar"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- City header -->
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-12 h-12 bg-terracotta/10 rounded-xl flex items-center justify-center text-2xl">
            {selectedCity.npcs[0]?.icon || '📍'}
          </div>
          <div>
            <h2 class="font-display text-xl font-bold">{selectedCity.name}</h2>
            <p class="text-xs text-cafe-secondary">{selectedCity.region}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full {badge.color}">{badge.label}</span>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-pedra-subtle text-cafe-muted">{selectedCity.cefr}</span>
          {#if state && state.masteryPercent > 0}
            <span class="text-xs text-serra font-semibold">{state.masteryPercent}% dominado</span>
          {/if}
        </div>
      </div>

      <!-- Cultural fact -->
      <div class="bg-ouro/10 border border-ouro/20 rounded-xl p-3 mb-6">
        <p class="text-xs text-cafe-secondary italic">{selectedCity.culturalFact}</p>
      </div>

      <!-- Topics -->
      <h3 class="text-xs text-cafe-muted uppercase tracking-wider font-semibold mb-3">Temas <span class="font-normal opacity-50">Topics</span></h3>
      <div class="space-y-2 mb-6">
        {#each selectedCity.topics as topic}
          {@const tm = topicMeta[topic] || { label: topic, icon: '📖' }}
          <a
            href="/lesson?type=vocab&topic={topic}"
            class="flex items-center justify-between p-3 bg-white border border-border rounded-xl hover:border-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-base">{tm.icon}</span>
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
        <h3 class="text-xs text-cafe-muted uppercase tracking-wider font-semibold mb-3">Personagem <span class="font-normal opacity-50">NPC</span></h3>
        <button
          onclick={() => handleNpcClick(npc)}
          class="w-full flex items-center gap-3 p-4 bg-white border border-serra/20 rounded-xl hover:border-serra hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 text-left"
        >
          <div class="w-11 h-11 bg-serra/10 rounded-full flex items-center justify-center text-xl">{npc.icon}</div>
          <div class="flex-1">
            <div class="font-semibold text-sm">{npc.name}</div>
            <div class="text-xs text-cafe-muted">{npc.role}</div>
          </div>
          <div class="text-xs text-serra font-semibold">Conversar →</div>
        </button>
      {/each}

      <!-- Start exercises button -->
      <a
        href="/session"
        class="block w-full py-3 mt-6 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors text-center"
      >
        Praticar exercícios <span class="text-white/60 text-xs">Practice</span>
      </a>
    </div>
  </div>
{/if}

<!-- NPC Chat overlay -->
{#if selectedNpc}
  <NpcChat npc={selectedNpc} onClose={handleNpcClose} />
{/if}
