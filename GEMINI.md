# AI Agent Instructions — Self-Driving Car Simulator

This document provides context for AI coding agents working on this project.

---

## Project Identity

- **Name**: Self-Driving Car Simulator
- **Language**: TypeScript (source in `ts/`, compiled output in `js/`)
- **Runtime**: Browser (Canvas 2D API, no Node.js runtime)
- **Dependencies**: Zero runtime dependencies. Dev-only: TypeScript, ESLint, Prettier, serve, concurrently, onchange
- **Bundler**: None. Uses `tsc` to compile TS → JS. HTML files load scripts via `<script>` tags in dependency order.

---

## Architecture Rules

1. **No bundlers** — Do not add Webpack, Vite, Rollup, esbuild, or similar. The project intentionally uses direct script loading.
2. **No runtime dependencies** — Everything is implemented from scratch. Do not add npm packages for geometry, neural networks, physics, etc.
3. **Global scope** — All classes are globals. No ES module `import`/`export` at runtime. TypeScript files compile to plain JS that attaches to `window`.
4. **HTML controls load order** — When adding new modules, you must add `<script>` tags in the correct dependency order to relevant HTML files.
5. **Canvas 2D only** — No WebGL, no Three.js. Rendering uses the standard Canvas 2D API.
6. **Composition over inheritance** — Cars contain sensors, controls, and networks as separate objects. Markings use subclass hierarchy but most systems prefer composition.

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
2. The class/function will be a global (no exports needed)
3. Add `<script src="/js/path/to/file.js">` to all HTML files that need it
4. Ensure the script tag comes AFTER its dependencies
5. Add the class name to `eslint.config.mjs` globals if needed (to suppress lint warnings)
6. Run `npm start` — tsc will compile it automatically

### Adding a new marking type:

1. Create `ts/world/markings/newMarking.ts` extending `Marking`
2. Create `ts/world/editors/newMarkingEditor.ts` extending `MarkingEditor`
3. Add to `Marking.load()` switch statement for deserialization
4. Add editor activation in `worldEditor.ts`
5. Add script tags to `html/world.html` and simulator HTML files

### Adding a new simulation mode:

1. Create a new `IWorld` implementation in `ts/` (e.g., `ts/world/simple/simpleWorld.ts`)
2. Add mode detection to `TrainingSimulator` constructor via URL parameter (e.g., `?mode=mymode`)
3. Add `#initMyMode()` and `#drawMyMode()` methods to `TrainingSimulator`
4. Add script tag to `html/simulator.html` in correct dependency order
5. Add link to `index.html` landing page (use clean URL: `html/simulator?mode=mymode`)
6. Register new globals in `eslint.config.mjs`

---

## Key Design Decisions to Preserve

- **Binary step activation** in neural network (not sigmoid/ReLU) — produces crisp decisions
- **Genetic algorithm only** (no backpropagation) — simpler, produces emergent behaviors
- **Polygon.union()** for road generation — critical algorithm, handle with care
- **Painter's algorithm** for 3D rendering — no depth buffer, sort by distance
- **No module system at runtime** — all globals, HTML controls initialization order
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

1. **Script order matters** — If you get "X is not defined", the script tag is in wrong order
2. **tsc output** — Never edit `js/` files directly; always edit `ts/` source
3. **Polygon.union()** — Complex algorithm, mutations can break road rendering
4. **Global namespace** — Class names must be unique across all files
5. **Canvas coordinate system** — Y-axis is inverted (positive = down)
6. **Car angle convention** — 0 = facing up, positive = clockwise
7. **Sensor offset inversion** — Readings are `1 - offset` before feeding to network
8. **World files** — Use JS variable assignment syntax, not pure JSON
