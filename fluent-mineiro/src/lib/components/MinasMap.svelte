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

  function getStatusLabel(status: CityStatus): string {
    switch (status) {
      case 'locked': return 'Bloqueada';
      case 'open': return 'Aberta';
      case 'fading': return 'Precisa revisão';
      case 'mastered': return 'Dominada';
    }
  }

  function getStatusColor(status: CityStatus): string {
    switch (status) {
      case 'locked': return '#9B8B7F';
      case 'open': return '#C0582B';
      case 'fading': return '#D4A843';
      case 'mastered': return '#2D6A4F';
    }
  }

  // More recognizable Minas Gerais outline — based on actual state borders
  // Key features: Triângulo Mineiro notch on the west, Jequitinhonha valley on the east
  const minasOutline = `
    M 155,165 L 175,140 L 215,115 L 260,95 L 310,82 L 365,72 L 420,68 L 475,72
    L 530,82 L 575,98 L 610,118 L 640,148 L 658,178 L 670,215 L 678,258
    L 680,300 L 675,340 L 665,375 L 648,405 L 625,430 L 595,452
    L 560,468 L 520,478 L 475,485 L 430,488 L 385,485 L 340,478
    L 298,465 L 258,445 L 225,420 L 195,390 L 170,355 L 152,318
    L 140,278 L 135,238 L 138,200 Z
  `;
</script>

