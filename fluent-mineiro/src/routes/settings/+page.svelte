<script lang="ts">
  import { onMount } from 'svelte';
  import { getProfile } from '$lib/db';

  let currentLevel = $state('A2');
  let dailyGoal = $state('10');
  let loaded = $state(false);

  onMount(async () => {
    try {
      currentLevel = await getProfile('current_level') || 'A2';
      dailyGoal = await getProfile('daily_goal') || '10';
    } catch {
      // DB not ready
    }
    loaded = true;
  });
</script>

<div class="max-w-3xl mx-auto p-6">
  <h2 class="font-display text-2xl font-bold mb-2">⚙️ Configurações</h2>
  <p class="text-sm text-cafe-secondary mb-8">Personalize sua experiência de aprendizado</p>

  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <div class="space-y-4">
      <div class="bg-white border border-border rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-sm">Nível atual</h3>
            <p class="text-xs text-cafe-muted mt-1">Seu nível CEFR de português</p>
          </div>
          <span class="text-sm font-semibold px-3 py-1.5 rounded-full bg-pedra-subtle text-serra">{currentLevel}</span>
        </div>
      </div>

      <div class="bg-white border border-border rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-sm">Meta diária</h3>
            <p class="text-xs text-cafe-muted mt-1">Exercícios por dia</p>
          </div>
          <span class="text-sm font-semibold px-3 py-1.5 rounded-full bg-pedra-subtle text-terracotta">{dailyGoal} exercícios</span>
        </div>
      </div>

      <div class="bg-white border border-border rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-sm">Dialeto</h3>
            <p class="text-xs text-cafe-muted mt-1">Foco regional do aprendizado</p>
          </div>
          <span class="text-sm font-semibold px-3 py-1.5 rounded-full bg-pedra-subtle text-ouro">Mineiro 🏔️</span>
        </div>
      </div>
    </div>
  {/if}
</div>
