<script lang="ts">
  import type { TeachItem } from '$lib/lesson';
  import { getElevenLabsKey, textToSpeech, playAudio, unlockAudio } from '$lib/elevenlabs';
  import { onMount, untrack } from 'svelte';

  let { item }: { item: TeachItem } = $props();

  let elevenKey = $state<string | null>(null);
  let speaking = $state(false);

  onMount(() => {
    getElevenLabsKey().then((k) => (elevenKey = k)).catch(() => {});
  });

  async function speak() {
    if (!elevenKey || speaking || !item.answer) return;
    unlockAudio(); // when called from a tap, this primes mobile/PWA playback
    speaking = true;
    try {
      const blob = await textToSpeech(item.answer, elevenKey);
      await playAudio(blob);
    } catch {} finally {
      speaking = false;
    }
  }

  // Auto-play the word when the card changes — sight + sound (+ typing later) =
  // triple encoding. Depends only on the word and the key; untrack() keeps the
  // internals (speaking, etc.) from retriggering this effect into a replay loop.
  // Works on desktop always; on mobile once audio is unlocked by a prior tap
  // (the Next / Listen buttons call unlockAudio). Pattern cards have no word.
  $effect(() => {
    const word = item.answer;
    if (elevenKey && word && !item.isPattern) {
      untrack(() => speak());
    }
  });
</script>

<div class="bg-white border border-border rounded-2xl p-8 text-center">
  {#if item.image}
    <img src={item.image} alt={item.answer} class="w-24 h-24 mx-auto mb-4 object-contain" />
  {:else if item.emoji}
    <div class="text-6xl mb-4">{item.emoji}</div>
  {/if}
  {#if item.isPattern}
    <p class="text-base text-cafe-secondary">{item.meaning}</p>
  {:else}
    <div class="font-display text-2xl font-bold text-terracotta mb-1">{item.answer}</div>
    <div class="text-sm text-cafe-muted mb-3">{item.meaning}</div>
    {#if elevenKey}
      <button
        onclick={speak}
        disabled={speaking}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-cafe-secondary hover:border-terracotta hover:text-terracotta transition-colors disabled:opacity-40"
        aria-label="Listen to pronunciation"
        title="Listen to pronunciation"
      >
        <svg class="w-4 h-4 {speaking ? 'animate-pulse' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z"/></svg>
        {speaking ? 'Playing…' : 'Listen'}
      </button>
    {/if}
  {/if}
  {#if item.mineiroNote}
    <p class="text-sm italic text-serra mt-3">"{item.mineiroNote}"</p>
  {/if}
</div>
