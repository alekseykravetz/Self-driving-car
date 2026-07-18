# Add Test Infrastructure & First Test Suite

**Date:** 2026-07-18
**Slug:** add-test-infrastructure
**Entry points affected:** none — only `tests/` and `package.json` changed
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Establish a testing foundation for the project and write the first high-value test suites. The project currently has zero automated tests and relies entirely on visual validation via HTML pages. The goal is to:

1. Install vitest (zero-config, ESM-native test runner)
2. Create the `tests/` directory structure
3. Write unit tests for the pure-math layer (`ts/math/`) — the highest-ROI target
4. Write unit tests for the neural network (`ts/neural-network/network.ts`)
5. Write unit tests for car physics + brain adapter
6. Write unit tests for pool manager / genetics
7. Add npm scripts for running tests
8. Update AGENTS.md with testing conventions

This plan covers **Tiers 1–3** from the analysis (pure math, neural network, physics + genetics). Visual/Playwright tests (Tier 4+) are deferred to a follow-up plan.

## Context (read first)

- `AGENTS.md` — project conventions, architecture rules, entry points.
- `docs/Architecture.md` — module dependency graph, layer isolation rules.
- `ts/math/utils.ts` — vector math, intersection, lerp, seeded PRNG.
- `ts/math/collision.ts` — `polysIntersect`, `nearestEdgeOffset`.
- `ts/math/primitives/polygon.ts` — `Polygon` class with `containsPoint`, `union`, `multiBreak`.
- `ts/math/primitives/segment.ts` — `Segment` class.
- `ts/math/primitives/point.ts` — `Point` class (likely simple data class).
- `ts/math/primitives/envelope.ts` — `Envelope` class.
- `ts/math/graph/graph.ts` — `Graph` with Dijkstra shortest path.
- `ts/math/spatialGrid.ts` — `SpatialHashGrid` for fast range queries.
- `ts/math/heatmapGrid.ts` — `HeatmapGrid` congestion counter.
- `ts/math/trafficControlGrid.ts` — traffic-light spatial grid.
- `ts/math/worldUnits.ts` — unit conversion functions.
- `ts/math/color.ts` — `getRGBA`, `getRandomColor`.
- `ts/neural-network/network.ts` — `NeuralNetwork` + `Level` with feedforward, mutate, crossover, trainStep.
- `ts/car/carState.ts` — `CarState`, `ControlsState` interfaces.
- `ts/car/physics/carPhysics.ts` — `CarPhysics` class (pure physics, no DOM).
- `ts/car/brain/carBrainAdapter.ts` — `CarBrainAdapter` (sole bridge to NN).
- `ts/car/config.ts` — config constants.
- `ts/simulator/training/genetics/poolManager.ts` — pure functions for pool management.
- `ts/simulator/training/genetics/storageManager.ts` — localStorage persistence.
- `ts/store/serialization.ts` — `safeJsonParse`, `stripFileExtension`.

## Architecture rules for tests

All existing architecture rules still apply. Tests are **readers** of the codebase — they import production code but must not modify it. Specific rules:

1. **Tests import from `ts/`** — vitest's `esbuild` transform handles TypeScript directly. Import paths use `.js` extension conventions (consistent with the rest of the project: `import { distance } from '../../math/utils.js'`). Vitest resolves `.ts` files transparently when you use the `.js` extension in imports — this matches how the `module: "nodenext"` compilation works.

2. **No new runtime dependencies** — vitest is a devDependency; test code is never shipped.

3. **No canvas/DOM in unit tests** — math, neural-network, car-physics, and pool-manager tests must not touch `CanvasRenderingContext2D`, `document`, `window`, or any browser API. Pure-node execution.

4. **Deterministic tests** — seed the PRNG (`mulberry32`) or mock `Math.random` for reproducible results in neural-network tests.

5. **One concern per test file** — match the production module structure: `tests/unit/math/utils.test.ts` tests `ts/math/utils.ts`, etc.

6. **`npm run fix:all` before commit** — tests are formatted/linted too.

## Scope

### In scope

