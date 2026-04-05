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

<section class="glass-panel control-panel" id="control-panel">
  <div class="panel-header">
    <div class="header-topline">
      <div>
        <p class="hud-eyebrow">Artemis Trajectory</p>
        <h1 class="hud-title">Launch Sequencer</h1>
      </div>
      <div class="mission-badge">
        <span class="badge-dot"></span>
        TLI
      </div>
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

  <div class="divider"></div>

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
      <label class="field" id="field-payload-mass">
        <div class="field-head">
          <span>Payload Mass</span>
          <strong>kg</strong>
        </div>
        <input bind:value={payloadMassKg} min="1000" max="100000" step="500" type="number" />
        <small>Dry payload only. Structural mass is estimated automatically.</small>
      </label>

      <label class="field" id="field-specific-impulse">
        <div class="field-head">
          <span>Specific Impulse</span>
          <strong>s</strong>
        </div>
        <input bind:value={ispSeconds} min="250" max="520" step="1" type="number" />
        <small>Seconds of effective exhaust performance.</small>
      </label>

      <label class="field" id="field-fuel-mass">
        <div class="field-head">
          <span>Initial Fuel Mass</span>
          <strong>kg</strong>
        </div>
        <input bind:value={fuelMassKg} min="1000" max="350000" step="1000" type="number" />
        <small>Available propellant for the translunar injection stage.</small>
      </label>

      <label class="field" id="field-strategy">
        <div class="field-head">
          <span>Launch Strategy</span>
          <strong>Mode</strong>
        </div>
        <div class="select-wrap">
          <select bind:value={strategy}>
            {#each STRATEGY_OPTIONS as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          <svg class="select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
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
    <button class="launch-button" type="button" id="launch-button" on:click={onLaunch}>
      <span class="button-kicker">Trans-Lunar Injection</span>
      <span class="button-title">Initiate Launch Sequence</span>
      <span class="button-arrow">→</span>
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
    height: calc(100vh - 32px);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
    overflow-x: hidden;
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
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    border: 1px solid rgba(103, 217, 255, 0.2);
    background: rgba(103, 217, 255, 0.06);
    color: var(--accent-cyan);
    border-radius: 999px;
    padding: 6px 12px;
    font-family: var(--mono-font);
    font-size: 0.64rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    animation: pulse-glow 3s ease-in-out infinite;
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-cyan);
    animation: pulse-dot 2s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .panel-copy,
  .footnote {
    margin: 0;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .footnote {
    font-size: 0.72rem;
    color: var(--muted-soft);
    line-height: 1.45;
  }

  .header-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .header-tags span {
    font-family: var(--mono-font);
    font-size: 0.58rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--muted-soft);
    border: 1px solid rgba(110, 231, 183, 0.12);
    border-radius: 999px;
    padding: 5px 10px;
    background: rgba(110, 231, 183, 0.04);
    transition: border-color 200ms ease, color 200ms ease;
  }

  .header-tags span:hover {
    border-color: rgba(110, 231, 183, 0.24);
    color: var(--accent-emerald);
  }

  .divider {
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(103, 217, 255, 0.18) 20%,
      rgba(103, 217, 255, 0.18) 80%,
      transparent
    );
  }

  .mission-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    border-radius: 14px;
    background: rgba(120, 170, 255, 0.08);
    overflow: hidden;
    border: 1px solid rgba(120, 170, 255, 0.1);
  }

  .mission-strip div {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    background: rgba(6, 12, 26, 0.85);
  }

  .strip-label {
    font-family: var(--mono-font);
    font-size: 0.56rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--muted-soft);
  }

  .mission-strip strong {
    font-size: 0.85rem;
    line-height: 1.3;
    color: #e8f0ff;
  }

  .panel-section {
    display: grid;
    gap: 10px;
  }

  .section-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding-top: 4px;
    border-top: 1px solid rgba(120, 170, 255, 0.08);
  }

  .section-header span {
    font-family: var(--mono-font);
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #d8e4ff;
  }

  .section-header small {
    color: var(--muted-soft);
    font-size: 0.72rem;
  }

  .input-grid {
    display: grid;
    gap: 12px;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .field-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .field-head span,
  .field-head strong {
    font-family: var(--mono-font);
    font-size: 0.6rem;
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
    border: 1px solid rgba(120, 170, 255, 0.14);
    background: rgba(4, 8, 18, 0.94);
    color: #f0f6ff;
    font-family: var(--mono-font);
    font-size: 0.9rem;
    border-radius: 12px;
    padding: 11px 14px;
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
  }

  .field input:hover,
  .field select:hover {
    border-color: rgba(103, 217, 255, 0.28);
    background: rgba(6, 12, 24, 0.98);
  }

  .field input:focus,
  .field select:focus {
    border-color: rgba(103, 217, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(103, 217, 255, 0.07), 0 0 20px rgba(103, 217, 255, 0.06);
    background: rgba(6, 12, 24, 1);
  }

  .select-wrap {
    position: relative;
  }

  .select-wrap select {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    padding-right: 36px;
    cursor: pointer;
  }

  .select-chevron {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--muted-soft);
    transition: color 180ms ease;
  }

  .select-wrap:hover .select-chevron {
    color: var(--accent-cyan);
  }

  .field small {
    color: rgba(200, 218, 255, 0.48);
    line-height: 1.4;
    font-size: 0.72rem;
  }

  .mission-grid {
    margin-top: 2px;
  }

  .emphasis-card {
    border-color: rgba(240, 188, 94, 0.12);
    background:
      linear-gradient(180deg, rgba(40, 30, 8, 0.22), rgba(6, 11, 22, 0.88)),
      rgba(10, 18, 33, 0.9);
  }

  .launch-block {
    margin-top: auto;
    display: grid;
    gap: 10px;
    padding-top: 4px;
  }

  .launch-button {
    position: relative;
    border: 0;
    border-radius: 16px;
    padding: 14px 18px;
    background:
      linear-gradient(135deg, rgba(103, 217, 255, 0.92), rgba(110, 231, 183, 0.88) 45%, rgba(240, 188, 94, 0.92));
    color: #060e1c;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 2px;
    text-align: left;
    cursor: pointer;
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 12px 40px rgba(103, 217, 255, 0.2),
      0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .launch-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    background-size: 250% 100%;
    animation: shimmer 4s ease-in-out infinite;
    pointer-events: none;
  }

  .launch-button:hover {
    transform: translateY(-2px);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.12) inset,
      0 16px 48px rgba(103, 217, 255, 0.3),
      0 6px 18px rgba(0, 0, 0, 0.3);
    filter: brightness(1.06);
  }

  .launch-button:active {
    transform: translateY(0px);
    filter: brightness(0.96);
  }

  .button-kicker {
    grid-column: 1;
    font-family: var(--mono-font);
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0.64;
  }

  .button-title {
    grid-column: 1;
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .button-arrow {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
    font-size: 1.4rem;
    font-weight: 300;
    opacity: 0.6;
    transition: transform 200ms ease, opacity 200ms ease;
  }

  .launch-button:hover .button-arrow {
    transform: translateX(4px);
    opacity: 0.9;
  }

  .warning {
    color: var(--accent-red) !important;
  }

  .ok {
    color: var(--accent-emerald) !important;
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
