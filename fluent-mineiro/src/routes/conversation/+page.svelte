<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { sendMessage, getApiKey, setApiKey, type ChatMessage } from '$lib/claude';

  let messages = $state<ChatMessage[]>([]);
  let input = $state('');
  let loading = $state(false);
  let apiKey = $state<string | null>(null);
  let apiKeyInput = $state('');
  let error = $state<string | null>(null);
  let chatContainer: HTMLDivElement | undefined = $state();

  onMount(async () => {
    try {
      apiKey = await getApiKey();
    } catch {
      // DB not ready
    }
    // If we have a key, start the conversation
    if (apiKey) {
      await startConversation();
    }
  });

  async function saveKey() {
    if (!apiKeyInput.trim()) return;
    try {
      await setApiKey(apiKeyInput.trim());
      apiKey = apiKeyInput.trim();
      apiKeyInput = '';
      await startConversation();
    } catch {
      error = 'Não foi possível salvar a chave. Tente novamente.';
    }
  }

  async function startConversation() {
    loading = true;
    error = null;
    try {
      // Send empty conversation to get Claude's greeting
      const greeting = await sendMessage([], apiKey!);
      messages = [{ role: 'assistant', content: greeting }];
    } catch (e: any) {
      error = e.message || 'Erro ao conectar com Claude.';
    }
    loading = false;
  }

  async function send() {
    if (!input.trim() || loading || !apiKey) return;
    const userMsg = input.trim();
    input = '';
    error = null;

    messages = [...messages, { role: 'user', content: userMsg }];
    await tick();
    scrollToBottom();

    loading = true;
    try {
      const reply = await sendMessage(messages, apiKey);
      messages = [...messages, { role: 'assistant', content: reply }];
      await tick();
      scrollToBottom();
    } catch (e: any) {
      error = e.message || 'Erro ao enviar mensagem.';
    }
    loading = false;
  }

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

<div class="flex flex-col h-full">
  {#if !apiKey}
    <!-- API Key Setup -->
    <div class="max-w-lg mx-auto p-6 mt-12">
      <h2 class="font-display text-2xl font-bold mb-2">💬 Conversa</h2>
      <p class="text-sm text-cafe-secondary mb-6">Pratique conversação com um tutor de português mineiro powered by Claude.</p>

      <div class="bg-white border border-border rounded-xl p-6">
        <h3 class="font-semibold text-sm mb-3">Chave da API Anthropic</h3>
        <p class="text-xs text-cafe-muted mb-4">Sua chave fica salva localmente no app — nunca é enviada para nenhum servidor além da API da Anthropic.</p>
        <input
          bind:value={apiKeyInput}
          type="password"
          placeholder="sk-ant-..."
          class="w-full px-4 py-2.5 border-2 border-border rounded-lg text-sm bg-pedra focus:border-terracotta outline-none mb-3"
        />
        <button
          onclick={saveKey}
          disabled={!apiKeyInput.trim()}
          class="w-full py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Salvar e começar
        </button>
      </div>

      {#if error}
        <div class="mt-4 px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>
      {/if}
    </div>

  {:else}
    <!-- Chat Interface -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-border">
      <div>
        <h2 class="font-display text-lg font-bold">💬 Conversa</h2>
        <p class="text-xs text-cafe-muted">Converse em português mineiro com Claude</p>
      </div>
      <button
        onclick={() => { messages = []; startConversation(); }}
        class="text-xs px-3 py-1.5 border border-border rounded-lg text-cafe-muted hover:text-cafe hover:border-terracotta transition-colors"
      >
        Nova conversa
      </button>
    </div>

    <!-- Messages -->
    <div
      bind:this={chatContainer}
      class="flex-1 overflow-y-auto px-6 py-4 space-y-4"
    >
      {#each messages as msg}
        <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed {msg.role === 'user'
            ? 'bg-terracotta text-white rounded-br-md'
            : 'bg-white border border-border text-cafe rounded-bl-md'}">
            {msg.content}
          </div>
        </div>
      {/each}

      {#if loading}
        <div class="flex justify-start">
          <div class="bg-white border border-border rounded-2xl rounded-bl-md px-4 py-3">
            <div class="flex gap-1">
              <div class="w-2 h-2 bg-cafe-muted rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-2 h-2 bg-cafe-muted rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-2 h-2 bg-cafe-muted rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>
      {/if}

      {#if error}
        <div class="px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>
      {/if}
    </div>

    <!-- Input -->
    <div class="px-6 py-4 border-t border-border">
      <div class="flex gap-2">
        <input
          bind:value={input}
          onkeydown={handleKeydown}
          placeholder="Escreva em português..."
          disabled={loading}
          class="flex-1 px-4 py-2.5 border-2 border-border rounded-xl text-sm bg-pedra focus:border-terracotta outline-none disabled:opacity-50"
        />
        <button
          onclick={send}
          disabled={!input.trim() || loading}
          class="px-5 py-2.5 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Enviar
        </button>
      </div>
      <p class="text-xs text-cafe-muted mt-2 text-center">Claude Haiku — ~$0.01 por conversa</p>
    </div>
  {/if}
</div>
