# Tests for Zero-Coverage Modules

**Date:** 2026-07-18
**Slug:** tests-zero-coverage-modules
**Entry points affected:** none (only `tests/unit/` and `tests/helpers/` added to)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Write unit tests for the 4 modules that currently have **0% coverage**:

1. **Rendering** — `carRenderer.ts`, `shapeRenderer.ts`, `pointRenderer.ts`, `polygonRenderer.ts`, `segmentRenderer.ts`
2. **World loader** — `worldLoader.ts`
3. **Marking loader** — `markingLoader.ts`
4. **Road generator** — `roadGenerator.ts`

Current coverage: 61% statements. These modules represent the biggest gap.

## Context (read first)

- `AGENTS.md` — project conventions, architecture rules, entry points.
- `vitest.config.ts` — Vitest v4 with `include: ['tests/**/*.test.ts']`.
- `tsconfig.json` — excludes `tests/**/*.ts`, so test files don't interfere with main compilation.
- Import paths use `.js` extension (e.g. `import { drawCar } from './carRenderer.js'`).

### Module summaries

- **`ts/car/rendering/carRenderer.ts`** — `CarRenderer` class with `draw()` method. Constructor calls `new Image()` (needs mock). Renders a `CarDrawData` shape containing polygon, color, sensor ref to a Canvas2D context. **Pure draw logic** — hard to unit test without mocking canvas.
- **`ts/rendering/shapeRenderer.ts`** — `drawPoint()`, `drawSegment()`, `drawPolygon()` functions. Also pure canvas drawing.
- **`ts/rendering/pointRenderer.ts`** — point rendering helpers.
- **`ts/rendering/polygonRenderer.ts`** — polygon rendering helpers.
- **`ts/rendering/segmentRenderer.ts`** — segment rendering helpers.
- **`ts/world/loader/worldLoader.ts`** — `WorldLoader` class (static `load()` from data, async `fromFile()` via fetch). Contains DOM elements (file input).
- **`ts/world/markings/markingLoader.ts`** — `MarkingLoader` with `loadMarking(type, data, world)` — factory that dispatches to marking subtypes.
- **`ts/world/generation/roadGenerator.ts`** — `RoadGenerator` class — generates road networks procedurally.

## Architecture rules for these tests

1. **Canvas-dependent functions** — create a `mockCanvas2D` helper that returns a minimal `CanvasRenderingContext2D` with spy-like counters. Use this for rendering tests. Do NOT create a real canvas.
2. **DOM-dependent functions** — for `WorldLoader`, test pure logic only. The constructor that creates DOM elements is tested separately.
3. **Image mock** — already exists in `tests/helpers/setupImageMock.ts`. Import `setupImageMock()` before any import that triggers `CarRenderer`.
4. **No new runtime dependencies** — all test utilities are hand-rolled inside `tests/helpers/`.

## Scope

### In scope

- **Rendering tests:** `tests/unit/car/rendering/carRenderer.test.ts`
- **Shape rendering tests:** `tests/unit/rendering/shapeRenderer.test.ts`
- **World loader tests:** `tests/unit/world/loader/worldLoader.test.ts` (pure functions only)
- **Marking loader tests:** `tests/unit/world/markings/markingLoader.test.ts`
- **Road generator tests:** `tests/unit/world/generation/roadGenerator.test.ts`
- New helper: `tests/helpers/mockCanvas2D.ts`
- Updated helper: `tests/helpers/setupImageMock.ts` (already exists, may need tweaks)

### Out of scope

- Visual rendering regression tests (handled by the Playwright visual test plan).
- DOM element creation in `WorldLoader` constructor (tested via manual inspection / the world editor page).
- Integration tests — these are pure unit tests.

## Implementation

### 1. Create `tests/helpers/mockCanvas2D.ts`

A lightweight mock that records draw calls without needing a real canvas:

