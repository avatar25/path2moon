<script>
  import { onDestroy, onMount } from 'svelte';
  import {
    CategoryScale,
    Chart,
    Filler,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip
  } from 'chart.js';

  export let samples = [];

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
    Filler
  );

  let canvas;
  let chart;

  const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  });

  function formatHourMark(sample) {
    return `${(sample.timeSeconds / 3600).toFixed(1)} h`;
  }

  function formatMass(value) {
    return `${numberFormatter.format(value)} kg`;
  }

  function syncChart() {
    if (!chart) {
      return;
    }

    chart.data.labels = samples.map(formatHourMark);
    chart.data.datasets[0].data = samples.map((sample) => sample.fuelMassKg);
    chart.update('none');
  }

  onMount(() => {
    const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 140);
    gradient.addColorStop(0, 'rgba(103, 217, 255, 0.18)');
    gradient.addColorStop(0.6, 'rgba(103, 217, 255, 0.06)');
    gradient.addColorStop(1, 'rgba(103, 217, 255, 0.0)');

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: samples.map(formatHourMark),
        datasets: [
          {
            label: 'Fuel Mass',
            data: samples.map((sample) => sample.fuelMassKg),
            borderColor: '#67d9ff',
            backgroundColor: gradient,
            fill: true,
            borderWidth: 1.8,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#67d9ff',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            tension: 0.26
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(6, 12, 26, 0.92)',
            borderColor: 'rgba(103, 217, 255, 0.2)',
            borderWidth: 1,
            titleFont: {
              family: "'JetBrains Mono', monospace",
              size: 11
            },
            bodyFont: {
              family: "'JetBrains Mono', monospace",
              size: 11
            },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label(context) {
                return `${context.parsed.y.toLocaleString('en-US', {
                  maximumFractionDigits: 0
                })} kg`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(160, 190, 255, 0.05)',
              drawTicks: false
            },
            border: {
              display: false
            },
            ticks: {
              color: 'rgba(200, 218, 255, 0.4)',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 9
              },
              maxTicksLimit: 4,
              padding: 6
            }
          },
          y: {
            grid: {
              color: 'rgba(160, 190, 255, 0.05)',
              drawTicks: false
            },
            border: {
              display: false
            },
            ticks: {
              color: 'rgba(200, 218, 255, 0.4)',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 9
              },
              maxTicksLimit: 4,
              padding: 6,
              callback(value) {
                return `${Number(value).toLocaleString('en-US', {
                  maximumFractionDigits: 0
                })} kg`;
              }
            }
          }
        }
      }
    });

    syncChart();
  });

  onDestroy(() => {
    chart?.destroy();
  });

  $: latestSample = samples[samples.length - 1] ?? { timeSeconds: 0, fuelMassKg: 0 };
  $: initialSample = samples[0] ?? { timeSeconds: 0, fuelMassKg: 0 };
  $: spentFuelKg = Math.max(0, initialSample.fuelMassKg - latestSample.fuelMassKg);
  $: syncChart();
</script>

<section class="glass-panel chart-panel" id="fuel-chart-panel">
  <div class="chart-topline">
    <div>
      <p class="hud-eyebrow">Propellant Curve</p>
      <h2 class="hud-title">Fuel vs Mission Time</h2>
    </div>
    <div class="chart-summary">
      <div>
        <span>Current</span>
        <strong>{formatMass(latestSample.fuelMassKg)}</strong>
      </div>
      <div class="chart-summary-sep"></div>
      <div>
        <span>Spent</span>
        <strong class="spent-value">{formatMass(spentFuelKg)}</strong>
      </div>
    </div>
  </div>

  <div class="chart-canvas-wrap">
    <canvas bind:this={canvas}></canvas>
  </div>

  <div class="chart-foot">
    <span>Burn model: Tsiolkovsky</span>
    <span class="foot-time">{formatHourMark(latestSample)}</span>
  </div>
</section>

<style>
  .chart-panel {
    pointer-events: auto;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 10px;
    min-height: 200px;
    height: 200px;
    padding: 14px 16px;
  }

  .chart-topline {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 12px;
  }

  .chart-summary {
    display: flex;
    align-items: stretch;
    gap: 10px;
  }

  .chart-summary div {
    display: grid;
    gap: 3px;
  }

  .chart-summary-sep {
    width: 1px;
    background: rgba(120, 170, 255, 0.1);
  }

  .chart-summary span {
    font-family: var(--mono-font);
    font-size: 0.56rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--muted-soft);
  }

  .chart-summary strong {
    font-family: var(--mono-font);
    font-size: 0.82rem;
    font-weight: 600;
    color: #e8f0ff;
  }

  .spent-value {
    color: var(--accent-amber) !important;
  }

  .chart-canvas-wrap {
    min-height: 0;
  }

  .chart-canvas-wrap :global(canvas) {
    max-height: 110px;
  }

  canvas {
    width: 100%;
    height: 100%;
  }

  .chart-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-family: var(--mono-font);
    font-size: 0.56rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--muted-soft);
    line-height: 1.4;
  }

  .foot-time {
    color: var(--accent-cyan);
  }

  @media (max-width: 860px) {
    .chart-topline,
    .chart-summary {
      flex-direction: column;
      align-items: flex-start;
    }

    .chart-summary-sep {
      width: 100%;
      height: 1px;
    }

    .chart-panel {
      height: auto;
      min-height: 220px;
    }
  }
</style>
