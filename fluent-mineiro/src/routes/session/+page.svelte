<script lang="ts">
  import { onMount } from 'svelte';
  import ExercisePlayer, { type SessionStats } from '$lib/components/ExercisePlayer.svelte';
  import TeachCard from '$lib/components/TeachCard.svelte';
  import StageProgress from '$lib/components/StageProgress.svelte';
  import type { Exercise } from '$lib/exercises';
  import { getDb, startSession, endSession, updateStreak, getDueReviewIds } from '$lib/db';
  import { applyAdaptation } from '$lib/adaptive';
  import { planLesson, type Lesson } from '$lib/lesson';
  import { SEED_EXERCISES } from '$lib/content';
  import { checkAchievements, type AchievementStatus } from '$lib/achievements';
  import { updateChallengeProgress } from '$lib/challenges';
  import { checkSlangTriggers } from '$lib/journal';
  import { unlockAudio } from '$lib/elevenlabs';

  type Phase = 'loading' | 'warmup' | 'teach' | 'practice' | 'done' | 'empty' | 'error';

  let phase = $state<Phase>('loading');
  let lesson = $state<Lesson | null>(null);
  let warmupExercises = $state<Exercise[]>([]);
  let teachIndex = $state(0);
  let sessionId = $state<number | null>(null);
  let sessionStats = $state<SessionStats | null>(null);
  let sessionStreak = $state(0);
  let levelChange = $state<string | null>(null);
  let errorMsg = $state('');

  let newAchievements = $state<AchievementStatus[]>([]);
  let showCelebration = $state(false);
  let celebrationIndex = $state(0);

  const exerciseById = new Map(SEED_EXERCISES.map(e => [e.id, e]));

  onMount(async () => {
    try {
      const db = await getDb();
      lesson = await planLesson(db);
      if (!lesson) { phase = 'empty'; return; }
      sessionId = await startSession();
      // Optional SRS warm-up: due reviews (cap 10), any topic.
      try {
        const due = await getDueReviewIds();
        warmupExercises = due.map(id => exerciseById.get(id)).filter((e): e is Exercise => !!e).slice(0, 10);
      } catch { warmupExercises = []; }
      phase = warmupExercises.length > 0 ? 'warmup' : 'teach';
    } catch (e: any) {
      errorMsg = e?.message || String(e);
      phase = 'error';
    }
  });

  // These are user taps entering the teach phase — unlock audio here so the
  // teach card can auto-play its pronunciation on mobile/PWA (see TeachCard).
  function skipWarmup() { unlockAudio(); phase = 'teach'; }
  function onWarmupEnd() { unlockAudio(); phase = 'teach'; }

  function nextTeach() {
    if (!lesson) return;
    unlockAudio(); // tap that advances to the next card also primes its auto-play
    if (teachIndex < lesson.teach.length - 1) teachIndex++;
    else phase = 'practice';
  }

  async function onPracticeEnd(stats: SessionStats) {
    sessionStats = stats;
    try {
      if (sessionId) await endSession(sessionId, stats.total, stats.correct, stats.xp);
      sessionStreak = await updateStreak();
      const newLevel = await applyAdaptation();
      const curLevel = lesson?.recognize[0]?.cefr_level || lesson?.produce[0]?.cefr_level || 'A2';
      if (newLevel !== curLevel) levelChange = newLevel;
      newAchievements = await checkAchievements({ total: stats.total, correct: stats.correct });
      await updateChallengeProgress(stats.total);
      await checkSlangTriggers();
    } catch {}
    if (newAchievements.length > 0) { showCelebration = true; celebrationIndex = 0; }
    phase = 'done';
  }

  function dismissCelebration() {
    if (celebrationIndex < newAchievements.length - 1) celebrationIndex++;
    else showCelebration = false;
  }
  function handleCelebrationKeydown(e: KeyboardEvent) {
    if (showCelebration && (e.key === 'Escape' || e.key === 'Enter')) dismissCelebration();
  }

  const practiceExercises = $derived(lesson ? [...lesson.recognize, ...lesson.produce] : []);
</script>

<svelte:window onkeydown={showCelebration ? handleCelebrationKeydown : undefined} />

