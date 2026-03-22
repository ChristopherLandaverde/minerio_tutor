<script lang="ts">
  import { onMount } from 'svelte';
  import { fetch } from '@tauri-apps/plugin-http';
  import { getApiKey } from '$lib/claude';

  interface WritingPrompt {
    title: string;
    description: string;
    level: string;
    type: string;
    minWords: number;
  }

  const prompts: WritingPrompt[] = [
    { title: 'E-mail para um amigo', description: 'Escreva um e-mail para um amigo convidando-o para visitar Belo Horizonte. Mencione lugares para visitar e comidas para provar.', level: 'A2', type: 'email', minWords: 30 },
    { title: 'Minha rotina diária', description: 'Descreva sua rotina diária: o que você faz de manhã, à tarde e à noite.', level: 'A2', type: 'description', minWords: 40 },
    { title: 'Pedido no restaurante', description: 'Imagine que você está em um restaurante mineiro. Escreva o diálogo entre você e o garçom.', level: 'A2', type: 'dialogue', minWords: 30 },
    { title: 'Reclamação educada', description: 'Escreva uma mensagem para um hotel reclamando de um problema com o quarto, mas de forma educada.', level: 'B1', type: 'formal', minWords: 50 },
    { title: 'Minha comida favorita', description: 'Descreva sua comida brasileira favorita: como é, como é preparada, e por que você gosta.', level: 'A2', type: 'description', minWords: 40 },
    { title: 'Carta para o futuro', description: 'Escreva uma carta para você mesmo no futuro, quando já falar português fluentemente. Use o futuro do indicativo.', level: 'B1', type: 'letter', minWords: 60 },
    { title: 'Recomendação de filme', description: 'Recomende um filme ou série para um amigo brasileiro. Explique a história e por que vale a pena assistir.', level: 'B1', type: 'review', minWords: 50 },
    { title: 'Experiência de viagem', description: 'Conte sobre uma viagem que você fez (ou gostaria de fazer) ao Brasil. Use o pretérito perfeito.', level: 'B1', type: 'narrative', minWords: 60 },
    { title: 'Opinião sobre tecnologia', description: 'Dê sua opinião: a tecnologia está melhorando ou piorando nossa vida? Justifique com exemplos.', level: 'B2', type: 'opinion', minWords: 80 },
    { title: 'Mensagem para o chefe', description: 'Escreva uma mensagem profissional pedindo férias. Explique quando, por quanto tempo, e por quê.', level: 'B1', type: 'formal', minWords: 50 },
  ];

  let apiKey = $state<string | null>(null);
  let selectedPrompt = $state<WritingPrompt | null>(null);
  let userText = $state('');
  let feedback = $state<string | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let wordCount = $state(0);

  $effect(() => {
    wordCount = userText.trim() ? userText.trim().split(/\s+/).length : 0;
  });

  onMount(async () => {
    try {
      apiKey = await getApiKey();
    } catch {}
  });

  function selectPrompt(p: WritingPrompt) {
    selectedPrompt = p;
    userText = '';
    feedback = null;
    error = null;
  }

  function backToPrompts() {
    selectedPrompt = null;
    userText = '';
    feedback = null;
    error = null;
  }

  async function submitWriting() {
    if (!userText.trim() || !apiKey || !selectedPrompt) return;
    loading = true;
    error = null;
    feedback = null;

    const systemPrompt = `You are a Portuguese writing evaluator specializing in Mineiro Brazilian Portuguese. The student is an English/Spanish speaker at ${selectedPrompt.level} level.

EVALUATE their writing and respond in this EXACT format:

📊 **Avaliação Geral:** [score]/10

✅ **Pontos Positivos:**
- [what they did well — be specific, quote their text]

❌ **Erros Encontrados:**
- "[original]" → "[corrected]" — [brief explanation]
- (list each error with correction and explanation)

💡 **Sugestões:**
- [1-2 tips for improvement, relevant to their level]

${selectedPrompt.level === 'A2' ? '🗣️ **Versão Mineira:** Rewrite 1-2 of their sentences using Mineiro dialect features (cê, trem, bão, uai, dropped gerund d).' : ''}

Keep feedback encouraging but honest. Be specific — quote their text when praising or correcting. Respond primarily in Portuguese with English translations for corrections.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: `Writing prompt: "${selectedPrompt.title}" — ${selectedPrompt.description}\n\nStudent's writing:\n${userText}`,
          }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      feedback = data.content[0]?.text || 'Não foi possível avaliar. Tente novamente.';
    } catch (e: any) {
      error = e.message || 'Erro ao avaliar o texto.';
    }
    loading = false;
  }
