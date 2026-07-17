<script lang="ts">
  import { onMount } from 'svelte';
  import { getDb, getProfile, getDueReviewCount, getTodayStats, incrementCityVisit, getCityVisitCounts } from '$lib/db';
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
  import { awardCityStamp, getJournalStats, checkSlangTriggers, type ToastData } from '$lib/journal';
  import { getAllHeartLevels, type HeartState } from '$lib/npc';
  import Toast from '$lib/components/Toast.svelte';

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
  let journalStamps = $state(0);
  let journalNpcs = $state(0);
  let journalTotal = $state(0);
  let npcHearts = $state<Map<string, HeartState>>(new Map());
  let toasts = $state<ToastData[]>([]);
  let cityVisits = $state<Map<string, number>>(new Map());

  function getTimeOfDay(): 'morning' | 'afternoon' | 'night' {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    return 'night';
  }

  // Topic metadata
  const topicMeta: Record<string, { label: string; icon: string }> = {
    food: { label: 'Mineiro Food', icon: '🍽️' },
    mineiro: { label: 'Mineiro Expressions', icon: '🏔️' },
    greetings: { label: 'Greetings', icon: '👋' },
    travel: { label: 'Travel & Directions', icon: '🗺️' },
    family: { label: 'Family', icon: '👨‍👩‍👧' },
    daily_routine: { label: 'Daily Routine', icon: '☀️' },
    transport: { label: 'Transport', icon: '🚌' },
    emotions: { label: 'Emotions', icon: '💛' },
    cultural: { label: 'Mineiro Culture', icon: '🎭' },
    dialogue: { label: 'Dialogues', icon: '💬' },
    shopping: { label: 'Shopping', icon: '🛍️' },
    mineiro_vs_standard: { label: 'Mineiro vs Standard', icon: '🗣️' },
    false_cognates: { label: 'False Cognates', icon: '⚠️' },
    clothing: { label: 'Clothing', icon: '👕' },
    colors: { label: 'Colors', icon: '🎨' },
    body_health: { label: 'Body & Health', icon: '🏥' },
    nature: { label: 'Nature', icon: '🌿' },
    weather: { label: 'Weather', icon: '🌤️' },
    sports_leisure: { label: 'Sports & Leisure', icon: '⚽' },
    work: { label: 'Work', icon: '💼' },
    education: { label: 'Education', icon: '📚' },
    technology: { label: 'Technology', icon: '📱' },
    verbs_present: { label: 'Verbs: Present', icon: '📝' },
    verbs_past: { label: 'Verbs: Past', icon: '⏮️' },
    ser_estar: { label: 'Ser vs Estar', icon: '⚖️' },
    prepositions: { label: 'Prepositions', icon: '🔗' },
    error_correction: { label: 'Error Correction', icon: '🔧' },
    house: { label: 'House & Home', icon: '🏠' },
    time_numbers: { label: 'Time & Numbers', icon: '🕐' },
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

      const db = await getDb();
      sessionPlan = await planSession(db);
      cityStates = await computeCityStates(db);
      challenges = await getActiveChallenges();
      hasVoice = !!(await getElevenLabsKey());

      const jStats = await getJournalStats();
      journalStamps = jStats.stamps;
      journalNpcs = jStats.npcs;
      journalTotal = jStats.total;
      npcHearts = await getAllHeartLevels();
      cityVisits = await getCityVisitCounts();
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
    // Award stamp on first visit + track visit
    awardCityStamp(cityId);
    incrementCityVisit(cityId).then(({ visitCount }) => {
      cityVisits = new Map(cityVisits).set(cityId, visitCount);
    });
    // Check slang triggers after stamp
    checkSlangTriggers().then(newToasts => {
      if (newToasts.length > 0) toasts = [...toasts, ...newToasts];
    });
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
      case 'locked': return { label: 'Locked', color: 'bg-cafe-muted/20 text-cafe-muted', dot: 'bg-cafe-muted' };
      case 'open': return { label: 'Open', color: 'bg-terracotta/15 text-terracotta', dot: 'bg-terracotta' };
      case 'fading': return { label: 'Needs review', color: 'bg-ouro/15 text-ouro', dot: 'bg-ouro' };
      case 'mastered': return { label: 'Mastered', color: 'bg-serra/15 text-serra', dot: 'bg-serra' };
      default: return { label: status, color: 'bg-pedra-subtle text-cafe-muted', dot: 'bg-cafe-muted' };
    }
  }