- `package.json` changes: add `vitest` devDependency, add npm test scripts.
- Create `vitest.config.ts` at the repo root.
- Create `tests/` directory structure.
- Write tests for **all pure functions** in:
  - `ts/math/utils.ts` (~14 exportable functions + `mulberry32`)
  - `ts/math/collision.ts` (2 functions)
  - `ts/math/primitives/point.ts` (equality, serialization)
  - `ts/math/primitives/segment.ts` (distanceToPoint, length, projection)
  - `ts/math/primitives/polygon.ts` (containsPoint, containsPolygon, intersectsPolygon, union, multiBreak, break, distanceToPoint, distanceToPolygon)
  - `ts/math/primitives/envelope.ts` (envelope wraps a segment correctly)
  - `ts/math/graph/graph.ts` (add/remove point/segment, Dijkstra, load/save)
  - `ts/math/spatialGrid.ts` (insert, query, clear)
  - `ts/math/heatmapGrid.ts` (increment, get, reset)
  - `ts/math/trafficControlGrid.ts` (insert light, query, rebuild)
  - `ts/math/worldUnits.ts` (WORLD_PIXELS_PER_METER, pxPerFrameToKmh, formatElapsedTime)
  - `ts/math/color.ts` (getRGBA returns valid rgba string, getRandomColor returns 6-char hex)
  - `ts/neural-network/network.ts` — every static method
  - `ts/car/physics/carPhysics.ts` — update, createPolygon, assessDamage
  - `ts/car/brain/carBrainAdapter.ts` — buildInput, computeControls, brainsCompatible, inputLayerSize
  - `ts/car/config.ts` — constant values are as documented
  - `ts/simulator/training/genetics/poolManager.ts` — every exported function
  - `ts/store/serialization.ts` — safeJsonParse, stripFileExtension
  - `ts/math/osm-importer/osm.ts` — load/parse OSM data (if importable without fetch)
- Update `AGENTS.md` with testing conventions.
- Run `npm run fix:all` at the end.

### Out of scope

- Playwright visual snapshot tests (deferred to follow-up plan).
- Integration tests for Car class (requires constructing Car with sensor/controls/physics).
- Tests for custom HTML elements / panels (requires DOM environment).
- Tests for simulator shells (TrainingSimulator, TrafficSimulator, RaceSimulator, HumanBackpropSimulator).
- Tests for world editor and marking editors.
- Tests for rendering functions (drawPoint, drawSegment, etc. — covered by visual tests).
- Tests for camera, viewport, mini-map.
- Tests for audio/sound.ts.
- Code coverage thresholds (deferred; vitest config will enable it but not set fail thresholds).
- CI/CD pipeline — no GitHub Actions workflow added in this plan.

## Implementation

### 1. Install vitest

Add to `package.json`:

```json
"devDependencies": {
  "vitest": "^3.0.0"
}
```

Run `npm install`.

### 2. Create `vitest.config.ts` at repo root

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // ES module compatibility — vitest handles .ts natively via esbuild
  },
});
```

No special `resolve.alias` needed because imports use relative `.js` paths that vitest resolves via esbuild's TypeScript support.

### 3. Create directory structure

```
tests/
  unit/
    math/
      utils.test.ts
      collision.test.ts
      point.test.ts
      segment.test.ts
      polygon.test.ts
      envelope.test.ts
      graph.test.ts
      spatialGrid.test.ts
      heatmapGrid.test.ts
      trafficControlGrid.test.ts
      worldUnits.test.ts
      color.test.ts
    neural-network/
      network.test.ts
    car/
      carPhysics.test.ts
      carBrainAdapter.test.ts
      config.test.ts
    simulator/
      poolManager.test.ts
    store/
      serialization.test.ts
