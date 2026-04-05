<script>
  import {
    EARTH_RADIUS_KM,
    MOON_RADIUS_KM,
    MOON_SOI_RADIUS_KM,
    magnitude,
    subVec
  } from '../physics/orbitMath.js';

  export let rocketPositionKm = [0, 0, 0];
  export let moonPositionKm = [0, 0, 0];
  export let pathPositionsKm = [];
  export let projectedPositionsKm = [];
  export let pathVersion = 0;
  export let focusTarget = 'system';
  export let telemetry;

  const MAP_SIZE = 1000;
  const EARTH_POSITION_KM = [0, 0, 0];

  function collectBounds(points) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const point of points) {
      if (!point) {
        continue;
      }

      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }

    if (!Number.isFinite(minX)) {
      return { centerX: 0, centerY: 0, spanKm: 100000 };
    }

    const widthKm = Math.max(1, maxX - minX);
    const heightKm = Math.max(1, maxY - minY);
    const spanKm = Math.max(widthKm, heightKm) * 1.18;

    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      spanKm
    };
  }

  function buildViewWindow() {
    if (focusTarget === 'earth') {
      return {
        centerX: 0,
        centerY: 0,
        spanKm: Math.max(48000, magnitude(rocketPositionKm) * 1.55)
      };
    }

    if (focusTarget === 'moon') {
      return {
        centerX: moonPositionKm[0],
        centerY: moonPositionKm[1],
        spanKm: Math.max(26000, magnitude(subVec(rocketPositionKm, moonPositionKm)) * 1.75)
      };
    }

    if (focusTarget === 'rocket') {
      const earthDistanceKm = magnitude(rocketPositionKm);
      const moonDistanceKm = magnitude(subVec(rocketPositionKm, moonPositionKm));
      return {
        centerX: rocketPositionKm[0],
        centerY: rocketPositionKm[1],
        spanKm: Math.min(
          160000,
          Math.max(24000, Math.min(earthDistanceKm, moonDistanceKm) * 2.2)
        )
      };
    }

    return collectBounds([
      EARTH_POSITION_KM,
      moonPositionKm,
      rocketPositionKm,
      ...pathPositionsKm,
      ...projectedPositionsKm
    ]);
  }

  function kmToMapPoint(pointKm, window) {
    const halfSpanKm = window.spanKm / 2;
    const x = ((pointKm[0] - window.centerX) / halfSpanKm) * (MAP_SIZE / 2) + MAP_SIZE / 2;
    const y = MAP_SIZE / 2 - ((pointKm[1] - window.centerY) / halfSpanKm) * (MAP_SIZE / 2);

    return [x, y];
  }

  function toSvgPoints(pointsKm, window) {
    return pointsKm
      .map((point) => kmToMapPoint(point, window))
      .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ');
  }

  function radiusToMapPixels(radiusKm, window, minPixels = 0) {
    const radiusPixels = (radiusKm / (window.spanKm / 2)) * (MAP_SIZE / 2);
    return Math.max(minPixels, radiusPixels);
  }

  function buildGridLines() {
    const lines = [];
    const divisions = 6;
    const step = MAP_SIZE / divisions;

    for (let index = 1; index < divisions; index += 1) {
      lines.push({
        x1: index * step,
        y1: 0,
        x2: index * step,
        y2: MAP_SIZE
      });
      lines.push({
        x1: 0,
        y1: index * step,
        x2: MAP_SIZE,
        y2: index * step
      });
    }

    return lines;
  }

  $: pathVersion;
  $: viewWindow = buildViewWindow();
  $: earthPoint = kmToMapPoint(EARTH_POSITION_KM, viewWindow);
  $: moonPoint = kmToMapPoint(moonPositionKm, viewWindow);
  $: rocketPoint = kmToMapPoint(rocketPositionKm, viewWindow);
  $: earthRadiusPx = radiusToMapPixels(EARTH_RADIUS_KM, viewWindow, focusTarget === 'system' ? 10 : 16);
  $: moonRadiusPx = radiusToMapPixels(MOON_RADIUS_KM, viewWindow, focusTarget === 'system' ? 5 : 10);
  $: moonSoiRadiusPx = radiusToMapPixels(MOON_SOI_RADIUS_KM, viewWindow, 0);
  $: pathPolyline = toSvgPoints(pathPositionsKm, viewWindow);
  $: projectedPolyline = toSvgPoints(projectedPositionsKm, viewWindow);
  $: gridLines = buildGridLines();
  $: scaleLabel = `${Math.round(viewWindow.spanKm).toLocaleString('en-US')} km span`;
</script>

