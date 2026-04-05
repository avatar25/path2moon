import { create, all } from 'mathjs';

const math = create(all, {});

export const G_KM = 6.6743e-20;
export const G0 = 9.80665;
export const EARTH_MASS_KG = 5.97219e24;
export const MOON_MASS_KG = 7.342e22;
export const EARTH_RADIUS_KM = 6371;
export const MOON_RADIUS_KM = 1737.4;
export const EARTH_MOON_DISTANCE_KM = 384400;
export const MOON_ORBIT_PERIOD_SECONDS = 27.321661 * 24 * 60 * 60;
export const MOON_ANGULAR_RATE_RAD_PER_SECOND = (Math.PI * 2) / MOON_ORBIT_PERIOD_SECONDS;
export const MOON_SOI_RADIUS_KM =
  EARTH_MOON_DISTANCE_KM * Math.pow(MOON_MASS_KG / EARTH_MASS_KG, 2 / 5);
export const EARTH_GRAVITATIONAL_PARAMETER = G_KM * EARTH_MASS_KG;
export const MOON_GRAVITATIONAL_PARAMETER = G_KM * MOON_MASS_KG;
export const DEFAULT_PARKING_ALTITUDE_KM = 200;
export const KM_PER_RENDER_UNIT = 1000;
export const DAY_SECONDS = 24 * 60 * 60;
export const DEG_TO_RAD = Math.PI / 180;

export const STRATEGY_OPTIONS = [
  {
    value: 'hohmann',
    label: 'Hohmann Transfer',
    blurb: 'Fuel-efficient elliptical injection with a longer transfer time.'
  },
  {
    value: 'freeReturn',
    label: 'Free Return',
    blurb: 'Apollo-inspired lunar flyby geometry biased toward an Earth return arc.'
  },
  {
    value: 'direct',
    label: 'Direct Injection',
    blurb: 'Higher-energy departure that shortens the coast to the Moon.'
  }
];

export const DEFAULT_FORM_VALUES = {
  payloadMassKg: 28000,
  ispSeconds: 450,
  fuelMassKg: 185000,
  strategy: 'hohmann'
};

const STRATEGY_PROFILES = {
  hohmann: {
    deltaVMultiplier: 1,
    headingOffsetDeg: 0,
    moonArrivalOffsetDeg: 0,
    burnDurationSeconds: 260,
    targetRadiusOffsetKm: MOON_SOI_RADIUS_KM * 0.2,
    targetFlybyKm: 9000
  },
  freeReturn: {
    deltaVMultiplier: 1.025,
    headingOffsetDeg: -1.15,
    moonArrivalOffsetDeg: 1.85,
    burnDurationSeconds: 300,
    targetRadiusOffsetKm: MOON_SOI_RADIUS_KM * 0.28,
    targetFlybyKm: 5000
  },
  direct: {
    deltaVMultiplier: 1.12,
    headingOffsetDeg: 0.55,
    moonArrivalOffsetDeg: -0.75,
    burnDurationSeconds: 210,
    targetRadiusOffsetKm: MOON_SOI_RADIUS_KM * 0.1,
    targetFlybyKm: 3500
  }
};

const previewCache = new Map();

const TELEMETRY_TEMPLATE = {
  velocityKmPerSecond: 0,
  earthAltitudeKm: 0,
  moonRangeKm: 0,
  sphereOfInfluence: 'Earth',
  missionElapsedLabel: 'T+00:00:00',
  missionClockSeconds: 0,
  timeWarp: 1,
  fuelMassKg: DEFAULT_FORM_VALUES.fuelMassKg,
  statusText: 'Parking orbit hold',
  strategyLabel: 'Hohmann Transfer',
  closestMoonApproachKm: Infinity,
  achievedDeltaVKmPerSecond: 0,
  burnActive: false
};

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value?.valueOf) {
    return value.valueOf();
  }

  return value;
}

export function cloneVector(vector) {
  return [...vector];
}

export function addVec(a, b) {
  return toArray(math.add(a, b));
}

export function subVec(a, b) {
  return toArray(math.subtract(a, b));
}

export function scaleVec(vector, scalar) {
  return toArray(math.multiply(vector, scalar));
}

export function magnitude(vector) {
  return Number(math.norm(vector));
}

export function normalizeVec(vector) {
  const length = magnitude(vector);
  return length === 0 ? [0, 0, 0] : scaleVec(vector, 1 / length);
}

export function rotateVectorZ(vector, angleRad) {
  const cosAngle = Math.cos(angleRad);
  const sinAngle = Math.sin(angleRad);

  return [
    vector[0] * cosAngle - vector[1] * sinAngle,
    vector[0] * sinAngle + vector[1] * cosAngle,
    vector[2]
  ];
}

export function normalizeAngle(angleRad) {
  const turn = Math.PI * 2;
  return ((angleRad % turn) + turn) % turn;
}