</script>

<div class="max-w-3xl mx-auto p-6">
  {#if !apiKey}
    <h2 class="font-display text-2xl font-bold mb-2">✍️ Escrita</h2>
    <p class="text-sm text-cafe-secondary mb-6">Pratique escrita em português com feedback de Claude.</p>
    <div class="bg-white border border-border rounded-xl p-8 text-center">
      <div class="text-3xl mb-3">🔑</div>
      <p class="text-cafe-muted text-sm mb-4">Configure sua chave API nas Configurações para usar o modo escrita.</p>
      <a href="/settings" class="inline-block px-6 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta/90 transition-colors">
        Ir para Configurações
      </a>
    </div>

  {:else if !selectedPrompt}
    <!-- Prompt Selection -->
    <h2 class="font-display text-2xl font-bold mb-2">✍️ Escrita</h2>
    <p class="text-sm text-cafe-secondary mb-6">Escolha um tema para praticar escrita em português</p>

    <div class="space-y-3">
      {#each prompts as prompt}
        <button
          onclick={() => selectPrompt(prompt)}
          class="w-full text-left p-4 bg-white border border-border rounded-xl hover:border-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-sm">{prompt.title}</h3>
              <p class="text-xs text-cafe-muted mt-1 line-clamp-1">{prompt.description}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0 ml-4">
              <span class="text-xs text-cafe-muted">{prompt.minWords}+ palavras</span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-pedra-subtle {prompt.level === 'A2' ? 'text-serra' : prompt.level === 'B1' ? 'text-terracotta' : 'text-info'}">{prompt.level}</span>
            </div>
          </div>
        </button>
      {/each}
    </div>

  {:else}
    <!-- Writing Area -->
    <div class="flex items-center gap-3 mb-6">
      <button onclick={backToPrompts} class="text-cafe-muted hover:text-cafe transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h2 class="font-display text-lg font-bold">{selectedPrompt.title}</h2>
        <p class="text-xs text-cafe-muted">{selectedPrompt.level} · {selectedPrompt.minWords}+ palavras</p>
      </div>
    </div>

    <!-- Prompt Card -->
    <div class="bg-ouro/10 border border-ouro/20 rounded-xl p-4 mb-4">
      <p class="text-sm text-cafe">{selectedPrompt.description}</p>
    </div>

    <!-- Text Area -->
    <div class="relative mb-4">
      <textarea
        bind:value={userText}
        placeholder="Escreva seu texto em português aqui..."
        rows={8}
        disabled={loading}
        class="w-full px-4 py-3 border-2 border-border rounded-xl text-sm bg-white focus:border-terracotta outline-none resize-none disabled:opacity-50 leading-relaxed"
      ></textarea>
      <div class="absolute bottom-3 right-3 text-xs {wordCount >= selectedPrompt.minWords ? 'text-serra' : 'text-cafe-muted'}">
        {wordCount}/{selectedPrompt.minWords} palavras
      </div>
    </div>

    <!-- Submit -->
    <button
      onclick={submitWriting}
      disabled={wordCount < selectedPrompt.minWords || loading}
      class="w-full py-3 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {#if loading}
        Avaliando...
      {:else}
        Enviar para avaliação
      {/if}
    </button>

    {#if error}
      <div class="mt-4 px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>
    {/if}

    <!-- Feedback -->
    {#if feedback}
      <div class="mt-6 bg-white border border-border rounded-xl p-6">
        <h3 class="font-display text-lg font-bold mb-4">Feedback</h3>
        <div class="prose prose-sm text-cafe leading-relaxed whitespace-pre-wrap">
          {feedback}
        </div>
        <div class="mt-6 flex gap-3">
          <button
            onclick={() => { userText = ''; feedback = null; }}
            class="flex-1 py-2.5 border border-border text-sm font-semibold rounded-lg hover:bg-pedra-subtle transition-colors"
          >
            Tentar de novo
          </button>
          <button
            onclick={backToPrompts}
            class="flex-1 py-2.5 bg-serra text-white text-sm font-semibold rounded-lg hover:bg-serra-dark transition-colors"
          >
            Outro tema
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
