<script lang="ts">
  import '../app.css';

  let { children } = $props();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '🏠' },
    { href: '/lesson', label: 'Lição', icon: '📚' },
    { href: '/review', label: 'Revisão', icon: '🔄' },
    { href: '/conversation', label: 'Conversa', icon: '💬' },
    { href: '/settings', label: 'Config', icon: '⚙️' },
  ];
</script>

<div class="flex h-screen bg-pedra">
  <!-- Sidebar -->
  <nav role="navigation" class="w-56 border-r border-border bg-white flex flex-col shrink-0">
    <div class="p-4 border-b border-border">
      <h1 class="font-display text-xl font-bold text-terracotta">
        Fluent <span class="text-serra">Mineiro</span>
      </h1>
    </div>
    <div class="flex-1 py-2">
      {#each navItems as item}
        <a
          href={item.href}
          class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-cafe-secondary hover:bg-pedra-subtle hover:text-cafe transition-colors"
        >
          <span class="text-base">{item.icon}</span>
          {item.label}
        </a>
      {/each}
    </div>
    <div class="p-4 border-t border-border text-xs text-cafe-muted">
      Fluent Mineiro v0.1.0
    </div>
  </nav>

  <!-- Main content -->
  <main role="main" class="flex-1 overflow-y-auto">
    {@render children()}
  </main>
</div>
