<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { getApiKey, type ChatMessage } from '$lib/claude';
  import { loadNpcConversation, saveNpcConversation, sendNpcMessage, resetNpcConversation } from '$lib/npc';
  import type { NpcDef } from '$lib/cities';

  interface DisplayMessage extends ChatMessage {
    time: string;
  }

  interface Props {
    npc: NpcDef;
    onClose: () => void;
  }
  let { npc, onClose }: Props = $props();

  let messages = $state<DisplayMessage[]>([]);
  let input = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let apiKey = $state<string | null>(null);
  let chatContainer: HTMLDivElement | undefined = $state();

  function now(): string {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  onMount(async () => {
    apiKey = await getApiKey();
    const history = await loadNpcConversation(npc.id);
    if (history.length > 0) {
      messages = history.map(m => ({ ...m, time: '' }));
    } else {
      // First meeting — NPC greets
      messages = [{ role: 'assistant', content: npc.greeting, time: now() }];
    }
    await tick();
    scrollToBottom();
  });

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    input = '';

    messages = [...messages, { role: 'user', content: text, time: now() }];
    await tick();
    scrollToBottom();

    loading = true;
    error = null;
    try {
      const history: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendNpcMessage(npc, history.slice(0, -1), text);
      messages = [...messages, { role: 'assistant', content: reply, time: now() }];
      await tick();
      scrollToBottom();

      // Save conversation
      await saveNpcConversation(
        npc.id,
        npc.cityId,
        messages.map(m => ({ role: m.role, content: m.content }))
      );
    } catch (e: any) {
      error = e.message || 'Erro ao enviar mensagem.';
    }
    loading = false;
  }

  async function handleNewConversation() {
    await resetNpcConversation(npc.id);
    messages = [{ role: 'assistant', content: npc.greeting, time: now() }];
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 bg-black/30 z-40"
  onclick={onClose}
  role="presentation"
></div>

<!-- Chat panel -->
<div class="fixed right-0 top-0 bottom-0 w-full max-w-md bg-pedra z-50 flex flex-col shadow-2xl">
  <!-- Header -->
  <div class="flex items-center gap-3 px-4 py-2.5 bg-serra text-white">
    <button
      onclick={onClose}
      class="text-white/70 hover:text-white transition-colors"
      aria-label="Fechar"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <div class="w-9 h-9 rounded-full bg-serra-dark flex items-center justify-center text-lg">
      {npc.icon}
    </div>
    <div class="flex-1">
      <p class="text-sm font-semibold leading-tight">{npc.name}</p>
      <p class="text-[11px] text-white/70">
        {#if loading}digitando...
        {:else}{npc.role}{/if}
      </p>
    </div>
    <button
      onclick={handleNewConversation}
      class="text-white/70 hover:text-white transition-colors p-1"
      aria-label="Nova conversa"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  </div>

  <!-- Chat area -->
  <div
    bind:this={chatContainer}
    class="flex-1 overflow-y-auto px-3 py-3 space-y-1"
    style="background-color: #E8DDD3; background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c9bc' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"
  >
    {#each messages as msg}
      <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
        <div class="relative max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed shadow-sm
          {msg.role === 'user'
            ? 'bg-terracotta/90 text-white rounded-tr-none'
            : 'bg-white text-cafe rounded-tl-none'}">
          {#if msg.role === 'user'}
            <div class="absolute -right-2 top-0 w-0 h-0 border-t-[8px] border-t-terracotta/90 border-r-[8px] border-r-transparent"></div>
          {:else}
            <div class="absolute -left-2 top-0 w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent"></div>
          {/if}

          <p class="whitespace-pre-wrap">{msg.content}</p>

          {#if msg.time}
            <div class="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
              <span class="text-[10px] {msg.role === 'user' ? 'text-white/60' : 'text-cafe-muted'}">{msg.time}</span>
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if loading}
      <div class="flex justify-start">
        <div class="relative bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm">
          <div class="absolute -left-2 top-0 w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent"></div>
          <div class="flex gap-1.5">
            <div class="w-2 h-2 bg-cafe-muted/50 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
            <div class="w-2 h-2 bg-cafe-muted/50 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
            <div class="w-2 h-2 bg-cafe-muted/50 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
          </div>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="px-4 py-2 bg-error/10 border border-error/20 rounded-lg text-xs text-error text-center mx-8">{error}</div>
    {/if}
  </div>

  <!-- Input bar -->
  <div class="bg-white border-t border-border px-3 py-2 flex items-center gap-2">
    <input
      bind:value={input}
      onkeydown={handleKeydown}
      placeholder="Escreva em português..."
      class="flex-1 px-4 py-2 border border-border rounded-full text-sm bg-pedra focus:border-terracotta outline-none"
      disabled={loading}
    />
    <button
      onclick={send}
      disabled={!input.trim() || loading}
      class="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center hover:bg-terracotta-dark transition-colors disabled:opacity-40"
      aria-label="Enviar"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    </button>
  </div>
</div>