export function formatMissionTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safeSeconds / DAY_SECONDS);
  const hours = Math.floor((safeSeconds % DAY_SECONDS) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const body = [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');

  return days > 0 ? `T+${days}d ${body}` : `T+${body}`;
}

export function getMoonState(timeSeconds, moonPhaseAngleRad) {
  const phase = moonPhaseAngleRad + MOON_ANGULAR_RATE_RAD_PER_SECOND * timeSeconds;

  return {
    positionKm: [
      EARTH_MOON_DISTANCE_KM * Math.cos(phase),
      EARTH_MOON_DISTANCE_KM * Math.sin(phase),
      0
    ],
    velocityKmPerSecond: [
      -EARTH_MOON_DISTANCE_KM * MOON_ANGULAR_RATE_RAD_PER_SECOND * Math.sin(phase),
      EARTH_MOON_DISTANCE_KM * MOON_ANGULAR_RATE_RAD_PER_SECOND * Math.cos(phase),
      0
    ],
    angleRad: normalizeAngle(phase)
  };
}

function gravityAcceleration(positionKm, bodyPositionKm, bodyMassKg) {
  const offset = subVec(bodyPositionKm, positionKm);
  const distanceKm = magnitude(offset);

  if (distanceKm === 0) {
    return [0, 0, 0];
  }

  return scaleVec(offset, (G_KM * bodyMassKg) / Math.pow(distanceKm, 3));
}

function computeThrustAcceleration(dynamicState, staticState, absoluteTimeSeconds) {
  const { burn, rocket } = staticState;

  if (!burn.active || burn.completed) {
    return { accelerationKmPerSecondSquared: [0, 0, 0], fuelRateKgPerSecond: 0 };
  }

  const propellantBurnedKg = burn.startFuelMassKg - dynamicState.fuelMassKg;
  const burnEndSeconds = burn.startTimeSeconds + burn.durationSeconds;

  if (
    propellantBurnedKg >= burn.targetPropellantKg - 1e-3 ||
    dynamicState.fuelMassKg <= 0 ||
    absoluteTimeSeconds >= burnEndSeconds
  ) {
    return { accelerationKmPerSecondSquared: [0, 0, 0], fuelRateKgPerSecond: 0 };
  }

  const currentMassKg = rocket.dryMassKg + dynamicState.fuelMassKg;
  const accelerationKmPerSecondSquared =
    (burn.mdotKgPerSecond * burn.exhaustVelocityKmPerSecond) / currentMassKg;
  const progradeDirection =
    magnitude(dynamicState.velocityKmPerSecond) === 0
      ? burn.directionUnit
      : normalizeVec(dynamicState.velocityKmPerSecond);
  const thrustDirection =
    typeof burn.headingOffsetRad === 'number'
      ? normalizeVec(rotateVectorZ(progradeDirection, burn.headingOffsetRad))
      : burn.directionUnit;

  return {
    accelerationKmPerSecondSquared: scaleVec(thrustDirection, accelerationKmPerSecondSquared),
    fuelRateKgPerSecond: -burn.mdotKgPerSecond
  };
}

function computeDerivative(dynamicState, staticState, absoluteTimeSeconds, bodies = 'full') {
  const moonState = getMoonState(absoluteTimeSeconds, staticState.mission.moonPhaseAngleRad);
  const earthAcceleration = gravityAcceleration(dynamicState.positionKm, [0, 0, 0], EARTH_MASS_KG);
  const moonAcceleration =
    bodies === 'earthOnly'
      ? [0, 0, 0]
      : gravityAcceleration(dynamicState.positionKm, moonState.positionKm, MOON_MASS_KG);
  const thrust = computeThrustAcceleration(dynamicState, staticState, absoluteTimeSeconds);

  return {
    positionDotKmPerSecond: cloneVector(dynamicState.velocityKmPerSecond),
    velocityDotKmPerSecondSquared: addVec(
      addVec(earthAcceleration, moonAcceleration),
      thrust.accelerationKmPerSecondSquared
    ),
    fuelDotKgPerSecond: thrust.fuelRateKgPerSecond
  };
}

function applyDerivative(dynamicState, derivative, deltaTimeSeconds) {
  return {
    positionKm: addVec(
      dynamicState.positionKm,
      scaleVec(derivative.positionDotKmPerSecond, deltaTimeSeconds)
    ),
    velocityKmPerSecond: addVec(
      dynamicState.velocityKmPerSecond,
      scaleVec(derivative.velocityDotKmPerSecondSquared, deltaTimeSeconds)
    ),
    fuelMassKg: Math.max(
      0,
      dynamicState.fuelMassKg + derivative.fuelDotKgPerSecond * deltaTimeSeconds
    )
  };
}

function combineDerivatives(dynamicState, derivatives, deltaTimeSeconds) {
  const positionContribution = scaleVec(
    addVec(
      addVec(derivatives.k1.positionDotKmPerSecond, scaleVec(derivatives.k2.positionDotKmPerSecond, 2)),
      addVec(
        scaleVec(derivatives.k3.positionDotKmPerSecond, 2),
        derivatives.k4.positionDotKmPerSecond
      )
    ),
    deltaTimeSeconds / 6
  );

  const velocityContribution = scaleVec(
    addVec(
      addVec(
        derivatives.k1.velocityDotKmPerSecondSquared,
        scaleVec(derivatives.k2.velocityDotKmPerSecondSquared, 2)
      ),
      addVec(
        scaleVec(derivatives.k3.velocityDotKmPerSecondSquared, 2),
        derivatives.k4.velocityDotKmPerSecondSquared
      )
    ),
    deltaTimeSeconds / 6
  );

  const fuelContribution =
    (deltaTimeSeconds / 6) *
    (derivatives.k1.fuelDotKgPerSecond +
      2 * derivatives.k2.fuelDotKgPerSecond +
      2 * derivatives.k3.fuelDotKgPerSecond +
      derivatives.k4.fuelDotKgPerSecond);

  return {
    positionKm: addVec(dynamicState.positionKm, positionContribution),
    velocityKmPerSecond: addVec(dynamicState.velocityKmPerSecond, velocityContribution),
    fuelMassKg: Math.max(0, dynamicState.fuelMassKg + fuelContribution)
  };
}

function rk4DynamicStep(staticState, deltaTimeSeconds, bodies = 'full') {
  const dynamicState = {
    positionKm: cloneVector(staticState.rocket.positionKm),
    velocityKmPerSecond: cloneVector(staticState.rocket.velocityKmPerSecond),
    fuelMassKg: staticState.rocket.fuelMassKg
  };

  const startTimeSeconds = staticState.timeSeconds;
  const k1 = computeDerivative(dynamicState, staticState, startTimeSeconds, bodies);
  const k2 = computeDerivative(
    applyDerivative(dynamicState, k1, deltaTimeSeconds / 2),
    staticState,
    startTimeSeconds + deltaTimeSeconds / 2,
    bodies
  );
  const k3 = computeDerivative(
    applyDerivative(dynamicState, k2, deltaTimeSeconds / 2),
    staticState,
    startTimeSeconds + deltaTimeSeconds / 2,
    bodies
  );
  const k4 = computeDerivative(
    applyDerivative(dynamicState, k3, deltaTimeSeconds),
    staticState,
    startTimeSeconds + deltaTimeSeconds,
    bodies
  );

  return combineDerivatives(dynamicState, { k1, k2, k3, k4 }, deltaTimeSeconds);
}

function getParkingOrbitRadiusKm() {
  return EARTH_RADIUS_KM + DEFAULT_PARKING_ALTITUDE_KM;
}

function getParkingOrbitSpeedKmPerSecond(radiusKm) {
  return Math.sqrt(EARTH_GRAVITATIONAL_PARAMETER / radiusKm);
}

function calculateDryMassKg(payloadMassKg) {
  return payloadMassKg + Math.max(9000, payloadMassKg * 0.35);
}

function calculateHohmannBurnKmPerSecond(startRadiusKm, targetRadiusKm) {
  const circularVelocity = Math.sqrt(EARTH_GRAVITATIONAL_PARAMETER / startRadiusKm);
  const transferFactor = Math.sqrt(
    (2 * targetRadiusKm) / (startRadiusKm + targetRadiusKm)
  );

  return circularVelocity * (transferFactor - 1);
}

function estimateBallisticArrival(dynamicState, targetRadiusKm, moonPhaseAngleRad) {
  let probe = {
    timeSeconds: 0,
    mission: { moonPhaseAngleRad },
    rocket: {
      positionKm: cloneVector(dynamicState.positionKm),
      velocityKmPerSecond: cloneVector(dynamicState.velocityKmPerSecond),
      fuelMassKg: 0,
      dryMassKg: 1
    },
    burn: {
      active: false,
      completed: true,
      startFuelMassKg: 0,
      targetPropellantKg: 0,
      startTimeSeconds: 0,
      durationSeconds: 0,
      mdotKgPerSecond: 0,
      exhaustVelocityKmPerSecond: 0,
      directionUnit: [0, 0, 0]
    }
  };

  let best = {
    timeSeconds: 0,
    radialErrorKm: Infinity,
    angleRad: Math.PI
  };

  for (let index = 0; index < 3200; index += 1) {
    const nextProbeState = rk4DynamicStep(probe, 180, 'earthOnly');
    probe.rocket.positionKm = cloneVector(nextProbeState.positionKm);
    probe.rocket.velocityKmPerSecond = cloneVector(nextProbeState.velocityKmPerSecond);
    probe.timeSeconds += 180;

    const radiusKm = magnitude(probe.rocket.positionKm);
    const radialErrorKm = Math.abs(radiusKm - targetRadiusKm);

    if (probe.timeSeconds > 2 * 3600 && radialErrorKm < best.radialErrorKm) {
      best = {
        timeSeconds: probe.timeSeconds,
        radialErrorKm,
        angleRad: Math.atan2(probe.rocket.positionKm[1], probe.rocket.positionKm[0])
      };
    }

    if (probe.timeSeconds > 3 * DAY_SECONDS && radiusKm > targetRadiusKm && radialErrorKm > best.radialErrorKm * 2.2) {
      break;
    }
  }

  return best;
}

function summarizeStrategy(strategy) {
  return STRATEGY_OPTIONS.find((option) => option.value === strategy) ?? STRATEGY_OPTIONS[0];
}

function buildBallisticProbe(initialPositionKm, initialVelocityKmPerSecond, moonPhaseAngleRad) {
  return {
    timeSeconds: 0,
    mission: { moonPhaseAngleRad },
    rocket: {
      positionKm: cloneVector(initialPositionKm),
      velocityKmPerSecond: cloneVector(initialVelocityKmPerSecond),
      fuelMassKg: 0,
      dryMassKg: 1
    },
    burn: {
      active: false,
      completed: true,
      startFuelMassKg: 0,
      targetPropellantKg: 0,
      startTimeSeconds: 0,
      durationSeconds: 0,
      mdotKgPerSecond: 0,
      exhaustVelocityKmPerSecond: 0,
      directionUnit: [0, 0, 0]
    }
  };
}

function advanceProbe(probe, deltaTimeSeconds, coastSubstepSeconds = 20) {
  let remainingTimeSeconds = deltaTimeSeconds;

  while (remainingTimeSeconds > 0) {
    const substepSeconds = Math.min(
      remainingTimeSeconds,
      probe.burn.active ? 0.75 : coastSubstepSeconds
    );
    const updatedDynamicState = rk4DynamicStep(probe, substepSeconds);

    probe.rocket.positionKm = updatedDynamicState.positionKm;
    probe.rocket.velocityKmPerSecond = updatedDynamicState.velocityKmPerSecond;
    probe.rocket.fuelMassKg = updatedDynamicState.fuelMassKg;
    probe.timeSeconds += substepSeconds;
    remainingTimeSeconds -= substepSeconds;

    if (probe.burn.active) {
      const burnElapsedSeconds = probe.timeSeconds - probe.burn.startTimeSeconds;
      const burnFinished =
        burnElapsedSeconds >= probe.burn.durationSeconds ||
        probe.rocket.fuelMassKg <= probe.burn.targetFinalFuelMassKg + 1e-3 ||
        probe.rocket.fuelMassKg <= 0;

      if (burnFinished) {
        probe.rocket.fuelMassKg = Math.max(
          0,
          Math.max(probe.burn.targetFinalFuelMassKg, probe.rocket.fuelMassKg)
        );
        probe.burn.active = false;
        probe.burn.completed = true;
      }
    }
  }
}

function evaluateGuidanceCandidate(
  initialPositionKm,
  parkingVelocityKmPerSecond,
  moonPhaseAngleRad,
  strategy,
  vehicleConfig
) {
  const profile = STRATEGY_PROFILES[strategy];
  const probe = {
    timeSeconds: 0,
    launched: true,
    mission: {
      moonPhaseAngleRad
    },
    rocket: {
      positionKm: cloneVector(initialPositionKm),
      velocityKmPerSecond: [0, parkingVelocityKmPerSecond, 0],
      fuelMassKg: vehicleConfig.fuelMassKg,
      dryMassKg: vehicleConfig.dryMassKg
    },
    burn: {
      active: vehicleConfig.plannedPropellantKg > 0,
      completed: vehicleConfig.plannedPropellantKg <= 0,
      startTimeSeconds: 0,
      durationSeconds: vehicleConfig.burnDurationSeconds,
      directionUnit: cloneVector(vehicleConfig.burnDirection),
      headingOffsetRad: vehicleConfig.headingOffsetDeg * DEG_TO_RAD,
      mdotKgPerSecond: vehicleConfig.plannedPropellantKg / vehicleConfig.burnDurationSeconds,
      exhaustVelocityKmPerSecond: vehicleConfig.exhaustVelocityKmPerSecond,
      startFuelMassKg: vehicleConfig.fuelMassKg,
      targetPropellantKg: vehicleConfig.plannedPropellantKg,
      targetFinalFuelMassKg: Math.max(
        0,
        vehicleConfig.fuelMassKg - vehicleConfig.plannedPropellantKg
      )
    }
  };
  let closestSurfaceRangeKm = Infinity;
  let closestApproachTimeSeconds = 0;

  for (let index = 0; index < 240; index += 1) {
    advanceProbe(probe, 3600, 120);

    const moonState = getMoonState(probe.timeSeconds, moonPhaseAngleRad);
    const moonSurfaceRangeKm =
      magnitude(subVec(probe.rocket.positionKm, moonState.positionKm)) - MOON_RADIUS_KM;

    if (moonSurfaceRangeKm < closestSurfaceRangeKm) {
      closestSurfaceRangeKm = moonSurfaceRangeKm;
      closestApproachTimeSeconds = probe.timeSeconds;
    }

    if (
      probe.timeSeconds > 3 * DAY_SECONDS &&
      moonSurfaceRangeKm > closestSurfaceRangeKm + 120000 &&
      closestSurfaceRangeKm < MOON_SOI_RADIUS_KM * 2
    ) {
      break;
    }
  }

  const finalEarthAltitudeKm = magnitude(probe.rocket.positionKm) - EARTH_RADIUS_KM;
  let score = Math.abs(closestSurfaceRangeKm - profile.targetFlybyKm);

  if (closestSurfaceRangeKm > MOON_SOI_RADIUS_KM * 1.4) {
    score += closestSurfaceRangeKm * 0.4;
  }

  if (closestSurfaceRangeKm < 300) {
    score += 140000;
  }

  if (strategy === 'freeReturn') {
    score += Math.max(0, finalEarthAltitudeKm - EARTH_MOON_DISTANCE_KM) * 0.03;
  }

  return {
    closestSurfaceRangeKm,
    closestApproachTimeSeconds,
    finalEarthAltitudeKm,
    score
  };
}

function solveGuidance(
  initialPositionKm,
  parkingVelocityKmPerSecond,
  plannedDeltaVKmPerSecond,
  targetRadiusKm,
  strategy,
  vehicleConfig
) {
  const profile = STRATEGY_PROFILES[strategy];
  const coarseHeadingOffsetsDeg = [-3, 0, 3];
  const coarseMoonArrivalOffsetsDeg = [-36, -18, 0, 18, 36];
  let bestCandidate;

  for (const coarseHeadingOffsetDeg of coarseHeadingOffsetsDeg) {
    const headingOffsetDeg = profile.headingOffsetDeg + coarseHeadingOffsetDeg;
    const candidateBurnDirection = normalizeVec(
      rotateVectorZ([0, 1, 0], headingOffsetDeg * DEG_TO_RAD)
    );
    const candidateVelocityKmPerSecond = addVec(
      [0, parkingVelocityKmPerSecond, 0],
      scaleVec(candidateBurnDirection, plannedDeltaVKmPerSecond)
    );
    const arrivalEstimate = estimateBallisticArrival(
      {
        positionKm: initialPositionKm,
        velocityKmPerSecond: candidateVelocityKmPerSecond,
        fuelMassKg: 0
      },
      targetRadiusKm,
      0
    );

    for (const coarseMoonArrivalOffsetDeg of coarseMoonArrivalOffsetsDeg) {
      const moonArrivalOffsetDeg = profile.moonArrivalOffsetDeg + coarseMoonArrivalOffsetDeg;
      const moonPhaseAngleRad = normalizeAngle(
        arrivalEstimate.angleRad +
          moonArrivalOffsetDeg * DEG_TO_RAD -
          MOON_ANGULAR_RATE_RAD_PER_SECOND * arrivalEstimate.timeSeconds
      );
      const evaluation = evaluateGuidanceCandidate(
        initialPositionKm,
        parkingVelocityKmPerSecond,
        moonPhaseAngleRad,
        strategy,
        {
          ...vehicleConfig,
          burnDirection: candidateBurnDirection,
          headingOffsetDeg
        }
      );

      if (!bestCandidate || evaluation.score < bestCandidate.score) {
        bestCandidate = {
          burnDirection: candidateBurnDirection,
          headingOffsetDeg,
          moonArrivalOffsetDeg,
          moonPhaseAngleRad,
          arrivalEstimate,
          initialVelocityKmPerSecond: candidateVelocityKmPerSecond,
          ...evaluation
        };
      }
    }
  }

  const refinedHeadingOffsetsDeg = [-1.2, -0.6, 0, 0.6, 1.2].map(
    (delta) => bestCandidate.headingOffsetDeg + delta
  );
  const refinedMoonArrivalOffsetsDeg = [-6, -3, 0, 3, 6].map(
    (delta) => bestCandidate.moonArrivalOffsetDeg + delta
  );

  for (const headingOffsetDeg of refinedHeadingOffsetsDeg) {
    const candidateBurnDirection = normalizeVec(
      rotateVectorZ([0, 1, 0], headingOffsetDeg * DEG_TO_RAD)
    );
    const candidateVelocityKmPerSecond = addVec(
      [0, parkingVelocityKmPerSecond, 0],
      scaleVec(candidateBurnDirection, plannedDeltaVKmPerSecond)
    );
    const arrivalEstimate = estimateBallisticArrival(
      {
        positionKm: initialPositionKm,
        velocityKmPerSecond: candidateVelocityKmPerSecond,
        fuelMassKg: 0
      },
      targetRadiusKm,
      0
    );

    for (const moonArrivalOffsetDeg of refinedMoonArrivalOffsetsDeg) {
      const moonPhaseAngleRad = normalizeAngle(
        arrivalEstimate.angleRad +
          moonArrivalOffsetDeg * DEG_TO_RAD -
          MOON_ANGULAR_RATE_RAD_PER_SECOND * arrivalEstimate.timeSeconds
      );
      const evaluation = evaluateGuidanceCandidate(
        initialPositionKm,
        parkingVelocityKmPerSecond,
        moonPhaseAngleRad,
        strategy,
        {
          ...vehicleConfig,
          burnDirection: candidateBurnDirection,
          headingOffsetDeg
        }
      );

      if (evaluation.score < bestCandidate.score) {
        bestCandidate = {
          burnDirection: candidateBurnDirection,
          headingOffsetDeg,
          moonArrivalOffsetDeg,
          moonPhaseAngleRad,
          arrivalEstimate,
          initialVelocityKmPerSecond: candidateVelocityKmPerSecond,
          ...evaluation
        };
      }
    }
  }

  return bestCandidate;
}

export function planMissionPreview(inputValues) {
  const cacheKey = JSON.stringify({
    payloadMassKg: Number(inputValues.payloadMassKg),
    fuelMassKg: Number(inputValues.fuelMassKg),
    ispSeconds: Number(inputValues.ispSeconds),
    strategy: inputValues.strategy
  });

  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey);
  }

  const strategy = STRATEGY_PROFILES[inputValues.strategy] ? inputValues.strategy : 'hohmann';
  const profile = STRATEGY_PROFILES[strategy];
  const payloadMassKg = Math.max(1000, Number(inputValues.payloadMassKg) || DEFAULT_FORM_VALUES.payloadMassKg);
  const fuelMassKg = Math.max(1000, Number(inputValues.fuelMassKg) || DEFAULT_FORM_VALUES.fuelMassKg);
  const ispSeconds = Math.max(250, Number(inputValues.ispSeconds) || DEFAULT_FORM_VALUES.ispSeconds);
  const dryMassKg = calculateDryMassKg(payloadMassKg);
  const totalMassKg = dryMassKg + fuelMassKg;
  const exhaustVelocityKmPerSecond = (ispSeconds * G0) / 1000;
  const parkingRadiusKm = getParkingOrbitRadiusKm();
  const parkingVelocityKmPerSecond = getParkingOrbitSpeedKmPerSecond(parkingRadiusKm);
  const targetRadiusKm = EARTH_MOON_DISTANCE_KM - profile.targetRadiusOffsetKm;
  const baselineDeltaVKmPerSecond = calculateHohmannBurnKmPerSecond(parkingRadiusKm, targetRadiusKm);
  const plannedDeltaVKmPerSecond = baselineDeltaVKmPerSecond * profile.deltaVMultiplier;
  const initialPositionKm = [parkingRadiusKm, 0, 0];
  const requiredFinalMassKg = totalMassKg / Math.exp(plannedDeltaVKmPerSecond / exhaustVelocityKmPerSecond);
  const requiredPropellantKg = Math.max(0, totalMassKg - requiredFinalMassKg);
  const plannedPropellantKg = Math.min(requiredPropellantKg, fuelMassKg);
  const achievableDeltaVKmPerSecond =
    exhaustVelocityKmPerSecond *
    Math.log(totalMassKg / (dryMassKg + fuelMassKg - plannedPropellantKg));
  const guidance = solveGuidance(
    initialPositionKm,
    parkingVelocityKmPerSecond,
    plannedDeltaVKmPerSecond,
    targetRadiusKm,
    strategy,
    {
      dryMassKg,
      fuelMassKg,
      plannedPropellantKg,
      burnDurationSeconds: profile.burnDurationSeconds,
      exhaustVelocityKmPerSecond
    }
  );

  const preview = {
    strategy,
    strategyMeta: summarizeStrategy(strategy),
    payloadMassKg,
    fuelMassKg,
    ispSeconds,
    dryMassKg,
    totalMassKg,
    parkingRadiusKm,
    parkingVelocityKmPerSecond,
    plannedDeltaVKmPerSecond,
    achievableDeltaVKmPerSecond,
    requiredPropellantKg,
    plannedPropellantKg,
    fuelMarginKg: fuelMassKg - requiredPropellantKg,
    burnDurationSeconds: profile.burnDurationSeconds,
    burnDirection: guidance.burnDirection,
    moonPhaseAngleRad: guidance.moonPhaseAngleRad,
    arrivalEstimateTimeSeconds: guidance.arrivalEstimate.timeSeconds,
    arrivalPhaseAngleDeg: normalizeAngle(guidance.moonPhaseAngleRad) / DEG_TO_RAD,
    exhaustVelocityKmPerSecond,
    estimatedClosestApproachKm: guidance.closestSurfaceRangeKm,
    guidanceHeadingOffsetDeg: guidance.headingOffsetDeg,
    guidanceMoonArrivalOffsetDeg: guidance.moonArrivalOffsetDeg
  };

  previewCache.set(cacheKey, preview);
  return preview;
}

