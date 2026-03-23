<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { sendMessage, getApiKey, setApiKey, type ChatMessage } from '$lib/claude';

  interface DisplayMessage extends ChatMessage {
    time: string;
  }

  let messages = $state<DisplayMessage[]>([]);
  let input = $state('');
  let loading = $state(false);
  let apiKey = $state<string | null>(null);
  let apiKeyInput = $state('');
  let error = $state<string | null>(null);
  let chatContainer: HTMLDivElement | undefined = $state();
  let showStickers = $state(false);

  // Mineiro-themed sticker packs
  const stickerPacks = [
    {
      name: 'Mineiro',
      stickers: [
        { emoji: '🏔️😄', label: 'Uai!' },
        { emoji: '☕🧀', label: 'Cafezinho' },
        { emoji: '🔥👏', label: 'Bão demais!' },
        { emoji: '😱🙏', label: 'Nó!' },
        { emoji: '🤝😊', label: 'Ô sô!' },
        { emoji: '🎉🇧🇷', label: 'Arrasou!' },
      ],
    },
    {
      name: 'Comida',
      stickers: [
        { emoji: '🧀❤️', label: 'Pão de queijo' },
        { emoji: '🍖🫘', label: 'Feijão tropeiro' },
        { emoji: '☕😌', label: 'Café mineiro' },
        { emoji: '🍫🟤', label: 'Doce de leite' },
        { emoji: '🌽🎉', label: 'Festa junina' },
        { emoji: '🍺😎', label: 'Boteco' },
      ],
    },
    {
      name: 'Reações',
      stickers: [
        { emoji: '👍🔥', label: 'Top!' },
        { emoji: '😂🤣', label: 'kkkkk' },
        { emoji: '🤔💭', label: 'Hmm...' },
        { emoji: '😢💔', label: 'Que pena' },
        { emoji: '🥳🎊', label: 'Parabéns!' },
        { emoji: '😴💤', label: 'Tô cansado' },
      ],
    },
    {
      name: 'Estudo',
      stickers: [
        { emoji: '📚💪', label: 'Estudando!' },
        { emoji: '✅🎯', label: 'Acertei!' },
        { emoji: '❌😅', label: 'Errei...' },
        { emoji: '🧠✨', label: 'Entendi!' },
        { emoji: '🔄📝', label: 'Revisão' },
        { emoji: '🏆🥇', label: 'Missão cumprida' },
      ],
    },
  ];

  /** Check if a message is emoji-only (should render as sticker) */
  function isEmojiOnly(text: string): boolean {
    const stripped = text.replace(/[\s\uFE0F]/g, '');
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
    return emojiRegex.test(stripped) && stripped.length <= 20;
  }

  function now(): string {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  onMount(async () => {
    try {
      apiKey = await getApiKey();
    } catch {}
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
    messages = [{ role: 'assistant', content: 'E aí, tudo bão? 😊 Manda um oi em português, sô!', time: now() }];
  }

  async function send() {
    if (!input.trim() || loading || !apiKey) return;
    const userMsg = input.trim();
    input = '';
    error = null;

    messages = [...messages, { role: 'user', content: userMsg, time: now() }];
    await tick();
    scrollToBottom();

    loading = true;
    try {
      // Send without time field to API
      const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendMessage(apiMessages, apiKey);
      messages = [...messages, { role: 'assistant', content: reply, time: now() }];
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

  async function sendSticker(emoji: string) {
    showStickers = false;
    if (!apiKey || loading) return;
    messages = [...messages, { role: 'user', content: emoji, time: now() }];
    await tick();
    scrollToBottom();

    loading = true;
    try {
      const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendMessage(apiMessages, apiKey);
      messages = [...messages, { role: 'assistant', content: reply, time: now() }];
      await tick();
      scrollToBottom();
    } catch (e: any) {
      error = e.message || 'Erro ao enviar mensagem.';
    }
    loading = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    if (e.key === 'Escape' && showStickers) {
      showStickers = false;
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
    <!-- WhatsApp-style Header -->
    <div class="flex items-center gap-3 px-4 py-2.5 bg-serra text-white">
      <a href="/" class="text-white/70 hover:text-white transition-colors" aria-label="Voltar">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </a>
      <!-- Avatar -->
      <div class="w-9 h-9 rounded-full bg-serra-dark flex items-center justify-center text-lg">
        🏔️
      </div>
      <div class="flex-1">
        <p class="text-sm font-semibold leading-tight">Sabiá</p>
        <p class="text-[11px] text-white/70">{loading ? 'digitando...' : 'online'}</p>
      </div>
      <button
        onclick={() => { messages = []; startConversation(); }}
        class="text-white/70 hover:text-white transition-colors p-1"
        aria-label="Nova conversa"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Chat Area — WhatsApp wallpaper style -->
    <div
      bind:this={chatContainer}
      class="flex-1 overflow-y-auto px-3 py-3 space-y-1"
      style="background-color: #E8DDD3; background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c9bc' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"
    >
      {#each messages as msg, i}
        <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
          {#if isEmojiOnly(msg.content)}
            <!-- Sticker / emoji-only message — render large, no bubble -->
            <div class="max-w-[75%] px-1 py-1">
              <p class="text-5xl leading-tight">{msg.content}</p>
              <div class="flex items-center {msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-1 mt-0.5">
                <span class="text-[10px] text-cafe-muted">{msg.time}</span>
                {#if msg.role === 'user'}
                  <svg class="w-4 h-3 text-serra" viewBox="0 0 16 12" fill="none">
                    <path d="M1 6l3 3L11 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 6l3 3L15 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                {/if}
              </div>
            </div>
          {:else}
            <!-- Normal text bubble -->
            <div class="relative max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed shadow-sm
              {msg.role === 'user'
                ? 'bg-terracotta/90 text-white rounded-tr-none'
                : 'bg-white text-cafe rounded-tl-none'}">
              <!-- WhatsApp-style tail -->
              {#if msg.role === 'user'}
                <div class="absolute -right-2 top-0 w-0 h-0 border-t-[8px] border-t-terracotta/90 border-r-[8px] border-r-transparent"></div>
              {:else}
                <div class="absolute -left-2 top-0 w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent"></div>
              {/if}

              <p class="whitespace-pre-wrap">{msg.content}</p>

              <!-- Timestamp + checkmarks -->
              <div class="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
                <span class="text-[10px] {msg.role === 'user' ? 'text-white/60' : 'text-cafe-muted'}">{msg.time}</span>
                {#if msg.role === 'user'}
                  <svg class="w-4 h-3 text-white/60" viewBox="0 0 16 12" fill="none">
                    <path d="M1 6l3 3L11 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 6l3 3L15 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                {/if}
              </div>
            </div>
          {/if}
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

    <!-- Sticker Picker Panel -->
    {#if showStickers}
      <div class="bg-white border-t border-border">
        <!-- Pack tabs -->
        <div class="flex border-b border-border overflow-x-auto">
          {#each stickerPacks as pack, pi}
            <button
              class="px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2
                {pi === 0 ? 'text-terracotta border-terracotta' : 'text-cafe-muted border-transparent hover:text-cafe'}"
            >
              {pack.name}
            </button>
          {/each}
        </div>
        <!-- Sticker grid (show all packs) -->
        <div class="p-3 max-h-48 overflow-y-auto">
          {#each stickerPacks as pack}
            <p class="text-[10px] text-cafe-muted uppercase tracking-wider font-semibold mb-2 mt-2 first:mt-0">{pack.name}</p>
            <div class="grid grid-cols-6 gap-1">
              {#each pack.stickers as sticker}
                <button
                  onclick={() => sendSticker(sticker.emoji)}
                  class="flex flex-col items-center p-2 rounded-lg hover:bg-pedra-subtle transition-colors"
                  aria-label={sticker.label}
                  title={sticker.label}
                >
                  <span class="text-2xl">{sticker.emoji}</span>
                  <span class="text-[9px] text-cafe-muted mt-0.5 line-clamp-1">{sticker.label}</span>
                </button>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- WhatsApp-style Input Bar -->
    <div class="px-2 py-2 bg-pedra-subtle flex items-end gap-2">
      <!-- Sticker toggle -->
      <button
        onclick={() => showStickers = !showStickers}
        class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors
          {showStickers ? 'text-terracotta' : 'text-cafe-muted hover:text-cafe'}"
        aria-label={showStickers ? 'Fechar stickers' : 'Abrir stickers'}
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      <input
        bind:value={input}
        onkeydown={handleKeydown}
        onfocus={() => showStickers = false}
        placeholder="Mensagem"
        disabled={loading}
        class="flex-1 px-4 py-2.5 bg-white rounded-3xl text-sm outline-none disabled:opacity-50 border-none shadow-sm"
      />
      <button
        onclick={send}
        disabled={!input.trim() || loading}
        class="w-11 h-11 rounded-full bg-serra text-white flex items-center justify-center shrink-0 hover:bg-serra-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        aria-label="Enviar mensagem"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  {/if}
</div>
