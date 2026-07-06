# ES Modules Refactoring — `module: "none"` → `module: "nodenext"`

Eliminate the global-scope pattern. Every `.ts` file gets proper `import`/`export` statements; HTML pages drop all `<script src>` tags in favor of a single `<script type="module">` entry.

**Why:** LSP/IDE support breaks under `module: "none"` + global scope. The project outgrew the simple pattern. Native ES modules give us proper dependency graphs, tree-shaking, dynamic `import()`, and full tooling support — with no bundler and no runtime deps.

**Scope:** ~99 TS files, 5 HTML files, ESLint config, tsconfig, docs.

---

## Phase 1 — Configuration changes

### 1.1 tsconfig.json

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext"
    // remove "module": "none"
    // keep everything else: target ES2022, outDir ./js, rootDir ./ts, strict
  }
}
```

Verify with `npx tsc --noEmit` — expect errors because files still have no imports yet.

### 1.2 ESLint config — strip globals

1. Delete the entire `allowedUnusedVars` array — it exists only for the global-scope pattern.
2. Delete or gut the `myGlobals` object. With `import`/`export`, unused-vars reporting works normally.
3. Update the three file matchers (`scripts/**`, non-script JS files, `**/*.ts`) — the JS and TS sections should no longer need `myGlobals`. Keep only `globals.browser` for the DOM types.

### 1.3 serve.json — MIME / CORS

ES modules must be served with `Content-Type: application/javascript`. The `serve` package already does this. Verify:

```bash
curl -sI http://localhost:9090/js/math/primitives/point.js | grep content-type
# → content-type: application/javascript; charset=utf-8
```

No changes needed unless testing reveals an issue.

---

## Phase 2 — Add `import` / `export` to every `.ts` file

This is the bulk of the work (99 files). Strategy:

### 2.1 Map all cross-file references

Each file references globals defined elsewhere. These become `import` statements. The dependency graph is largely known (see `docs/Architecture.md` load-order layers). Key mapping:

| Declares →                                                              | Consumed by                                                |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ts/math/primitives/point.ts`: `class Point`                            | ~All files                                                 |
| `ts/math/primitives/segment.ts`: `class Segment`                        | polygon, envelope, graph, world/\*                         |
| `ts/math/primitives/polygon.ts`: `class Polygon`                        | envelope, corridor, markings                               |
| `ts/math/primitives/envelope.ts`: `class Envelope`                      | world, corridor, markings                                  |
| `ts/math/utils.ts`: `lerp`, `distance`, `add`, `angle`, etc.            | segment, polygon, envelope, geometry, world, car           |
| `ts/math/graph/graph.ts`: `class Graph`                                 | world, miniMap, editors, simulators                        |
| `ts/math/spatialGrid.ts`: `class SpatialHashGrid`                       | simulators (racing, traffic, worldMode)                    |
| `ts/car/car.ts`: `class Car`, `type CarInfo`                            | poolManager, trainingPanel, race, traffic                  |
| `ts/neural-network/network.ts`: `class NeuralNetwork`, `class Level`    | car, brainAdapter, poolManager, storageManager, visualizer |
| `ts/world/world.ts`: `class World`                                      | all simulators, editor                                     |
| `ts/simulator/core/simulatorShell.ts`: `class SimulatorShell`           | trainingSimulator, trafficSimulator, raceSimulator         |
| `ts/store/storeManager.ts`: `class StoreManager` (with `static init()`) | All entry pages                                            |
| rendering functions (`drawPoint`, `drawPolygon`, etc.)                  | World, editors, car renderers                              |

### 2.2 Rule for import paths

All import paths use `.js` extensions (TypeScript convention for `nodenext`):

```typescript
import { Point } from './point.js';
import { Segment } from '../primitives/segment.js';
import { lerp, distance } from '../../math/utils.js';
```

### 2.3 Pattern per file

**Files that declare types/classes** — add `export`:

```typescript
export class Point { … }
export function lerp(a: number, b: number, t: number): number { … }
export interface CarInfo { … }
```

**Files that consume** — add `import` at top:

```typescript
import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';
```

### 2.4 Circular dependency check

The dependency graph is a DAG as designed (math → world → car → NN → simulator). Verify no cycles after adding imports. Expected natural order:

```
math/primitives
  → math/utils
  → math/graph
  → rendering (draw functions)
  → world (items, markings, editors, corridor, trafficManager, world)
  → viewport, camera, mini-map
  → audio, utils
  → car (config, sensors, physics, controls, brain, car)
  → neural-network
  → store
  → panels (templates + custom elements)
  → simulator (spatialGridUtils, training modes, genetics)
  → simulator/core, simulator/traffic, simulator/racing
  → entry points
```

If a cycle appears, extract the shared type into a new file or use a forward-reference pattern.

### 2.5 Generate config checklists

For each HTML page, identify which modules it actually needs (currently visible from its `<script>` tags). Create entry files that import exactly that set.

---

## Phase 3 — Create entry-point files

Create one entry module per HTML page. These import everything needed and bootstrap the app.

### Entry: `ts/simulator/entry.ts`

Imports everything needed by `html/simulator.html`:

