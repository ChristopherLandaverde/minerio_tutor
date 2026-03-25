<script lang="ts">
  import { onMount } from 'svelte';
  import { getAllAchievements, type AchievementStatus } from '$lib/achievements';

  let achievements = $state<AchievementStatus[]>([]);
  let loaded = $state(false);
  let error = $state(false);

  const categories = [
    { key: 'streak', label: 'Streak' },
    { key: 'exercises', label: 'Exercícios' },
    { key: 'accuracy', label: 'Precisão' },
    { key: 'cefr', label: 'Nível CEFR' },
    { key: 'special', label: 'Especial' },
  ];

  onMount(async () => {
    try {
      achievements = await getAllAchievements();
    } catch {
      error = true;
    }
    loaded = true;
  });

  const unlockedCount = $derived(achievements.filter(a => a.unlockedAt).length);
  const totalCount = $derived(achievements.length);
</script>

<div class="max-w-3xl mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <div>
        <h2 class="font-display text-2xl font-bold">🏆 Conquistas</h2>
        <p class="text-[10px] text-cafe-muted/50">Achievements</p>
      </div>
      <p class="text-sm text-cafe-secondary">Suas medalhas e marcos de aprendizado <span class="text-[10px] text-cafe-muted/50">Your badges & milestones</span></p>
    </div>
    {#if loaded && !error}
      <span class="text-xs font-semibold px-3 py-1.5 rounded-full bg-ouro/15 text-ouro">
        {unlockedCount}/{totalCount}
      </span>
    {/if}
  </div>

  {#if !loaded}
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {#each Array(12) as _}
        <div class="h-32 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>

  {:else if error}
    <div class="bg-white border border-error/20 rounded-xl p-8 text-center">
      <div class="text-3xl mb-3">😕</div>
      <p class="text-sm text-cafe-muted">Erro ao carregar conquistas.</p>
      <button
        onclick={() => location.reload()}
        class="mt-4 px-5 py-2 bg-terracotta text-white text-sm font-semibold rounded-lg hover:bg-terracotta-dark transition-colors"
      >
        Tentar novamente
      </button>
    </div>

  {:else if unlockedCount === 0}
    <div class="bg-white border border-border rounded-xl p-8 text-center mb-8">
      <div class="text-4xl mb-4">🎯</div>
      <h3 class="font-display text-lg font-bold mb-2">Nenhuma conquista ainda!</h3>
      <p class="text-sm text-cafe-muted">Complete sua primeira sessão para começar a desbloquear medalhas.</p>
      <a href="/session" class="inline-block mt-4 px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta-dark transition-colors">
        Começar sessão
      </a>
    </div>
  {/if}

  {#if loaded && !error}
    {#each categories as cat}
      {@const catAchievements = achievements.filter(a => a.category === cat.key)}
      {#if catAchievements.length > 0}
        <h3 class="text-xs uppercase tracking-wider text-cafe-muted font-semibold mb-3 mt-6">{cat.label}</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {#each catAchievements as badge}
            <div
              class="bg-white border border-border rounded-xl p-4 text-center transition-all duration-150
                {badge.unlockedAt ? 'hover:-translate-y-0.5 hover:shadow-md' : 'opacity-60'}"
              role="listitem"
              aria-label="{badge.title}, {badge.tier}, {badge.unlockedAt ? 'desbloqueado' : 'bloqueado — ' + badge.hint}"
            >
              <div class="text-3xl {badge.unlockedAt ? '' : 'opacity-20'}">{badge.icon}</div>
              <p class="text-xs font-semibold mt-2 line-clamp-1">{badge.title}</p>
              <span class="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold
                {badge.tier === 'gold' ? 'bg-ouro/20 text-ouro' : badge.tier === 'silver' ? 'bg-cafe-muted/15 text-cafe-secondary' : 'bg-terracotta/15 text-terracotta'}">
                {badge.tier}
              </span>
              {#if badge.unlockedAt}
                <p class="text-[10px] text-cafe-muted mt-1">{new Date(badge.unlockedAt).toLocaleDateString('pt-BR')}</p>
              {:else}
                {#if badge.threshold > 1 && badge.currentValue > 0}
                  <div class="mt-2 h-1 bg-pedra-subtle rounded-full overflow-hidden">
                    <div class="h-full bg-terracotta rounded-full" style="width: {Math.min(100, (badge.currentValue / badge.threshold) * 100)}%"></div>
                  </div>
                  <p class="text-[10px] text-cafe-muted mt-1">{badge.currentValue}/{badge.threshold}</p>
                {:else}
                  <p class="text-[10px] text-cafe-muted mt-2">{badge.hint}</p>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/each}
  {/if}
</div>
