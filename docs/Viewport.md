# Viewport System

The `ts/viewport/viewport.ts` module provides 2D pan-and-zoom navigation for the top-down canvas view. It manages coordinate transformations between screen space and world space.

---

## Class Structure

```typescript
interface DragState {
  start: Point; // Position where drag started (world coords)
  end: Point; // Current position during drag (world coords)
  offset: Point; // Vector difference (end - start)
  active: boolean; // Is a drag currently in progress?
}

class Viewport {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  zoom: number; // Zoom level (1 = 100%, >1 = zoomed out, <1 = zoomed in)
  center: Point; // Center of the canvas element (pixels, fixed)
  offset: Point; // World offset (how far the "camera" has moved)
  drag: DragState; // Current drag operation state

  constructor(canvas: HTMLCanvasElement, zoom?: number, offset?: Point);

  // Transform methods
  reset(): void; // Apply transform to context (also syncs center to canvas size)
  getMouse(e: MouseEvent, subtractDragOffset?): Point; // Screen → world coords
  getOffset(): Point; // Total offset (permanent + drag)

  // Zoom / scale accessors
  getZoom(): number; // Returns current zoom value
  getPixelsPerMeter(): number; // Returns WORLD_PIXELS_PER_METER / zoom

  // Viewport culling
  getVisibleBounds(margin?): VisibleWorldRect; // Visible world-space AABB

  // Touch / pointer
  setTouchPanMode(mode: 'one-finger' | 'two-finger-only'): void;
  recenterOn(worldPoint: Point): void; // Center the view on a world point

  // Scale indicator
  drawScaleIndicator(
    ctx?: CanvasRenderingContext2D, // defaults to this.ctx
    viewportWidth?: number, // defaults to canvas.width
    viewportHeight?: number, // defaults to canvas.height
  ): void;

  // Lifecycle
  // (Event listeners auto-attached in constructor)
}
```

---

## Coordinate System

### World Space

- Origin: (0, 0) at the center of the world
- Y-axis: negative = up, positive = down
- Units: pixels (1 unit = 1 pixel at zoom = 1)

### Screen Space

- Origin: (0, 0) at top-left of canvas
- Center: (canvas.width/2, canvas.height/2)

### Transformation Formula

```
Screen → World:
  worldX = (screenX - canvasCenter.x) * zoom - offset.x
  worldY = (screenY - canvasCenter.y) * zoom - offset.y

World → Screen (via canvas transform):
  ctx.translate(center.x, center.y)
  ctx.scale(1/zoom, 1/zoom)
  ctx.translate(offset.x, offset.y)
```

The `zoom` value works inversely: `zoom = 2` means the world is rendered at 50% size (zoomed out). `zoom = 0.5` means 200% size (zoomed in).

---

## Reset (Per-Frame Transform Application)

Called at the start of each render loop:

```typescript
reset(): void {
  // Sync center to canvas dimensions (handles responsive resizes)
  this.center = new Point(this.canvas.width / 2, this.canvas.height / 2);

  this.ctx.restore();   // Clear previous frame's transform
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  this.ctx.save();      // Save clean state

  // Apply viewport transform:
  this.ctx.translate(this.center.x, this.center.y);   // Move origin to canvas center
  this.ctx.scale(1 / this.zoom, 1 / this.zoom);       // Apply zoom
  const totalOffset = this.getOffset();
  this.ctx.translate(totalOffset.x, totalOffset.y);    // Apply pan offset
}
```

After `reset()`, all subsequent drawing operations use world coordinates automatically.

---

## Mouse → World Coordinate Conversion

```typescript
getMouse(e: MouseEvent, subtractDragOffset: boolean = false): Point {
  const p = new Point(
    (e.offsetX - this.center.x) * this.zoom - this.offset.x,
    (e.offsetY - this.center.y) * this.zoom - this.offset.y,
  );
  return subtractDragOffset ? subtract(p, this.drag.offset) : p;
}
```

**Parameters:**

- `e`: MouseEvent from canvas
- `subtractDragOffset`: When true, returns the position ignoring the temporary drag offset. Used by editor tools that shouldn't move during panning.

---

## Pan (Middle-Click Drag)

### Mouse Down (initiate pan)

```typescript
#handleMouseDown(e: MouseEvent): void {
  if (e.button === 1) {  // Middle mouse button
    this.drag.start = this.getMouse(e);
    this.drag.active = true;
  }
}
```

### Mouse Move (update offset during drag)

```typescript
#handleMouseMove(e: MouseEvent): void {
  if (this.drag.active) {
    this.drag.end = this.getMouse(e);
    this.drag.offset = subtract(this.drag.end, this.drag.start);
  }
}
```

### Mouse Up (finalize pan)

