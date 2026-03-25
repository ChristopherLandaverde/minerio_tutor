<script lang="ts">
  import { CITIES, ROADS, CITY_MAP } from '$lib/cities';
  import { isRoadUnlocked, type CityState, type CityStatus } from '$lib/city-state';

  interface Props {
    cityStates: CityState[];
    onCityClick: (cityId: string) => void;
  }
  let { cityStates, onCityClick }: Props = $props();

  const stateMap = $derived(new Map(cityStates.map(s => [s.cityId, s])));

  function getStatus(cityId: string): CityStatus {
    return stateMap.get(cityId)?.status || 'locked';
  }

  function getMastery(cityId: string): number {
    return stateMap.get(cityId)?.masteryPercent || 0;
  }

  function isClickable(status: CityStatus): boolean {
    return status !== 'locked';
  }

  function handleClick(cityId: string) {
    const status = getStatus(cityId);
    if (isClickable(status)) {
      onCityClick(cityId);
    }
  }

  function handleKeydown(e: KeyboardEvent, cityId: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(cityId);
    }
  }

  // City node colors based on status
  function getCityFill(status: CityStatus): string {
    switch (status) {
      case 'locked': return 'var(--color-border)';
      case 'open': return 'var(--color-terracotta)';
      case 'fading': return 'var(--color-terracotta)';
      case 'mastered': return 'var(--color-serra)';
    }
  }

  function getCityStroke(status: CityStatus): string {
    switch (status) {
      case 'locked': return 'var(--color-cafe-muted)';
      case 'open': return 'var(--color-terracotta-dark)';
      case 'fading': return 'var(--color-terracotta-dark)';
      case 'mastered': return 'var(--color-ouro)';
    }
  }

  function getCityOpacity(status: CityStatus): number {
    return (status === 'locked' || status === 'fading') ? 0.5 : 1;
  }

  function getStatusLabel(status: CityStatus): string {
    switch (status) {
      case 'locked': return 'Bloqueada';
      case 'open': return 'Aberta';
      case 'fading': return 'Precisa revisão';
      case 'mastered': return 'Dominada';
    }
  }

  // Simplified Minas Gerais outline (recognizable shape)
  const minasOutline = 'M 180,120 L 280,80 L 400,60 L 520,80 L 620,120 L 680,180 L 700,280 L 680,380 L 640,440 L 560,480 L 440,500 L 320,480 L 220,440 L 160,380 L 120,280 L 140,180 Z';
</script>

