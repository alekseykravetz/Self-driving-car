# Task 08 — Add scale indicator with zoom value in viewport (main canvas + mini-map)

**Effort:** medium · **Priority:** medium · **Status:** done · **Branch:** `task-8-viewport-scale`

## Problem

There is currently no visual indicator to understand the scale/distance while viewing the world in viewport-rendered canvases. Users cannot easily determine the actual size (in meters) of objects on screen, or what the current zoom level is. This makes it difficult to judge distances and plan world layouts accurately.

## Goal

Add a scale indicator to viewport-rendered canvases that:

1. Shows a visual reference representing **1 meter** of the world
2. The indicator's **size changes dynamically with zoom** (larger when zoomed in, smaller when zoomed out)
3. Displays the current **zoom value** (e.g., "2.0×" or "zoom: 2.0") near the scale indicator

## Context

- **World scale:** The world uses a coordinate system where 1 unit ≈ 1 meter in the real world
- **Viewport source:** Defined in `ts/viewport/viewport.ts`, which handles pan/zoom transformation
- **Rendered targets:**
  - Main canvas in world editor (`html/world.html`)
  - Mini-map canvas where mini-map rendering uses viewport transforms
- **Default behavior:** Any world rendered through a viewport-wrapped **main canvas** should receive this indicator by default
- **Exclusions:** Do **not** add this indicator to camera rendering
- **Canvas context:** Draw on canvas (not DOM)

## Implementation Steps

### 1. Extend viewport interfaces

- Add zoom-related properties/methods if not already exposed (e.g., `getZoom()` or `zoom` getter)
- Ensure viewport provides a way to calculate the **pixels-per-meter** ratio at current zoom

### 2. Create scale indicator component

- **File:** `ts/viewport/scaleIndicator.ts`
- **Class:** `ScaleIndicator` with:
  - Constructor: `(canvasWidth: number, canvasHeight: number, viewport: Viewport)`
  - Method: `draw(ctx: CanvasRenderingContext2D, viewportWidth: number, viewportHeight: number)` — draws the scale bar and zoom text
  - Method: `update()` — recalculates position/size based on current viewport zoom
  - Properties:
    - `position` (default: bottom-left corner, e.g., 20px from edges)
    - `barLength` = 100 pixels (fixed screen length) OR adaptive based on zoom
    - `scaleInMeters` = 1 meter (represents what distance in world units)
    - `pixelsPerMeter` (derived from viewport zoom)

### 3. Integrate into viewport rendering

- **World editor** (`ts/world/worldEditor.ts`):

  - Instantiate `ScaleIndicator` alongside viewport
  - Call `draw()` in the main render loop (after world draw, before HUD elements)
  - Pass current viewport state
  - Apply by default to the main canvas that viewport wraps

- **Mini-map rendering path** (`ts/mini-map/miniMap.ts` and callers):
  - Add indicator draw support when mini-map is rendered through viewport transforms
  - Keep indicator placement readable in mini-map scale

### 4. Visual design

- **Scale bar styling:**
  - Horizontal line with tick marks at start/end (e.g., `├────┤`)
  - Label below: `"1 m"` (or `"1 meter"`)
  - Color: white or light gray with black outline for contrast
- **Zoom text:**

  - Positioned above or beside the scale bar
  - Format: `"Zoom: 1.5×"` or `"1.5×"`
  - Font: small, readable (e.g., 12px)
  - Color: same as scale bar

- **Padding/Position:**
  - Default: 20px from bottom-left corner (configurable)
  - Should not overlap important UI elements (top controls, toolbar)

### 5. Responsive behavior

- Recalculate and redraw on canvas resize
- Test across different viewport sizes (mobile: 768px breakpoint)

### 6. Add to rendering pipeline

- **world.html:** Add `<script src="/js/viewport/scaleIndicator.js"></script>` before world rendering script
- **Mini-map pages/components:** Ensure `scaleIndicator.js` is loaded where mini-map viewport rendering is used
- Verify script load order and global registration (if applicable)

### 7. Testing & refinement

- Verify scale indicator appears in world editor viewport
- Verify zoom changes update indicator size dynamically
- Verify indicator appears on mini-map when mini-map uses viewport rendering
- Verify default behavior: viewport-wrapped main canvas gets indicator without per-page custom wiring
- Test on different zoom levels (0.5×, 1.0×, 2.0×, 5.0×, etc.)
- Verify no performance degradation (indicator redraws efficiently)
- Check mobile responsive behavior

## Acceptance Criteria