<div class="max-w-xl mx-auto p-6">
  {#if phase === 'loading'}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}<div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>{/each}
    </div>

  {:else if phase === 'error'}
    <div class="bg-white border border-error/20 rounded-xl p-8 text-center">
      <div class="text-3xl mb-3">😕</div>
      <h3 class="font-display text-lg font-bold mb-2">Error loading lesson</h3>
      {#if errorMsg}<p class="text-xs text-error font-mono bg-error/5 p-2 rounded mb-4 break-all">{errorMsg}</p>{/if}
      <a href="/" class="inline-block px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg">Back to Dashboard</a>
    </div>

  {:else if phase === 'empty'}
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-4xl mb-4">✅</div>
      <h3 class="font-display text-xl font-bold mb-2">All caught up!</h3>
      <p class="text-cafe-muted text-sm">No lesson pending. Try chat or writing, or come back tomorrow.</p>
      <div class="flex gap-3 justify-center mt-6">
        <a href="/conversation" class="px-5 py-2.5 border border-border font-semibold rounded-lg text-sm">💬 Chat</a>
        <a href="/writing" class="px-5 py-2.5 border border-border font-semibold rounded-lg text-sm">✍️ Writing</a>
      </div>
    </div>

  {:else if phase === 'warmup' && warmupExercises.length > 0}
    <div class="text-center mb-4">
      <p class="text-sm font-semibold text-serra">🔥 Warm-up — {warmupExercises.length} review{warmupExercises.length > 1 ? 's' : ''}</p>
      <button onclick={skipWarmup} class="text-xs text-cafe-muted underline mt-1">Skip warm-up</button>
    </div>
    <ExercisePlayer exercises={warmupExercises} onSessionEnd={onWarmupEnd} />

  {:else if phase === 'teach' && lesson}
    <StageProgress current="teach" />
    <p class="text-center text-sm text-cafe-muted mb-1">Today: <span class="font-semibold text-cafe">{lesson.theme}</span></p>
    <p class="text-center text-xs text-cafe-muted mb-6">{lesson.reason}</p>
    {#if lesson.teach.length > 0}
      <TeachCard item={lesson.teach[teachIndex]} />
      <div class="text-center mt-4 text-xs text-cafe-muted">{teachIndex + 1} / {lesson.teach.length}</div>
      <button onclick={nextTeach} class="mt-4 w-full py-3 bg-terracotta text-white font-semibold rounded-xl">
        {teachIndex < lesson.teach.length - 1 ? 'Next' : 'Practice →'}
      </button>
    {:else}
      <button onclick={() => (phase = 'practice')} class="mt-4 w-full py-3 bg-terracotta text-white font-semibold rounded-xl">Practice →</button>
    {/if}

  {:else if phase === 'practice' && lesson}
    <StageProgress current="practice" />
    {#if practiceExercises.length > 0}
      <ExercisePlayer exercises={practiceExercises} onSessionEnd={onPracticeEnd} />
    {:else}
      <div class="bg-white border border-border rounded-2xl p-8 text-center">
        <p class="text-sm text-cafe-secondary mb-4">No practice exercises today.</p>
        <button onclick={() => onPracticeEnd({ correct: 0, total: 0, xp: 0 })} class="w-full py-3 bg-terracotta text-white font-semibold rounded-xl">Continue →</button>
      </div>
    {/if}

  {:else if phase === 'done' && sessionStats}
    <div class="text-center py-12">
      <div class="text-5xl mb-4">🎉</div>
      <h2 class="font-display text-2xl font-bold mb-2">Lesson complete!</h2>
      <div class="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
        <div class="bg-white border border-border rounded-xl p-3"><div class="font-display text-xl font-bold text-serra">{sessionStats.correct}/{sessionStats.total}</div><div class="text-xs text-cafe-muted">Correct</div></div>
        <div class="bg-white border border-border rounded-xl p-3"><div class="font-display text-xl font-bold text-ouro">+{sessionStats.xp}</div><div class="text-xs text-cafe-muted">XP</div></div>
        <div class="bg-white border border-border rounded-xl p-3"><div class="font-display text-xl font-bold text-terracotta">🔥 {sessionStreak}</div><div class="text-xs text-cafe-muted">Streak</div></div>
      </div>
      {#if levelChange}<div class="mb-6 px-4 py-3 bg-ouro/15 border border-ouro/30 rounded-xl"><span class="text-lg font-bold text-ouro">🎯 Level updated to {levelChange}!</span></div>{/if}
      <a href="/" class="inline-flex px-6 py-3 bg-terracotta text-white font-semibold rounded-xl">Back to Dashboard</a>
    </div>
  {/if}
</div>

{#if showCelebration && newAchievements[celebrationIndex]}
  {@const badge = newAchievements[celebrationIndex]}
  <div class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-24" role="dialog" aria-modal="true" aria-labelledby="celebration-title" tabindex="-1">
    <button class="absolute inset-0 w-full h-full cursor-default" onclick={dismissCelebration} aria-label="Close"></button>
    <div class="relative max-w-sm w-full mx-4 bg-white rounded-2xl p-8 text-center shadow-xl z-10">
      <div class="text-5xl mb-4">{badge.icon}</div>
      <p id="celebration-title" class="font-display text-2xl font-bold text-ouro">Congratulations!</p>
      <p class="font-semibold text-base text-cafe mt-2">{badge.title}</p>
      <p class="text-sm text-cafe-secondary mt-3">{badge.description}</p>
      <button onclick={dismissCelebration} class="mt-6 px-8 py-2.5 bg-serra text-white font-semibold rounded-xl">Continue</button>
    </div>
  </div>
{/if}
