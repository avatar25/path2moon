<script>
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import {
    DAY_SECONDS,
    EARTH_RADIUS_KM,
    KM_PER_RENDER_UNIT,
    MOON_RADIUS_KM,
    buildTelemetry,
    createSimulationState,
    getMoonState,
    getTimeWarpForState,
    magnitude,
    sampleProjectedTrajectory,
    stepSimulation,
    subVec
  } from '../physics/orbitMath.js';

  export let payloadMassKg;
  export let ispSeconds;
  export let fuelMassKg;
  export let strategy;
  export let launchSequenceId = 0;
  export let focusTarget = 'system';
  export let onSample = () => {};

  let container;
  let renderer;
  let scene;
  let camera;
  let controls;
  let earthMesh;
  let atmosphereMesh;
  let moonMesh;
  let rocketMesh;
  let velocityArrow;
  let pathLine;
  let projectionLine;
  let frameId;
  let lastFrameMs = 0;
  let lastTelemetryMs = 0;
  let lastProjectionMs = 0;
  let simState;
  let pathPositionsKm = [];
  let previousLaunchSequenceId = launchSequenceId;
  let previousConfigKey = '';
  let previousFocusTarget = focusTarget;
  let earthTexture;
  let moonTexture;

  function currentInputs() {
    return {
      payloadMassKg,
      ispSeconds,
      fuelMassKg,
      strategy
    };
  }

  function toRenderVector(positionKm) {
    return new THREE.Vector3(
      positionKm[0] / KM_PER_RENDER_UNIT,
      positionKm[1] / KM_PER_RENDER_UNIT,
      positionKm[2] / KM_PER_RENDER_UNIT
    );
  }

  function createProceduralEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    const oceanGradient = context.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#0d274a');
    oceanGradient.addColorStop(0.5, '#134a7c');
    oceanGradient.addColorStop(1, '#0b213d');
    context.fillStyle = oceanGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 1800; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const width = 24 + Math.random() * 90;
      const height = 14 + Math.random() * 52;
      context.fillStyle = Math.random() > 0.5 ? 'rgba(92, 141, 84, 0.9)' : 'rgba(153, 118, 77, 0.82)';
      context.beginPath();
      context.ellipse(x, y, width, height, Math.random() * Math.PI, 0, Math.PI * 2);
      context.fill();
    }

    for (let index = 0; index < 720; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = 10 + Math.random() * 36;
      context.fillStyle = 'rgba(250, 250, 255, 0.28)';
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function createProceduralMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    const surfaceGradient = context.createLinearGradient(0, 0, 0, canvas.height);
    surfaceGradient.addColorStop(0, '#b4b8c3');
    surfaceGradient.addColorStop(0.45, '#8f96a5');
    surfaceGradient.addColorStop(1, '#73798a');
    context.fillStyle = surfaceGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 2600; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = 4 + Math.random() * 24;
      context.fillStyle = Math.random() > 0.5 ? 'rgba(72, 76, 92, 0.18)' : 'rgba(210, 214, 224, 0.12)';
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function createStarfield() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6000 * 3);

    for (let index = 0; index < 6000; index += 1) {
      const radius = 3000 + Math.random() * 2800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xdce7ff,
      size: 2.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    });

    return new THREE.Points(geometry, material);
  }

  function updateLineGeometry(line, positionsKm) {
    const points = positionsKm.map(toRenderVector);
    line.geometry.setFromPoints(points);

    if (typeof line.computeLineDistances === 'function') {
      line.computeLineDistances();
    }
  }

  function emitSample() {
    onSample({
      telemetry: buildTelemetry(simState),
      fuelHistory: simState.sampling.fuelHistory.map((sample) => ({ ...sample }))
    });
  }

  function resetMission(launched = false) {
    simState = createSimulationState(currentInputs(), { launched });
    pathPositionsKm = [[...simState.rocket.positionKm]];
    updateLineGeometry(pathLine, pathPositionsKm);
    updateLineGeometry(
      projectionLine,
      sampleProjectedTrajectory(simState, {
        horizonSeconds: launched ? 8 * DAY_SECONDS : DAY_SECONDS,
        points: 180
      })
    );
    updateSceneObjects();
    emitSample();
  }

  function updateSceneObjects() {
    const moonState = getMoonState(simState.timeSeconds, simState.mission.moonPhaseAngleRad);
    const moonPosition = toRenderVector(moonState.positionKm);
    const rocketPosition = toRenderVector(simState.rocket.positionKm);

    moonMesh.position.copy(moonPosition);
    rocketMesh.position.copy(rocketPosition);
    atmosphereMesh.position.set(0, 0, 0);

    const velocityMagnitude = magnitude(simState.rocket.velocityKmPerSecond);
    velocityArrow.position.copy(rocketPosition);
    velocityArrow.setDirection(
      velocityMagnitude === 0
        ? new THREE.Vector3(0, 1, 0)
        : toRenderVector(simState.rocket.velocityKmPerSecond).normalize()
    );
    velocityArrow.setLength(Math.min(18, Math.max(4, velocityMagnitude * 2.2)));
  }

  function maybeAppendPathPoint() {
    const latestPoint = pathPositionsKm[pathPositionsKm.length - 1];

    if (!latestPoint || magnitude(subVec(simState.rocket.positionKm, latestPoint)) > 1800) {
      pathPositionsKm.push([...simState.rocket.positionKm]);
      if (pathPositionsKm.length > 1800) {
        pathPositionsKm.shift();
      }
      updateLineGeometry(pathLine, pathPositionsKm);
    }
  }

  function getFocusAnchor() {
    if (focusTarget === 'earth') {
      return new THREE.Vector3(0, 0, 0);
    }

    if (focusTarget === 'moon') {
      return moonMesh.position.clone();
    }

    if (focusTarget === 'rocket') {
      return rocketMesh.position.clone();
    }

    return moonMesh.position.clone().multiplyScalar(0.5);
  }

  function getDesiredCameraOffset() {
    if (focusTarget === 'earth') {
      return new THREE.Vector3(28, 18, 28);
    }

    if (focusTarget === 'moon') {
      return new THREE.Vector3(18, 12, 18);
    }

    if (focusTarget === 'rocket') {
      return new THREE.Vector3(12, 8, 14);
    }

    return new THREE.Vector3(90, 48, 132);
  }

  function animate(timestampMs) {
    if (!lastFrameMs) {
      lastFrameMs = timestampMs;
    }

    const realDeltaSeconds = Math.min(0.12, (timestampMs - lastFrameMs) / 1000);
    lastFrameMs = timestampMs;

    simState = stepSimulation(simState, realDeltaSeconds * getTimeWarpForState(simState));
    maybeAppendPathPoint();
    updateSceneObjects();

    if (timestampMs - lastProjectionMs > 900) {
      updateLineGeometry(
        projectionLine,
        sampleProjectedTrajectory(simState, {
          horizonSeconds: simState.launched ? 8 * DAY_SECONDS : DAY_SECONDS,
          points: 180
        })
      );
      lastProjectionMs = timestampMs;
    }

    if (timestampMs - lastTelemetryMs > 120) {
      emitSample();
      lastTelemetryMs = timestampMs;
    }

    const target = getFocusAnchor();
    controls.target.lerp(target, 0.08);
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  function handleResize() {
    if (!renderer || !camera || !container) {
      return;
    }

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  onMount(() => {
    earthTexture = createProceduralEarthTexture();
    moonTexture = createProceduralMoonTexture();
    previousConfigKey = JSON.stringify(currentInputs());

    renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x02040a);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x02040a, 900, 3200);
    camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      8000
    );
    camera.position.set(90, 48, 132);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 6;
    controls.maxDistance = 1800;

    scene.add(createStarfield());

    const sunLight = new THREE.DirectionalLight(0xf3f6ff, 2.3);
    sunLight.position.set(240, 100, 120);
    scene.add(sunLight);

    const fillLight = new THREE.HemisphereLight(0x5f84ff, 0x050917, 0.18);
    scene.add(fillLight);

    earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS_KM / KM_PER_RENDER_UNIT, 80, 80),
      new THREE.MeshStandardMaterial({
        map: earthTexture,
        metalness: 0.04,
        roughness: 0.86
      })
    );
    scene.add(earthMesh);

    atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry((EARTH_RADIUS_KM / KM_PER_RENDER_UNIT) * 1.045, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x70c5ff,
        transparent: true,
        opacity: 0.09,
        side: THREE.BackSide
      })
    );
    scene.add(atmosphereMesh);

    moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(MOON_RADIUS_KM / KM_PER_RENDER_UNIT, 48, 48),
      new THREE.MeshStandardMaterial({
        map: moonTexture,
        metalness: 0.02,
        roughness: 0.96
      })
    );
    scene.add(moonMesh);

    rocketMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xf6c569
      })
    );
    scene.add(rocketMesh);

    velocityArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 8, 0x67d9ff, 2.4, 1.2);
    scene.add(velocityArrow);

    pathLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: 0xf0bc5e,
        transparent: true,
        opacity: 0.95
      })
    );
    scene.add(pathLine);

    projectionLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({
        color: 0x67d9ff,
        dashSize: 3,
        gapSize: 2,
        transparent: true,
        opacity: 0.85
      })
    );
    scene.add(projectionLine);

    window.addEventListener('resize', handleResize);
    resetMission(false);
    frameId = requestAnimationFrame(animate);
  });

  onDestroy(() => {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', handleResize);
    controls?.dispose();
    renderer?.dispose();
    earthTexture?.dispose();
    moonTexture?.dispose();
  });

  $: configKey = JSON.stringify(currentInputs());

  $: if (renderer && !simState?.launched && configKey !== previousConfigKey) {
    previousConfigKey = configKey;
    resetMission(false);
  }

  $: if (renderer && launchSequenceId !== previousLaunchSequenceId) {
    previousLaunchSequenceId = launchSequenceId;
    previousConfigKey = configKey;
    resetMission(true);
  }

  $: if (renderer && focusTarget !== previousFocusTarget) {
    previousFocusTarget = focusTarget;
    const target = getFocusAnchor();
    controls.target.copy(target);
    camera.position.copy(target.clone().add(getDesiredCameraOffset()));
  }
</script>

<div bind:this={container} class="scene-root"></div>

<style>
  .scene-root {
    position: absolute;
    inset: 0;
  }

  .scene-root :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