function cloneFuelHistory(fuelHistory) {
  return fuelHistory.map((sample) => ({ ...sample }));
}

export function cloneSimulationState(simState, options = {}) {
  const includeFuelHistory = options.includeFuelHistory ?? true;

  return {
    timeSeconds: simState.timeSeconds,
    launched: simState.launched,
    mission: {
      strategy: simState.mission.strategy,
      moonPhaseAngleRad: simState.mission.moonPhaseAngleRad,
      preview: { ...simState.mission.preview }
    },
    rocket: {
      payloadMassKg: simState.rocket.payloadMassKg,
      dryMassKg: simState.rocket.dryMassKg,
      ispSeconds: simState.rocket.ispSeconds,
      fuelMassKg: simState.rocket.fuelMassKg,
      positionKm: cloneVector(simState.rocket.positionKm),
      velocityKmPerSecond: cloneVector(simState.rocket.velocityKmPerSecond)
    },
    burn: {
      ...simState.burn,
      directionUnit: cloneVector(simState.burn.directionUnit)
    },
    navigation: {
      ...simState.navigation
    },
    sampling: {
      lastLoggedFuelTimeSeconds: simState.sampling.lastLoggedFuelTimeSeconds,
      fuelHistoryVersion: simState.sampling.fuelHistoryVersion ?? 0,
      fuelHistory: includeFuelHistory ? cloneFuelHistory(simState.sampling.fuelHistory) : []
    }
  };
}