- All math, world, rendering, car, NN, store, panels, simulator modules
- Bootstrap: `StoreManager.init()` → `new TrainingSimulator(...)`

### Entry: `ts/traffic/entry.ts`

Same foundation minus training-specific modules; adds traffic panel + `TrafficSimulator`.

### Entry: `ts/race/entry.ts`

Same foundation minus training/traffic; adds `RaceSimulator` + `CameraControls`/`PhoneControls` + race-specific inline logic.

### Entry: `ts/world/entry.ts`

Same foundation minus car/NN/audio; adds all editors + OSM + `WorldEditor`.

### Entry: `ts/store/entry.ts` (for `index.html`)

Imports only: utils, carLoader, worldLoader, store types, storeManager, storePanel.

---

## Phase 4 — Update HTML files

Each HTML page replaces its ~50-140 `<script src="...">` tags with a single module script:

```html
<!-- Before: 130 script tags -->
<script src="/js/math/primitives/point.js"></script>
<script src="/js/math/primitives/segment.js"></script>
...

<!-- After: 1 module script -->
<script type="module" src="/js/simulator/entry.js"></script>
```

**Key differences with type="module":**

1. Scripts are **deferred by default** — no need to place at bottom of `<body>`.
2. ES modules are **strict** by default — `"use strict"` implicit.
3. Top-level declarations are **scoped to the module** — no global leak without explicit `window.X = X`.
4. Async `import()` available for lazy panel loading.

For `index.html`, switch to `<script type="module" src="/js/store/entry.js">`.

For `race.html`, move the inline initialization logic (mode detection, controls setup) into `ts/race/entry.ts`.

---

## Phase 5 — Update ESLint config

1. Delete `allowedUnusedVars` (250+ entries).
2. Delete or gut the `myGlobals` globals map.
3. Remove the three-section `defineConfig` — simplify to a flat config.
4. Keep `eslint-plugin-prettier` integration.
5. Add `sourceType: "module"` for TS files.

---

## Phase 6 — Update documentation

- **`AGENTS.md`**: Replace "Global scope only" rule with "ES modules — import/export". Remove script-load-order gotcha. Update key commands.
- **`GEMINI.md`**: Rewrite the Architecture Rules section (#3-4). Remove the script-load-order sections. Update the "Adding New Features" guide.
- **`README.md`**: Rewrite Build System section. Update Project Structure description. Remove the script-load-order gotchas from Contributing.
- **`docs/Architecture.md`**: Rewrite the "Build Pipeline" and "Script Load Order" sections. Update the "Module Dependency Graph" to reference actual import statements rather than script-tag ordering. Update all sections that reference global scope.
- **`docs/Simulators.md`**, **`docs/WorldEditor.md`**, **`docs/SaveLoad.md`**: Audit for references to global scope / script ordering — update where found.

---

## Phase 7 — Test

1. Run `npx tsc --noEmit` — zero type errors.
2. Run `npm run lint` — zero lint errors.
3. Open each HTML page and verify the app loads:
   - `index.html` — landing page with store panel
   - `html/simulator.html` — training (both `?mode=simple` and default)
   - `html/simulator?mode=simple` — simple road training
   - `html/traffic.html` — live traffic jam
   - `html/race.html` — racing (default, `?mode=camera`, `?mode=phone`)
   - `html/world.html` — world editor
4. Verify:
   - Cars render and drive
   - Training loop runs (next gen, new train)
   - Save/load brains and worlds
   - Race mode countdown + controls
   - Traffic jam click-to-spawn
   - World editor editing + saving
   - OSM import
5. Run `npm run fix:all` to confirm clean format + lint.

---

## Migration order (recommended sequence)

1. `tsconfig.json` + `eslint.config.mjs` + `serve.json` (Phase 1)
2. Math primitives — `Point`, `Segment`, `Polygon`, `Envelope` (no deps on other ts/ files)
3. `math/utils.ts`, `math/graph/graph.ts`, `math/spatialGrid.ts`, `math/osm-importer/osm.ts`
4. Rendering — `ts/rendering/*.ts`
5. World core — `world/types.ts`, `world/corridor.ts`, world items, world markings, world editors, `world/trafficManager.ts`, `world/world.ts`, `world/simple/simpleWorld.ts`, `world/loader/worldLoader.ts`
6. Camera, Viewport, Mini-map
7. Audio
8. Core utils (`ts/utils.ts`)
9. Car system — config, sensorRaycaster, sensors, controls, physics, brain, car, carLoader
10. Neural network
11. Store
12. Panel templates + custom elements
13. Simulator modules — spatialGridUtils, training modes, genetics, panels, core, traffic, racing
14. Entry-point files
15. HTML files — swap script tags for module scripts
16. Documentation updates
17. ESLint config cleanup
18. `npm run fix:all` + visual testing

---

## Rollback plan

Keep the current commit as a safety branch (`git tag pre-esm`). Each phase produces a working commit:

- After Phase 1: site still works (no behavioral change, TS may complain about missing imports but JS output is unchanged)
- After each file batch in Phase 2: verify `npx tsc --noEmit` on that batch
- After Phase 4: verify all HTML pages load and work
