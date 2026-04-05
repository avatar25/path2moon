<script>
  import SpaceScene from './lib/scene/SpaceScene.svelte';
  import ControlPanel from './lib/ui/ControlPanel.svelte';
  import TelemetryOverlay from './lib/ui/TelemetryOverlay.svelte';
  import FuelChart from './lib/ui/FuelChart.svelte';
  import {
    DEFAULT_FORM_VALUES,
    buildInitialTelemetry,
    planMissionPreview
  } from './lib/physics/orbitMath.js';

  let payloadMassKg = DEFAULT_FORM_VALUES.payloadMassKg;
  let ispSeconds = DEFAULT_FORM_VALUES.ispSeconds;
  let fuelMassKg = DEFAULT_FORM_VALUES.fuelMassKg;
  let strategy = DEFAULT_FORM_VALUES.strategy;
  let focusTarget = 'system';
  let launchSequenceId = 0;
  let telemetry = buildInitialTelemetry(DEFAULT_FORM_VALUES);
  let fuelHistory = [{ timeSeconds: 0, fuelMassKg: DEFAULT_FORM_VALUES.fuelMassKg }];

  $: missionPreview = planMissionPreview({
    payloadMassKg,
    ispSeconds,
    fuelMassKg,
    strategy
  });

  function initiateLaunchSequence() {
    launchSequenceId += 1;
    focusTarget = 'rocket';
  }

  function handleSceneSample(sample) {
    telemetry = sample.telemetry;
    fuelHistory = sample.fuelHistory;
  }
</script>

<svelte:head>
  <title>Artemis Trajectory</title>
</svelte:head>

<div class="viewport-shell">
  <SpaceScene
    {payloadMassKg}
    {ispSeconds}
    {fuelMassKg}
    {strategy}
    {launchSequenceId}
    {focusTarget}
    onSample={handleSceneSample}
  />

  <div class="hud-layer">
    <div class="panel-stack">
      <ControlPanel
        bind:payloadMassKg
        bind:ispSeconds
        bind:fuelMassKg
        bind:strategy
        missionPreview={missionPreview}
        onLaunch={initiateLaunchSequence}
      />
    </div>

    <div class="telemetry-stack">
      <TelemetryOverlay
        {telemetry}
        {focusTarget}
        onFocusChange={(nextFocusTarget) => (focusTarget = nextFocusTarget)}
      />
    </div>

    <div class="chart-stack">
      <FuelChart samples={fuelHistory} />
    </div>
  </div>
</div>
