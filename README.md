# Self-Driving Car Simulator

A browser-based autonomous vehicle simulation platform that uses **neural networks** and **genetic algorithms** to evolve self-driving agents. Built entirely with TypeScript — no bundlers, no frameworks, no runtime dependencies.

Cars learn to navigate procedurally-generated worlds through evolutionary selection: sensors perceive the environment, a feedforward neural network decides steering, and the fittest brains survive to the next generation.

---

## Features

- **Neuroevolution Training** — Evolve neural networks through genetic selection, crossover, and mutation across generations of hundreds of cars simultaneously
- **Procedural World Generation** — Roads, buildings, and trees generated from a graph-based road network with configurable width, roundness, and density
- **OpenStreetMap Import** — Load real-world road networks from OSM Overpass API data
- **Interactive World Editor** — Visual tools for designing road networks, placing traffic lights, stop signs, crosswalks, and destinations
- **Multiple Control Modes** — Keyboard, phone tilt (device orientation), camera-based marker tracking, and AI neural network control
- **Real-time Neural Network Visualizer** — Live display of neuron activations, weights, and biases as cars drive
- **3D Camera Perspective** — Pseudo-3D rendering with buildings, trees, and perspective projection
- **Racing Mode** — Competitive races between player and AI cars with countdown, progress tracking, and sound effects
- **Traffic Simulation** — Coordinated traffic lights with green/yellow/red cycling at intersections
- **Mini-Map** — Real-time overview of all cars and the world graph
- **Save/Load System** — Persist worlds, trained brains, and car configurations to files or localStorage

---

## Quick Start

### Prerequisites

- **Node.js** (v18+) — only used for dev tooling (`tsc`, `eslint`, `serve`)

### Installation

```bash
git clone <repo-url>
cd Self-driving-car
npm install
```

### Running

```bash
npm start
```

This concurrently runs:

