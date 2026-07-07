# AI Agent Instructions — Self-Driving Car Simulator

This document provides context for AI coding agents working on this project.

---

## Project Identity

- **Name**: Self-Driving Car Simulator
- **Language**: TypeScript (source in `ts/`, compiled output in `js/`)
- **Runtime**: Browser (Canvas 2D API, no Node.js runtime)
- **Dependencies**: Zero runtime dependencies. Dev-only: TypeScript, ESLint, Prettier, serve, concurrently, onchange
- **Bundler**: None. Uses `tsc` to compile TS → JS. Each HTML page loads a single `<script type="module">` entry point.

---

## Architecture Rules

1. **No bundlers** — Do not add Webpack, Vite, Rollup, esbuild, or similar. The project uses native ES modules via `<script type="module">`.
2. **No runtime dependencies** — Everything is implemented from scratch. Do not add npm packages for geometry, neural networks, physics, etc.
3. **ES modules** — All files use `import`/`export` with `module: "nodenext"`. Import paths use `.js` extension (even for `.ts` source).
4. **Single entry point per page** — Each HTML page loads one `<script type="module">`; the browser resolves dependencies via import graph.
5. **Canvas 2D only** — No WebGL, no Three.js. Rendering uses the standard Canvas 2D API.
6. **Composition over inheritance** — Cars contain sensors, controls, and networks as separate objects. Markings use subclass hierarchy but most systems prefer composition.
7. **Traffic-light perception** — `TrafficControlGrid` (`ts/math/trafficControlGrid.ts`) indexes `Light` polygons in 150px cells (mirrors `SpatialHashGrid`); rebuilt only on world-markings change, light state read live at query time via a `getState` closure. `ts/simulator/trafficControlUtils.ts` exposes `buildTrafficControls(world)` + `queryTrafficControlsNearCar(grid, car)`. `Sensor.update()` / `Car.update()` take an optional `trafficControls` param consumed only when `sensor.trafficAwareness === true`. Traffic-state encoding: green=1, yellow=0.5, red/off/absent=0. The flag is serialized on `CarInfo.sensor` (defaults `false` → old `.car` files keep the legacy `rayCount + 1` input layer and drive unchanged) and is settable from the training UI via the "Traffic Lights" checkbox in the init modal (`#tiCarTrafficAwareness`) and the live training panel (`#carTrafficAwareness`); both default to off. `CarBrainAdapter.inputLayerSize(rayCount, trafficAwareness)` returns `rayCount*2 + 1` when traffic-aware, else `rayCount + 1`; `brainsCompatible()` rejects cross-awareness brain swaps automatically.

---

## Build & Dev Workflow

```bash
npm install          # Install dev dependencies
npm start            # Runs: tsc --watch + serve -p 9090 + auto-format/lint
```

- TypeScript compiler watches `ts/**/*.ts` → outputs to `js/**/*.js`
- Static server at http://localhost:9090
- ESLint + Prettier auto-fix on file changes

### Key Commands

| Command             | Purpose               |
| ------------------- | --------------------- |
| `npm start`         | Full dev environment  |
| `npm run tsc:watch` | TypeScript watch only |
| `npm run serve`     | Static server only    |
| `npm run format`    | Prettier format all   |
| `npm run lint`      | ESLint fix all        |

---

## Code Conventions

- **Formatting**: Prettier with `singleQuote: true`
- **Naming**: PascalCase for classes, camelCase for functions/variables
- **Private members**: Use `#` prefix (ES2022 private fields)
- **Type declarations**: Global types in `ts/types.ts`, world/editor types in `ts/world/types.ts`
- **Static methods**: Prefer static factory methods (`World.load()`, `Graph.load()`, `Marking.load()`)
- **Drawing**: Classes own their `draw(ctx, ...options)` method
- **Serialization**: Objects know how to serialize/deserialize themselves via `static load(info)`

---

## Project Structure