```typescript
export interface DrawCall {
  method: string;
  args: unknown[];
}

export interface CanvasMockContext {
  ctx: CanvasRenderingContext2D;
  calls: DrawCall[];
  reset(): void;
}

export function mockCanvas2D(): CanvasMockContext {
  const calls: DrawCall[] = [];

  const handler: ProxyHandler<CanvasRenderingContext2D> = {
    get(target, prop) {
      if (prop === 'canvas') return { width: 800, height: 600 };
      const value = (target as Record<string, unknown>)[prop as string];
      if (typeof value === 'function') {
        return (...args: unknown[]) => {
          calls.push({ method: prop as string, args });
          return (value as Function).apply(target, args);
        };
      }
      return value;
    },
  };

  // Create a minimal mock that satisfies the CanvasRenderingContext2D interface
  const dummyCtx = {
    canvas: { width: 800, height: 600 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    beginPath: () => calls.push({ method: 'beginPath', args: [] }),
    closePath: () => calls.push({ method: 'closePath', args: [] }),
    moveTo: (...a: number[]) => calls.push({ method: 'moveTo', args: a }),
    lineTo: (...a: number[]) => calls.push({ method: 'lineTo', args: a }),
    fill: () => calls.push({ method: 'fill', args: [] }),
    stroke: () => calls.push({ method: 'stroke', args: [] }),
    arc: (...a: unknown[]) => calls.push({ method: 'arc', args: a }),
    save: () => calls.push({ method: 'save', args: [] }),
    restore: () => calls.push({ method: 'restore', args: [] }),
    translate: (...a: number[]) => calls.push({ method: 'translate', args: a }),
    rotate: (...a: number[]) => calls.push({ method: 'rotate', args: a }),
    scale: (...a: number[]) => calls.push({ method: 'scale', args: a }),
    setTransform: (...a: number[]) => calls.push({ method: 'setTransform', args: a }),
    fillRect: (...a: number[]) => calls.push({ method: 'fillRect', args: a }),
    strokeRect: (...a: number[]) => calls.push({ method: 'strokeRect', args: a }),
    clearRect: (...a: number[]) => calls.push({ method: 'clearRect', args: a }),
    measureText: () => ({ width: 0 }),
    fillText: (...a: unknown[]) => calls.push({ method: 'fillText', args: a }),
  } as unknown as CanvasRenderingContext2D;

  const reset = () => { calls.length = 0; };

  return { ctx: dummyCtx, calls, reset };
}
```

### 2. Create `tests/unit/car/rendering/carRenderer.test.ts`

```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupImageMock } from '../../../helpers/setupImageMock.js';
import { mockCanvas2D } from '../../../helpers/mockCanvas2D.js';

// Mock Image before any CarRenderer import
beforeAll(() => setupImageMock());

describe('CarRenderer', () => {
  let mockCanvas: ReturnType<typeof mockCanvas2D>;
  // declare CarRenderer with a dynamic import after mock is set up

  beforeEach(() => {
    mockCanvas = mockCanvas2D();
    mockCanvas.reset();
  });

  it('draw() calls beginPath, moveTo, lineTo for each polygon vertex', async () => {
    const { CarRenderer } = await import(
      '../../../../ts/car/rendering/carRenderer.js'
    );
    // Create CarDrawData with a simple triangular polygon
    const drawData = {
      polygon: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }],
      color: 'red',
      sensor: null,
      damaged: false,
      showSensor: false,
      showRayDots: false,
    };
    CarRenderer.draw(mockCanvas.ctx, drawData);
    // Should have at least one beginPath, moveTo, lineTo sequence
    expect(mockCanvas.calls.filter(c => c.method === 'beginPath').length).toBeGreaterThanOrEqual(1);
    expect(mockCanvas.calls.filter(c => c.method === 'lineTo').length).toBeGreaterThanOrEqual(2);
  });

  it('draw() sets fillStyle from drawData.color', async () => {
    const { CarRenderer } = await import(
      '../../../../ts/car/rendering/carRenderer.js'
    );
    const drawData = {
      polygon: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }],
      color: 'blue',
      sensor: null,
      damaged: false,
      showSensor: false,
      showRayDots: false,
    };
    CarRenderer.draw(mockCanvas.ctx, drawData);
    expect(mockCanvas.ctx.fillStyle).toBe('blue');
  });
});
```

