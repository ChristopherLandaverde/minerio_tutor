<script lang="ts">
  import { onMount } from 'svelte';
  import { getProfile, setProfile } from '$lib/db';
  import { getApiKey, setApiKey } from '$lib/claude';

  let currentLevel = $state('A2');
  let dailyGoal = $state(15);
  let darkMode = $state<'system' | 'light' | 'dark'>('system');
  let hasApiKey = $state(false);
  let apiKeyInput = $state('');
  let keySaved = $state(false);
  let settingsSaved = $state(false);
  let loaded = $state(false);

  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const goalOptions = [5, 10, 15, 20, 30];

  onMount(async () => {
    try {
      currentLevel = await getProfile('current_level') || 'A2';
      dailyGoal = parseInt(await getProfile('daily_goal') || '15');
      darkMode = (await getProfile('dark_mode') as 'system' | 'light' | 'dark') || 'system';
      applyTheme(darkMode);
      const key = await getApiKey();
      hasApiKey = !!key;
    } catch {
      // DB not ready — check localStorage fallback
      darkMode = (localStorage.getItem('dark_mode') as 'system' | 'light' | 'dark') || 'system';
      applyTheme(darkMode);
    }
    loaded = true;
  });

  async function saveLevel(level: string) {
    currentLevel = level;
    try {
      await setProfile('current_level', level);
      flashSaved();
    } catch {}
  }

  async function saveGoal(goal: number) {
    dailyGoal = goal;
    try {
      await setProfile('daily_goal', String(goal));
      flashSaved();
    } catch {}
  }

  function flashSaved() {
    settingsSaved = true;
    setTimeout(() => { settingsSaved = false; }, 2000);
  }

  function applyTheme(mode: 'system' | 'light' | 'dark') {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.add('light');
    }
    // 'system' = no class, CSS @media handles it
  }

  async function setTheme(mode: 'system' | 'light' | 'dark') {
    darkMode = mode;
    applyTheme(mode);
    localStorage.setItem('dark_mode', mode);
    try {
      await setProfile('dark_mode', mode);
    } catch {}
    flashSaved();
  }

  async function saveNewKey() {
    if (!apiKeyInput.trim()) return;
    try {
      await setApiKey(apiKeyInput.trim());
      hasApiKey = true;
      apiKeyInput = '';
      keySaved = true;
      setTimeout(() => { keySaved = false; }, 2000);
    } catch {}
  }

  async function removeKey() {
    try {
      await setProfile('api_key', '');
      hasApiKey = false;
    } catch {}
  }

  async function resetProgress() {
    try {
      await setProfile('streak', '0');
      await setProfile('total_xp', '0');
      await setProfile('current_level', 'A2');
      currentLevel = 'A2';
      flashSaved();
    } catch {}
  }
</script>

