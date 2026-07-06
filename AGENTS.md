# AGENTS.md — Self-Driving Car Simulator

## Build & dev

- **No bundler** — `tsc` compiles `ts/` → `js/` (mirrored structure). Each HTML page loads a single `<script type="module">` entry point.
- **`npm start`** runs three concurrent watchers: `tsc --watch`, `serve -p 9090`, and `watch:fix` (formats+lints on file change).
- **Never edit `js/` directly.** Source of truth is `ts/`.
- **Always run `npm run fix:all` (format + lint) before committing.**

## Architecture rules

- **No runtime dependencies.** Everything (NN, physics, geometry, rendering) is hand-rolled. Don't add npm packages.
- **ES modules with `module: "nodenext"`.** All files use proper `import`/`export`. Import paths use `.js` extensions (TypeScript convention for `nodenext`).
- **Canvas 2D API only** — no WebGL or Three.js.
- **Private members use `#` prefix** (ES2022 private fields).
- **Serialization pattern:** `static load(info)` factory + instance method.
- **Layer isolation:** Car must never import NeuralNetwork, audio, or explode. Bridge through `CarBrainAdapter` and `CarCallbacks`.
- **Sensor decoupled:** Sensor holds no Car reference — receives `(x, y, angle, polygons)` via `update()`.
- **Physics stateless:** `CarPhysics.update(carState, controlsState)` mutates state but knows nothing of Car or control subtypes.
- **Audio via callbacks:** RaceSimulator injects `SoundEngine`/`explode` through `car.setCallbacks({onDamaged, onEngineUpdate})` instead of Car owning a sound engine.
- **`Brain = unknown` opaque type:** Car stores brain as opaque type. Consumers cast `as NeuralNetwork` when they need network API.

## Key gotchas

- **Import paths use `.js` extension** — even though source is `.ts`, write `import { X } from './file.js'`.
- **Car angle:** 0 = facing up, positive = clockwise. **Sensor readings** are `1 - offset` before feeding to network.
- **`Polygon.union()`** is complex — mutations can break road rendering.
- **3D uses Painter's algorithm** (sort by distance, draw back-to-front).
- **Neural network uses binary step activation** (not sigmoid/ReLU).
- **`utils.ts` split** — functions moved to `math/collision.ts` (`polysIntersect`), `math/color.ts` (`getRGBA`, `getRandomColor`), `store/serialization.ts` (`safeJsonParse`, `stripFileExtension`). Old file kept as re-export barrel.

## Key commands

| Command                | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm start`            | Full dev: tsc watch + server + lint/format    |
| `npm run tsc:watch`    | Compile TS on save only                       |
| `npm run serve`        | Static server on :9090                        |
| `npm run lint`         | ESLint auto-fix                               |
| `npm run format`       | Prettier (singleQuote: true)                  |
| `npm run fix:all`      | format + lint                                 |
| `npm run publish:site` | Deploy via here.now (scripts/publish-site.sh) |

## Entry points

- `html/simulator.html` — Training (world mode by default, `?mode=simple` for simple road)
- `html/traffic.html` — Live Traffic Jam
- `html/race.html` — Racing (`?mode=camera` or `?mode=phone`)
- `html/world.html` — World editor

## Testing

- No automated tests — validation is visual. Open the relevant HTML page in a browser.
- World files in `saves/` use v2 schema (`version: 2`, `decoration` instead of baked tree/building arrays).

## Persistence

| localStorage key                        | Content                            |
| --------------------------------------- | ---------------------------------- |
| `bestPool`                              | Top-K car configs with brains      |
| `raceCars`                              | Cars loaded via race "Load car(s)" |
| `editorWorld`                           | World saved by editor              |
| `store:activeWorld` / `store:activeCar` | Active store selection             |
