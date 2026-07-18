# Expand Test Helpers

**Date:** 2026-07-18
**Slug:** expand-test-helpers
**Entry points affected:** none (only `tests/helpers/` added to)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Create reusable test helpers that reduce boilerplate across the test suite and make it easier to write new tests.

Current helpers:

- `makeKnownNetwork.ts` — constructs a `NeuralNetwork` with known weights/biases (useful for NN and brain adapter tests).
- `setupImageMock.ts` — mocks `HTMLImageElement` for `CarRenderer` construction in Node.
- `mockCanvas2D.ts` — should be created by the zero-coverage modules plan (if that plan runs first, this one can reuse it; otherwise create it here).

## Context (read first)

- `tests/helpers/` directory — 2 existing helpers, 57 lines total.
- Test files in `tests/unit/` — many duplicate the same setup patterns (creating a car, creating a world with a road graph, mocking canvas).
- `AGENTS.md` — project conventions, architecture rules.
- Key source types used in tests:
  - `Car` (`ts/car/car.ts`) — needs `new Image()` mock
  - `World` (`ts/world/world.ts`) — needs graph, markings, corridor
  - `Graph` (`ts/math/graph/graph.ts`) — points and segments
  - `Polygon` (`ts/math/primitives/polygon.ts`) — array of points
  - `Segment` (`ts/math/primitives/segment.ts`) — two points
  - `Point` — `{x: number, y: number}`
  - `CanvasRenderingContext2D` — for rendering tests

## Architecture rules for helpers

1. **Pure functions only** — helpers must not have side effects (except `setupImageMock` which modifies `globalThis`).
2. **TypeScript with `.ts` extension** — import with `.js` extension (project convention).
3. **No DOM/canvas dependencies** unless explicitly named (e.g. `mockCanvas2D`).
4. **Deterministic** — no `Math.random` unless seeded.

## Scope

### In scope

- `tests/helpers/makeWorld.ts` — constructs a minimal `World` with a single-road graph.
- `tests/helpers/makeCar.ts` — constructs a `Car` with minimal setup and mocked callbacks.
- `tests/helpers/makeCanvasMock.ts` (or reuse `mockCanvas2D.ts` if created by another plan).
- `tests/helpers/makeSegment.ts` — shorthand for `new Segment(p1, p2)`.
- `tests/helpers/makeGraph.ts` — creates a simple graph from a list of point pairs.
- `tests/helpers/makePoint.ts` — shorthand for `{x: n, y: n}`.

### Out of scope

- Mock for `KeyboardManager` / DOM event routing — too complex for a helper.
- Mock for `localStorage` — already handled inline in test files where needed.
- Full `World` with markings, buildings, and trees — start simple.

## Implementation

### 1. Create `tests/helpers/makePoint.ts`

```typescript
export type Point = { x: number; y: number };

/** Shorthand for creating a point literal. */
export function p(x: number, y: number): Point {
  return { x, y };
}

/** Create an array of points from coordinate pairs. */
export function points(...coords: [number, number][]): Point[] {
  return coords.map(([x, y]) => ({ x, y }));
}
```

### 2. Create `tests/helpers/makeSegment.ts`

```typescript
import { p, type Point } from './makePoint.js';

export type SegmentData = { p1: Point; p2: Point };

/** Creates a segment from two points. */
export function seg(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): SegmentData {
  return { p1: p(x1, y1), p2: p(x2, y2) };
}

/** Creates a segment from Point objects. */
export function segFrom(p1: Point, p2: Point): SegmentData {
  return { p1, p2 };
}
```

Note: Check if `Segment` is used as a class or just a shape in the modules under test. If tests import the `Segment` class directly, use that. If they work with `{p1, p2}` shapes, the data interface is sufficient.

### 3. Create `tests/helpers/makeGraph.ts`