### 3. Create `tests/unit/rendering/shapeRenderer.test.ts`

For the shape renderer, test the exported drawing functions. Use `mockCanvas2D`:

```typescript
import { describe, it, expect } from 'vitest';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';

describe('shapeRenderer', () => {
  it('drawPoint calls arc', async () => {
    const { drawPoint } = await import('../../../ts/rendering/pointRenderer.js');
    const mock = mockCanvas2D();
    drawPoint(mock.ctx, { x: 5, y: 10 }, 3, 'red');
    expect(mock.calls.filter(c => c.method === 'arc').length).toBe(1);
  });

  it('drawSegment calls moveTo and lineTo', async () => {
    const { drawSegment } = await import('../../../ts/rendering/segmentRenderer.js');
    const mock = mockCanvas2D();
    drawSegment(mock.ctx, { p1: { x: 0, y: 0 }, p2: { x: 10, y: 10 } }, { color: 'black', width: 2 });
    expect(mock.calls.filter(c => c.method === 'moveTo').length).toBe(1);
    expect(mock.calls.filter(c => c.method === 'lineTo').length).toBe(1);
  });
});
```

### 4. Create `tests/unit/world/loader/worldLoader.test.ts`

Test the pure parsing logic. The `WorldLoader` class constructor creates DOM elements (file input) — test only the static methods or extract pure functions:

```typescript
import { describe, it, expect } from 'vitest';

describe('WorldLoader', () => {
  it('load() parses valid world data into world object', async () => {
    const { WorldLoader } = await import('../../../../ts/world/loader/worldLoader.js');
    const data = {
      version: 2,
      graph: { points: [], segments: [] },
      markings: [],
      corridor: null,
      decoration: [],
    };
    const world = WorldLoader.load(data);
    expect(world).toBeDefined();
    expect(world.graph).toBeDefined();
  });

  it('load() with v1 data upgrades to v2', async () => {
    const { WorldLoader } = await import('../../../../ts/world/loader/worldLoader.js');
    const v1Data = {
      graph: { points: [], segments: [] },
      markings: [],
      trees: [],
      buildings: [],
    };
    const world = WorldLoader.load(v1Data);
    expect(world).toBeDefined();
  });

  it('load() with invalid data throws', async () => {
    const { WorldLoader } = await import('../../../../ts/world/loader/worldLoader.js');
    expect(() => WorldLoader.load(null)).toThrow();
    expect(() => WorldLoader.load({})).toThrow();
  });
});
```

### 5. Create `tests/unit/world/markings/markingLoader.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('MarkingLoader', () => {
  it('loadMarking with type "stop" returns a Stop instance', async () => {
    const { MarkingLoader } = await import(
      '../../../../ts/world/markings/markingLoader.js'
    );
    const marking = MarkingLoader.loadMarking('stop', {
      type: 'stop',
      center: { x: 0, y: 0 },
      directionVector: { x: 1, y: 0 },
      width: 3,
      height: 3,
    });
    expect(marking.type).toBe('stop');
  });

  it('loadMarking with type "light" returns a Light instance', async () => {
    const { MarkingLoader } = await import(
      '../../../../ts/world/markings/markingLoader.js'
    );
    const marking = MarkingLoader.loadMarking('light', {
      type: 'light',
      center: { x: 0, y: 0 },
      directionVector: { x: 1, y: 0 },
      width: 3,
      height: 3,
    });
    expect(marking.type).toBe('light');
  });

  it('loadMarking with unknown type returns null', async () => {
    const { MarkingLoader } = await import(
      '../../../../ts/world/markings/markingLoader.js'
    );
    expect(
      MarkingLoader.loadMarking('nonexistent', {
        type: 'nonexistent',
        center: { x: 0, y: 0 },
        directionVector: { x: 1, y: 0 },
        width: 3,
        height: 3,
      })
    ).toBeNull();
  });
});
```

### 6. Create `tests/unit/world/generation/roadGenerator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { Graph } from '../../../ts/math/graph/graph.js';

