<script>
  import { STRATEGY_OPTIONS } from '../physics/orbitMath.js';

  export let payloadMassKg;
  export let ispSeconds;
  export let fuelMassKg;
  export let strategy;
  export let missionPreview;
  export let onLaunch = () => {};

  const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  });

  const deltaVFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function formatMass(value) {
    return `${numberFormatter.format(value)} kg`;
  }

  function formatHours(seconds) {
    return `${(seconds / 3600).toFixed(1)} h`;
  }
</script>

<section class="glass-panel control-panel">
  <div class="panel-header">
    <p class="hud-eyebrow">Artemis Trajectory</p>
    <h1 class="hud-title">Launch Sequencer</h1>
    <p class="panel-copy">
      Deterministic Earth-to-Moon mission planning with RK4 integration, dual-body gravity,
      and a continuous trans-lunar injection burn.
    </p>
  </div>

  <div class="input-grid">
    <label class="field">
      <span>Payload Mass</span>
      <input bind:value={payloadMassKg} min="1000" max="100000" step="500" type="number" />
      <small>Dry payload only. Structural mass is estimated automatically.</small>
    </label>

    <label class="field">
      <span>Specific Impulse</span>
      <input bind:value={ispSeconds} min="250" max="520" step="1" type="number" />
      <small>Seconds of effective exhaust performance.</small>
    </label>

    <label class="field">
      <span>Initial Fuel Mass</span>
      <input bind:value={fuelMassKg} min="1000" max="350000" step="1000" type="number" />
      <small>Available propellant for the translunar injection stage.</small>
    </label>

    <label class="field">
      <span>Launch Strategy</span>
      <select bind:value={strategy}>
        {#each STRATEGY_OPTIONS as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <small>
        {missionPreview.strategyMeta.blurb}
      </small>
    </label>
  </div>

  <div class="metric-grid mission-grid">
    <article class="metric-card">
      <div class="metric-label">Planned Delta-v</div>
      <div class="metric-value accent-text">
        {deltaVFormatter.format(missionPreview.plannedDeltaVKmPerSecond)} km/s
      </div>
      <div class="metric-subtext">
        Achievable: {deltaVFormatter.format(missionPreview.achievableDeltaVKmPerSecond)} km/s
      </div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Transfer Window</div>
      <div class="metric-value">{formatHours(missionPreview.arrivalEstimateTimeSeconds)}</div>
      <div class="metric-subtext">
        Moon phase lead: {missionPreview.arrivalPhaseAngleDeg.toFixed(1)} deg
      </div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Burn Budget</div>
      <div class="metric-value">{formatMass(missionPreview.plannedPropellantKg)}</div>
      <div class="metric-subtext">
        Duration: {Math.round(missionPreview.burnDurationSeconds)} s
      </div>
    </article>

    <article class="metric-card">
      <div class="metric-label">Fuel Margin</div>
      <div class="metric-value {missionPreview.fuelMarginKg < 0 ? 'warning' : 'ok'}">
        {missionPreview.fuelMarginKg < 0 ? '-' : ''}
        {formatMass(Math.abs(missionPreview.fuelMarginKg))}
      </div>
      <div class="metric-subtext">
        Vehicle dry mass: {formatMass(missionPreview.dryMassKg)}
      </div>
    </article>
  </div>

  <button class="launch-button" type="button" on:click={onLaunch}>
    Initiate Launch Sequence
  </button>

  <p class="footnote">
    Assumptions: 200 km parking orbit, circular lunar orbit around Earth, and impulse guidance
    tuned for visualization-grade translunar interception.
  </p>
</section>

<style>
  .control-panel {
    pointer-events: auto;
    height: calc(100vh - 48px);
    padding: 22px;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .panel-header {
    display: grid;
    gap: 10px;
  }

  .panel-copy,
  .footnote {
    margin: 0;
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .input-grid {
    display: grid;
    gap: 14px;
  }

  .field {
    display: grid;
    gap: 8px;
  }

  .field span {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--muted);
  }

  .field input,
  .field select {
    border: 1px solid rgba(143, 193, 255, 0.2);
    background: rgba(8, 16, 34, 0.95);
    color: #f7fbff;
    border-radius: 14px;
    padding: 14px 16px;
  }

  .field small {
    color: rgba(222, 236, 255, 0.64);
    line-height: 1.45;
  }

  .mission-grid {
    margin-top: 2px;
  }

  .launch-button {
    margin-top: auto;
    border: 0;
    border-radius: 16px;
    padding: 16px 20px;
    background:
      linear-gradient(135deg, rgba(84, 196, 255, 0.88), rgba(240, 188, 94, 0.94));
    color: #06101f;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: transform 160ms ease, box-shadow 160ms ease;
    box-shadow: 0 16px 32px rgba(33, 111, 170, 0.32);
  }

  .launch-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 34px rgba(33, 111, 170, 0.4);
  }

  .warning {
    color: var(--accent-red);
  }

  .ok {
    color: var(--accent-cyan);
  }

  @media (max-width: 860px) {
    .control-panel {
      height: auto;
      max-height: none;
    }
  }
</style>