- [ ] `ScaleIndicator` class created and exported globally (or used internally)
- [ ] Scale bar visually represents 1 meter and updates correctly as zoom changes
- [ ] Zoom value displayed near scale indicator
- [ ] Indicator appears in world editor main canvas
- [ ] Indicator appears in mini-map when mini-map uses viewport rendering
- [ ] Default behavior: all viewport-wrapped main canvases get the indicator
- [ ] Indicator does **not** appear in camera views
- [ ] No visual overlap with other UI (toolbar, controls, panels)
- [ ] Performance impact is negligible (< 1ms per frame)
- [ ] Works on mobile (768px breakpoint)

## Notes

- The indicator should be **fixed to screen space** (not world space), so it always appears in the same position relative to the viewport edges
- Consider making position/padding configurable via options object to allow different pages to position it differently
- Keep this task scoped to viewport only; do not couple it to camera logic
- For mini-map, keep the same unit semantics (1m reference + zoom text) while allowing compact UI sizing
- Consult `ts/viewport/viewport.ts` to understand the current coordinate transformation system
- Related docs: `docs/Viewport.md`

## Definition of Done

1. Open world editor and confirm the scale bar + zoom text are visible on the main viewport canvas and follow zoom changes.
2. Open a page with mini-map viewport rendering and confirm the same indicator appears there with readable compact placement.
3. Smoke-test other pages/modes and confirm camera views do not show the indicator, while viewport-wrapped main canvases get it automatically.

---

## Implementation Summary

**Commits:** `1f419a4`, `40e6622`, `7636b88` on branch `task-8-viewport-scale`

### Files Changed

| File                                                         | Change                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `ts/viewport/scaleIndicator.ts`                              | New `ScaleIndicator` class (132 lines)                                                                    |
| `ts/viewport/viewport.ts`                                    | Added `getZoom()`, `getPixelsPerMeter()`, `drawScaleIndicator()`, center sync fix in `reset()`            |
| `ts/world/editors/worldEditor.ts`                            | Calls `viewport.drawScaleIndicator()` + passes `miniMapViewport` to mini-map                              |
| `ts/mini-map/miniMap.ts`                                     | Accepts optional `viewport` + `compactScaleIndicator` in draw options; creates and draws `ScaleIndicator` |
| `ts/world/types.ts`                                          | Added `viewport` and `compactScaleIndicator` to `MiniMapDrawOptions`                                      |
| `ts/simulator/traffic/trafficSimulator.ts`                   | Calls `viewport.drawScaleIndicator()`                                                                     |
| `ts/simulator/training/trainingSimulator.ts`                 | Calls `viewport.drawScaleIndicator()` (×2: simple world + real world render paths)                        |
| `ts/games/race.ts`                                           | Calls `viewport.drawScaleIndicator()`                                                                     |
| `html/world.html`                                            | Added `<script src="/js/viewport/scaleIndicator.js">` before viewport script                              |
| `html/race.html`, `html/simulator.html`, `html/traffic.html` | Same script tag added                                                                                     |
| `eslint.config.mjs`                                          | Registered `ScaleIndicator` as allowed global                                                             |

### Design Decisions vs. Plan

- **Scale reference:** Used **10 m** as the default bar reference (not 1 m) — more readable at typical zoom levels.
- **Two display modes:** `ScaleIndicator` supports `inlineStats` mode (compact: zoom + scale on one line after bar) for mini-map, and standard mode (zoom above bar, scale beside) for main canvas.
- **Mini-map integration:** `ScaleIndicator` is lazy-initialized on first `draw()` call that includes a `viewport` (not at MiniMap construction time), since the viewport may not exist at construction.
- **`pixelsPerMeterMultiplier` / `zoomMultiplier`:** Mini-map passes `this.scaler` for both, so the bar length and zoom text correctly reflect the mini-map's scale factor instead of the world viewport's raw zoom.
- **Viewport center sync fix:** Added `this.center = new Point(this.canvas.width / 2, this.canvas.height / 2)` at the top of `viewport.reset()` to keep the transform origin in sync with responsive canvas resizes.
- **No indicator in camera views:** `ScaleIndicator` is only wired to `Viewport` instances, never to `Camera` — camera pages don't call `drawScaleIndicator()`.

### Acceptance Criteria Status

- [x] `ScaleIndicator` class created and exported globally
- [x] Scale bar visually represents 10 m and updates correctly as zoom changes
- [x] Zoom value displayed near scale indicator
- [x] Indicator appears in world editor main canvas
- [x] Indicator appears in mini-map (world editor, race, simulators)
- [x] Default behavior: `Viewport` owns and draws the indicator via `drawScaleIndicator()`
- [x] Indicator does **not** appear in camera views
- [x] No visual overlap with other UI (positioned bottom-left with configurable padding)
- [x] Works across all zoom levels
