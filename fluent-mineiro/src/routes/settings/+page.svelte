<script lang="ts">
  import { onMount } from 'svelte';
  import { getProfile, setProfile } from '$lib/db';
  import { getApiKey, setApiKey } from '$lib/claude';

  let currentLevel = $state('A2');
  let dailyGoal = $state('10');
  let hasApiKey = $state(false);
  let apiKeyInput = $state('');
  let keySaved = $state(false);
  let loaded = $state(false);

  onMount(async () => {
    try {
      currentLevel = await getProfile('current_level') || 'A2';
      dailyGoal = await getProfile('daily_goal') || '10';
      const key = await getApiKey();
      hasApiKey = !!key;
    } catch {
      // DB not ready
    }
    loaded = true;
  });

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
            <p class="text-xs text-cafe-muted mt-1">Seu nível CEFR de português (adaptativo)</p>
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
            <button
              onclick={removeKey}
              class="text-xs text-error hover:underline"
            >
              Remover
            </button>
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
    </div>
  {/if}
</div>
