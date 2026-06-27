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

## Zoom (Scroll Wheel)

```typescript
#handleMouseWheel(e: WheelEvent): void {
  e.preventDefault();  // Prevent page scroll

  const dir = Math.sign(e.deltaY);
  const step = 0.1;
  this.zoom += dir * step;
  this.zoom = Math.max(0.1, Math.min(5, this.zoom));  // Clamp to [0.1, 5]
}
```

| Input                   | Effect           |
| ----------------------- | ---------------- |
| Scroll down / pinch out | Zoom out (+zoom) |
| Scroll up / pinch in    | Zoom in (-zoom)  |
| Ctrl + scroll           | Same as scroll   |

**Zoom range**: 0.1 (10× zoomed in) to 5 (5× zoomed out).

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
  scaler: number; // World-to-minimap scale factor (default: 0.05)

  constructor(canvas, graph, size, scaler?);
  draw(options: MiniMapDrawOptions): void;
}

interface MiniMapDrawOptions {
  viewPoint: Point;
  cars: IMiniMapCar[]; // Passed in per frame (draw-time input, not stored)
  roadColor?: string;
  carColor?: string;
  backgroundColor?: string;
  viewport?: Viewport; // When provided, draws a ScaleIndicator overlay
  compactScaleIndicator?: boolean; // true = inline mode (default), false = standard mode
}
```

> The mini-map is **stateless**: cars are passed into `draw()` every frame
> rather than stored on the instance. `World.draw()` follows the same pattern —
> cars/bestCar are `WorldDrawOptions` inputs, not `World` fields.

When `viewport` is passed in `MiniMapDrawOptions`, a `ScaleIndicator` is lazy-initialized on first call and drawn in compact inline mode by default. The indicator uses the mini-map's own `scaler` as both `pixelsPerMeterMultiplier` and `zoomMultiplier` so the bar length and zoom text correctly reflect the mini-map scale.

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
this.miniMap.draw({ viewPoint, cars: this.trainingManager.cars });
```

### Usage in Race

```typescript
// If corridor exists: show corridor skeleton (cleaner)
const miniMapGraph = new Graph([], world.corridor.skeleton);
this.miniMap = new MiniMap(miniMapCanvas, miniMapGraph, 300, 0.1);

// Each frame:
this.miniMap.draw({ viewPoint, cars: this.cars });
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

class ScaleIndicator {
  constructor(
    canvasWidth: number,
    canvasHeight: number,
    viewport: Viewport,
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

For mini-map, pass the mini-map's own viewport in draw options:

```typescript
this.miniMap.draw({
  viewPoint,
  cars: [],
  viewport: this.miniMapViewport,
  compactScaleIndicator: true,
});
```

The indicator draws in **screen space** (resets the canvas transform with `setTransform(1,0,0,1,0,0)`) so it always appears at the same position regardless of pan/zoom state.