<div class="w-full aspect-[4/3] relative">
  <svg
    viewBox="0 0 800 560"
    class="w-full h-full"
    role="img"
    aria-label="Mapa de Minas Gerais — clique nas cidades para praticar"
  >
    <!-- Background -->
    <rect width="800" height="560" fill="var(--color-pedra-subtle)" rx="16" />

    <!-- Minas Gerais outline -->
    <path
      d={minasOutline}
      fill="var(--color-pedra)"
      stroke="var(--color-border)"
      stroke-width="2"
      opacity="0.8"
    />

    <!-- Topographic texture lines -->
    <path d="M 200,200 Q 350,180 500,220" fill="none" stroke="var(--color-border)" stroke-width="0.5" opacity="0.3" />
    <path d="M 250,300 Q 400,280 550,320" fill="none" stroke="var(--color-border)" stroke-width="0.5" opacity="0.3" />
    <path d="M 220,380 Q 380,350 520,400" fill="none" stroke="var(--color-border)" stroke-width="0.5" opacity="0.3" />

    <!-- Roads -->
    {#each ROADS as road}
      {@const fromCity = CITY_MAP.get(road.from)}
      {@const toCity = CITY_MAP.get(road.to)}
      {#if fromCity && toCity}
        {@const unlocked = isRoadUnlocked(road.from, cityStates)}
        <line
          x1={fromCity.mapPosition.x}
          y1={fromCity.mapPosition.y}
          x2={toCity.mapPosition.x}
          y2={toCity.mapPosition.y}
          stroke={unlocked ? 'var(--color-serra)' : 'var(--color-border)'}
          stroke-width={unlocked ? 3 : 2}
          stroke-dasharray={unlocked ? 'none' : '8,6'}
          opacity={unlocked ? 0.8 : 0.4}
        />
      {/if}
    {/each}

    <!-- City nodes -->
    {#each CITIES as city}
      {@const status = getStatus(city.id)}
      {@const mastery = getMastery(city.id)}
      {@const clickable = isClickable(status)}
      <g
        role="button"
        tabindex={clickable ? 0 : -1}
        aria-label="{city.name} — {getStatusLabel(status)}{mastery > 0 ? `, ${mastery}% dominado` : ''}"
        onclick={() => handleClick(city.id)}
        onkeydown={(e) => handleKeydown(e, city.id)}
        class="city-node {clickable ? 'clickable' : ''} status-{status}"
        style="opacity: {getCityOpacity(status)}"
      >
        <!-- Mastered glow -->
        {#if status === 'mastered'}
          <circle
            cx={city.mapPosition.x}
            cy={city.mapPosition.y}
            r="32"
            fill="none"
            stroke="var(--color-ouro)"
            stroke-width="2"
            opacity="0.4"
            class="glow-ring"
          />
        {/if}

        <!-- Mastery progress ring -->
        {#if status !== 'locked' && mastery > 0 && mastery < 100}
          <circle
            cx={city.mapPosition.x}
            cy={city.mapPosition.y}
            r="26"
            fill="none"
            stroke="var(--color-serra)"
            stroke-width="3"
            stroke-dasharray="{(mastery / 100) * 163.36} 163.36"
            stroke-dashoffset="0"
            transform="rotate(-90 {city.mapPosition.x} {city.mapPosition.y})"
            opacity="0.5"
          />
        {/if}

        <!-- City circle -->
        <circle
          cx={city.mapPosition.x}
          cy={city.mapPosition.y}
          r="22"
          fill={getCityFill(status)}
          stroke={getCityStroke(status)}
          stroke-width="3"
        />

        <!-- City icon / lock -->
        <text
          x={city.mapPosition.x}
          y={city.mapPosition.y + 1}
          text-anchor="middle"
          dominant-baseline="central"
          font-size="16"
          class="pointer-events-none select-none"
        >
          {status === 'locked' ? '🔒' : city.npcs[0]?.icon || '📍'}
        </text>

        <!-- City name -->
        <text
          x={city.mapPosition.x}
          y={city.mapPosition.y + 40}
          text-anchor="middle"
          font-size="13"
          font-weight="600"
          fill="var(--color-cafe)"
          class="pointer-events-none select-none"
        >
          {city.shortName}
        </text>

        <!-- Full name below -->
        <text
          x={city.mapPosition.x}
          y={city.mapPosition.y + 54}
          text-anchor="middle"
          font-size="10"
          fill="var(--color-cafe-muted)"
          class="pointer-events-none select-none"
        >
          {city.name}
        </text>

        <!-- Status badge -->
        {#if status === 'fading'}
          <text
            x={city.mapPosition.x + 18}
            y={city.mapPosition.y - 18}
            font-size="12"
            class="pointer-events-none select-none"
          >⚠️</text>
        {/if}
      </g>
    {/each}

    <!-- Map title -->
    <text x="400" y="36" text-anchor="middle" font-size="18" font-weight="700" fill="var(--color-cafe)" font-family="var(--font-display, Fraunces)">
      Minas Gerais
    </text>
    <text x="400" y="52" text-anchor="middle" font-size="10" fill="var(--color-cafe-muted)">
      Sua jornada pelo estado
    </text>
  </svg>
</div>

<style>
  .city-node.clickable {
    cursor: pointer;
  }
  .city-node.clickable:hover circle {
    filter: brightness(1.15);
  }
  .city-node.clickable:hover {
    transform-origin: center;
  }
  .city-node:focus-visible {
    outline: none;
  }
  .city-node:focus-visible circle {
    stroke: var(--color-terracotta);
    stroke-width: 4;
  }
  .glow-ring {
    animation: glow-pulse 2s ease-in-out infinite;
  }
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
  .status-fading circle {
    filter: saturate(0.3);
  }
</style>
