<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  let { children } = $props();
  let mobileMenuOpen = $state(false);
  let splashVisible = $state(true);
  let splashFading = $state(false);

  onMount(() => {
    // Apply saved theme on app load
    const saved = localStorage.getItem('dark_mode');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else if (saved === 'light') document.documentElement.classList.add('light');

    // Dismiss splash after DB initializes (min 1.2s for animation)
    setTimeout(() => {
      splashFading = true;
      setTimeout(() => { splashVisible = false; }, 500);
    }, 1200);
  });

  const navItems = [
    { href: '/', label: 'Mapa', en: 'Map', icon: '🗺️' },
    { href: '/lesson', label: 'Lição', en: 'Lesson', icon: '📚' },
    { href: '/review', label: 'Revisão', en: 'Review', icon: '🔄' },
    { href: '/conversation', label: 'Conversa', en: 'Chat', icon: '💬' },
    { href: '/writing', label: 'Escrita', en: 'Writing', icon: '✍️' },
    { href: '/reading', label: 'Leitura', en: 'Reading', icon: '📖' },
    { href: '/progress', label: 'Progresso', en: 'Progress', icon: '📊' },
    { href: '/achievements', label: 'Conquistas', en: 'Achievements', icon: '🏆' },
    { href: '/settings', label: 'Config', en: 'Settings', icon: '⚙️' },
  ];

  function isActive(href: string): boolean {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }
</script>

<!-- Splash screen -->
{#if splashVisible}
  <div
    class="fixed inset-0 z-[100] bg-pedra flex flex-col items-center justify-center transition-opacity duration-500"
    class:opacity-100={!splashFading}
    class:opacity-0={splashFading}
  >
    <div class="text-6xl mb-4 animate-bounce" style="animation-duration: 1.5s;">🐦</div>
    <h1 class="font-display text-3xl font-bold text-terracotta">Sabiá</h1>
    <p class="text-sm text-cafe-secondary mt-1">Aprenda mineirês, uai!</p>
    <div class="mt-6 flex gap-1.5">
      <div class="w-2 h-2 bg-terracotta/40 rounded-full animate-pulse" style="animation-delay: 0ms;"></div>
      <div class="w-2 h-2 bg-terracotta/40 rounded-full animate-pulse" style="animation-delay: 200ms;"></div>
      <div class="w-2 h-2 bg-terracotta/40 rounded-full animate-pulse" style="animation-delay: 400ms;"></div>
    </div>
  </div>
{/if}

<div class="flex h-screen bg-pedra">
  <!-- Mobile header -->
  <div class="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-border px-4 py-3 flex items-center justify-between">
    <h1 class="font-display text-lg font-bold text-terracotta">
      Sabiá <span class="text-serra">🐦</span>
    </h1>
    <button
      onclick={() => mobileMenuOpen = !mobileMenuOpen}
      class="p-2 text-cafe-secondary hover:text-cafe transition-colors"
      aria-label="Menu"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {#if mobileMenuOpen}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        {:else}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        {/if}
      </svg>
    </button>
  </div>

  <!-- Mobile overlay -->
  {#if mobileMenuOpen}
    <button
      class="md:hidden fixed inset-0 bg-black/30 z-30"
      onclick={() => mobileMenuOpen = false}
      aria-label="Close menu"
    ></button>
  {/if}

  <!-- Sidebar -->
  <nav class="fixed md:static z-40 h-full w-56 border-r border-border bg-white flex flex-col shrink-0 transition-transform duration-200 ease-out {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}">
    <div class="p-4 border-b border-border hidden md:block">
      <h1 class="font-display text-xl font-bold text-terracotta">
        Sabiá <span class="text-serra">🐦</span>
      </h1>
    </div>
    <div class="flex-1 py-2 mt-14 md:mt-0">
      {#each navItems as item}
        <a
          href={item.href}
          onclick={() => mobileMenuOpen = false}
          class="flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors {isActive(item.href)
            ? 'text-terracotta bg-pedra-subtle border-r-2 border-terracotta'
            : 'text-cafe-secondary hover:bg-pedra-subtle hover:text-cafe'}"
        >
          <span class="text-base">{item.icon}</span>
          <div class="leading-tight">
            <span class="block">{item.label}</span>
            <span class="block text-[10px] opacity-50 font-normal">{item.en}</span>
          </div>
        </a>
      {/each}
    </div>
    <div class="p-4 border-t border-border text-xs text-cafe-muted hidden md:block">
      Sabiá v0.5.0
    </div>
  </nav>

  <!-- Main content -->
  <main class="flex-1 overflow-y-auto mt-14 md:mt-0">
    {@render children()}
  </main>
</div>