<div class="orbital-map-shell">
  <div class="map-header">
    <div>
      <p class="map-eyebrow">Collapsed View</p>
      <h3>2D Orbital Map</h3>
    </div>
    <div class="map-meta">
      <span>{focusTarget} focus</span>
      <span>{scaleLabel}</span>
    </div>
  </div>

  <div class="map-stage">
    <svg viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} role="img" aria-label="Top-down orbital map">
      <defs>
        <linearGradient id="projectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#67d9ff" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#67d9ff" stop-opacity="0.18" />
        </linearGradient>
        <linearGradient id="historyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f0bc5e" stop-opacity="1" />
          <stop offset="100%" stop-color="#f0bc5e" stop-opacity="0.18" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={MAP_SIZE} height={MAP_SIZE} class="map-backdrop" rx="34" />

      {#each gridLines as line}
        <line {...line} class="grid-line" />
      {/each}

      <line x1={earthPoint[0]} y1={earthPoint[1]} x2={moonPoint[0]} y2={moonPoint[1]} class="body-link" />

      {#if moonSoiRadiusPx > 8}
        <circle cx={moonPoint[0]} cy={moonPoint[1]} r={moonSoiRadiusPx} class="soi-ring" />
      {/if}

      {#if projectedPolyline}
        <polyline points={projectedPolyline} class="projected-line" />
      {/if}

      {#if pathPolyline}
        <polyline points={pathPolyline} class="history-line" />
      {/if}

      <circle cx={earthPoint[0]} cy={earthPoint[1]} r={earthRadiusPx} class="earth-body" />
      <circle cx={moonPoint[0]} cy={moonPoint[1]} r={moonRadiusPx} class="moon-body" />

      <g transform={`translate(${rocketPoint[0]} ${rocketPoint[1]})`} class="rocket-marker">
        <path d="M 0 -11 L 9 11 L 0 6 L -9 11 Z" />
      </g>

      <text x={earthPoint[0]} y={earthPoint[1] - earthRadiusPx - 12} class="map-label earth-label">
        Earth
      </text>
      <text x={moonPoint[0]} y={moonPoint[1] - moonRadiusPx - 12} class="map-label moon-label">
        Moon
      </text>
      <text x={rocketPoint[0] + 12} y={rocketPoint[1] - 10} class="map-label rocket-label">
        Vehicle
      </text>
    </svg>

    <div class="map-legend">
      <span><i class="earth-swatch"></i>Earth</span>
      <span><i class="moon-swatch"></i>Moon</span>
      <span><i class="history-swatch"></i>Past path</span>
      <span><i class="projection-swatch"></i>Projected path</span>
    </div>
  </div>

  <div class="map-footer">
    <span>Top-down collapse of the live simulation state</span>
    <span>{telemetry?.missionElapsedLabel ?? 'T+00:00:00'}</span>
  </div>
</div>

<style>
  .orbital-map-shell {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 14px;
    padding: 24px;
    background:
      radial-gradient(circle at top, rgba(103, 217, 255, 0.08), transparent 26%),
      linear-gradient(180deg, rgba(4, 9, 18, 0.96), rgba(2, 5, 10, 0.92));
    pointer-events: none;
  }

  .map-header,
  .map-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: rgba(227, 238, 255, 0.78);
  }

  .map-eyebrow {
    margin: 0 0 6px;
    font-size: 0.72rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #67d9ff;
  }

  .map-header h3 {
    margin: 0;
    font-size: 1.35rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .map-meta,
  .map-footer {
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .map-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: 8px 12px;
  }

  .map-stage {
    position: relative;
    min-height: 0;
    border-radius: 34px;
    overflow: hidden;
    border: 1px solid rgba(120, 170, 255, 0.14);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    background: rgba(5, 10, 20, 0.5);
  }

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .map-backdrop {
    fill: rgba(6, 11, 22, 0.98);
  }

  .grid-line {
    stroke: rgba(120, 170, 255, 0.08);
    stroke-width: 1;
  }

  .body-link {
    stroke: rgba(190, 214, 255, 0.18);
    stroke-width: 2;
    stroke-dasharray: 10 12;
  }

  .soi-ring {
    fill: rgba(160, 165, 184, 0.03);
    stroke: rgba(214, 220, 232, 0.18);
    stroke-width: 1.5;
    stroke-dasharray: 12 10;
  }

  .projected-line,
  .history-line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .projected-line {
    stroke: url(#projectionGradient);
    stroke-width: 4;
    stroke-dasharray: 14 10;
  }

  .history-line {
    stroke: url(#historyGradient);
    stroke-width: 5;
  }

  .earth-body {
    fill: #2f78d0;
    stroke: rgba(173, 220, 255, 0.5);
    stroke-width: 2.5;
  }

  .moon-body {
    fill: #8d95a6;
    stroke: rgba(255, 255, 255, 0.34);
    stroke-width: 2;
  }

  .rocket-marker path {
    fill: #f0bc5e;
    stroke: rgba(255, 249, 235, 0.55);
    stroke-width: 1.5;
  }

  .map-label {
    font-size: 24px;
    font-family: 'IBM Plex Sans', sans-serif;
    fill: rgba(233, 242, 255, 0.94);
    letter-spacing: 0.08em;
  }

  .rocket-label {
    fill: rgba(255, 222, 156, 0.96);
  }

  .map-legend {
    position: absolute;
    left: 18px;
    bottom: 18px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    padding: 10px 12px;
    border-radius: 16px;
    background: rgba(3, 8, 16, 0.72);
    border: 1px solid rgba(120, 170, 255, 0.12);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(226, 238, 255, 0.82);
  }

  .map-legend span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .map-legend i {
    display: inline-block;
    width: 14px;
    height: 4px;
    border-radius: 999px;
  }

  .earth-swatch {
    background: #2f78d0;
    height: 10px !important;
    width: 10px !important;
    border-radius: 50% !important;
  }

  .moon-swatch {
    background: #8d95a6;
    height: 10px !important;
    width: 10px !important;
    border-radius: 50% !important;
  }

  .history-swatch {
    background: #f0bc5e;
  }

  .projection-swatch {
    background: #67d9ff;
  }

  @media (max-width: 860px) {
    .orbital-map-shell {
      padding: 16px;
    }

    .map-header,
    .map-footer {
      flex-direction: column;
      align-items: flex-start;
    }

    .map-meta {
      justify-content: flex-start;
    }

    .map-legend {
      right: 12px;
      left: 12px;
      bottom: 12px;
    }
  }
</style>