```

### 4. Write test files

Each test file must use proper `.js` import extensions (project convention). Example test structure:

#### `tests/unit/math/utils.test.ts`

- `distance()` — basic distance, zero distance, negative coordinates
- `lerp()` — endpoints, midpoint, extrapolation
- `getIntersection()` — crossing segments, parallel, touching at endpoint, colinear
- `getIntersectionOffset()` — same cases as getIntersection, returns offset number or -1
- `normalize()` — unit vector, zero vector (division by zero guard)
- `scale()`, `add()`, `subtract()` — basic vector ops
- `dot()`, `cross()` — perpendicular vectors, parallel vectors
- `angle()`, `rotate()` — known angles, full rotation
- `magnitude()` — known values, zero
- `translate()` — known offset
- `getNearestPoint()` — finds closest, respects threshold, returns null when none in range
- `getNearestSegment()` — same pattern
- `mulberry32()` — deterministic: same seed → same sequence; different seed → different sequence
- `lerp2D()`, `invLerp()`, `degToRad()`, `radiansToDegrees()`, `formatDegrees()` — basic math
- `getFake3dPoint()` — returns a Point, doesn't crash

#### `tests/unit/math/collision.test.ts`

- `polysIntersect()` — two overlapping squares → true; non-overlapping → false; touching edge → false (edges don't cross); share a vertex → false; degenerate 2-point "polygons"
- `nearestEdgeOffset()` — ray hits polygon at known offset; ray misses → null; polygon has 2 points (degenerate)

#### `tests/unit/math/primitives/point.test.ts`

- Point equality (same coords → equal, different → not equal)
- `load(info)` round-trip
- Optional: `intersection` flag serialization

#### `tests/unit/math/primitives/segment.test.ts`

- `distanceToPoint()` — point on segment (distance 0), point off segment, point beyond endpoints
- `length()` — pythagorean distance
- Projection of point onto segment line

#### `tests/unit/math/primitives/polygon.test.ts`

- `containsPoint()` — point inside square, outside, on edge (boundary condition)
- `containsPolygon()` — fully inside, partially overlapping, disjoint
- `intersectsPolygon()` — overlapping, touching, disjoint
- `distanceToPoint()` — point at center (0), point outside
- `union()` — two overlapping squares → segments excluding interior; non-overlapping squares
- `multiBreak()` / `break()` — segments split at intersection points
- `load(info)` round-trip (points member deserialized correctly)

#### `tests/unit/math/primitives/envelope.test.ts`

- Envelope around a segment: returns Polygon with expected point count (4 + rounding resolution)
- Envelope around a zero-length segment (handles degenerate case without crashing)

#### `tests/unit/math/graph/graph.test.ts`

- `addPoint()` / `addSegment()` — duplicates rejected
- `removePoint()` — cascading removal of connected segments
- `removeSegment()` — removes from adjacency
- `getShortestPath()` — Dijkstra: direct path, multi-hop, unreachable returns empty
- `load(info)` / `toInfo()` round-trip — graph with points, segments, one-way flags
- Graph with one-way segments: shortest path obeys directionality

#### `tests/unit/math/spatialGrid.test.ts`

- `insert()` / `query()` — points inside cell returned, outside not returned
- `query()` — dedup works (same segment in multiple cells returns once)
- `clear()` — grid empties
- Large coordinates — handles values outside normal range

#### `tests/unit/math/heatmapGrid.test.ts`

- `increment()` at cell → `get()` returns count
- `reset()` clears all counts
- Multiple increments accumulate
- Cell outside grid bounds handled gracefully

#### `tests/unit/math/trafficControlGrid.test.ts`

- Insert light polygon, query near position
- Rebuild after marking change
- State read via `getState` closure works

#### `tests/unit/math/worldUnits.test.ts`

- `pxPerFrameToKmh()` — known speed → expected kmh
- `formatElapsedTime()` — seconds → "MM:SS.ms" format
- `WORLD_PIXELS_PER_METER` constant value

#### `tests/unit/math/color.test.ts`

- `getRGBA()` — returns valid `rgba(r,g,b,a)` string
- `getRandomColor()` — returns 6-char hex string with `#` prefix
- Two calls to `getRandomColor()` usually produce different values (probabilistic)

#### `tests/unit/neural-network/network.test.ts`

- `new NeuralNetwork([2,3,1])` — creates correct level structure
- `feedForward()` — with frozen weights/biases, known input → expected binary output
- `mutate()` — weights change; architecture unchanged
- `mutate()` with amount=0 — no change
- `crossover()` — child has same architecture; weights come from parents
- `clone()` — deep copy: modifying clone doesn't affect original
- `deserialize()` — round-trip: serialize → deserialize → feedforward same
- `deserialize()` — invalid data throws
- `mutateFromPool()` — child arch matches parents; original pool entries not mutated
- `trainStep()` — with known inputs/targets/lr → returns `true` when weights change, `false` when no change
- `trainStep()` — gradient direction: if target=1 and output=0 → bias decreases (fires more); if target=0 and output=1 → bias increases
- `trainStep()` — per-output LR array works
- `trainStep()` — with 0 LR, weights unchanged → returns false
- `trainStep()` — with NaN/inf inputs guarded
- `Level.feedForward()` — sum > bias → output=1; sum <= bias → output=0
- Determinism: same random seed → same random network weights (use `mulberry32` to seed `Math.random`, or just verify structure)

#### `tests/unit/car/carPhysics.test.ts`

- `createPolygon()` — returns exactly 4 points
- `createPolygon()` — known position/angle → expected corners (approximate)
- `update()` — forward control → speed increases; friction slows it down
- `update()` — reverse control → negative speed, capped at `REVERSE_SPEED_RATIO * maxSpeed`
- `update()` — damaged car → no movement, returns false
- `update()` — collision with polygon → becomes damaged, speed=0, returns true
- `update()` — no collision → returns false, speed unchanged
- `assessDamage()` — AABB fast-reject: far-away poly → false
- `assessDamage()` — intersecting poly → true
- `assessDamage()` — empty polygons array → false

#### `tests/unit/car/carBrainAdapter.test.ts`

- `inputLayerSize()` — stateAware=false: rayCount+1; stateAware=true: rayCount*2+1
- `buildInput()` — legacy mode: `readings.map(1-offset) + [speed/maxSpeed]`
- `buildInput()` — stateAware mode: `[...ray,distance,state,...] + [speed/maxSpeed]`
- `buildInput()` — null reading → 0 for distance, 0 for state
- `brainsCompatible()` — matching arch → true; different input dims → false; null brain → false
- `computeControls()` — maps network outputs to `{forward, left, right, reverse}`
- `createBrain()` / `serialize()` / `deserialize()` round-trip