export function createSimulationState(inputValues, options = {}) {
  const preview = planMissionPreview(inputValues);
  const parkingVelocityKmPerSecond = getParkingOrbitSpeedKmPerSecond(preview.parkingRadiusKm);
  const plannedFinalFuelKg = Math.max(0, preview.fuelMassKg - preview.plannedPropellantKg);
  const launched = options.launched ?? false;

  return {
    timeSeconds: 0,
    launched,
    mission: {
      strategy: preview.strategy,
      moonPhaseAngleRad: preview.moonPhaseAngleRad,
      preview
    },
    rocket: {
      payloadMassKg: preview.payloadMassKg,
      dryMassKg: preview.dryMassKg,
      ispSeconds: preview.ispSeconds,
      fuelMassKg: preview.fuelMassKg,
      positionKm: [preview.parkingRadiusKm, 0, 0],
      velocityKmPerSecond: [0, parkingVelocityKmPerSecond, 0]
    },
    burn: {
      active: launched && preview.plannedPropellantKg > 0,
      completed: !launched || preview.plannedPropellantKg <= 0,
      startTimeSeconds: 0,
      durationSeconds: preview.burnDurationSeconds,
      directionUnit: cloneVector(preview.burnDirection),
      headingOffsetRad: preview.guidanceHeadingOffsetDeg * DEG_TO_RAD,
      mdotKgPerSecond: preview.plannedPropellantKg / preview.burnDurationSeconds,
      exhaustVelocityKmPerSecond: preview.exhaustVelocityKmPerSecond,
      startFuelMassKg: preview.fuelMassKg,
      targetPropellantKg: preview.plannedPropellantKg,
      targetFinalFuelMassKg: plannedFinalFuelKg
    },
    navigation: {
      enteredMoonSOI: false,
      closestMoonApproachKm: Infinity,
      closestMoonApproachTimeSeconds: 0
    },
    sampling: {
      lastLoggedFuelTimeSeconds: 0,
      fuelHistoryVersion: 0,
      fuelHistory: [{ timeSeconds: 0, fuelMassKg: preview.fuelMassKg }]
    }
  };
}

