<script>
  export let telemetry;
  export let focusTarget = 'system';
  export let onFocusChange = () => {};

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
    { value: 'system', label: 'System' },
    { value: 'earth', label: 'Earth' },
    { value: 'moon', label: 'Moon' },
    { value: 'rocket', label: 'Rocket' }
  ];
</script>

<section class="glass-panel telemetry-panel">
  <div class="telemetry-header">
    <div class="telemetry-lockup">
      <p class="hud-eyebrow">Telemetry</p>
      <h2 class="hud-title">{telemetry.strategyLabel}</h2>
    </div>
    <div class="soi-pill">{telemetry.sphereOfInfluence} SOI</div>
  </div>

  <div class="status-grid">
    <article class="status-card status-primary">
      <span class="status-label">Mission Status</span>
      <strong>{telemetry.statusText}</strong>
    </article>
    <article class="status-card">
      <span class="status-label">Mission Clock</span>
      <strong>{telemetry.missionElapsedLabel}</strong>
      <small>Time warp x{telemetry.timeWarp}</small>
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
        >
          {option.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="metric-grid">
    <article class="metric-card">
      <div class="metric-label">Velocity</div>
      <div class="metric-value">{speedFormatter.format(telemetry.velocityKmPerSecond)} km/s</div>
      <div class="metric-subtext">
        Achieved burn: {speedFormatter.format(telemetry.achievedDeltaVKmPerSecond)} km/s
      </div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Fuel Remaining</div>
      <div class="metric-value">{formatMass(telemetry.fuelMassKg)}</div>
      <div class="metric-subtext">{telemetry.burnActive ? 'Burning' : 'Coasting'}</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Earth Altitude</div>
      <div class="metric-value">{formatDistance(telemetry.earthAltitudeKm)}</div>
      <div class="metric-subtext">Surface-referenced altitude</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Moon Range</div>
      <div class="metric-value">{formatDistance(telemetry.moonRangeKm)}</div>
      <div class="metric-subtext">Measured to the lunar surface</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Closest Approach</div>
      <div class="metric-value">{formatDistance(telemetry.closestMoonApproachKm)}</div>
      <div class="metric-subtext">Best lunar flyby estimate so far</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Dominant Body</div>
      <div class="metric-value">{telemetry.sphereOfInfluence}</div>
      <div class="metric-subtext">Current sphere of influence</div>
    </article>
  </div>
</section>

<style>
  .telemetry-panel {
    pointer-events: auto;
    width: min(370px, calc(100vw - 40px));
    border-radius: 28px;
    padding: 18px;
    display: grid;
    gap: 12px;
  }

  .telemetry-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 12px;
  }

  .telemetry-lockup {
    display: grid;
    gap: 4px;
  }

  .soi-pill {
    border: 1px solid rgba(122, 215, 180, 0.2);
    background: rgba(122, 215, 180, 0.08);
    color: var(--accent-emerald);
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    white-space: nowrap;
  }

  .status-grid {
    display: grid;
    grid-template-columns: 1.2fr 0.9fr;
    gap: 10px;
  }

  .status-card {
    display: grid;
    gap: 6px;
    padding: 12px 13px;
    border-radius: 18px;
    background: rgba(8, 15, 29, 0.76);
    border: 1px solid rgba(131, 180, 255, 0.12);
  }

  .status-primary {
    background:
      linear-gradient(180deg, rgba(10, 29, 43, 0.9), rgba(7, 13, 25, 0.8));
  }

  .status-label,
  .focus-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--muted-soft);
  }

  .status-card strong {
    font-size: 0.98rem;
    line-height: 1.35;
  }

  .status-card small {
    color: var(--muted);
  }

  .focus-block {
    display: grid;
    gap: 8px;
  }

  .focus-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .focus-strip button {
    pointer-events: auto;
    border: 1px solid rgba(143, 193, 255, 0.2);
    background: rgba(7, 14, 28, 0.78);
    color: rgba(236, 244, 255, 0.84);
    border-radius: 999px;
    padding: 9px 10px;
    cursor: pointer;
    transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
  }

  .focus-strip button.active {
    background: rgba(103, 217, 255, 0.16);
    color: #f8fbff;
    border-color: rgba(103, 217, 255, 0.42);
  }

  @media (max-width: 860px) {
    .telemetry-panel {
      width: auto;
    }

    .status-grid,
    .focus-strip {
      grid-template-columns: 1fr;
    }
  }
</style>
