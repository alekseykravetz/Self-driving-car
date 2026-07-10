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
- **Real-time Neural Network Visualizer** — Live display of neuron activations, weights, and biases as cars drive; follows the best AI car by default, or the user-controlled KEYS car when the toolbar tracking mode is set to "keys" (which also reveals the KEYS car's sensor rays)
- **3D Camera Perspective** — Pseudo-3D rendering with buildings, trees, and perspective projection
- **Racing Mode** — Competitive races between player and AI cars with countdown, progress tracking, and sound effects
- **Live Traffic Jam** — Click anywhere on a loaded world to drop trained cars that immediately drive themselves, collide with each other, and build an emergent traffic jam
- **Spatial Congestion Heatmap** — Toggle a 🌡️ colour overlay (blue → red) on any simulator to see where traffic accumulates and idles over time
- **Traffic Simulation** — Coordinated traffic lights with green/yellow/red cycling at intersections
- **Traffic-Light Perception** — AI cars with `sensor.stateAware: true` detect traffic lights and other cars via their ray network and feed the obstacle state (0=safe, 0.5=caution, 1=stop) as an extra input per ray; enabled per car via the "State Aware" checkbox in the training car-config (init modal and live panel), defaults to off so legacy cars keep the original input layer and drive unchanged
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

| Command                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `npm start`            | Full dev environment (compile + serve + lint/format watch) |
| `npm run tsc:watch`    | TypeScript compiler in watch mode only                     |
| `npm run serve`        | Static file server on port 9090                            |
| `npm run watch:fix`    | Auto-format + lint on file change                          |
| `npm run format`       | Format all files with Prettier                             |
| `npm run lint`         | Lint and auto-fix with ESLint                              |
| `npm run fix:all`      | Format + lint combined                                     |
| `npm run lint:watch`   | Watch mode linter (on changed files only)                  |
| `npm run publish:site` | Deploy via here.now (`scripts/publish-site.sh`)            |

---

## Simulation Modes

| Mode                 | URL Path                      | Description                                                              |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| **Simple Road**      | `/html/simulator?mode=simple` | 3-lane straight road with random traffic — ideal for initial training    |
| **Simulator**        | `/html/simulator`             | Full world simulation with custom maps, corridors, and advanced training |
| **Live Traffic Jam** | `/html/traffic`               | Click a loaded world to spawn self-driving cars and watch traffic emerge |
| **Race**             | `/html/race`                  | Competitive racing with keyboard controls vs AI                          |
| **Race (Camera)**    | `/html/race?mode=camera`      | Race controlled via webcam marker detection                              |
| **Race (Phone)**     | `/html/race?mode=phone`       | Race controlled via phone tilt (device orientation)                      |
| **World Editor**     | `/html/world`                 | Full-featured map creation and editing tool                              |

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

- **Input Layer**: Sensor ray offsets (normalized 0–1) + current speed. Traffic-aware cars add one light-state input per ray (input size `rayCount*2 + 1` vs legacy `rayCount + 1`)
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
│   │   ├── osm-importer/
│   │   │   └── osm.ts          # OpenStreetMap data parser (lat/lon → canvas)
│   │   ├── spatialGrid.ts      # Uniform hash grid for fast range queries (segments)
│   │   ├── trafficControlGrid.ts # Spatial hash grid indexing traffic-light polygons for AI perception
│   │   └── heatmapGrid.ts      # Lazy grid-based congestion counter for the heatmap overlay
│   │
│   ├── car/
│   │   ├── car.ts              # Vehicle physics, collision, AI integration
│   │   ├── config.ts           # Car configuration & defaults
│   │   ├── brain/
│   │   │   └── carBrainAdapter.ts  # Neural network ↔ car brain bridge
│   │   ├── sensors/
│   │   │   └── sensor.ts       # Ray-casting perception system
│   │   ├── physics/
│   │   │   ├── carPhysics.ts       # Acceleration, friction, steering dynamics
│   │   │   └── sensorRaycaster.ts  # Optimized ray-segment intersection
│   │   ├── rendering/
│   │   │   └── carRenderer.ts  # Car drawing (hull, wheels, damage overlays)
│   │   ├── controls/
│   │   │   ├── controls.ts     # Keyboard & AI control modes
│   │   │   ├── phoneControls.ts    # Device orientation (tilt) steering
│   │   │   ├── cameraControls.ts   # Webcam marker-based steering
│   │   │   └── markerDetector.ts   # Blue marker K-means clustering
│   │   └── loader/
│   │       └── carLoader.ts    # .car/.json file-input loader
│   │
│   ├── rendering/              # Shared canvas-drawing helpers
│   │   ├── pointRenderer.ts
│   │   ├── segmentRenderer.ts
│   │   ├── polygonRenderer.ts
│   │   ├── envelopeRenderer.ts
│   │   └── heatmapRenderer.ts  # Viewport-culled congestion heatmap overlay (blue→red)
│   │
│   ├── neural-network/
│   │   ├── network.ts          # Feedforward network, mutation, crossover
│   │   └── visualizer.ts       # Real-time network state renderer
│   │
│   ├── world/
│   │   ├── world.ts            # World data + draw + load container
│   │   ├── corridor.ts         # Standalone race corridor (borders, caps, extend)
│   │   ├── entry.ts            # World editor page entry point
│   │   ├── trafficManager.ts   # Traffic light coordination
│   │   ├── types.ts            # Shared world/editor types (IWorld, Corridor)
│   │   ├── generation/
│   │   │   └── worldGenerator.ts # Procedural geometry (roads on edit, items on demand)
│   │   ├── editors/            # Interactive editing tools
│   │   │   ├── worldEditor.ts  # Master editor coordinator
│   │   │   ├── graphEditor.ts  # Road network point/segment editing
│   │   │   ├── corridorEditor.ts   # Race corridor authoring
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
│   │   ├── markings/           # Traffic marking types
│   │   │   ├── marking.ts      # Base marking class
│   │   │   ├── markingLoader.ts    # Marking de/serialization
│   │   │   ├── crossing.ts     # Pedestrian crossing
│   │   │   ├── light.ts        # Traffic light
│   │   │   ├── parking.ts      # Parking spot
│   │   │   ├── start.ts        # Spawn point
│   │   │   ├── stop.ts         # Stop line
│   │   │   ├── target.ts       # Destination marker
│   │   │   └── yield.ts        # Yield line
│   │   ├── simple/
│   │   │   └── simpleWorld.ts  # Lightweight IWorld: straight 3-lane road
│   │   └── loader/
│   │       └── worldLoader.ts  # .world file-input loader
│   │
│   ├── simulator/              # Simulator domain (training, traffic, panels, core)
│   │   ├── entry.ts            # Simulator page entry point
│   │   ├── spatialGridUtils.ts # Spatial-grid helpers for collision queries
│   │   ├── trafficControlUtils.ts # Traffic-light grid build/query helpers for AI perception
│   │   ├── core/
│   │   │   └── simulatorShell.ts   # Abstract base: canvases, viewport, camera, RAF loop
│   │   ├── traffic/
│   │   │   ├── trafficSimulator.ts # Live Traffic Jam: click-to-spawn self-driving cars
│   │   │   ├── trafficPanel.ts     # Custom element <traffic-panel>: per-car stats list
│   │   │   └── templates/          # HTML template strings for the traffic panel
│   │   ├── panels/
│   │   │   ├── layoutToolbar.ts    # Custom element <layout-toolbar>: layout & visibility toggles
│   │   │   ├── animationLoopToolbar.ts # Custom element <animation-loop-toolbar>: play/pause + render interval
│   │   │   └── templates/          # HTML template strings for the panels
│   │   ├── rendering/
│   │   │   └── layoutManager.ts   # Canvas resize/layout logic
│   │   ├── training/
│   │   │   ├── trainingSimulator.ts # Unified training environment (world + simple modes)
│   │   │   ├── trainingPanel.ts     # Custom element <training-panel>: training UI + genetic algorithm
│   │   │   ├── trainingInitModal.ts # Custom element <training-init-modal>: brain-source picker
│   │   │   ├── genetics/
│   │   │   │   ├── poolManager.ts   # Car creation & pool/brain application
│   │   │   │   └── storageManager.ts # localStorage persistence & .car file download
│   │   │   ├── modes/
│   │   │   │   ├── simpleModeBehavior.ts # Simple-mode traffic & car update loops
│   │   │   │   ├── worldModeBehavior.ts  # World-mode car update loop
│   │   │   │   ├── borderCollision.ts    # Collision correction with road borders
│   │   │   │   └── trafficFactory.ts     # Dynamic traffic generation for simple mode
│   │   │   ├── rendering/
│   │   │   │   └── carRenderer.ts   # Car drawing utilities (pool highlighting)
│   │   │   └── templates/          # HTML template strings for the training panel + init modal
│   │   ├── racing/
│   │   │   ├── raceSimulator.ts # Racing mode with countdown, progress, AI opponents
│   │   │   └── racePanel.ts     # Custom element <race-panel>: race HUD
│   │   └── views/
│   │       └── simulatorPageHost.ts # Shared page host wiring (entry → simulator)
│   │
│   ├── store/                  # Bundled store assets (worlds + cars)
│   │   ├── entry.ts            # Store page entry point
│   │   ├── storeManager.ts     # Singleton: fetches manifest + assets, active selection
│   │   ├── storePanel.ts       # Custom element <store-panel>: landing-page browser
│   │   ├── types.ts            # Store type definitions
│   │   └── templates/          # HTML template for the store panel
│   │
│   ├── panels/                 # Shared floating UI toolbars (custom elements)
│   │   ├── worldToolbar.ts     # Custom element <world-toolbar>: border/tracking mode, file loading, camera debug
│   │   ├── shortcutsToolbar.ts # Custom element <shortcuts-toolbar>: keyboard-shortcut indicators
│   │   ├── worldLayersToolbar.ts # Custom element <world-layers-toolbar>: editor layer visibility + regenerate items + 🌡️ heatmap overlay toggle
│   │   ├── assetSelectors.ts   # File-input trigger helpers for worlds & cars
│   │   ├── modeControls.ts     # Layout & visibility controls shared across simulators
│   │   └── templates/          # HTML template strings for the toolbars
│   │
│   ├── race/
│   │   └── entry.ts            # Racing page entry point
│   │
│   ├── viewport/
│   │   ├── viewport.ts         # Pan/zoom transformation system
│   │   └── scaleIndicator.ts   # Distance-scale HUD overlay (meters)
│   │
│   ├── mini-map/
│   │   └── miniMap.ts          # Scaled world overview
│   │
│   ├── camera/
│   │   ├── types.ts            # Camera interfaces
│   │   ├── extrusion.ts        # 3D extrusion helpers (buildings, cars, trees)
│   │   └── camera.ts           # 3D perspective camera with frustum culling
│   │
│   ├── audio/
│   │   └── sound.ts            # Audio effects (engine, beep, explosion)
│   └── utils.ts                # Collision helpers, color utilities
│
├── js/                         # COMPILED OUTPUT (generated by tsc)
│   └── (mirrors ts/ structure)
│
├── html/                       # HTML entry points for each mode
│   ├── simulator.html          # Both world mode and ?mode=simple
│   ├── traffic.html            # Live Traffic Jam (click-to-spawn cars)
│   ├── race.html               # All race modes via ?mode=camera|phone
│   └── world.html              # Map creation
│
├── styles/
│   ├── style.css               # Main page styles
│   └── world/styles.css        # World editor styles
│
├── assets/
│   ├── favicon.svg             # Browser tab icon
│   ├── logo.svg                # Project logo
│   ├── car.png                 # Car sprite (store/landing page)
│   ├── car_old.png             # Legacy car sprite
│   └── world/                  # World textures and sprites
│
├── store/                      # Bundled asset packages
│   ├── manifest.json           # Asset manifest (id → name/description)
│   ├── world/                  # Pre-built world files (*.world)
│   └── car/                    # Pre-trained car brains (*.car)
│
├── saves/                      # Exported brains and OSM data
│   ├── bestBrain*.txt          # Exported neural networks
│   └── *-osm-data.json        # OpenStreetMap import data
│
└── docs/                       # Technical documentation
    ├── ProjectGoal.md          # Vision, city-scale traffic simulation goals
    ├── Architecture.md         # System overview & module graph
    ├── Math.md                 # Geometric primitives & algorithms
    ├── Physics.md              # Car dynamics & sensor system
    ├── Units.md                # Unified unit system, conversions & formulas
    ├── NeuralNetwork.md        # AI brain & genetic evolution
    ├── WorldEditor.md          # World generation & editing
    ├── Simulators.md           # Training environments & UI
    ├── Camera.md               # 3D perspective rendering
    ├── Controls.md             # Input systems (keyboard/phone/camera)
    ├── Race.md                 # Racing mode & scoring
    ├── Viewport.md             # Pan/zoom & mini-map
    ├── SaveLoad.md             # Persistence & file formats
    ├── Store.md                # Bundled store assets & active selection
    └── Sound.md                # Audio synthesis
```

---

## Build System

This project intentionally uses **no bundler** (no Webpack, Vite, Rollup, etc.).

- **TypeScript Compiler** (`tsc`) transpiles `.ts` files to `.js` files maintaining the same directory structure
- **Native ES modules** — each HTML page loads a single `<script type="module">` entry point; the browser resolves the import graph at runtime
- **Static file server** (`serve`) hosts the project as-is
- Import paths use `.js` extension in source TypeScript (convention for `module: "nodenext"`)

This keeps the development loop instant: save a `.ts` file → `tsc` compiles → browser refresh picks up changes.

---

## Save/Load Formats

### World Files (`.world`)

JavaScript files containing a world definition object with graph, road parameters, buildings, trees, markings, and viewport state. Format: pure JSON object.

### Car Files (`.car`)

JSON files containing a car configuration with neural network brain, physics parameters, and sensor settings. See [Save & Load](docs/SaveLoad.md) for full format details.

### LocalStorage

| Key                  | Contents                                                              |
| -------------------- | --------------------------------------------------------------------- |
| `bestPool`           | JSON array of top-K car configs with brains (unified format)          |
| `raceCars`           | JSON array of car configs loaded via race mode's "Load car(s)" button |
| `editorWorld`        | World saved by the world editor (legacy `world` key migrated on init) |
| `loadedWorlds`       | User-loaded `.world` files (in-memory after refresh)                  |
| `loadedCars`         | User-loaded `.car` files (in-memory after refresh)                    |
| `store:activeWorld`  | Id of the active store world (`store:`/`loaded:`/`editor`)            |
| `store:activeCar`    | JSON array of active store car ids (multi-select)                     |
| `sim:worldLayers`    | Simulator world-layer visibility toggles                              |
| `editor:worldLayers` | Editor world-layer visibility toggles                                 |
| `markerThreshold`    | Webcam marker detection threshold (camera controls)                   |

> See [Save & Load](docs/SaveLoad.md) for the full persistence schema, legacy migration, and file formats.

---

## Documentation

Detailed technical documentation is maintained in the `docs/` directory:

| Document                                | Description                                                |
| --------------------------------------- | ---------------------------------------------------------- |
| [Project Goal](docs/ProjectGoal.md)     | Vision, city-scale traffic simulation goals, performance   |
| [Architecture](docs/Architecture.md)    | System overview, module graph, data flow, design patterns  |
| [Math](docs/Math.md)                    | Geometric primitives, polygon union, graph, OSM import     |
| [Physics](docs/Physics.md)              | Car dynamics, sensors, collision detection & response      |
| [Units](docs/Units.md)                  | Unified unit system, conversions, formulas, and examples   |
| [Neural Network](docs/NeuralNetwork.md) | Network structure, feedforward, mutation, crossover, pool  |
| [World Editor](docs/WorldEditor.md)     | World generation pipeline, editors, markings, traffic      |
| [Simulators](docs/Simulators.md)        | Training environments, genetic algorithm, panel UI         |
| [Camera](docs/Camera.md)                | 3D perspective projection, frustum culling, extrusion      |
| [Controls](docs/Controls.md)            | Keyboard, phone tilt, webcam markers, AI control modes     |
| [Race](docs/Race.md)                    | Racing mode, corridor progress, countdown, AI opponents    |
| [Viewport](docs/Viewport.md)            | Pan/zoom system, coordinate transforms, mini-map           |
| [Save & Load](docs/SaveLoad.md)         | File formats, localStorage, legacy migration, loaders      |
| [Store](docs/Store.md)                  | Bundled store assets, active selection, landing-page panel |
| [Sound](docs/Sound.md)                  | Web Audio API synthesis, beep, explosion, victory fanfare  |

---

## Key Design Decisions

- **No bundler** — Native ES modules via `<script type="module">` keep the project simple and debuggable
- **No runtime dependencies** — Everything is implemented from scratch (neural network, physics, geometry, rendering)
- **ES modules** — All files use proper `import`/`export` with `module: "nodenext"`
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