function appendFuelSample(nextState, historyIntervalSeconds = 900) {
  const shouldAppend =
    nextState.timeSeconds === 0 ||
    nextState.timeSeconds - nextState.sampling.lastLoggedFuelTimeSeconds >= historyIntervalSeconds;

  if (!shouldAppend) {
    return;
  }

  nextState.sampling.lastLoggedFuelTimeSeconds = nextState.timeSeconds;
  nextState.sampling.fuelHistory.push({
    timeSeconds: nextState.timeSeconds,
    fuelMassKg: nextState.rocket.fuelMassKg
  });
  nextState.sampling.fuelHistoryVersion += 1;

  if (nextState.sampling.fuelHistory.length > 540) {
    nextState.sampling.fuelHistory.shift();
  }
}

export function getTimeWarpForState(simState) {
  if (simState.burn.active) {
    return 30;
  }

  if (!simState.launched) {
    return 12;
  }

  const moonState = getMoonState(simState.timeSeconds, simState.mission.moonPhaseAngleRad);
  const moonDistanceKm = magnitude(subVec(simState.rocket.positionKm, moonState.positionKm));

  if (moonDistanceKm < MOON_SOI_RADIUS_KM * 1.6) {
    return 180;
  }

  return 1800;
}

export function stepSimulation(simState, deltaTimeSeconds, options = {}) {
  const mutate = options.mutate ?? false;
  const trackHistory = options.trackHistory ?? true;
  const burnSubstepSeconds = options.burnSubstepSeconds ?? 0.5;
  const coastSubstepSeconds = options.coastSubstepSeconds ?? 20;
  const burnHistoryIntervalSeconds = options.burnHistoryIntervalSeconds ?? 6;
  const coastHistoryIntervalSeconds = options.coastHistoryIntervalSeconds ?? 900;
  const nextState = mutate
    ? simState
    : cloneSimulationState(simState, { includeFuelHistory: trackHistory });
  let remainingTimeSeconds = Math.max(0, deltaTimeSeconds);

  while (remainingTimeSeconds > 0) {
    const substepSeconds = Math.min(
      remainingTimeSeconds,
      nextState.burn.active ? burnSubstepSeconds : coastSubstepSeconds
    );
    const updatedDynamicState = rk4DynamicStep(nextState, substepSeconds);

    nextState.rocket.positionKm = updatedDynamicState.positionKm;
    nextState.rocket.velocityKmPerSecond = updatedDynamicState.velocityKmPerSecond;
    nextState.rocket.fuelMassKg = updatedDynamicState.fuelMassKg;
    nextState.timeSeconds += substepSeconds;
    remainingTimeSeconds -= substepSeconds;

    if (nextState.burn.active) {
      const burnElapsedSeconds = nextState.timeSeconds - nextState.burn.startTimeSeconds;
      const burnFinished =
        burnElapsedSeconds >= nextState.burn.durationSeconds ||
        nextState.rocket.fuelMassKg <= nextState.burn.targetFinalFuelMassKg + 1e-3 ||
        nextState.rocket.fuelMassKg <= 0;

      if (burnFinished) {
        nextState.rocket.fuelMassKg = Math.max(
          0,
          Math.max(nextState.burn.targetFinalFuelMassKg, nextState.rocket.fuelMassKg)
        );
        nextState.burn.active = false;
        nextState.burn.completed = true;
      }
    }

    const moonState = getMoonState(nextState.timeSeconds, nextState.mission.moonPhaseAngleRad);
    const moonDistanceKm = magnitude(subVec(nextState.rocket.positionKm, moonState.positionKm));

    if (moonDistanceKm < nextState.navigation.closestMoonApproachKm) {
      nextState.navigation.closestMoonApproachKm = moonDistanceKm;
      nextState.navigation.closestMoonApproachTimeSeconds = nextState.timeSeconds;
    }

    if (moonDistanceKm <= MOON_SOI_RADIUS_KM) {
      nextState.navigation.enteredMoonSOI = true;
    }

    if (trackHistory) {
      appendFuelSample(
        nextState,
        nextState.burn.active ? burnHistoryIntervalSeconds : coastHistoryIntervalSeconds
      );
    }
  }

  return nextState;
}