</script>

<div class="max-w-3xl mx-auto p-4 md:p-6">
  <!-- Minimal header: just the two chips the layout doesn't already show -->
  <div class="flex items-center justify-end gap-2 mb-3">
    <span class="inline-flex items-center gap-1 font-mono text-xs font-semibold text-terracotta bg-pedra-subtle border border-border rounded-lg px-2.5 py-1 tabular-nums">🔥 {streak}</span>
    <span class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-serra text-white">{currentLevel}</span>
  </div>

  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <!-- Hero: the map IS the screen, Start is fused into it -->
    <div class="relative mb-4 rounded-2xl border border-border bg-gradient-to-b from-white to-pedra-subtle p-3 md:p-4">
      <MinasMap {cityStates} onCityClick={handleCityClick} timeOfDay={getTimeOfDay()} />

      <!-- Start card: docked to the hero, the one obvious next action -->
      <div class="mt-3 md:mt-3 bg-white border-[1.5px] border-terracotta rounded-2xl p-4 shadow-lg shadow-terracotta/10 flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-[180px]">
          {#if noteLoading}
            <div class="h-4 bg-pedra-subtle rounded animate-pulse w-2/3"></div>
          {:else if coachingNote}
            <p class="text-sm italic font-display text-cafe">{coachingNote}</p>
          {:else if sessionPlan && sessionPlan.exercises.length > 0}
            <p class="text-sm text-cafe">{sessionPlan.exercises.length} exercises ready for today</p>
          {:else}
            <p class="text-sm text-cafe">Explore the map and practice!</p>
          {/if}
          {#if sabiaRecommendations().length > 0}
            <p class="text-xs text-cafe-muted mt-1">
              🐦 Sabiá recommends
              {#each sabiaRecommendations().slice(0, 2) as rec, i}
                <a href="/lesson?type={rec.type}&topic={rec.topic}" class="text-cafe-secondary hover:text-terracotta font-medium transition-colors">{rec.topicLabel}</a>{i === 0 && sabiaRecommendations().length > 1 ? ' · ' : ''}
              {/each}
            </p>
          {/if}
        </div>
        <a href="/session" class="shrink-0 px-6 py-2.5 bg-terracotta text-white text-sm font-semibold rounded-xl hover:bg-terracotta-dark transition-colors">
          Start →
        </a>
      </div>
    </div>

    <!-- Today: everything else, quiet and collapsed, not competing with the hero -->
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 bg-pedra-subtle border border-border rounded-xl px-4 py-2.5">
      <span class="text-[10px] uppercase tracking-wider font-bold text-cafe-muted shrink-0">Today</span>

      <div class="flex items-center gap-4 font-mono text-xs text-cafe-secondary tabular-nums">
        <span>🔥 <b class="text-cafe font-semibold">{streak}</b> streak</span>
        <span><b class="text-cafe font-semibold">{accuracy}%</b> correct</span>
        <span><b class="text-cafe font-semibold">{totalXp}</b> XP</span>
        <span><b class="text-cafe font-semibold">{journalStamps}</b> stamps</span>
      </div>

      <div class="flex items-center gap-2 text-xs text-cafe-muted">
        <span>Goal {todayTotal}/{dailyGoal}</span>
        <span class="w-16 h-1.5 rounded-full bg-border overflow-hidden inline-block">
          <span class="h-full block rounded-full transition-all duration-500 {goalMet ? 'bg-serra' : 'bg-terracotta'}" style="width: {goalProgress}%"></span>
        </span>
      </div>

      <div class="flex items-center gap-2 ml-auto">
        {#if dueReviews > 0}
          <a href="/review" class="text-xs text-serra bg-white border border-serra/30 rounded-full px-3 py-1 hover:border-serra transition-colors whitespace-nowrap">{dueReviews} reviews</a>
        {/if}
        {#if hasVoice}
          <a href="/lesson?type=vocab&mode=listening" class="text-xs text-cafe-secondary bg-white border border-border rounded-full px-3 py-1 hover:border-terracotta transition-colors whitespace-nowrap">🎧 Listening</a>
        {/if}
        {#if challenges.length > 0}
          <span class="text-xs text-cafe-secondary bg-white border border-border rounded-full px-3 py-1 whitespace-nowrap">{challenges.length} challenges</span>
        {/if}
      </div>
    </div>
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
        aria-label="Close"
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
        {#if cityVisits.get(selectedCity.id)}
          <span class="text-[10px] text-cafe-muted">👣 {cityVisits.get(selectedCity.id)}x</span>
        {/if}
      </div>

      <!-- Mastery bar -->
      {#if state}
        <div class="mt-3 h-1.5 bg-pedra-subtle rounded-full overflow-hidden">
          <div class="h-full bg-serra rounded-full transition-all duration-500" style="width: {state.masteryPercent}%"></div>
        </div>
        <div class="flex justify-between mt-1">
          <span class="text-[9px] text-cafe-muted">{state.masteredExercises} of {state.totalTopicExercises} exercises</span>
          <span class="text-[9px] text-serra font-semibold">{state.masteryPercent}% mastered</span>
        </div>
      {/if}
    </div>

    <div class="px-6 pb-6">
      <!-- Cultural fact -->
      <div class="bg-ouro/8 border border-ouro/15 rounded-xl p-3.5 mb-5">
        <p class="text-[11px] text-ouro font-semibold uppercase tracking-wider mb-1">📜 Did you know?</p>
        <p class="text-xs text-cafe-secondary leading-relaxed">{selectedCity.culturalFact}</p>
      </div>

      <!-- Topics -->
      <h3 class="text-[10px] text-cafe-muted uppercase tracking-wider font-semibold mb-2">Topics to practice</h3>
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

      <!-- NPCs -->
      <h3 class="text-[10px] text-cafe-muted uppercase tracking-wider font-semibold mb-2">Chat with a character</h3>
      {#each selectedCity.npcs as npc}
        {@const hearts = npcHearts.get(npc.id)}
        <button
          onclick={() => handleNpcClick(npc)}
          class="w-full flex items-center gap-3 p-4 bg-serra/5 border border-serra/20 rounded-xl hover:border-serra hover:bg-serra/10 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 text-left mb-3"
        >
          <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm border border-border">{npc.icon}</div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm">{npc.name}</div>
            <div class="text-xs text-cafe-muted truncate">{npc.role}</div>
            <!-- Heart display -->
            <div class="flex gap-px mt-0.5">
              {#each Array(5) as _, i}
                <span class="text-[9px]" class:opacity-25={i >= (hearts?.heartLevel || 0)}>
                  {i < (hearts?.heartLevel || 0) ? '❤️' : '🤍'}
                </span>
              {/each}
            </div>
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
          Practice exercises
        </a>
        <a
          href="/lesson?topic={selectedCity.topics[0]}"
          class="block w-full py-3 bg-white border border-border text-cafe font-semibold rounded-xl hover:border-terracotta transition-colors text-center text-sm"
        >
          {topicMeta[selectedCity.topics[0]]?.label || selectedCity.topics[0]} Lesson
        </a>
      </div>
    </div>
  </div>
{/if}

<!-- NPC Chat overlay -->
{#if selectedNpc}
  <NpcChat npc={selectedNpc} onClose={handleNpcClose} />
{/if}

<!-- Toasts -->
{#each toasts as toast, i}
  <Toast
    icon={toast.icon}
    title={toast.title}
    detail={toast.detail}
    onDismiss={() => { toasts = toasts.filter((_, j) => j !== i); }}
    duration={3500 + i * 1000}
  />
{/each}