#### `tests/unit/car/config.test.ts`

- `NN_OUTPUT_COUNT === 4`
- `DEFAULT_HIDDEN_LAYERS === [6]`
- `DEFAULT_CAR_CONFIG` has expected keys (maxSpeed, acceleration, friction, width, height, sensor)

#### `tests/unit/simulator/poolManager.test.ts`

- `getTopAICars()` — filters out KEYS cars; sorts by fitness descending
- `getTopAICars()` — empty cars array → empty result
- `getTopAICars()` — all KEYS cars → empty result
- `getTopAICars()` — cars without brain → filtered out
- `getTopAICars()` — with evaluateFitness returning negative values
- `getTopCarInfoPool()` — returns correct number of entries, each has `toInfo()` shape
- `applyPoolToCars()` — KEYS cars skipped
- `applyPoolToCars()` — pool[0..K-1] copied (elitism), remaining mutated
- `applyPoolToCars()` — empty pool → no change
- `brainsCompatible()` — same architecture → true; different → false
- `inferHiddenLayers()` — correct layer sizes extracted
- `createCarsForTraining()` — creates correct count, type assigned

#### `tests/unit/store/serialization.test.ts`

- `safeJsonParse()` — valid JSON → parsed object
- `safeJsonParse()` — invalid JSON → returns null (no throw)
- `stripFileExtension()` — "file.json" → "file"; "file" → "file"; "file.name.json" → "file.name"
- `stripFileExtension()` — handles paths with directories

### 5. Add npm scripts

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
}
```

### 6. Update AGENTS.md

Add a new section at the end (before the Key commands table or after it):

```markdown
## Testing

- **Unit tests** live in `tests/unit/`, mirroring the `ts/` structure.
- Run `npm test` (vitest) to execute all unit tests.
- Run `npm run test:watch` during development for TDD.
- Run `npm run test:coverage` to view coverage (report in `coverage/`).
- **No DOM/canvas in unit tests** — tests for pure-math, neural-network, physics, and brain-adapter modules must not depend on browser APIs.
- **Deterministic tests** — seed PRNGs where possible; avoid `Math.random` in test assertions.
- **Import paths use `.js` extension** — match the production code convention even though files are `.ts`.
- **Format + lint** — `npm run fix:all` before commit covers all files including tests.
- **Visual regression** (Playwright) tests are deferred — see follow-up plan.
```

#### Also add a "Testing" section to the Key commands table

```markdown
| `npm test`              | Run all unit tests                     |
| `npm run test:watch`    | Run tests in watch mode (TDD)          |
| `npm run test:coverage` | Run tests with coverage report         |
```

## Brain / persistence considerations

None. Tests don't touch localStorage, saved `.car`/`.world` files, or the `bestPool`/`editorWorld` keys.

## Determinism strategy for NN tests

The `NeuralNetwork` constructor calls `Math.random()` for every weight and bias. To write deterministic tests:

1. **For architecture tests** (structure, not values): just verify the `Level` objects have the right dimensions.
2. **For feedforward tests**: freeze weights and biases after construction by setting them directly, or use a `mulberry32`-seeded override of `Math.random`.
3. **For mutate/trainStep tests**: construct a network and explicitly set known weights before calling mutate/trainStep. This avoids `Math.random` entirely.
4. For crossover tests: construct two known networks with explicit weights, verify the child combines them.

**Recommendation**: Write a small helper function `makeKnownNetwork(layerCounts, weights, biases)` that constructs a `NeuralNetwork` with `[]` layer array then sets known `Level` values directly, bypassing the random constructor. Import this helper from `tests/helpers/makeKnownNetwork.ts`.

## Acceptance criteria

- `npm test` runs and all tests pass.
- `tsc --noEmit` compiles clean (vitest's test files shouldn't interfere with the main tsconfig — `tsconfig.json` may need `"exclude": ["tests/**/*.ts"]` if vitest's types cause conflicts; verify).
- All pure-math functions listed in scope have test coverage.
- All neural-network static methods have test coverage.
- All car-physics methods have test coverage.
- All car-brain-adapter methods have test coverage.
- All pool-manager exported functions have test coverage.
- `npm run fix:all` passes.
- AGENTS.md is updated with testing conventions.
- Opening `html/simulator.html` works normally (no test artifacts leaked into production).

## Docs to update

- `AGENTS.md` — add Testing section at the end.
- Optionally create `tests/README.md` with brief explanation of the test structure (deferred — not required for this plan; AGENTS.md coverage is sufficient).