export function sampleProjectedTrajectory(simState, options = {}) {
  const horizonSeconds = options.horizonSeconds ?? (simState.launched ? 8 * DAY_SECONDS : 1.5 * DAY_SECONDS);
  const points = options.points ?? 220;
  const stepSeconds = horizonSeconds / points;
  const burnSubstepSeconds = options.burnSubstepSeconds ?? 3;
  const coastSubstepSeconds = options.coastSubstepSeconds ?? Math.min(240, Math.max(60, stepSeconds / 10));
  let probe = cloneSimulationState(simState, { includeFuelHistory: false });
  const samples = [cloneVector(probe.rocket.positionKm)];

  for (let index = 0; index < points; index += 1) {
    probe = stepSimulation(probe, stepSeconds, {
      mutate: true,
      trackHistory: false,
      burnSubstepSeconds,
      coastSubstepSeconds
    });
    samples.push(cloneVector(probe.rocket.positionKm));
  }

  return samples;
}

export function buildTelemetry(simState) {
  const moonState = getMoonState(simState.timeSeconds, simState.mission.moonPhaseAngleRad);
  const velocityKmPerSecond = magnitude(simState.rocket.velocityKmPerSecond);
  const earthCenterDistanceKm = magnitude(simState.rocket.positionKm);
  const moonCenterDistanceKm = magnitude(subVec(simState.rocket.positionKm, moonState.positionKm));
  const earthAltitudeKm = Math.max(0, earthCenterDistanceKm - EARTH_RADIUS_KM);
  const moonRangeKm = Math.max(0, moonCenterDistanceKm - MOON_RADIUS_KM);
  const achievedDeltaVKmPerSecond =
    simState.mission.preview.exhaustVelocityKmPerSecond *
    Math.log(
      (simState.rocket.dryMassKg + simState.burn.startFuelMassKg) /
        (simState.rocket.dryMassKg + simState.rocket.fuelMassKg)
    );

  let statusText = 'Parking orbit hold';

  if (simState.burn.active) {
    statusText = 'Trans-lunar injection burn';
  } else if (moonCenterDistanceKm <= MOON_SOI_RADIUS_KM) {
    statusText =
      simState.mission.strategy === 'freeReturn'
        ? 'Lunar flyby / free-return arc'
        : 'Lunar sphere of influence';
  } else if (simState.navigation.enteredMoonSOI && simState.mission.strategy === 'freeReturn') {
    statusText = 'Earth return coast';
  } else if (simState.launched) {
    statusText = 'Ballistic coast to lunar intercept';
  }

  return {
    ...TELEMETRY_TEMPLATE,
    velocityKmPerSecond,
    earthAltitudeKm,
    moonRangeKm,
    sphereOfInfluence: moonCenterDistanceKm <= MOON_SOI_RADIUS_KM ? 'Moon' : 'Earth',
    missionElapsedLabel: formatMissionTime(simState.timeSeconds),
    missionClockSeconds: simState.timeSeconds,
    timeWarp: getTimeWarpForState(simState),
    fuelMassKg: simState.rocket.fuelMassKg,
    statusText,
    strategyLabel: simState.mission.preview.strategyMeta.label,
    closestMoonApproachKm: Math.max(
      0,
      simState.navigation.closestMoonApproachKm - MOON_RADIUS_KM
    ),
    achievedDeltaVKmPerSecond,
    burnActive: simState.burn.active
  };
}

export function buildInitialTelemetry(inputValues = DEFAULT_FORM_VALUES) {
  return buildTelemetry(createSimulationState(inputValues, { launched: false }));
}