<div class="max-w-3xl mx-auto p-6">
  <h2 class="font-display text-2xl font-bold mb-1">⚙️ Configurações</h2>
  <p class="text-[10px] text-cafe-muted/50 mb-2">Settings</p>
  <p class="text-sm text-cafe-secondary mb-6">Personalize sua experiência <span class="text-[10px] text-cafe-muted/50">Customize your experience</span></p>

  {#if settingsSaved}
    <div class="mb-4 px-4 py-2 bg-serra/10 border border-serra/20 rounded-lg text-sm text-serra text-center">
      Salvo!
    </div>
  {/if}

  {#if !loaded}
    <div class="space-y-4">
      {#each [1, 2, 3] as _}
        <div class="h-20 bg-pedra-subtle rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <div class="space-y-4">
      <!-- CEFR Level -->
      <div class="bg-white border border-border rounded-xl p-5">
        <div class="mb-3">
          <h3 class="font-semibold text-sm">Nível CEFR</h3>
          <p class="text-xs text-cafe-muted mt-1">Seu nível atual de português. O sistema adapta automaticamente, mas você pode ajustar manualmente.</p>
        </div>
        <div class="flex gap-2">
          {#each cefrLevels as level}
            <button
              onclick={() => saveLevel(level)}
              class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors {currentLevel === level
                ? 'bg-serra text-white'
                : 'bg-pedra-subtle text-cafe-secondary hover:bg-pedra hover:text-cafe'}"
            >
              {level}
            </button>
          {/each}
        </div>
      </div>

      <!-- Daily Goal -->
      <div class="bg-white border border-border rounded-xl p-5">
        <div class="mb-3">
          <h3 class="font-semibold text-sm">Meta diária</h3>
          <p class="text-xs text-cafe-muted mt-1">Quantos exercícios por dia você quer praticar?</p>
        </div>
        <div class="flex gap-2">
          {#each goalOptions as goal}
            <button
              onclick={() => saveGoal(goal)}
              class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors {dailyGoal === goal
                ? 'bg-terracotta text-white'
                : 'bg-pedra-subtle text-cafe-secondary hover:bg-pedra hover:text-cafe'}"
            >
              {goal}
            </button>
          {/each}
        </div>
      </div>

      <!-- Dialect -->
      <div class="bg-white border border-border rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-sm">Dialeto</h3>
            <p class="text-xs text-cafe-muted mt-1">Foco regional do aprendizado</p>
          </div>
          <span class="text-sm font-semibold px-3 py-1.5 rounded-full bg-pedra-subtle text-ouro">Mineiro 🏔️</span>
        </div>
      </div>

      <!-- Theme -->
      <div class="bg-white border border-border rounded-xl p-5">
        <div class="mb-3">
          <h3 class="font-semibold text-sm">Tema</h3>
          <p class="text-xs text-cafe-muted mt-1">Escolha entre claro, escuro, ou automático (segue o sistema).</p>
        </div>
        <div class="flex gap-2">
          <button
            onclick={() => setTheme('light')}
            class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors {darkMode === 'light'
              ? 'bg-ouro text-white'
              : 'bg-pedra-subtle text-cafe-secondary hover:bg-pedra hover:text-cafe'}"
          >
            ☀️ Claro
          </button>
          <button
            onclick={() => setTheme('dark')}
            class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors {darkMode === 'dark'
              ? 'bg-ouro text-white'
              : 'bg-pedra-subtle text-cafe-secondary hover:bg-pedra hover:text-cafe'}"
          >
            🌙 Escuro
          </button>
          <button
            onclick={() => setTheme('system')}
            class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors {darkMode === 'system'
              ? 'bg-ouro text-white'
              : 'bg-pedra-subtle text-cafe-secondary hover:bg-pedra hover:text-cafe'}"
          >
            💻 Sistema
          </button>
        </div>
      </div>

      <!-- API Key -->
      <div class="bg-white border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="font-semibold text-sm">Chave API Anthropic</h3>
            <p class="text-xs text-cafe-muted mt-1">Para o modo conversa com Claude</p>
          </div>
          {#if hasApiKey}
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-serra/10 text-serra">Configurada</span>
          {:else}
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-error/10 text-error">Não configurada</span>
          {/if}
        </div>
        {#if hasApiKey}
          <div class="flex items-center gap-2">
            <span class="text-xs text-cafe-muted">sk-ant-•••••••••</span>
            <button onclick={removeKey} class="text-xs text-error hover:underline">Remover</button>
          </div>
        {:else}
          <div class="flex gap-2">
            <input
              bind:value={apiKeyInput}
              type="password"
              placeholder="sk-ant-..."
              class="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-pedra focus:border-terracotta outline-none"
            />
            <button
              onclick={saveNewKey}
              disabled={!apiKeyInput.trim()}
              class="px-4 py-2 bg-terracotta text-white text-sm font-semibold rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        {/if}
        {#if keySaved}
          <p class="text-xs text-serra mt-2">Chave salva com sucesso!</p>
        {/if}
      </div>

      <!-- Reset Progress -->
      <div class="bg-white border border-border rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-sm">Resetar progresso</h3>
            <p class="text-xs text-cafe-muted mt-1">Zera XP, streak e nível. Exercícios praticados são mantidos.</p>
          </div>
          <button
            onclick={resetProgress}
            class="px-4 py-2 border border-error/30 text-error text-sm font-semibold rounded-lg hover:bg-error/5 transition-colors"
          >
            Resetar
          </button>
        </div>
      </div>

      <!-- App Info -->
      <div class="text-center text-xs text-cafe-muted pt-4">
        Sabiá v0.4.0 · Tauri + SvelteKit · 990 exercícios
      </div>
    </div>
  {/if}
</div>