```typescript
#handleMouseUp(e: MouseEvent): void {
  if (this.drag.active && e.button === 1) {
    this.offset = add(this.offset, this.drag.offset);  // Commit drag to permanent offset
    this.#resetDrag();  // Clear drag state
  }
}
```

**Key behavior**: During drag, `getOffset()` returns `offset + drag.offset` (sum of permanent + temporary). On release, the temporary drag offset is committed to the permanent offset.

---

## Viewport Culling (`getVisibleBounds`)

`getVisibleBounds(margin = 0): VisibleWorldRect` returns the axis-aligned
world-space rectangle currently visible on the canvas. It mirrors the transform
applied in `reset()`: the screen center maps to `-getOffset()` in world space,
and one canvas pixel spans `zoom` world units, so:

```typescript
const centerX = -getOffset().x;
const halfW = (canvas.width / 2) * zoom;
// minX = centerX - halfW - margin,  maxX = centerX + halfW + margin  (same for Y)
```

Callers pass the result as `WorldDrawOptions.screenBounds`, and `World.draw()`
skips any road envelope, border, lane marking, parking glyph, bridge polygon, or
marking whose bounding box (expanded by `WORLD_CULL_MARGIN_PX = 300`) lies
off-screen. On large OSM maps this is the single biggest render win — drawing
drops from "the whole city" to "what's on screen." When `screenBounds` is
omitted, nothing is culled (behavior-preserving fallback for tests / off-screen
renders). Buildings and trees keep their orthogonal `renderRadius` distance
cull, but it filters/sorts by each item's cached centroid
(`Building.center`/`Tree.center`) with a plain O(1) squared-distance check
rather than `Polygon.distanceToPoint` — the latter walks every edge of the
footprint polygon (32 for a tree canopy) and was the dominant per-frame cost on
big OSM imports (see
[Math § Render-time distance culling](Math.md#render-time-distance-culling-for-buildingstreescamera-perf)).
The math is unit-tested in `tests/unit/viewport/viewport.test.ts`.

---

## Zoom (Scroll Wheel)

```typescript
#handleMouseWheel(e: WheelEvent): void {
  e.preventDefault();  // Prevent page scroll

  const dir = Math.sign(e.deltaY);
  const step = 0.1;
  this.zoom += dir * step;
  this.zoom = Math.max(0.8, Math.min(10, this.zoom));  // Clamp to [0.8, 10]
}
```

| Input                   | Effect           |
| ----------------------- | ---------------- |
| Scroll down / pinch out | Zoom out (+zoom) |
| Scroll up / pinch in    | Zoom in (−zoom)  |
| Ctrl + scroll           | Same as scroll   |

The wheel direction follows the conventional map/design-tool behavior:
scrolling **up/forward zooms in**, scrolling **down/back zooms out**. Because a
higher `zoom` value means _more zoomed out_ (`ctx.scale(1/zoom, 1/zoom)`),
scrolling up decreases `zoom` and scrolling down increases it.

**Zoom range**: 0.8 (zoomed in) to 30 (zoomed out — raised from 10 so a whole
city of spawned traffic fits on screen; see the Live Traffic Jam simulator).

---

## Event Listener Setup

```typescript
#addEventListeners(): void {
  this.canvas.addEventListener('wheel', this.boundHandleMouseWheel, { passive: false });
  this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
  this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
  window.addEventListener('mouseup', this.boundHandleMouseUp);
  // mouseup on window: catches release even if mouse leaves canvas
}
```

**Note**: `mouseup` is on `window` rather than the canvas — this handles the case where the user drags outside the canvas boundaries and releases.

---

## Touch & Pointer Gestures

Touch/pen input is handled by a `PointerGestures` recognizer
(`ts/input/pointerGestures.ts`) attached alongside the mouse listeners. Mouse
pointers are ignored by the recognizer, so desktop behavior is unchanged; only
`touch`/`pen` pointers are turned into gestures:

| Gesture                              | Result                                    |
| ------------------------------------ | ----------------------------------------- |
| One-finger drag                      | Pan (in `one-finger` mode)                |
| Pinch (two fingers)                  | Zoom toward the finger midpoint           |
| Two-finger drag                      | Pan                                       |
| Long-press (500 ms) / two-finger tap | Secondary action (right-click equivalent) |

`setTouchPanMode('two-finger-only')` suppresses single-finger pan so those
touches flow to another consumer — the world editor uses this so a single
finger draws/selects while two fingers pan/zoom. Simulators stay on
`one-finger`. Pinch keeps the focal world point fixed under the fingers by
recomputing `offset` after changing `zoom`. `recenterOn(worldPoint)` moves the
view so a world point sits at the canvas center (used by mini-map tap-to-navigate).

App-page canvases set `touch-action: none` (see `styles/atoms/_base.css`) and
the 5 app HTML pages use `user-scalable=no` so the browser's own scroll/zoom
never competes with these gestures.

---

## Viewport in Simulator (Auto-Tracking)

When tracking is enabled (best car or KEYS car), the simulator updates the viewport offset each frame:

```typescript
// In animate():
const target = getTrackTarget(trackingMode, bestCar, keysCar);
if (target && this.viewport) {
  this.viewport.offset = new Point(-target.x, -target.y);
}
```

This centers the viewport on the tracked car. When tracking is disabled (`none`), the offset is not updated, allowing free manual navigation.

---

## Viewport State Persistence

World files save the viewport state:

```typescript
// In world serialization:
{
  zoom: viewport.zoom,
  offset: { x: viewport.offset.x, y: viewport.offset.y }
}
```

When a world is loaded, the viewport is reconstructed with the saved zoom and offset:

```typescript
this.viewport = new Viewport(this.gameCanvas, world.zoom, world.offset);
```

---

## Mini-Map (`ts/mini-map/miniMap.ts`)

### Class Structure

```typescript
interface IMiniMapCar {
  x: number;
  y: number;
  damaged: boolean;
  color: string;
}

class MiniMap {
  canvas: HTMLCanvasElement;
  graph: Graph;
  size: number; // Canvas dimension (square)
  #scaler: number; // World-to-minimap scale factor (default: 0.05)

  constructor(canvas, graph, size, scaler?);
  draw(options: MiniMapDrawOptions): void;

  // Scroll-to-zoom support (wired on every simulator + the world editor via
  // `wireMiniMapWheelZoom`). Clamped to [0.005, 0.3], stepped by ×1.25 per call.
  getScaler(): number;
  zoomIn(): void;
  zoomOut(): void;
}

interface MiniMapDrawOptions {
  viewPoint: Point;
  cars: IMiniMapCar[]; // Passed in per frame (draw-time input, not stored)
  roadColor?: string;
  carColor?: string;
  backgroundColor?: string;
  mainViewportZoom?: number; // Main viewport zoom for one-way sync (see below)
  compactScaleIndicator?: boolean; // true = inline mode (default), false = standard mode
  showScaleIndicator?: boolean; // Draw the ScaleIndicator overlay (default: true)
}
```

> The mini-map is **stateless**: cars are passed into `draw()` every frame
> rather than stored on the instance. `World.draw()` follows the same pattern —
> cars/bestCar are `WorldDrawOptions` inputs, not `World` fields.

### Scale indicator (always on)

The `ScaleIndicator` overlay is drawn by default (`showScaleIndicator` defaults
to `true`) on **every** mini-map — all simulators (training, human-backprop,
traffic, race) and the world editor — not just the world editor. It is
lazy-initialized on first `draw()` and rendered in compact inline mode by
default. The mini-map drives the indicator through a small `ZoomSource` adapter
over its own live `#scaler` (`getZoom()` / `getPixelsPerMeter()`), so the bar
length and zoom text always reflect the current mini-map scale — no external
`Viewport` instance is needed.

### One-way zoom sync

Pass `mainViewportZoom` (the main top-down viewport's current `zoom`) every
frame to keep the mini-map's scale following the main viewport **proportionally
and one-way**:

- Zooming the **main viewport** (scroll over the game canvas) scales the
  mini-map by the same factor.
- Zooming the **mini-map** (scroll over the mini-map canvas, via
  `wireMiniMapWheelZoom`) only changes the mini-map's own scaler — it **never**
  writes back to the main viewport.

Internally, `#syncToMainZoom(mainZoom)` records the last main zoom it saw and, on
the next differing value, multiplies the mini-map scaler by
`lastMainZoom / mainZoom`. The first call just records the baseline. This holds
identically in the world editor and all simulators.

```typescript
// Wire scroll-to-zoom once (constructor). getMiniMap is lazy so it survives
// mini-map instances recreated on world/mode reload.
wireMiniMapWheelZoom(this.miniMapCanvas, () => this.miniMap);
```

### Touch input (mobile)

`miniMap.enableInput()` attaches a `PointerGestures` recognizer to the mini-map
canvas. A one-finger **tap or drag** recenters the main viewport on the touched
location (host wires `miniMap.setOnRecenter((p) => viewport.recenterOn(p))`),
and a **pinch** zooms the mini-map's own scaler. The tapped pixel is converted
back to a world coordinate with the inverse of `draw()`'s transform, using the
last drawn `viewPoint`. Wired in the training (simple + world), traffic,
human-backprop, and world-editor hosts (not race, whose view follows the car).

### Rendering

```typescript
draw(options: MiniMapDrawOptions): void {
  const { viewPoint, cars } = options;
  ctx.clearRect(0, 0, size, size);

  // Center on viewPoint (scaled)
  const scaledViewPoint = scale(viewPoint, -this.scaler);
  ctx.translate(scaledViewPoint.x + size/2, scaledViewPoint.y + size/2);
  ctx.scale(this.scaler, this.scaler);

  // Draw road network (graph segments)
  for (const segment of this.graph.segments) {
    segment.draw(ctx, { width: 3/scaler, color: 'white', cap: 'round' });
  }

  // Draw cars as colored dots
  for (const car of cars) {
    ctx.arc(car.x, car.y, (car.damaged ? 2 : 3) / scaler, 0, Math.PI * 2);
    ctx.fillStyle = car.damaged ? 'gray' : car.color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.stroke();
  }
}
```

**Key features:**

- World is scaled down by factor 0.05 (20× smaller)
- Centered on the current viewPoint (follows tracked car)
- Cars drawn as colored circles (damaged = gray, smaller)
- Road segments drawn as thick white lines
- Line width and car size scaled inversely to maintain visibility

### Usage in Simulator

```typescript
this.miniMap = new MiniMap(miniMapCanvas, world.graph, 300);

// Each frame (cars passed in, not stored):
this.miniMap.draw({
  viewPoint,
  cars: this.trainingManager.cars,
  mainViewportZoom: this.viewport.zoom,
});
```

### Usage in Race

```typescript
// If corridor exists: show corridor skeleton (cleaner)
const miniMapGraph = new Graph([], world.corridor.skeleton);
this.miniMap = new MiniMap(miniMapCanvas, miniMapGraph, 300, 0.1);

// Each frame:
this.miniMap.draw({
  viewPoint,
  cars: this.cars,
  mainViewportZoom: this.viewport.zoom,
});
```

---

## Scale Indicator (`ts/viewport/scaleIndicator.ts`)

The `ScaleIndicator` class draws a fixed-screen-space HUD overlay showing a distance scale bar and the current zoom level. It is owned by `Viewport` and exposed via `drawScaleIndicator()`.

### Class Structure

```typescript
interface ScaleIndicatorOptions {
  paddingX?: number; // Pixels from left edge (default: 20)
  paddingY?: number; // Pixels from bottom edge (default: 20)
  lineColor?: string; // Bar/text color (default: '#f5f5f5')
  outlineColor?: string; // Shadow/outline color (default: 'rgba(0,0,0,0.8)')
  fontSize?: number; // Label font size in px (default: 12)
  lineWidth?: number; // Bar stroke width (default: 2)
  scaleInMeters?: number; // Reference distance in meters (default: 10)
  pixelsPerMeterMultiplier?: number; // Multiplier for non-1:1 canvases (default: 1)
  zoomMultiplier?: number; // Multiplier for displayed zoom text (default: 1)
  inlineStats?: boolean; // Compact inline layout (default: false)
  statSeparator?: string; // Separator in inline mode (default: ' • ')
}

// A ScaleIndicator only needs a zoom source, not a full Viewport. `Viewport`
// implements this; the mini-map supplies a small adapter over its own scaler.
interface ZoomSource {
  getZoom(): number;
  getPixelsPerMeter(): number;
}

class ScaleIndicator {
  constructor(
    canvasWidth: number,
    canvasHeight: number,
    viewport: ZoomSource,
    options?: ScaleIndicatorOptions,
  );

  update(viewportWidth?: number, viewportHeight?: number): void;
  draw(
    ctx: CanvasRenderingContext2D,
    viewportWidth: number,
    viewportHeight: number,
  ): void;
}
```

### Display Modes

**Standard mode** (`inlineStats: false`, default — used on main canvas):

```
Zoom: 1.50x
├────────────┤ 10 m
```

Zoom label above bar, distance label to the right.

**Inline/compact mode** (`inlineStats: true` — used on mini-map):

```
├──────┤ 1.50x • 10 m
```

Zoom and scale on one line after the bar. Smaller font and padding.

### Integration

`Viewport` creates and owns a `ScaleIndicator` in its constructor. Call `drawScaleIndicator()` after all world/game drawing but before any other HUD elements:

```typescript
// In render loop — after world draw, before HUD:
this.viewport.drawScaleIndicator(this.gameCtx);
```

The mini-map builds its own `ScaleIndicator` from a `ZoomSource` adapter over
its live scaler (no separate `Viewport` needed). Callers just pass
`mainViewportZoom` for the one-way sync; the indicator shows by default:

```typescript
this.miniMap.draw({
  viewPoint,
  cars: [],
  mainViewportZoom: this.viewport.zoom,
  compactScaleIndicator: true,
  // showScaleIndicator defaults to true — pass false to hide it
});
```

The indicator draws in **screen space** (resets the canvas transform with `setTransform(1,0,0,1,0,0)`) so it always appears at the same position regardless of pan/zoom state.
