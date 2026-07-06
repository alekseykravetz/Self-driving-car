# Feature C1: Spatial Congestion Heatmap

**Priority:** 1 | **Effort:** Small | **Impact:** High | **Risk:** None

## Core Concept

A grid-based counter that records vehicle occupancy and idle-time per cell over time, rendered as a color overlay on the game canvas. Provides live visual analytics of traffic bottlenecks with zero external tooling.

## Target Files

- `ts/math/spatialGrid.ts` — reference uniform grid cell size (150px)
- `ts/rendering/heatmapRenderer.ts` — **new file**, heatmap rendering logic
- `ts/simulator/core/simulatorShell.ts` — hook into render loop
- `ts/simulator/training/trainingSimulator.ts` — wire up heatmap
- `ts/simulator/traffic/trafficSimulator.ts` — wire up heatmap
- `ts/simulator/race/raceSimulator.ts` — wire up heatmap

## Implementation Steps

### 1. Create `HeatmapGrid` data structure (new file: `ts/math/heatmapGrid.ts`)

```
ts/math/
├── heatmapGrid.ts        <-- new
```

```ts
class HeatmapCell {
  occupancyFrames: number = 0;  // frames where >=1 car was in this cell
  totalFrames: number = 0;      // frames since recording started
  idleFrames: number = 0;       // frames where car speed was near zero
}

class HeatmapGrid {
  #cellSize: number;         // 150px (match SpatialHashGrid)
  #cells: Map<string, HeatmapCell>;
  #worldWidth: number;
  #worldHeight: number;

  constructor(worldWidth: number, worldHeight: number, cellSize?: number);
  #cellKey(x: number, y: number): string;  // `${col},${row}`
  record(cars: Car[]): void;                // called every frame
  getHeatmapData(): HeatmapCell[];          // for rendering
  reset(): void;
}
```

**Key behavior:**
- `record(cars)` maps each car to a cell via `Math.floor(pos / cellSize)`, increments occupancy, and checks car speed against `<0.5 px/frame` threshold for idle detection.
- O(cars) per frame with O(1) cell lookup.
- `reset()` clears all counters (used on simulation restart).

### 2. Create `HeatmapRenderer` (new file: `ts/rendering/heatmapRenderer.ts`)

```
ts/rendering/
├── heatmapRenderer.ts     <-- new
```

```ts
class HeatmapRenderer {
  #heatmapGrid: HeatmapGrid;
  #offscreenCanvas: OffscreenCanvas;
  #lastRedrawFrame: number = 0;
  #redrawInterval: number = 15;  // ~4 fps at 60fps game loop

  constructor(heatmapGrid: HeatmapGrid, width: number, height: number);

  draw(ctx: CanvasRenderingContext2D, viewPoint: { x: number; y: number }): void;
  #cullAndRender(viewPoint: { x: number; y: number }): void;
  #occupancyColor(ratio: number): string;  // blue→cyan→yellow→red via RGBA lerp
  resize(width: number, height: number): void;
}
```

**Color mapping:** occupancy ratio `0→1` maps `blue→cyan→yellow→red` via lerp through RGBA values. Use `getRGBA` from `ts/math/color.ts` if available, otherwise implement inline.

**Viewport culling:** Only cells intersecting the visible rect are drawn. For a 2000×2000px viewport at 150px cells: ~196 cells drawn per frame.

**Offscreen canvas caching:** The heatmap is redrawn to an offscreen canvas at ~4fps, then `drawImage` is called each frame. This decouples heatmap rendering from the game loop.

### 3. Wire into simulators

For each simulator (`TrainingSimulator`, `TrafficSimulator`, `RaceSimulator`):

- In `constructor`, create `HeatmapGrid(worldWidth, worldHeight)` and `HeatmapRenderer(grid, width, height)`.
- In `update()` (or a render-hook), call `heatmapGrid.record(cars)`.
- In `draw()`, after all game objects are drawn, call `heatmapRenderer.draw(ctx, viewPoint)`.
- Ensure the heatmap overlay is drawn *above* the road/cars but *below* UI overlays.

### 4. Add toggle UI

Add a button or checkbox in the simulator toolbar:
- Label: "Show Heatmap" or a thermometer icon
- Toggle `heatmapVisible: boolean` prop in the simulator
- When off, skip `heatmapRenderer.draw()`

### 5. Persistence

Ephemeral — resets on simulation restart or world change. No schema changes.

## Performance Safeguards

- Recording: O(number of cars) with O(1) cell lookup per car. No cross-car interaction.
- Rendering: Viewport-culled; offscreen canvas caching decouples redraw from game loop (4fps).
- Off by default — user must toggle on.
- Memory: cells are lazy-created on first write; only cells that have been occupied consume memory.

## Acceptance Criteria

- [ ] Heatmap overlay renders on canvas in all three simulators
- [ ] Cells turn red where traffic is dense/idle
- [ ] Toggle button hides/shows the overlay
- [ ] Heatmap resets when simulation restarts or world changes
- [ ] No measurable FPS drop with heatmap off
- [ ] Rendering stays smooth (~60fps on car drawing) with heatmap on

## References

- `SpatialHashGrid` cell size: 150px (match for consistency)
- Hook pattern: Telemetry hooks into `SimulatorShell` render loop per roadmap rule
- Color utilities: `ts/math/color.ts` (`getRGBA`)
