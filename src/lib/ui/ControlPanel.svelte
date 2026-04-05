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
    <div class="header-topline">
      <div>
        <p class="hud-eyebrow">Artemis Trajectory</p>
        <h1 class="hud-title">Launch Sequencer</h1>
      </div>
      <div class="mission-badge">TLI</div>
    </div>

    <p class="panel-copy">
      Deterministic Earth-to-Moon mission planning with RK4 integration, dual-body gravity,
      and a continuous trans-lunar injection burn.
    </p>

    <div class="header-tags">
      <span>RK4</span>
      <span>Earth + Moon</span>
      <span>1 unit = 1,000 km</span>
    </div>
  </div>

  <div class="mission-strip">
    <div>
      <span class="strip-label">Parking Orbit</span>
      <strong>200 km</strong>
    </div>
    <div>
      <span class="strip-label">Transfer</span>
      <strong>{missionPreview.strategyMeta.label}</strong>
    </div>
    <div>
      <span class="strip-label">Fuel Need</span>
      <strong>{formatMass(missionPreview.plannedPropellantKg)}</strong>
    </div>
  </div>

  <div class="panel-section">
    <div class="section-header">
      <span>Mission Inputs</span>
      <small>Launch-state assumptions</small>
    </div>

    <div class="input-grid">
      <label class="field">
        <div class="field-head">
          <span>Payload Mass</span>
          <strong>kg</strong>
        </div>
        <input bind:value={payloadMassKg} min="1000" max="100000" step="500" type="number" />
        <small>Dry payload only. Structural mass is estimated automatically.</small>
      </label>

      <label class="field">
        <div class="field-head">
          <span>Specific Impulse</span>
          <strong>s</strong>
        </div>
        <input bind:value={ispSeconds} min="250" max="520" step="1" type="number" />
        <small>Seconds of effective exhaust performance.</small>
      </label>

      <label class="field">
        <div class="field-head">
          <span>Initial Fuel Mass</span>
          <strong>kg</strong>
        </div>
        <input bind:value={fuelMassKg} min="1000" max="350000" step="1000" type="number" />
        <small>Available propellant for the translunar injection stage.</small>
      </label>

      <label class="field">
        <div class="field-head">
          <span>Launch Strategy</span>
          <strong>Mode</strong>
        </div>
        <select bind:value={strategy}>
          {#each STRATEGY_OPTIONS as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <small>{missionPreview.strategyMeta.blurb}</small>
      </label>
    </div>
  </div>

  <div class="panel-section">
    <div class="section-header">
      <span>Mission Preview</span>
      <small>Pre-burn estimate</small>
    </div>

    <div class="metric-grid mission-grid">
      <article class="metric-card emphasis-card">
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
  </div>

  <div class="launch-block">
    <button class="launch-button" type="button" on:click={onLaunch}>
      <span class="button-kicker">Trans-Lunar Injection</span>
      <span class="button-title">Initiate Launch Sequence</span>
    </button>

    <p class="footnote">
      Assumptions: 200 km parking orbit, circular lunar orbit around Earth, and impulse guidance
      tuned for visualization-grade translunar interception.
    </p>
  </div>
</section>

<style>
  .control-panel {
    pointer-events: auto;
    height: calc(100vh - 40px);
    padding: 18px;
    border-radius: 28px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow: auto;
  }

  .panel-header {
    display: grid;
    gap: 10px;
  }

  .header-topline {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 12px;
  }

  .mission-badge {
    border: 1px solid rgba(103, 217, 255, 0.22);
    background: rgba(103, 217, 255, 0.08);
    color: var(--accent-cyan);
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .panel-copy,
  .footnote {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .header-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-tags span,
  .strip-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--muted-soft);
  }

  .header-tags span {
    border: 1px solid rgba(122, 215, 180, 0.15);
    border-radius: 999px;
    padding: 7px 10px;
    background: rgba(122, 215, 180, 0.06);
  }

  .mission-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    padding: 12px;
    border-radius: 18px;
    background: rgba(8, 16, 31, 0.72);
    border: 1px solid rgba(131, 180, 255, 0.14);
  }

  .mission-strip div {
    display: grid;
    gap: 6px;
  }

  .mission-strip strong {
    font-size: 0.95rem;
    line-height: 1.3;
  }

  .panel-section {
    display: grid;
    gap: 12px;
  }

  .section-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding-top: 6px;
    border-top: 1px solid rgba(131, 180, 255, 0.12);
  }

  .section-header span {
    font-size: 0.76rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #f3f8ff;
  }

  .section-header small {
    color: var(--muted-soft);
  }

  .input-grid {
    display: grid;
    gap: 12px;
  }

  .field {
    display: grid;
    gap: 8px;
  }

  .field-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .field-head span,
  .field-head strong {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .field-head span {
    color: var(--muted);
  }

  .field-head strong {
    color: var(--muted-soft);
    font-weight: 600;
  }

  .field input,
  .field select {
    border: 1px solid rgba(143, 193, 255, 0.2);
    background: rgba(6, 12, 25, 0.95);
    color: #f7fbff;
    border-radius: 16px;
    padding: 13px 14px;
    outline: none;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }

  .field input:focus,
  .field select:focus {
    border-color: rgba(103, 217, 255, 0.42);
    box-shadow: 0 0 0 3px rgba(103, 217, 255, 0.08);
  }

  .field small {
    color: rgba(222, 236, 255, 0.64);
    line-height: 1.4;
    font-size: 0.8rem;
  }

  .mission-grid {
    margin-top: 2px;
  }

  .emphasis-card {
    background:
      linear-gradient(180deg, rgba(35, 28, 10, 0.28), rgba(7, 13, 25, 0.82)),
      rgba(10, 18, 33, 0.86);
  }

  .launch-block {
    margin-top: auto;
    display: grid;
    gap: 12px;
  }

  .launch-button {
    border: 0;
    border-radius: 20px;
    padding: 15px 18px;
    background:
      linear-gradient(135deg, rgba(84, 196, 255, 0.96), rgba(240, 188, 94, 0.96));
    color: #06101f;
    display: grid;
    gap: 4px;
    text-align: left;
    cursor: pointer;
    transition: transform 160ms ease, box-shadow 160ms ease;
    box-shadow: 0 16px 32px rgba(33, 111, 170, 0.3);
  }

  .launch-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 34px rgba(33, 111, 170, 0.4);
  }

  .button-kicker {
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0.72;
  }

  .button-title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .warning {
    color: var(--accent-red);
  }

  .ok {
    color: var(--accent-emerald);
  }

  @media (max-width: 860px) {
    .control-panel {
      height: auto;
      max-height: none;
    }

    .mission-strip {
      grid-template-columns: 1fr;
    }
  }
</style>