```typescript
import { Graph } from '../../ts/math/graph/graph.js';
import { Point } from '../../ts/math/primitives/point.js';

/** Creates an empty graph. */
export function makeEmptyGraph(): Graph {
  return new Graph();
}

/** Creates a graph with a single segment between two points. */
export function makeSimpleGraph(): Graph {
  const g = new Graph();
  g.addPoint(new Point(0, 0));
  g.addPoint(new Point(100, 0));
  g.addPoint(new Point(100, 100));
  g.addPoint(new Point(0, 100));
  // Add square edges
  g.addSegment(new Segment(g.points[0], g.points[1]));
  g.addSegment(new Segment(g.points[1], g.points[2]));
  g.addSegment(new Segment(g.points[2], g.points[3]));
  g.addSegment(new Segment(g.points[3], g.points[0]));
  return g;
}
```

**Important:** Read the actual `Graph` API before writing this — adjust imports and method calls to match the real `Graph` class, `Point` class, and `Segment` class signatures. Use `graphify query "how does Graph.addPoint work"` or grep the source.

### 4. Create `tests/helpers/makeWorld.ts`

```typescript
import { World } from '../../ts/world/world.js';
import { Graph } from '../../ts/math/graph/graph.js';

/** Creates a minimal World with just a graph and no markings. */
export function makeMinimalWorld(): World {
  return new World(new Graph());
}

/** Creates a World with a simple rectangular road. */
export function makeSimpleWorld(): World {
  const g = new Graph();
  g.addPoint(new Point(0, 0));
  g.addPoint(new Point(100, 0));
  g.addPoint(new Point(100, 100));
  g.addPoint(new Point(0, 100));
  g.addPoint(new Point(0, 0));
  g.addPoint(new Point(100, 100));
  return new World(g);
}
```

**Important:** Read the actual `World` constructor API first. Adjust based on actual signature.

### 5. Create `tests/helpers/makeCar.ts`

```typescript
import { Car } from '../../ts/car/car.js';
import { setupImageMock } from './setupImageMock.js';

setupImageMock(); // Car constructor needs Image

export interface CarOptions {
  x?: number;
  y?: number;
  angle?: number;
  controlType?: 'AI' | 'KEYS' | 'DUMMY';
}

/** Creates a minimal Car for testing. */
export function makeCar(options: CarOptions = {}): Car {
  const x = options.x ?? 0;
  const y = options.y ?? 0;
  const angle = options.angle ?? 0;
  const controlType = options.controlType ?? 'DUMMY';

  const car = new Car(x, y, angle, controlType);
  // Set harmless callbacks
  car.setCallbacks({
    onDamaged: () => {},
    onEngineUpdate: () => {},
  });
  return car;
}
```

**Important:** Read the actual `Car` constructor signature first. The constructor may take additional parameters (like `maxSpeed`, `acceleration`, `friction`, `sensor` config). Adjust accordingly.

### 6. Create `tests/helpers/makeCanvasMock.ts` (if `mockCanvas2D.ts` doesn't already exist)

```typescript
/** Records a method invocation on the mock canvas. */
export interface CanvasCall {
  method: string;
  args: unknown[];
}

/** A minimal mock for CanvasRenderingContext2D that records draw calls. */
export interface CanvasMock {
  ctx: CanvasRenderingContext2D;
  calls: CanvasCall[];
  reset(): void;
}

/** Creates a Canvas2D context mock with call recording. */
export function makeCanvasMock(): CanvasMock {
  const calls: CanvasCall[] = [];

  const ctx = {
    canvas: { width: 800, height: 600 },
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,

    beginPath: () => calls.push({ method: 'beginPath', args: [] }),
    closePath: () => calls.push({ method: 'closePath', args: [] }),
    moveTo: (x: number, y: number) =>
      calls.push({ method: 'moveTo', args: [x, y] }),
    lineTo: (x: number, y: number) =>
      calls.push({ method: 'lineTo', args: [x, y] }),
    fill: () => calls.push({ method: 'fill', args: [] }),
    stroke: () => calls.push({ method: 'stroke', args: [] }),
    arc: (x: number, y: number, r: number, a0: number, a1: number) =>
      calls.push({ method: 'arc', args: [x, y, r, a0, a1] }),
    save: () => calls.push({ method: 'save', args: [] }),
    restore: () => calls.push({ method: 'restore', args: [] }),
    translate: (x: number, y: number) =>
      calls.push({ method: 'translate', args: [x, y] }),
    rotate: (a: number) => calls.push({ method: 'rotate', args: [a] }),
    scale: (x: number, y: number) =>
      calls.push({ method: 'scale', args: [x, y] }),
    setTransform: (...a: number[]) =>
      calls.push({ method: 'setTransform', args: a }),
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ method: 'fillRect', args: [x, y, w, h] }),
    strokeRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ method: 'strokeRect', args: [x, y, w, h] }),
    clearRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ method: 'clearRect', args: [x, y, w, h] }),
    measureText: () => ({ width: 0 }),
    fillText: (text: string, x: number, y: number) =>
      calls.push({ method: 'fillText', args: [text, x, y] }),
  } as unknown as CanvasRenderingContext2D;

  return {
    ctx,
    calls,
    reset() {
      calls.length = 0;
    },
  };
}
```

