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

  function formatHourMark(sample) {
    return `${(sample.timeSeconds / 3600).toFixed(1)} h`;
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
              color: 'rgba(232, 241, 255, 0.72)'
            }
          },
          y: {
            grid: {
              color: 'rgba(173, 205, 255, 0.08)'
            },
            ticks: {
              color: 'rgba(232, 241, 255, 0.72)',
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

  $: syncChart();
</script>

<section class="glass-panel chart-panel">
  <div class="chart-header">
    <div>
      <p class="hud-eyebrow">Propellant</p>
      <h2 class="hud-title">Fuel Mass vs Mission Time</h2>
    </div>
    <p class="chart-copy">
      Burn is governed by the Tsiolkovsky rocket equation and then held steady through the
      ballistic coast phase.
    </p>
  </div>

  <div class="chart-canvas-wrap">
    <canvas bind:this={canvas}></canvas>
  </div>
</section>

<style>
  .chart-panel {
    pointer-events: auto;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 14px;
    min-height: 220px;
    height: 220px;
    border-radius: 24px;
    padding: 18px 20px;
    background:
      linear-gradient(180deg, rgba(10, 18, 35, 0.86), rgba(5, 10, 22, 0.62)),
      var(--panel-bg);
  }

  .chart-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 18px;
  }

  .chart-copy {
    margin: 0;
    max-width: 220px;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .chart-canvas-wrap {
    min-height: 0;
  }

  .chart-canvas-wrap :global(canvas) {
    max-height: 140px;
  }

  canvas {
    width: 100%;
    height: 100%;
  }

  @media (max-width: 860px) {
    .chart-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
