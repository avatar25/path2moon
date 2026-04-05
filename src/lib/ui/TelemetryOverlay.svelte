<script>
  export let telemetry;
  export let focusTarget = 'system';
  export let viewMode = '3d';
  export let timeWarpSetting = 'auto';
  export let onFocusChange = () => {};
  export let onViewModeChange = () => {};
  export let onTimeWarpChange = () => {};

  const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  });

  const speedFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function formatDistance(value) {
    return `${numberFormatter.format(value)} km`;
  }

  function formatMass(value) {
    return `${numberFormatter.format(value)} kg`;
  }

  const focusOptions = [
    { value: 'system', label: 'System', icon: '◎' },
    { value: 'earth', label: 'Earth', icon: '⊕' },
    { value: 'moon', label: 'Moon', icon: '☽' },
    { value: 'rocket', label: 'Rocket', icon: '▲' }
  ];

  const viewOptions = [
    { value: '3d', label: '3D' },
    { value: '2d', label: '2D' }
  ];

  const timeWarpOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '1', label: '1x' },
    { value: '10', label: '10x' },
    { value: '30', label: '30x' },
    { value: '120', label: '120x' },
    { value: '600', label: '600x' }
  ];
</script>

<section class="glass-panel telemetry-panel" id="telemetry-panel">
  <div class="telemetry-header">
    <div class="telemetry-lockup">
      <p class="hud-eyebrow">
        <span class="live-dot"></span> Telemetry
      </p>
      <h2 class="hud-title">{telemetry.strategyLabel}</h2>
    </div>
    <div class="header-stack">
      <div class="view-toggle">
        {#each viewOptions as option}
          <button
            class:active={viewMode === option.value}
            on:click={() => onViewModeChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        {/each}
      </div>
      <div class="soi-pill">{telemetry.sphereOfInfluence} SOI</div>
    </div>
  </div>

  <div class="status-grid">
    <article class="status-card status-primary">
      <span class="status-label">Mission Status</span>
      <strong>{telemetry.statusText}</strong>
    </article>
    <article class="status-card">
      <span class="status-label">Mission Clock</span>
      <strong class="mono-value">{telemetry.missionElapsedLabel}</strong>
      <small>{telemetry.timeWarpModeLabel} time warp ×{telemetry.timeWarp}</small>
    </article>
  </div>

  <div class="focus-block">
    <span class="focus-label">Camera Focus</span>
    <div class="focus-strip">
      {#each focusOptions as option}
        <button
          class:active={focusTarget === option.value}
          on:click={() => onFocusChange(option.value)}
          type="button"
          id="focus-{option.value}"
        >
          <span class="focus-icon">{option.icon}</span>
          <span>{option.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="focus-block">
    <span class="focus-label">Simulation Speed</span>
    <div class="warp-strip">
      {#each timeWarpOptions as option}
        <button
          class:active={timeWarpSetting === option.value}
          on:click={() => onTimeWarpChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="metric-grid">
    <article class="metric-card">
      <div class="metric-label">Velocity</div>
      <div class="metric-value">{speedFormatter.format(telemetry.velocityKmPerSecond)} <span class="unit">km/s</span></div>
      <div class="metric-subtext">
        Achieved: {speedFormatter.format(telemetry.achievedDeltaVKmPerSecond)} km/s
      </div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Fuel Remaining</div>
      <div class="metric-value">{formatMass(telemetry.fuelMassKg)}</div>
      <div class="metric-subtext status-dot-wrap">
        <span class="status-dot {telemetry.burnActive ? 'burning' : 'coasting'}"></span>
        {telemetry.burnActive ? 'Burning' : 'Coasting'}
      </div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Earth Altitude</div>
      <div class="metric-value">{formatDistance(telemetry.earthAltitudeKm)}</div>
      <div class="metric-subtext">Surface-referenced</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Moon Range</div>
      <div class="metric-value">{formatDistance(telemetry.moonRangeKm)}</div>
      <div class="metric-subtext">To lunar surface</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Closest Approach</div>
      <div class="metric-value">{formatDistance(telemetry.closestMoonApproachKm)}</div>
      <div class="metric-subtext">Best flyby estimate</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Dominant Body</div>
      <div class="metric-value body-name">{telemetry.sphereOfInfluence}</div>
      <div class="metric-subtext">Sphere of influence</div>
    </article>
  </div>
</section>

<style>
  .telemetry-panel {
    pointer-events: auto;
    width: min(360px, calc(100vw - 32px));
    padding: 16px;
    display: grid;
    gap: 10px;
  }

  .telemetry-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 10px;
  }

  .header-stack {
    display: grid;
    gap: 8px;
    justify-items: end;
  }

  .telemetry-lockup {
    display: grid;
    gap: 3px;
  }

  .live-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-emerald);
    margin-right: 4px;
    vertical-align: middle;
    animation: pulse-dot 1.8s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 0.4; transform: scale(0.9); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  .soi-pill {
    flex-shrink: 0;
    border: 1px solid rgba(110, 231, 183, 0.16);
    background: rgba(110, 231, 183, 0.06);
    color: var(--accent-emerald);
    border-radius: 999px;
    padding: 5px 10px;
    font-family: var(--mono-font);
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    white-space: nowrap;
  }

  .view-toggle {
    display: inline-grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(6, 12, 26, 0.86);
    border: 1px solid rgba(120, 170, 255, 0.12);
  }

  .view-toggle button {
    pointer-events: auto;
    border: 0;
    background: transparent;
    color: var(--muted-soft);
    border-radius: 999px;
    padding: 5px 10px;
    cursor: pointer;
    font-family: var(--mono-font);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    transition: background 180ms ease, color 180ms ease;
  }

  .view-toggle button.active {
    background: rgba(103, 217, 255, 0.16);
    color: #f0f8ff;
  }

  .status-grid {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 8px;
  }

  .status-card {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(6, 13, 26, 0.8);
    border: 1px solid rgba(120, 170, 255, 0.08);
    transition: border-color 200ms ease;
  }

  .status-card:hover {
    border-color: rgba(120, 170, 255, 0.18);
  }

  .status-primary {
    background:
      linear-gradient(180deg, rgba(8, 24, 40, 0.92), rgba(5, 11, 22, 0.82));
    border-color: rgba(103, 217, 255, 0.12);
  }

  .status-label,
  .focus-label {
    font-family: var(--mono-font);
    font-size: 0.58rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--muted-soft);
  }

  .status-card strong {
    font-size: 0.9rem;
    line-height: 1.3;
    color: #e8f0ff;
  }

  .mono-value {
    font-family: var(--mono-font) !important;
  }

  .status-card small {
    color: var(--muted-soft);
    font-size: 0.68rem;
  }

  .focus-block {
    display: grid;
    gap: 6px;
  }

  .focus-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .warp-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .focus-strip button {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    border: 1px solid rgba(120, 170, 255, 0.12);
    background: rgba(6, 12, 26, 0.8);
    color: rgba(220, 232, 255, 0.6);
    border-radius: 12px;
    padding: 8px 6px;
    cursor: pointer;
    font-size: 0.68rem;
    font-weight: 500;
    transition: all 200ms ease;
  }

  .warp-strip button {
    pointer-events: auto;
    border: 1px solid rgba(120, 170, 255, 0.12);
    background: rgba(6, 12, 26, 0.8);
    color: rgba(220, 232, 255, 0.6);
    border-radius: 12px;
    padding: 8px 6px;
    cursor: pointer;
    font-size: 0.68rem;
    font-weight: 500;
    font-family: var(--mono-font);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: all 200ms ease;
  }

  .focus-icon {
    font-size: 1rem;
    line-height: 1;
    transition: transform 200ms ease;
  }

  .focus-strip button:hover {
    border-color: rgba(103, 217, 255, 0.28);
    color: rgba(220, 232, 255, 0.88);
    background: rgba(103, 217, 255, 0.06);
  }

  .warp-strip button:hover {
    border-color: rgba(103, 217, 255, 0.28);
    color: rgba(220, 232, 255, 0.88);
    background: rgba(103, 217, 255, 0.06);
  }

  .focus-strip button:hover .focus-icon {
    transform: scale(1.15);
  }

  .focus-strip button.active {
    background:
      linear-gradient(180deg, rgba(103, 217, 255, 0.14), rgba(103, 217, 255, 0.06));
    color: #f0f8ff;
    border-color: rgba(103, 217, 255, 0.36);
    box-shadow: 0 0 12px rgba(103, 217, 255, 0.1);
  }

  .warp-strip button.active {
    background:
      linear-gradient(180deg, rgba(103, 217, 255, 0.14), rgba(103, 217, 255, 0.06));
    color: #f0f8ff;
    border-color: rgba(103, 217, 255, 0.36);
    box-shadow: 0 0 12px rgba(103, 217, 255, 0.1);
  }

  .unit {
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--muted-soft);
  }

  .body-name {
    font-family: 'Inter', sans-serif !important;
    text-transform: capitalize;
  }

  .status-dot-wrap {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.burning {
    background: var(--accent-amber);
    box-shadow: 0 0 8px rgba(240, 188, 94, 0.5);
    animation: pulse-burn 0.8s ease-in-out infinite;
  }

  .status-dot.coasting {
    background: var(--muted-soft);
  }

  @keyframes pulse-burn {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  @media (max-width: 860px) {
    .telemetry-panel {
      width: auto;
    }

    .status-grid,
    .focus-strip,
    .warp-strip {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