### 7. Verify helpers work

Create a quick validation test:

```typescript
// tests/helpers/helpers.test.ts (temporary, can be deleted after)
import { describe, it, expect } from 'vitest';
import { p, points } from './makePoint.js';
import { seg } from './makeSegment.js';
import { makeCanvasMock } from './makeCanvasMock.js';
import { makeEmptyGraph, makeSimpleGraph } from './makeGraph.js';

describe('test helpers', () => {
  it('makePoint creates correct points', () => {
    expect(p(0, 0)).toEqual({ x: 0, y: 0 });
    expect(p(-5, 10)).toEqual({ x: -5, y: 10 });
  });

  it('points creates array from pairs', () => {
    const pts = points([0, 0], [1, 1], [2, 2]);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
  });

  it('seg creates segment data', () => {
    const s = seg(0, 0, 10, 10);
    expect(s.p1).toEqual({ x: 0, y: 0 });
    expect(s.p2).toEqual({ x: 10, y: 10 });
  });

  it('makeCanvasMock records calls', () => {
    const { ctx, calls, reset } = makeCanvasMock();
    ctx.beginPath();
    ctx.moveTo(10, 20);
    ctx.lineTo(30, 40);
    ctx.stroke();
    expect(calls).toHaveLength(4);
    reset();
    expect(calls).toHaveLength(0);
  });

  it('makeSimpleGraph has segments', () => {
    const g = makeSimpleGraph();
    expect(g.segments.length).toBeGreaterThan(0);
  });
});
```

Run:

```bash
npm test
```

If the helpers have import issues, check:

- Import paths use `.js` extension.
- `Point`, `Segment`, `Graph` classes are imported from correct paths.
- `setupImageMock()` is called before any `Car` import.

### 8. Clean up

Delete `tests/helpers/helpers.test.ts` after verifying.

## Acceptance criteria

- All 6 helper files exist and export useful utilities.
- No existing test files break.
- `npm test` passes.
- `npm run fix:all` passes.
- Helpers are importable with correct `.js` extensions.

## Gotchas

- **Import paths** — all imports use `.js` extensions even for `.ts` source files. Example: `import { Graph } from '../../ts/math/graph/graph.js'`.
- **`Car` constructor** — may require more parameters than shown. Read the actual `Car` class constructor signature before finalizing `makeCar.ts`.
- **`World` constructor** — the constructor signature may be different than assumed. Use `graphify query "what does the World constructor look like"` or grep `class World`.
- **`setupImageMock`** — calling it at module level in `makeCar.ts` is intentional: it ensures the mock is active before any test imports `Car`. But it modifies `globalThis`, so it can only be called once. That's fine for test helpers.
- **`.gitignore`** — no changes needed.

## Docs to update

- `AGENTS.md` — optionally add a line about available test helpers under the Testing section:
  ```markdown
  - **Test helpers** in `tests/helpers/` — `makeKnownNetwork`, `setupImageMock`, `makeCanvasMock`, `makeCar`, `makeWorld`, `p`, `seg`, etc.
  ```