```
ts/                         # TypeScript source (THE source of truth)
├── math/                   # Geometric primitives, graph, OSM import
│   ├── primitives/         # Point, Segment, Polygon, Envelope
│   ├── graph/              # Graph with Dijkstra pathfinding
│   ├── osm-importer/       # OpenStreetMap data parser
│   ├── trafficControlGrid.ts # Spatial hash grid indexing Light polygons for AI perception
│   └── utils.ts            # Vector math, lerp, intersections
├── car/                    # Vehicle system
│   ├── car.ts              # Physics, collision, AI integration
│   ├── sensors/            # Ray-casting perception
│   ├── controls/           # Input: keyboard, phone, camera, AI
│   └── loader/             # .car/.json file-input loader
├── neural-network/         # Feedforward network + visualizer
├── world/                  # World generation + editing tools
│   ├── world.ts            # Procedural generation
│   ├── trafficManager.ts   # Traffic light cycling
│   ├── editors/            # Interactive editors (graph, markings)
│   ├── items/              # Building, Tree (3D rendering)
│   ├── markings/           # Start, Stop, Light, Crossing, etc.
│   ├── simple/             # Lightweight IWorld for simple road training
│   └── loader/             # .world file-input loader
├── simulator/              # Simulator domain
│   ├── core/               # SimulatorShell: shared canvas/RAF scaffolding
│   ├── traffic/            # Live Traffic Jam + <traffic-panel>
│   ├── trafficControlUtils.ts # Traffic-light grid build/query helpers for AI perception
│   ├── panels/             # <world-toolbar>, <layout-toolbar>, <animation-loop-toolbar>
│   └── training/           # Training sim + <training-panel>
│       ├── genetics/       # Pool + storage managers
│       ├── modes/          # Simple/world update loops, traffic, collision
│       └── rendering/      # Car renderer + layout manager
├── store/                  # Bundled store assets + <store-panel>
├── games/                  # Racing mode
├── viewport/               # Pan/zoom transformation
├── mini-map/               # Scaled world overview
├── camera/                 # 3D perspective projection
├── audio/                  # Audio synthesis (sound.ts)
├── utils.ts                # Collision helpers
└── types.ts                # Global type declarations

js/                         # Compiled output (DO NOT EDIT DIRECTLY)
html/                       # HTML entry points (load scripts in order)
styles/                     # CSS stylesheets
assets/                     # Images and sprites
saves/                      # World maps, trained brains, OSM data
docs/                       # Technical documentation
```

---

## Adding New Features

### Adding a new TypeScript module:

1. Create the `.ts` file in the appropriate `ts/` subdirectory
2. `export` the class/function/type from the file
3. Add `import` in the files that need it, using `.js` extension
4. If the entry point needs it, trace the import chain — the entry module will pull it automatically
5. Run `npm start` — tsc will compile it automatically

### Adding a new marking type:

1. Create `ts/world/markings/newMarking.ts` extending `Marking`
2. Create `ts/world/editors/newMarkingEditor.ts` extending `MarkingEditor`
3. Add to `Marking.load()` switch statement for deserialization
4. Add editor activation in `worldEditor.ts`

### Adding a new simulation mode:

1. Create a new `IWorld` implementation in `ts/` (e.g., `ts/world/simple/simpleWorld.ts`)
2. Add mode detection to `TrainingSimulator` constructor via URL parameter (e.g., `?mode=mymode`)
3. Add `#initMyMode()` and `#drawMyMode()` methods to `TrainingSimulator`
4. Add link to `index.html` landing page (use clean URL: `html/simulator?mode=mymode`)

---

## Key Design Decisions to Preserve

- **Binary step activation** in neural network (not sigmoid/ReLU) — produces crisp decisions
- **Genetic algorithm only** (no backpropagation) — simpler, produces emergent behaviors
- **Polygon.union()** for road generation — critical algorithm, handle with care
- **Painter's algorithm** for 3D rendering — no depth buffer, sort by distance
- **Keys tracking drives rendering** — when the toolbar tracking mode is `keys`, world/simple mode draws the KEYS car with `showSensor: true` (sensor rays visible) and the network visualizer shows the KEYS car's brain instead of the best AI car's
- **Native ES modules** — single `<script type="module">` per page, imports handle ordering
- **localStorage for brain persistence** — simple, no server needed

---

## Testing

- No automated test suite — validation is visual
- Test by running the relevant simulator HTML page
- For simple road training: test at `simulator.html?mode=simple`
- For world changes: test in `world.html` editor
- For rendering: test in `simulator.html`
- For AI training: verify in `simulator.html` that cars still learn

---

## Documentation

Update `docs/*.md` when making significant changes:

- `Architecture.md` — System overview and module relationships
- `Math.md` — Geometric primitives and algorithms
- `Physics.md` — Car dynamics and collision
- `NeuralNetwork.md` — Brain architecture and evolution
- `WorldEditor.md` — World generation and editing
- `Simulators.md` — Training environments
- `Camera.md` — 3D projection system
- `Controls.md` — Input systems

---

## Common Gotchas

1. **Import paths use `.js`** — Write `import { X } from './x.js'` even though the source is `x.ts`
2. **tsc output** — Never edit `js/` files directly; always edit `ts/` source
3. **Polygon.union()** — Complex algorithm, mutations can break road rendering
4. **Import graph** — Circular imports will fail; keep the dependency graph a DAG (math → world → car → NN → simulator)
5. **Canvas coordinate system** — Y-axis is inverted (positive = down)
6. **Car angle convention** — 0 = facing up, positive = clockwise
7. **Sensor offset inversion** — Readings are `1 - offset` before feeding to network
8. **World files** — Use JS variable assignment syntax, not pure JSON
9. **Traffic-aware sensors** — Lights update via `TrafficManager` inside `World.draw()`, so AI perception reads the previous frame's state (one-frame lag, acceptable).