1. `tsc --watch` — compiles TypeScript to JavaScript on every save
2. `serve -p 9090` — serves static files at [http://localhost:9090](http://localhost:9090)
3. `onchange` watcher — auto-formats and lints on file changes

Open [http://localhost:9090](http://localhost:9090) in your browser to see the landing page with all simulation modes.

---

## Available Commands

| Command             | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `npm start`         | Full dev environment (compile + serve + lint/format watch) |
| `npm run tsc:watch` | TypeScript compiler in watch mode only                     |
| `npm run serve`     | Static file server on port 9090                            |
| `npm run format`    | Format all files with Prettier                             |
| `npm run lint`      | Lint and auto-fix with ESLint                              |
| `npm run fix:all`   | Format + lint combined                                     |

---

## Simulation Modes

| Mode              | URL Path                         | Description                                                              |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------ |
| **Simple Road**   | `/html/simpleRoadSimulator.html` | 3-lane straight road with random traffic — ideal for initial training    |
| **Simulator**     | `/html/simulator.html`           | Full world simulation with custom maps, corridors, and advanced training |
| **Camera View**   | `/html/cameraViewSimulator.html` | 3D perspective rendering from the car's viewpoint                        |
| **Race**          | `/html/race.html`                | Competitive racing with keyboard controls vs AI                          |
| **Race (Camera)** | `/html/race-camera.html`         | Race controlled via webcam marker detection                              |
| **Race (Phone)**  | `/html/race-phone.html`          | Race controlled via phone tilt (device orientation)                      |
| **World Editor**  | `/html/world.html`               | Full-featured map creation and editing tool                              |

---

## How It Works

### The Training Loop

```
┌─────────────────────────────────────────────────────────┐
│  1. Spawn N cars with mutated neural network brains     │
│  2. Each car's sensors cast rays → detect obstacles     │
│  3. Sensor readings feed into the neural network        │
│  4. Network outputs: [forward, left, right, reverse]    │
│  5. Car physics update position based on controls       │
│  6. Damaged cars stop; fitness = distance traveled      │
│  7. Select top performers → save to breeding pool       │
│  8. Next generation = crossover + mutation from pool    │
│  9. Repeat from step 1                                  │
└─────────────────────────────────────────────────────────┘
```

### Neural Network Architecture

- **Input Layer**: Sensor ray offsets (normalized 0–1) + current speed
- **Hidden Layer(s)**: Configurable neuron count (default: 6)
- **Output Layer**: 4 neurons → Forward, Left, Right, Reverse
- **Activation**: Binary step function (fires if weighted sum > bias)
- **Training**: No backpropagation — purely evolutionary (mutation + crossover)

### Car Physics

- Acceleration/friction-based movement model
- Angle-based steering (scales with speed direction)
- Rectangular polygon collision detection against all world geometry
- Max speed capping with 50% reverse speed limit

---

## Project Structure

```
Self-driving-car/
├── index.html                  # Landing page with links to all modes
├── package.json                # Dev dependencies (tsc, eslint, prettier, serve)
├── tsconfig.json               # TypeScript config (target: ES2022)
├── eslint.config.mjs           # ESLint 9 flat config with Prettier integration
│
├── ts/                         # SOURCE CODE (TypeScript)
│   ├── math/
│   │   ├── utils.ts            # Vector math, lerp, intersections, distance
│   │   ├── primitives/
│   │   │   ├── point.ts        # 2D/3D point with drawing
│   │   │   ├── segment.ts      # Line segment with projection & distance
│   │   │   ├── polygon.ts      # Closed shape with union, intersection, containment
│   │   │   └── envelope.ts     # Rounded rectangle around a segment
│   │   ├── graph/
│   │   │   └── graph.ts        # Road network graph with Dijkstra pathfinding
│   │   └── osm-importer/
│   │       └── osm.ts          # OpenStreetMap data parser (lat/lon → canvas)
│   │
│   ├── car/
│   │   ├── car.ts              # Vehicle physics, collision, AI integration
│   │   ├── sensors/
│   │   │   └── sensor.ts       # Ray-casting perception system
│   │   └── controls/
│   │       ├── controls.ts     # Keyboard & AI control modes
│   │       ├── phoneControls.ts    # Device orientation (tilt) steering
│   │       ├── cameraControls.ts   # Webcam marker-based steering
│   │       └── markerDetector.ts   # Blue marker K-means clustering
│   │
│   ├── neural-network/
│   │   ├── network.ts          # Feedforward network, mutation, crossover
│   │   └── visualizer.ts       # Real-time network state renderer
│   │
│   ├── world-editor/
│   │   ├── world.ts            # World generation (roads, buildings, trees)
│   │   ├── trafficManager.ts   # Traffic light coordination
│   │   ├── types.ts            # Shared editor types
│   │   ├── editors/            # Interactive editing tools
│   │   │   ├── worldEditor.ts  # Master editor coordinator
│   │   │   ├── graphEditor.ts  # Road network point/segment editing
│   │   │   ├── markingEditor.ts    # Base class for marking placement
│   │   │   ├── crossingEditor.ts   # Crosswalk placement
│   │   │   ├── lightEditor.ts      # Traffic light placement
│   │   │   ├── startEditor.ts      # Spawn point placement
│   │   │   ├── stopEditor.ts       # Stop sign placement
│   │   │   ├── targetEditor.ts     # Destination/finish placement
│   │   │   ├── parkingEditor.ts    # Parking spot placement
│   │   │   └── yieldEditor.ts      # Yield sign placement
│   │   ├── items/              # Environmental objects
│   │   │   ├── building.ts     # 3D building with perspective rendering
│   │   │   └── tree.ts         # Procedural tree with layered canopy
│   │   └── markings/           # Traffic marking types
│   │       ├── marking.ts      # Base marking class
│   │       ├── crossing.ts     # Pedestrian crossing
│   │       ├── light.ts        # Traffic light
│   │       ├── parking.ts      # Parking spot
│   │       ├── start.ts        # Spawn point
│   │       ├── stop.ts         # Stop line
│   │       ├── target.ts       # Destination marker
│   │       └── yield.ts        # Yield line
│   │
│   ├── ai-training/
│   │   ├── trainingManager.ts  # Genetic algorithm orchestration & UI
│   │   ├── simulator.ts        # Full world training environment
│   │   ├── simpleRoadSimulator.ts  # Straight road training
│   │   └── simulatorUtils.ts   # Shared drawing utilities
│   │
│   ├── simulators/
│   │   └── cameraViewSimulator.ts  # 3D perspective simulation
│   │
│   ├── games/
│   │   └── race.ts             # Racing mode with countdown & scoring
│   │
│   ├── viewport/
│   │   └── viewport.ts         # Pan/zoom transformation system
│   │
│   ├── mini-map/
│   │   └── miniMap.ts          # Scaled world overview
│   │
│   ├── camera.ts               # 3D perspective camera with frustum culling
│   ├── camera_new_ai_ver.ts    # Experimental AI vision camera
│   ├── road.ts                 # Simple straight road (for basic simulator)
│   ├── sound.ts                # Audio effects (engine, beep, explosion)
│   ├── types.ts                # Global type declarations
│   └── utils.ts                # Collision helpers, color utilities
│
├── js/                         # COMPILED OUTPUT (generated by tsc)
│   └── (mirrors ts/ structure)
│
├── html/                       # HTML entry points for each mode
│   ├── simulator.html
│   ├── simpleRoadSimulator.html
│   ├── cameraViewSimulator.html
│   ├── race.html
│   ├── race-camera.html
│   ├── race-phone.html
│   ├── world.html
│   └── controlPanel.html       # Reusable training UI (loaded via XHR)
│
├── styles/
│   ├── style.css               # Main page styles
│   └── world/styles.css        # World editor styles
│
├── assets/
│   └── world/                  # Textures and sprites
│
├── saves/                      # Saved worlds and trained brains
│   ├── *.world                 # World definition files
│   ├── *.car                   # Car brain/config files
│   ├── bestBrain*.txt          # Exported neural networks
│   └── *-osm-data.json        # OpenStreetMap import data
│
└── docs/                       # Technical documentation
    ├── Architecture.md
    ├── Math.md
    ├── Physics.md
    ├── NeuralNetwork.md
    ├── WorldEditor.md
    ├── Simulators.md
    ├── Camera.md
    └── Controls.md
```

---

## Build System

This project intentionally uses **no bundler** (no Webpack, Vite, Rollup, etc.).

- **TypeScript Compiler** (`tsc`) transpiles `.ts` files to `.js` files maintaining the same directory structure
- **HTML `<script>` tags** load compiled JS files in dependency order (base utilities first, then domain modules)
- **Static file server** (`serve`) hosts the project as-is
- All classes are exposed as **global variables** — no ES module imports/exports at runtime

This keeps the development loop instant: save a `.ts` file → `tsc` compiles → browser refresh picks up changes.

---

## Save/Load Formats

### World Files (`.world`)

JavaScript files containing a world definition object with graph, road parameters, buildings, trees, markings, and viewport state.

### Car Files (`.car`)

JavaScript files containing a car configuration with neural network brain, physics parameters, and sensor settings.

### LocalStorage Keys

| Key          | Contents                                          |
| ------------ | ------------------------------------------------- |
| `bestBrain`  | JSON of the single best-performing neural network |
| `bestBrains` | JSON array of the top N networks (breeding pool)  |

---

## Documentation

Detailed technical documentation is maintained in the `docs/` directory:

| Document                                | Description                                           |
| --------------------------------------- | ----------------------------------------------------- |
| [Architecture](docs/Architecture.md)    | System overview, module relationships, data flow      |
| [Math](docs/Math.md)                    | Geometric primitives, graph system, vector operations |
| [Physics](docs/Physics.md)              | Car dynamics, collision detection, sensor ray-casting |
| [Neural Network](docs/NeuralNetwork.md) | Network structure, evolution, mutation, crossover     |
| [World Editor](docs/WorldEditor.md)     | World generation, editors, markings, items            |
| [Simulators](docs/Simulators.md)        | Training environments, genetic algorithm workflow     |
| [Camera](docs/Camera.md)                | 3D perspective system, frustum culling, projection    |
| [Controls](docs/Controls.md)            | Input systems: keyboard, phone, camera, AI            |

---

## Key Design Decisions

- **No bundler** — Direct script loading keeps the project simple and debuggable
- **No runtime dependencies** — Everything is implemented from scratch (neural network, physics, geometry, rendering)
- **Global scope** — Classes are globals for simplicity; HTML files control load order
- **Genetic algorithms over backpropagation** — Binary step activation + evolutionary selection is simpler and produces interesting emergent behaviors
- **Polygon-based collision** — Accurate rotated rectangle intersection testing for all objects
- **Canvas 2D rendering** — No WebGL; uses standard Canvas API with custom 3D projection for camera views

---

## Contributing

1. Write all logic in TypeScript (`ts/` directory)
2. Run `npm run lint` before committing (auto-fixes formatting)
3. Test changes visually in the relevant simulator HTML page
4. Update documentation in `docs/` for any significant changes
5. Do not introduce bundlers or runtime dependencies

---

## License

ISC
