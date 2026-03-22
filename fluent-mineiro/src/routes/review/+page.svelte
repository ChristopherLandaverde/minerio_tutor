<script lang="ts">
  import { onMount } from 'svelte';
  import { getDueReviewCount } from '$lib/db';

  let dueReviews = $state(0);
  let loaded = $state(false);

  onMount(async () => {
    try {
      dueReviews = await getDueReviewCount();
    } catch {
      // DB not ready
    }
    loaded = true;
  });
</script>

<div class="max-w-3xl mx-auto p-6">
  <h2 class="font-display text-2xl font-bold mb-2">🔄 Revisão</h2>
  <p class="text-sm text-cafe-secondary mb-8">Spaced repetition — revise no tempo certo</p>

  {#if !loaded}
    <div class="h-40 bg-pedra-subtle rounded-xl animate-pulse"></div>
  {:else if dueReviews === 0}
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-4xl mb-4">✅</div>
      <h3 class="font-display text-xl font-bold mb-2">Tudo em dia!</h3>
      <p class="text-cafe-muted text-sm">Nenhuma revisão pendente. Volte mais tarde ou pratique uma lição nova.</p>
      <a href="/lesson" class="inline-block mt-6 px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta/90 transition-colors">
        Praticar agora
      </a>
    </div>
  {:else}
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-4xl mb-4">📚</div>
      <h3 class="font-display text-xl font-bold mb-2">{dueReviews} {dueReviews === 1 ? 'item' : 'itens'} para revisar</h3>
      <p class="text-cafe-muted text-sm mb-6">Revisões pendentes baseadas no algoritmo SM-2.</p>
      <a href="/lesson" class="inline-block px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta/90 transition-colors">
        Começar revisão
      </a>
    </div>
  {/if}
</div>
