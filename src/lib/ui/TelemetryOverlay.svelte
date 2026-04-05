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
    <div>
      <p class="hud-eyebrow">Telemetry</p>
      <h2 class="hud-title">{telemetry.strategyLabel}</h2>
    </div>
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

  <p class="status-line">{telemetry.statusText}</p>

  <div class="metric-grid">
    <article class="metric-card">
      <div class="metric-label">Velocity</div>
      <div class="metric-value">{speedFormatter.format(telemetry.velocityKmPerSecond)} km/s</div>
      <div class="metric-subtext">Achieved burn: {speedFormatter.format(telemetry.achievedDeltaVKmPerSecond)} km/s</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Earth Altitude</div>
      <div class="metric-value">{formatDistance(telemetry.earthAltitudeKm)}</div>
      <div class="metric-subtext">Parking orbit origin referenced from surface</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Moon Range</div>
      <div class="metric-value">{formatDistance(telemetry.moonRangeKm)}</div>
      <div class="metric-subtext">Measured to the lunar surface</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Current SOI</div>
      <div class="metric-value">{telemetry.sphereOfInfluence}</div>
      <div class="metric-subtext">
        Closest approach: {formatDistance(telemetry.closestMoonApproachKm)}
      </div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Mission Clock</div>
      <div class="metric-value">{telemetry.missionElapsedLabel}</div>
      <div class="metric-subtext">Time acceleration x{telemetry.timeWarp}</div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Fuel Remaining</div>
      <div class="metric-value">{formatMass(telemetry.fuelMassKg)}</div>
      <div class="metric-subtext">{telemetry.burnActive ? 'Burning' : 'Coasting'}</div>
    </article>
  </div>
</section>

<style>
  .telemetry-panel {
    pointer-events: auto;
    width: min(400px, calc(100vw - 48px));
    border-radius: 24px;
    padding: 18px;
  }

  .telemetry-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 10px;
  }

  .focus-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .focus-strip button {
    pointer-events: auto;
    border: 1px solid rgba(143, 193, 255, 0.24);
    background: rgba(8, 16, 34, 0.8);
    color: rgba(236, 244, 255, 0.84);
    border-radius: 999px;
    padding: 8px 12px;
    cursor: pointer;
  }

  .focus-strip button.active {
    background: rgba(102, 217, 255, 0.14);
    color: #f8fbff;
    border-color: rgba(102, 217, 255, 0.42);
  }

  .status-line {
    margin: 0 0 16px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(102, 217, 255, 0.08);
    border: 1px solid rgba(102, 217, 255, 0.14);
    color: rgba(240, 247, 255, 0.9);
  }

  @media (max-width: 860px) {
    .telemetry-panel {
      width: auto;
    }
  }
</style>
