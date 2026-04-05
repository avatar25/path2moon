# Artemis Trajectory

Artemis Trajectory is an interactive 3D Earth-to-Moon launch simulator built with Svelte and Three.js. It visualizes a translunar mission with deterministic orbital mechanics, live telemetry, trajectory paths, and propellant consumption driven by the Tsiolkovsky rocket equation.

## What It Does

- Renders Earth, the Moon, and a rocket in a scaled 3D scene.
- Simulates motion under Earth and Moon gravity using RK4 integration.
- Lets you tune payload mass, specific impulse, fuel mass, and launch strategy.
- Displays live telemetry for velocity, altitude, lunar range, sphere of influence, and mission clock.
- Plots fuel mass over time in a compact HUD chart.
- Ships with Docker and Kubernetes deployment assets.

## Stack

- Svelte 5
- Vite
- Three.js
- Math.js
- Chart.js
- Nginx for container runtime

## Physics Notes

The simulator uses:

- Newtonian gravity from both Earth and Moon
- Runge-Kutta 4 numerical integration
- A scaled render space where `1 unit = 1,000 km`
- A burn/fuel model based on the Tsiolkovsky rocket equation

Current launch strategies are guidance-tuned mission profiles for visualization and interaction. They are not a full patched-conic or Lambert-solver mission planner.

## Requirements

- Node.js `22.12+` or `24+` is recommended
- npm `10+`

Note: the current dependency set installs and builds on some Node 23 environments, but may show engine warnings.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## How To Use

1. Set the payload mass, specific impulse, fuel mass, and launch strategy.
2. Click `Initiate Launch Sequence`.
3. Use the telemetry panel to switch camera focus between the system, Earth, Moon, and rocket.
4. Orbit, pan, and zoom in the 3D scene with standard mouse or trackpad controls.

## Docker

Build the image:

```bash
docker build -t artemis-trajectory .
```

Run the container:

```bash
docker run --rm -p 8080:8080 artemis-trajectory
```

Then open [http://localhost:8080](http://localhost:8080).

## Kubernetes

A starter manifest is available at [k8s/deployment.yaml](/Users/shiben/Desktop/path2moon/k8s/deployment.yaml).

Before applying it:

- Replace `ghcr.io/example/artemis-trajectory:latest` with your real image reference.
- Adjust replica count and resource limits for your environment if needed.

Apply the manifest:

```bash
kubectl apply -f k8s/deployment.yaml
```

## Project Structure

```text
src/
  App.svelte
  app.css
  lib/
    physics/
      orbitMath.js
    scene/
      SpaceScene.svelte
    ui/
      ControlPanel.svelte
      TelemetryOverlay.svelte
      FuelChart.svelte
k8s/
  deployment.yaml
Dockerfile
nginx.conf
```

## Current Limitations

- No automated test suite yet
- No external texture assets yet; Earth and Moon textures are procedural
- Large client bundle because Three.js, Math.js, and Chart.js are bundled together
- Mission guidance is intentionally simplified compared with professional astrodynamics tooling

