<script lang="ts">
  import type { TeachItem } from '$lib/lesson';
  let { item }: { item: TeachItem } = $props();
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
  {/if}
  {#if item.mineiroNote}
    <p class="text-sm italic text-serra mt-3">"{item.mineiroNote}"</p>
  {/if}
</div>