<div class="map-container">
  <svg
    viewBox="0 0 820 560"
    class="map-svg"
    role="img"
    aria-label="Mapa de Minas Gerais — clique nas cidades para praticar"
  >
    <defs>
      <!-- Terrain gradient for depth -->
      <radialGradient id="terrain" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stop-color="#F5EFE5" />
        <stop offset="60%" stop-color="#EDE5D8" />
        <stop offset="100%" stop-color="#E5DDD3" />
      </radialGradient>
      <!-- Shadow filter for city cards -->
      <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#3D2B1F" flood-opacity="0.15" />
      </filter>
      <!-- Glow for mastered cities -->
      <filter id="gold-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feFlood flood-color="#D4A843" flood-opacity="0.4" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <!-- Road pattern -->
      <pattern id="road-dots" width="12" height="4" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="#9B8B7F" opacity="0.5" />
      </pattern>
    </defs>

    <!-- Background -->
    <rect width="820" height="560" fill="#FBF7F0" rx="16" />

    <!-- Subtle grid pattern for topographic feel -->
    {#each Array(12) as _, i}
      <line x1="0" y1={i * 48 + 20} x2="820" y2={i * 48 + 20} stroke="#E5DDD3" stroke-width="0.3" opacity="0.4" />
    {/each}

    <!-- Minas Gerais outline with terrain fill -->
    <path
      d={minasOutline}
      fill="url(#terrain)"
      stroke="#C0582B"
      stroke-width="2.5"
      stroke-opacity="0.3"
    />

    <!-- Inner terrain contour lines -->
    <path d="M 250,200 Q 380,170 520,210 Q 580,230 640,260" fill="none" stroke="#C0582B" stroke-width="0.6" opacity="0.08" />
    <path d="M 220,280 Q 360,250 500,290 Q 580,310 650,340" fill="none" stroke="#C0582B" stroke-width="0.6" opacity="0.08" />
    <path d="M 240,360 Q 380,330 520,370 Q 580,390 630,410" fill="none" stroke="#C0582B" stroke-width="0.6" opacity="0.06" />
    <path d="M 280,160 Q 400,140 530,170" fill="none" stroke="#2D6A4F" stroke-width="0.5" opacity="0.06" />
    <!-- Mountain range hint -->
    <path d="M 300,230 L 320,210 L 340,225 L 360,205 L 380,220 L 400,200 L 420,218 L 440,198 L 460,215 L 480,205 L 500,222" fill="none" stroke="#2D6A4F" stroke-width="0.8" opacity="0.1" />

    <!-- Roads -->
    {#each ROADS as road}
      {@const fromCity = CITY_MAP.get(road.from)}
      {@const toCity = CITY_MAP.get(road.to)}
      {#if fromCity && toCity}
        {@const unlocked = isRoadUnlocked(road.from, cityStates)}
        <!-- Road shadow -->
        <line
          x1={fromCity.mapPosition.x}
          y1={fromCity.mapPosition.y}
          x2={toCity.mapPosition.x}
          y2={toCity.mapPosition.y}
          stroke={unlocked ? '#2D6A4F' : '#9B8B7F'}
          stroke-width={unlocked ? 5 : 3}
          stroke-dasharray={unlocked ? 'none' : '6,8'}
          opacity={unlocked ? 0.15 : 0.1}
        />
        <!-- Road line -->
        <line
          x1={fromCity.mapPosition.x}
          y1={fromCity.mapPosition.y}
          x2={toCity.mapPosition.x}
          y2={toCity.mapPosition.y}
          stroke={unlocked ? '#2D6A4F' : '#9B8B7F'}
          stroke-width={unlocked ? 3 : 2}
          stroke-dasharray={unlocked ? 'none' : '6,8'}
          opacity={unlocked ? 0.5 : 0.3}
          stroke-linecap="round"
        />
      {/if}
    {/each}

    <!-- City nodes -->
    {#each CITIES as city}
      {@const status = getStatus(city.id)}
      {@const mastery = getMastery(city.id)}
      {@const clickable = isClickable(status)}
      {@const color = getStatusColor(status)}
      <g
        role="button"
        tabindex={clickable ? 0 : -1}
        aria-label="{city.name} — {getStatusLabel(status)}{mastery > 0 ? `, ${mastery}% dominado` : ''}"
        onclick={() => handleClick(city.id)}
        onkeydown={(e) => handleKeydown(e, city.id)}
        class="city-node {clickable ? 'clickable' : ''} status-{status}"
      >
        <!-- City card background -->
        <rect
          x={city.mapPosition.x - 52}
          y={city.mapPosition.y - 30}
          width="104"
          height="60"
          rx="12"
          fill="white"
          stroke={color}
          stroke-width={status === 'locked' ? 1.5 : 2.5}
          opacity={status === 'locked' ? 0.5 : 1}
          filter={status === 'mastered' ? 'url(#gold-glow)' : 'url(#card-shadow)'}
        />

        <!-- Icon circle -->
        <circle
          cx={city.mapPosition.x - 26}
          cy={city.mapPosition.y}
          r="16"
          fill={status === 'locked' ? '#F5EFE5' : color}
          opacity={status === 'locked' ? 0.6 : 0.15}
        />
        <text
          x={city.mapPosition.x - 26}
          y={city.mapPosition.y + 1}
          text-anchor="middle"
          dominant-baseline="central"
          font-size="16"
          class="pointer-events-none select-none"
        >
          {status === 'locked' ? '🔒' : city.npcs[0]?.icon || '📍'}
        </text>

        <!-- City name + region -->
        <text
          x={city.mapPosition.x + 8}
          y={city.mapPosition.y - 6}
          font-size="14"
          font-weight="700"
          fill={status === 'locked' ? '#9B8B7F' : '#3D2B1F'}
          font-family="'Fraunces', serif"
          class="pointer-events-none select-none"
        >
          {city.shortName}
        </text>
        <text
          x={city.mapPosition.x + 8}
          y={city.mapPosition.y + 10}
          font-size="10"
          fill={status === 'locked' ? '#9B8B7F' : '#6B5B4F'}
          class="pointer-events-none select-none"
        >
          {city.name}
        </text>

        <!-- Mastery bar (inside card) -->
        {#if status !== 'locked'}
          <rect
            x={city.mapPosition.x - 46}
            y={city.mapPosition.y + 20}
            width="92"
            height="3"
            rx="1.5"
            fill="#F5EFE5"
          />
          <rect
            x={city.mapPosition.x - 46}
            y={city.mapPosition.y + 20}
            width={Math.max(3, (mastery / 100) * 92)}
            height="3"
            rx="1.5"
            fill={color}
            opacity="0.7"
          />
        {/if}

        <!-- Status indicator dot -->
        {#if status === 'fading'}
          <circle cx={city.mapPosition.x + 46} cy={city.mapPosition.y - 24} r="6" fill="#D4A843" />
          <text x={city.mapPosition.x + 46} y={city.mapPosition.y - 23} text-anchor="middle" dominant-baseline="central" font-size="8" class="pointer-events-none select-none">!</text>
        {:else if status === 'mastered'}
          <circle cx={city.mapPosition.x + 46} cy={city.mapPosition.y - 24} r="6" fill="#2D6A4F" />
          <text x={city.mapPosition.x + 46} y={city.mapPosition.y - 23} text-anchor="middle" dominant-baseline="central" font-size="8" fill="white" class="pointer-events-none select-none">✓</text>
        {/if}
      </g>
    {/each}

    <!-- Map header -->
    <text x="410" y="38" text-anchor="middle" font-size="22" font-weight="700" fill="#3D2B1F" font-family="'Fraunces', serif" letter-spacing="0.5">
      Sua Jornada
    </text>
    <text x="410" y="55" text-anchor="middle" font-size="11" fill="#9B8B7F" letter-spacing="1.5" font-weight="500">
      MINAS GERAIS
    </text>

    <!-- Compass rose hint -->
    <g transform="translate(720, 480)" opacity="0.2">
      <line x1="0" y1="-12" x2="0" y2="12" stroke="#3D2B1F" stroke-width="1" />
      <line x1="-12" y1="0" x2="12" y2="0" stroke="#3D2B1F" stroke-width="1" />
      <text x="0" y="-16" text-anchor="middle" font-size="8" fill="#3D2B1F" font-weight="600">N</text>
    </g>
  </svg>
</div>

<style>
  .map-container {
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    background: var(--color-pedra);
  }
  .map-svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .city-node.clickable {
    cursor: pointer;
  }
  .city-node.clickable:hover rect {
    filter: brightness(1.02);
  }
  .city-node.clickable:hover {
    transform: scale(1.03);
    transform-origin: center;
    transition: transform 150ms ease-out;
  }
  .city-node:focus-visible {
    outline: none;
  }
  .city-node:focus-visible rect {
    stroke: var(--color-terracotta);
    stroke-width: 3;
  }
  .status-locked {
    opacity: 0.55;
  }
  .status-fading rect {
    filter: saturate(0.5);
  }
</style>
