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
    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: samples.map(formatHourMark),
        datasets: [
          {
            label: 'Fuel Mass',
            data: samples.map((sample) => sample.fuelMassKg),
            borderColor: '#67d9ff',
            backgroundColor: 'rgba(103, 217, 255, 0.12)',
            fill: true,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.18
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
              color: 'rgba(173, 205, 255, 0.08)'
            },
            ticks: {
              color: 'rgba(232, 241, 255, 0.62)',
              maxTicksLimit: 4
            }
          },
          y: {
            grid: {
              color: 'rgba(173, 205, 255, 0.08)'
            },
            ticks: {
              color: 'rgba(232, 241, 255, 0.62)',
              maxTicksLimit: 4,
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

<section class="glass-panel chart-panel">
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
      <div>
        <span>Spent</span>
        <strong>{formatMass(spentFuelKg)}</strong>
      </div>
    </div>
  </div>

  <div class="chart-canvas-wrap">
    <canvas bind:this={canvas}></canvas>
  </div>

  <div class="chart-foot">
    <span>Burn model: Tsiolkovsky equation + mission clock samples</span>
    <span>{formatHourMark(latestSample)}</span>
  </div>
</section>

<style>
  .chart-panel {
    pointer-events: auto;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 12px;
    min-height: 214px;
    height: 214px;
    border-radius: 24px;
    padding: 16px 18px;
    background:
      linear-gradient(180deg, rgba(10, 18, 35, 0.86), rgba(5, 10, 22, 0.62)),
      var(--panel-bg);
  }

  .chart-topline {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 14px;
  }

  .chart-summary {
    display: flex;
    gap: 14px;
  }

  .chart-summary div {
    display: grid;
    gap: 4px;
  }

  .chart-summary span,
  .chart-foot {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--muted-soft);
  }

  .chart-summary strong {
    font-size: 0.9rem;
    color: #f6fbff;
  }

  .chart-canvas-wrap {
    min-height: 0;
  }

  .chart-canvas-wrap :global(canvas) {
    max-height: 120px;
  }

  canvas {
    width: 100%;
    height: 100%;
  }

  .chart-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    line-height: 1.4;
  }

  @media (max-width: 860px) {
    .chart-topline,
    .chart-summary,
    .chart-foot {
      flex-direction: column;
      align-items: flex-start;
    }

    .chart-panel {
      height: auto;
      min-height: 240px;
    }
  }
</style>
