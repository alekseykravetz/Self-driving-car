# Feature C1: Spatial Congestion Heatmap

**Priority:** 1 | **Effort:** Small | **Impact:** High | **Risk:** None

## Core Concept

A grid-based counter that records vehicle occupancy and idle-time per cell over time, rendered as a color overlay on the game canvas. Provides live visual analytics of traffic bottlenecks with zero external tooling.

## Target Files

- `ts/math/spatialGrid.ts` — reference uniform grid cell size (150px)
- `ts/math/heatmapGrid.ts` — **new file**, occupancy/idle counter grid
- `ts/rendering/heatmapRenderer.ts` — **new file**, heatmap rendering logic
- `ts/panels/worldLayersToolbar.ts` — add "Overlays" group with the 🌡️ toggle
- `ts/panels/templates/worldLayersToolbarTemplate.ts` — (template renders dynamically; no static change needed)
- `ts/world/editors/worldEditor.ts` — hide the Overlays group (editor has no live traffic)
- `ts/simulator/core/simulatorShell.ts` — own `HeatmapGrid`/`HeatmapRenderer` + `recordHeatmap`/`drawHeatmap`/`resetHeatmap` helpers; wire the toolbar's heatmap change callback
- `ts/simulator/training/modes/simpleModeBehavior.ts` — record (cars + traffic) + draw
- `ts/simulator/training/modes/worldModeBehavior.ts` — record + draw; reset on world change / new training
- `ts/simulator/traffic/trafficSimulator.ts` — record + draw; reset on world change
- `ts/simulator/racing/raceSimulator.ts` — record (while started) + draw; reset on race init

## Implementation Steps

### 1. Create `HeatmapGrid` data structure (new file: `ts/math/heatmapGrid.ts`)

```
ts/math/
├── heatmapGrid.ts        <-- new
```

```ts
class HeatmapCell {
  occupancyFrames: number = 0; // frames where >=1 car was in this cell
  totalFrames: number = 0; // frames since recording started
  idleFrames: number = 0; // frames where car speed was near zero
}

class HeatmapGrid {
  #cellSize: number; // 150px (match SpatialHashGrid)
  #cells: Map<string, HeatmapCell>;
  #worldWidth: number;
  #worldHeight: number;

  constructor(worldWidth: number, worldHeight: number, cellSize?: number);
  #cellKey(x: number, y: number): string; // `${col},${row}`
  record(cars: Car[]): void; // called every frame
  getHeatmapData(): HeatmapCell[]; // for rendering
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
  #redrawInterval: number = 15; // ~4 fps at 60fps game loop

  constructor(heatmapGrid: HeatmapGrid, width: number, height: number);

  draw(
    ctx: CanvasRenderingContext2D,
    viewPoint: { x: number; y: number },
  ): void;
  #cullAndRender(viewPoint: { x: number; y: number }): void;
  #occupancyColor(ratio: number): string; // blue→cyan→yellow→red via RGBA lerp
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
- Ensure the heatmap overlay is drawn _above_ the road/cars but _below_ UI overlays.

### 4. Add toggle UI

The toggle lives on the **`<world-layers-toolbar>`** (the layer/overlay panel),
not on the `<layout-toolbar>` — it is a per-frame render overlay, grouping
naturally with the other layer visibility toggles rather than the panel
layout toggles.

- A new **"Overlays"** group is added to `WorldLayersToolbarElement` with a 🌡️
  button (`#showHeatmapBtn`).
- New API on the element: `showHeatmap` getter, `setShowHeatmap(on)`, and
  `setHeatmapChangeListener(cb)`.
- `hideOverlays()` mirrors `hideItems()` — called by the **world editor**
  (which has no live traffic), so the group is only visible on the three
  simulator pages.
- `SimulatorShell` stores the visibility as a `heatmapVisible` field (updated
  via the change listener) so `recordHeatmap`/`drawHeatmap` keep working even
  when the toolbar element is absent. Toggling off also calls `resetHeatmap()`
  so re-enabling starts from a clean slate.

### 5. Persistence

Ephemeral — resets on simulation restart or world change. No schema changes.

## Performance Safeguards

- Recording: O(number of cars) with O(1) cell lookup per car. No cross-car interaction.
- Rendering: Viewport-culled; offscreen canvas caching decouples redraw from game loop (4fps).
- Off by default — user must toggle on.
- Memory: cells are lazy-created on first write; only cells that have been occupied consume memory.

## Acceptance Criteria

- [x] Heatmap overlay renders on canvas in all three simulators
- [x] Cells turn red where traffic is dense/idle
- [x] Toggle button (🌡️ on `<world-layers-toolbar>` → Overlays group) hides/shows the overlay
- [x] Heatmap resets when simulation restarts or world changes (and when toggled off)
- [x] No measurable FPS drop with heatmap off (recording + drawing both gated on `heatmapVisible`)
- [x] Rendering stays smooth (~60fps on car drawing) with heatmap on (viewport-culled, ~200 cells/frame)

## Implementation notes (deviations from the original spec)

- **Toggle location** — moved from the `<layout-toolbar>` (panel layout) to the
  `<world-layers-toolbar>` (a new "Overlays" group), which is the natural home
  for a per-frame render overlay. The `<layout-toolbar>` stays limited to
  panel-visibility (camera / visualizer / mini-map) toggles.
- **`HeatmapGrid` signature** — the spec proposed
  `HeatmapGrid(worldWidth, worldHeight, cellSize?)`; the implementation is
  `HeatmapGrid(cellSize?)` with **lazy cell creation**. There is no need to size
  the grid to the world up front — cells are created on first write, so memory
  is proportional to the area that has ever seen traffic, not the full map.
  This also removes the need to recompute bounds on world change.
- **`HeatmapRenderer`** — the spec proposed an offscreen-canvas cache redrawn
  at ~4 fps. The implementation draws directly to the game context each render
  frame: viewport culling keeps the per-frame cell count to ~200, cheap enough
  that the extra offscreen canvas + redraw bookkeeping is not worth it.
- **Shared infrastructure** — `HeatmapGrid`/`HeatmapRenderer` are owned by
  `SimulatorShell` (not each simulator), exposed via `recordHeatmap` /
  `drawHeatmap` / `resetHeatmap` helpers. The three concrete simulators only
  add the record/draw/reset calls in their existing `update()`/`draw()` hooks.

## References

- `SpatialHashGrid` cell size: 150px (match for consistency)
- Hook pattern: Telemetry hooks into `SimulatorShell` render loop per roadmap rule
- Color utilities: `ts/math/color.ts` (`getRGBA`)