describe('RoadGenerator', () => {
  it('generate() returns a World with graph and markings', async () => {
    const { RoadGenerator } = await import(
      '../../../../ts/world/generation/roadGenerator.js'
    );
    const world = RoadGenerator.generate();
    expect(world).toBeDefined();
    expect(world.graph).toBeDefined();
    expect(world.markings).toBeDefined();
  });

  it('generate() produces at least one segment', async () => {
    const { RoadGenerator } = await import(
      '../../../../ts/world/generation/roadGenerator.js'
    );
    const world = RoadGenerator.generate();
    const points = world.graph.points;
    const segments = world.graph.segments;
    expect(segments.length).toBeGreaterThan(0);
    expect(points.length).toBeGreaterThan(0);
  });

  it('generateGrid() produces grid-like road pattern', async () => {
    const { RoadGenerator } = await import(
      '../../../../ts/world/generation/roadGenerator.js'
    );
    const world = RoadGenerator.generateGrid(3, 3);
    expect(world.graph.segments.length).toBeGreaterThan(0);
  });

  it('generate() with custom seed produces deterministic output', async () => {
    const { RoadGenerator } = await import(
      '../../../../ts/world/generation/roadGenerator.js'
    );
    const world1 = RoadGenerator.generate(42);
    const world2 = RoadGenerator.generate(42);
    // Same seed → same segment count
    expect(world1.graph.segments.length).toBe(world2.graph.segments.length);
  });

  it('generate() different seeds produce different output', async () => {
    const { RoadGenerator } = await import(
      '../../../../ts/world/generation/roadGenerator.js'
    );
    const world1 = RoadGenerator.generate(1);
    const world2 = RoadGenerator.generate(999);
    // Different seeds → likely different count (probabilistic)
    // This is a soft check — 2 consecutive runs with different seeds
    expect(world1.graph.segments).not.toEqual(world2.graph.segments);
  });
});
```

**Important:** Update imports to match the actual API of `RoadGenerator`. Check the source file first:

```bash
grep -n "export.*class\|export.*function\|export.*const" ts/world/generation/roadGenerator.ts
```

Adjust tests to match actual exported names and signatures.

### 7. Run tests and fix

```bash
npm test
npm run test:coverage
```

Check that coverage for the new modules is > 0%.

## Acceptance criteria

- `npm test` passes with all new tests green.
- Coverage report shows > 0% for `carRenderer.ts`, `shapeRenderer.ts`, `pointRenderer.ts`, `polygonRenderer.ts`, `segmentRenderer.ts`, `worldLoader.ts`, `markingLoader.ts`, `roadGenerator.ts`.
- `npm run fix:all` passes.

## Gotchas

- **`CarRenderer` constructor calls `new Image()`** — always import `setupImageMock()` before `CarRenderer` in test files. Use `beforeAll(() => setupImageMock())`.
- **Dynamic imports** — use `await import(...)` syntax inside tests to control mock timing, or import helpers at the top of the file and the module under test inside `beforeAll`.
- **`RoadGenerator`** — read the actual source to determine its API. The examples above are templates — adjust method signatures and parameters to match the real implementation.
- **`WorldLoader.load()`** — read the actual source. It may be async (if it uses fetch internally). Adjust tests accordingly.

## Docs to update

- None (coverage is observed but not enforced by config — that's the coverage-thresholds plan).
