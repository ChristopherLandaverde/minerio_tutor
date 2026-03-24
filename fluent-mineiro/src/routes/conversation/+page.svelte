<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { sendMessage, getApiKey, setApiKey, type ChatMessage } from '$lib/claude';
  import {
    getElevenLabsKey, setElevenLabsKey,
    textToSpeech, playAudio,
  } from '$lib/elevenlabs';

  interface DisplayMessage extends ChatMessage {
    time: string;
  }

  let messages = $state<DisplayMessage[]>([]);
  let input = $state('');
  let loading = $state(false);
  let apiKey = $state<string | null>(null);
  let elevenKey = $state<string | null>(null);
  let apiKeyInput = $state('');
  let elevenKeyInput = $state('');
  let error = $state<string | null>(null);
  let chatContainer: HTMLDivElement | undefined = $state();
  let showStickers = $state(false);

  // Voice state
  let voiceEnabled = $state(false);
  // recording removed — mic not supported in Tauri WebView
  let speaking = $state(false);

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
      elevenKey = await getElevenLabsKey();
      voiceEnabled = !!elevenKey;
    } catch {}
    if (apiKey) {
      await startConversation();
    }
  });

  async function saveKeys() {
    if (!apiKeyInput.trim()) return;
    try {
      await setApiKey(apiKeyInput.trim());
      apiKey = apiKeyInput.trim();
      if (elevenKeyInput.trim()) {
        await setElevenLabsKey(elevenKeyInput.trim());
        elevenKey = elevenKeyInput.trim();
        voiceEnabled = true;
      }
      apiKeyInput = '';
      elevenKeyInput = '';
      await startConversation();
    } catch {
      error = 'Não foi possível salvar as chaves. Tente novamente.';
    }
  }

  async function startConversation() {
    const greeting = 'E aí, tudo bão? 😊 Manda um oi em português, sô!';
    messages = [{ role: 'assistant', content: greeting, time: now() }];
    // Speak greeting if voice enabled
    if (voiceEnabled && elevenKey) {
      try {
        speaking = true;
        const audio = await textToSpeech(greeting, elevenKey);
        await playAudio(audio);
      } catch {} finally { speaking = false; }
    }
  }

  /** Send a text message and get a spoken reply */
  async function sendAndSpeak(text: string) {
    if (!apiKey || loading) return;
    messages = [...messages, { role: 'user', content: text, time: now() }];
    await tick();
    scrollToBottom();

    loading = true;
    error = null;
    try {
      const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendMessage(apiMessages, apiKey);
      messages = [...messages, { role: 'assistant', content: reply, time: now() }];
      await tick();
      scrollToBottom();

      // Speak the reply
      if (voiceEnabled && elevenKey && !isEmojiOnly(reply)) {
        try {
          speaking = true;
          const audio = await textToSpeech(reply, elevenKey);
          await playAudio(audio);
        } catch {} finally { speaking = false; }
      }
    } catch (e: any) {
      error = e.message || 'Erro ao enviar mensagem.';
    }
    loading = false;
  }

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    input = '';
    await sendAndSpeak(text);
  }

  async function sendSticker(emoji: string) {
    showStickers = false;
    await sendAndSpeak(emoji);
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
    if (e.key === 'Escape' && showStickers) {
      showStickers = false;
    }
  }
</script>

<div class="flex flex-col h-full">
  {#if !apiKey}
    <!-- API Key Setup -->
    <div class="max-w-lg mx-auto p-6 mt-12">
      <h2 class="font-display text-2xl font-bold mb-1">💬 Conversa</h2>
      <p class="text-[10px] text-cafe-muted/50 mb-2">Chat</p>
      <p class="text-sm text-cafe-secondary mb-6">Pratique conversação com um tutor de português mineiro.</p>

      <div class="bg-white border border-border rounded-xl p-6 space-y-4">
        <div>
          <h3 class="font-semibold text-sm mb-1">Chave da API Anthropic <span class="text-error text-xs">*</span></h3>
          <p class="text-xs text-cafe-muted mb-2">Para conversar com Claude. Salva localmente.</p>
          <input
            bind:value={apiKeyInput}
            type="password"
            placeholder="sk-ant-..."
            class="w-full px-4 py-2.5 border-2 border-border rounded-lg text-sm bg-pedra focus:border-terracotta outline-none"
          />
        </div>

        <div>
          <h3 class="font-semibold text-sm mb-1">Chave ElevenLabs <span class="text-xs text-cafe-muted">(opcional — para voz)</span></h3>
          <p class="text-xs text-cafe-muted mb-2">Para falar e ouvir em português. Salva localmente.</p>
          <input
            bind:value={elevenKeyInput}
            type="password"
            placeholder="sk_..."
            class="w-full px-4 py-2.5 border-2 border-border rounded-lg text-sm bg-pedra focus:border-terracotta outline-none"
          />
        </div>

        <button
          onclick={saveKeys}
          disabled={!apiKeyInput.trim()}
          class="w-full py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Salvar e começar <span class="text-white/60 text-xs">Save & start</span>
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
      <div class="w-9 h-9 rounded-full bg-serra-dark flex items-center justify-center text-lg">
        🐦
      </div>
      <div class="flex-1">
        <p class="text-sm font-semibold leading-tight">Sabiá</p>
        <p class="text-[11px] text-white/70">
          {#if speaking}falando... 🔊
          {:else if loading}digitando...
          {:else}online{/if}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Voice toggle -->
        {#if elevenKey}
          <button
            onclick={() => voiceEnabled = !voiceEnabled}
            class="text-white/70 hover:text-white transition-colors p-1"
            aria-label={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}
            title={voiceEnabled ? 'Voz ativada' : 'Voz desativada'}
          >
            {#if voiceEnabled}
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            {:else}
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            {/if}
          </button>
        {/if}
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
    </div>

    <!-- Chat Area -->
    <div
      bind:this={chatContainer}
      class="flex-1 overflow-y-auto px-3 py-3 space-y-1"
      style="background-color: #E8DDD3; background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c9bc' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"
    >
      {#each messages as msg, i}
        <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
          {#if isEmojiOnly(msg.content)}
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
        <div class="flex border-b border-border overflow-x-auto">
          {#each stickerPacks as pack}
            <button
              class="px-4 py-2 text-xs font-semibold whitespace-nowrap text-cafe-muted border-b-2 border-transparent hover:text-cafe"
            >
              {pack.name}
            </button>
          {/each}
        </div>
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

    <!-- Input Bar -->
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

      <!-- Send button -->
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
