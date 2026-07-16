<script lang="ts">
  let { current }: { current: 'teach' | 'practice' } = $props();
  const stages: { key: string; label: string }[] = [
    { key: 'teach', label: 'Learn' },
    { key: 'practice', label: 'Practice' },
  ];
  const order = ['teach', 'practice'];
  function state(key: string): 'done' | 'active' | 'todo' {
    const ci = order.indexOf(current), ki = order.indexOf(key);
    return ki < ci ? 'done' : ki === ci ? 'active' : 'todo';
  }
</script>

<div class="flex items-center justify-center gap-2 mb-6">
  {#each stages as s}
    {@const st = state(s.key)}
    <div class="flex items-center gap-1.5 text-xs font-semibold
      {st === 'active' ? 'text-terracotta' : st === 'done' ? 'text-serra' : 'text-cafe-muted'}">
      <span class="w-2 h-2 rounded-full {st === 'active' ? 'bg-terracotta' : st === 'done' ? 'bg-serra' : 'bg-pedra-subtle'}"></span>
      {s.label}
    </div>
  {/each}
</div>
