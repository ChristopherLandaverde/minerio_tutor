<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    icon: string;
    title: string;
    detail: string;
    onDismiss: () => void;
    duration?: number;
  }
  let { icon, title, detail, onDismiss, duration = 3500 }: Props = $props();

  let visible = $state(false);

  onMount(() => {
    // Animate in
    requestAnimationFrame(() => { visible = true; });
    const timer = setTimeout(() => {
      visible = false;
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  });
</script>

<div
  class="fixed bottom-4 right-4 z-[60] max-w-xs bg-white border border-ouro/30 rounded-xl shadow-lg p-3 flex items-center gap-3 transition-all duration-300"
  class:translate-y-0={visible}
  class:opacity-100={visible}
  class:translate-y-4={!visible}
  class:opacity-0={!visible}
  role="status"
>
  <div class="w-10 h-10 bg-ouro/10 rounded-lg flex items-center justify-center text-xl shrink-0">{icon}</div>
  <div class="min-w-0">
    <p class="text-xs font-semibold text-cafe">{title}</p>
    <p class="text-[10px] text-cafe-muted truncate">{detail}</p>
  </div>
  <button onclick={onDismiss} class="shrink-0 text-cafe-muted hover:text-cafe text-xs p-1" aria-label="Fechar">✕</button>
</div>
