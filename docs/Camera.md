# Camera & 3D Rendering

The camera system in `ts/camera/` provides pseudo-3D perspective rendering by projecting 2D world geometry into a first-person viewpoint.

---

## File Structure (`ts/camera/`)

| File               | Responsibility                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`         | Interfaces (`ICameraPoint`, `IColoredPolygon`, `ICameraRenderOptions`)                                                       |
| `extrusion.ts`     | Pure geometry functions for 3D extrusion (buildings, cars, trees) and flat ground paint (quads, dashes, zebra)               |
| `roadText.ts`      | Tiny stroke vector font for painting road words (STOP / YIELD) flat on the tarmac                                            |
| `cameraFrustum.ts` | `CameraFrustum` — view-frustum/projection math (frustum points, point projection, visibility filtering, near-plane clipping) |
| `camera.ts`        | Camera class (movement, scene assembly, rendering); delegates frustum/projection math to `CameraFrustum`                     |

---

## Camera Class (`ts/camera/camera.ts`)

### Structure

```typescript
interface ICameraPoint {
  x: number;
  y: number;
  angle: number;
}

interface ICameraRenderOptions {
  keyCar?: Car; // Car camera follows (full detail 3D)
  bestCar?: Car; // Best AI car (gold highlight)
  cars?: Car[]; // All scene cars; non-key/non-best drawn as flat shadows
  traffic?: Car[]; // Traffic/opponent cars (smaller 3D)
  showTrees?: boolean; // Omit trees from the 3D scene (perf). Default true
  showBuildings?: boolean; // Omit buildings from the 3D scene (perf). Default true
  debugCtx?: CanvasRenderingContext2D; // Optional debug canvas for raw polygons
}

class Camera implements ICameraPoint {
  // Position
  x: number; // World X position
  y: number; // World Y position
  z: number; // Height/elevation (fixed at -40)
  angle: number; // Heading direction (radians)

  // Configuration
  range: number; // View distance (default: 1000)
  distanceBehind: number; // Offset behind target car (default: 100)

  // Frustum geometry
  center: Point; // Camera position as Point
  tip: Point; // Front of view cone
  left: Point; // Left edge of view cone (45° left)
  right: Point; // Right edge of view cone (45° right)
  polygon: Polygon; // View frustum as triangle (for culling)

  // Methods
  move(target: ICameraPoint): void; // Smooth interpolation follow
  simpleMove(target: ICameraPoint): void; // Instant snap (no lerp)
  render(ctx, world: IWorld, options?: ICameraRenderOptions): void;
  draw(ctx: CanvasRenderingContext2D): void; // Debug: draw frustum outline
}
```

---

## Camera Movement

### Smooth Following (`move`)

```typescript
move(target: ICameraPoint): void {
  const t = 0.15;  // Interpolation factor (smoothing)
  this.x = lerp(this.x, target.x + this.distanceBehind * Math.sin(target.angle), t);
  this.y = lerp(this.y, target.y + this.distanceBehind * Math.cos(target.angle), t);
  this.angle = lerp(this.angle, target.angle, t);
  // delegates to CameraFrustum#updateFrustumPoints, copying the result onto
  // this.center/tip/left/right/polygon
  this.#applyFrustumUpdate();
}
```

The camera smoothly follows the target car with a lag factor of 0.15. The position is offset `distanceBehind` units behind the target (in the direction opposite to the target's heading), creating natural-feeling third-person camera movement.

**Smoothing behavior**: At `t = 0.15`, the camera covers 15% of the remaining distance each frame. This means:

- After 10 frames: ~80% caught up
- After 20 frames: ~96% caught up
- Result: smooth, lag-free following without jarring snaps

### Instant Snap (`simpleMove`)

Sets position directly without interpolation — used for initial placement or teleportation to avoid the camera slowly drifting from a distant position.

### Frustum Update (`CameraFrustum#updateFrustumPoints`)

After each position change, `Camera` calls `CameraFrustum#updateFrustumPoints(x, y, z, angle, range)` and copies the result onto its own public `center`/`tip`/`left`/`right`/`polygon` fields (preserving the public API for external readers/tests). The view frustum triangle is recalculated as:

```
center = (x, y)                           // Camera's position

tip = (x - sin(angle) * range,            // Point at front of view
       y - cos(angle) * range)

left = (x - sin(angle - π/4) * range,     // Left edge (45° left)
        y - cos(angle - π/4) * range)

right = (x - sin(angle + π/4) * range,    // Right edge (45° right)
         y - cos(angle + π/4) * range)

polygon = Polygon([center, left, right])   // Triangle frustum (90° FOV)
```

The frustum is a triangle with 90° field of view. Everything outside this triangle is culled from rendering.

---

## View Frustum Culling (`CameraFrustum#filter`)

Before rendering, all world polygons are tested against the camera's triangular view frustum (`Camera` delegates via `this.#frustum.filter(...)`):

```typescript
filter(polygons: Polygon[]): Polygon[] {
  const filtered: Polygon[] = [];
  for (const polygon of polygons) {
    if (this.polygon.containsPolygon(polygon)) {
      // Fully inside frustum → keep as-is
      filtered.push(polygon);
    } else if (polygon.intersectsPolygon(this.polygon)) {
      // Partially inside → clip at frustum boundary
      // Break polygon at intersection points, keep interior points
      filtered.push(clippedPolygon);
    }
    // Fully outside → discard (not added to filtered)
  }
  return filtered;
}
```

This significantly reduces rendering work — only visible geometry reaches the projection stage.

### Performance: distance pre-filter before frustum math

`Polygon.intersectsPolygon`/`containsPolygon` have no bounding-box
short-circuit — they run the full edge×edge intersection test regardless of
how far the polygon is from the frustum. On a whole-city OSM import this made
`#getPolygons` the dominant per-frame cost even with only a handful of cars
training, since every building and every tree (a 32-vertex canopy polygon) in
the world was pushed through `filter()`.

`Camera#getPolygons` now pre-filters `world.buildings`/`world.trees` with a
cheap O(1) squared-distance check against each item's cached centroid
(`Building.center`/`Tree.center`) before calling `this.#frustum.filter(...)`
(`Camera#withinRange(center, margin)`, margin = `boundingRadius`/`size`). Only
items that could possibly reach within `range` of the camera pay for the
expensive intersection/clip path. See
[Math § Render-time distance culling](Math.md#render-time-distance-culling-for-buildingstreescamera-perf).

The same pattern was extended to the two remaining unfiltered inputs:

- **Road-border segments** were mapped straight to `new Polygon([p1, p2])` and
  run through `filter()` (allocating a polygon + an `intersectsPolygon` test
  per border, every frame). They are now pre-rejected by
  `s.distanceToPoint(this.center) <= this.range + 1`. The frustum triangle's
  farthest point is exactly `range` from the camera centre, so any segment that
  can intersect it has a point within `range` — the distance test is a correct
  superset (no popping).
- **Painted markings** (`world.markings`) are pre-filtered by
  `#withinRange(m.center, m.width)` before the frustum `intersectsPolygon`
  test, so thousands of city markings no longer each pay the polygon test.

---

## 3D Projection (`CameraFrustum#projectPoint`)

Converts world 2D+Z coordinates to screen perspective coordinates (`Camera` delegates via `this.#frustum.projectPoint(...)`):

```typescript
projectPoint(ctx: CanvasRenderingContext2D, p: Point): Point {
  // 1. Project point onto the camera's forward axis (center → tip). The
  //    Segment is cached per-frame in updateFrustumPoints (#projSegment) so
  //    projecting N points allocates one Segment, not N.
  const { point: p1 } = this.#projSegment.projectPoint(p);

  // 2. Calculate lateral offset via 2D cross product. The camera position
  //    equals the frustum centre, so reuse #center instead of a fresh Point.
  const c = cross(subtract(p1, this.center), subtract(p, this.center));
  const x = (Math.sign(c) * distance(p, p1)) / distance(this.center, p1);

  // 3. Calculate vertical offset from Z coordinate
  const y = (p.z - this.z) / distance(this.center, p1);

  // 4. Scale to canvas coordinates
  const scaler = Math.max(ctx.canvas.width / 2, ctx.canvas.height / 2);
  const cX = ctx.canvas.width / 2;
  const cY = ctx.canvas.height / 2;
  return new Point(cX + x * scaler, cY + y * scaler);
}
```

**Key properties:**

- Objects further away appear smaller (division by distance to camera)
- Objects to the left/right of camera direction are offset horizontally
- Z coordinate provides vertical displacement (buildings rise up, ground is flat)
- The `scaler` normalizes to canvas dimensions

### Performance: per-frame allocation & depth-fade

Two hot spots surfaced once the geometry-culling above landed and the profile
became projection-bound:

- `projectPoint` previously allocated a `new Segment(center, tip)` **and** a
  `new Point(x, y)` on **every** projected vertex. The forward axis only
  changes when the camera moves, so it is now built once per frame in
  `updateFrustumPoints` (`#projSegment`), and the camera position is reused
  from `#center` (they are the same coordinates).
- `Camera.render()` computed each polygon's depth (for the alpha fade) with
  `Polygon.distanceToPoint`, which projects the camera onto **every edge** and
  spreads an array — per polygon, per frame. It now uses the nearest **vertex**
  distance (a plain O(points) squared-distance scan, no allocation), which is
  visually equivalent for the fade.

---

## 3D Extrusion

### Buildings (`extrudeBuildingShape`)

`Camera#buildBuildingPolygons` extrudes each footprint into a **house** — grey
walls + a flat ceiling + a red **pitched (gable) roof** — via
`extrudeBuildingShape(base, height, wallRatio)` in `ts/camera/extrusion.ts`.
This mirrors the 2D top-view `Building.draw()` recipe so the 3D camera reads as
houses, not featureless grey blocks.

```typescript
extrudeBuildingShape(
  base: Polygon,
  height = 200,          // per-building height (see below)
  wallRatio = 0.6,       // BUILDING_WALL_HEIGHT_RATIO
): { walls: Polygon[]; roof: Polygon[] } {
  // walls rise to height * wallRatio; the flat ceiling caps them
  // roof ridge (4-point footprints only) peaks at the FULL height,
  //   built from the midpoints of base edges 0→1 and 2→3
}
```

- **Per-building height.** The camera now uses `building.height` (falling back
  to `EXTRUDE_BUILDING_HEIGHT_PX = 200`) instead of a single fixed height, so
  OSM-imported buildings with real heights render at varied heights.
- **Roof only for rectangles.** The pitched roof is defined only for a 4-point
  base; any other footprint keeps the flat ceiling (matching the 2D fallback).
- **OSM footprints stay flat-roofed.** When `world.buildingSource === 'osm'`
  (arbitrary real outlines that don't suit a gable), `#buildBuildingPolygons`
  drops the roof and draws walls + flat ceiling only, coloured with the 2D
  top-view flat-roof palette (`FLAT_ROOF_WALL_FILL` walls, `FLAT_ROOF_FILL`
  ceiling, imported from `building.ts`) so they match the top view instead of a
  translucent grey block.
- **Colours** are named constants: `BUILDING_WALL_FILL` (grey walls/ceiling),
  `BUILDING_ROOF_FILL` (`#D44`), `BUILDING_ROOF_STROKE` (`#C44`).
- **Draw order** per building is walls (incl. ceiling) → roof, so the roof
  paints on top (painter's algorithm).
- **Unclipped whole-building draw.** Footprints are frustum-filtered with
  `filter([base], false)` (no near-edge clipping) so a rectangle keeps its 4
  points and still yields a pitched roof at the frustum edge; a building is only
  emitted when `CameraFrustum#fullyInFront(footprint)` is true, so a footprint
  straddling the camera doesn't project off-view walls as a floating artifact.

### Trees (`#extrudeTrees`)

Creates cone shapes from base polygons to a single centroid peak. Each tree is
filtered and extruded **individually** (`Camera#buildTreePolygons` loops per
tree rather than batch-filtering) so it can be extruded to its own
`tree.height` — there is no longer a single `EXTRUDE_TREE_HEIGHT_PX` constant.
Heights vary per instance by render type via `TREE_HEIGHT_RATIO` (`tree.ts`):
classic ≈ 1.25× the scaled canopy size (preserving the legacy ~200 px default),
conifers tall & narrow (1.9×), broadleaf clusters squat & wide (1.0×).

```typescript
// per tree: filter its base, skip if it straddles the camera, then
extrudeTreeShapes([base], tree.height); // cone from base edges to a centroid peak
```

This approach is robust regardless of how many base points survive frustum clipping — even with 2 base points, a valid triangle is formed.

### Cars (`#extrudeCar`)

Creates a detailed car model with:

1. **10-point base polygon** — front tapering, quarter points, middle, back
2. **Lower sides** — base edge to midline height (wheels area)
3. **Upper sides** — midline to ceiling (cabin area)
4. **Shaped roof** — sloped front windshield and rear window
5. **Front/back panels** — tapered shape for realistic silhouette

The car extrusion uses the car's actual dimensions, position, and angle to generate a full 3D model oriented correctly in world space.

---

## Render Options & Car Extrusion

| Option    | Style                                             | Purpose                             |
| --------- | ------------------------------------------------- | ----------------------------------- |
| `keyCar`  | Car's own color, full detail                      | Car the camera follows (always top) |
| `bestCar` | Gold highlight (`rgba(255, 200, 0, 0.6)`)         | Best AI car when different from key |
| `traffic` | Car's own color, slightly smaller (h=12, wheel=4) | Traffic/opponent cars               |

**Car shadows:** All cars passed via the `cars` option that are NOT the `keyCar` or `bestCar` are drawn as flat gray shadows on the ground (no extrusion, just the base polygon in gray).

**Best car:** The `bestCar` option (when set and different from `keyCar`) is extruded with the gold highlight; cars are an explicit render input, not read from world state.

### Usage Examples

```typescript
// Simple Mode Simulator
const keysCar = cars.find((c) => c.type === 'KEYS');
camera.move(bestCar);
camera.render(cameraCtx, world, {
  keyCar: keysCar || bestCar,
  bestCar: keysCar ? bestCar : undefined,
  cars, // AI population (drawn as shadows)
  traffic: simpleState.traffic,
});

// World Mode Simulator
camera.move(cameraTarget);
camera.render(cameraCtx, world, {
  keyCar: keysCar || currentBestCar,
  bestCar: keysCar ? currentBestCar : undefined,
  cars, // AI population (drawn as shadows)
  debugCtx, // Optional: raw polygon output for debugging
});

// Race Game
camera.move(myCar);
camera.render(cameraCtx, world, {
  keyCar: myCar,
  cars,
  traffic: cars.filter((c) => c !== myCar),
});
```

---

## Full Rendering Pipeline (`render`)

```
1. Gather world geometry:
   - Ground plane (a flat grass trapezoid covering the whole FOV)
   - world.envelopes → flat asphalt road surface (near-plane clipped)
   - world.graph.segments → lane markings (dividers, one-way, parking)
   - world.markings → zebra crossings, stop/yield paint + words, lights
   - world.buildings → base polygons
   - world.trees → base polygons
   - world.roadBorders → border walls (height 10)

2. Cull / clip:
   - Discrete objects (buildings, cars, trees) → frustum triangle (`CameraFrustum#filter`)
   - Road surface → near plane only (`CameraFrustum#nearPlaneClip`), so asphalt fills up
     to the camera with no gap (the frustum triangle collapses at the apex)
   - Ground-level lines → frustum-clipped visible range with world-anchored
     dashes (`Camera#emitRoadLine` / `CameraFrustum#visibleRange`), so paint stays put as the car moves

3. Extrude / build:
   - Buildings: per-building height, grey walls + flat ceiling + red pitched
     roof (`extrudeBuildingShape`); OSM footprints keep a flat roof
   - Trees: trunk + cone canopy, green
   - Roads (borders): height 10, dark gray walls
   - Traffic lights: short colour-coded gates by live state
   - Key/best/traffic cars: full detail car models

4. Project all 3D polygon points to 2D screen space
   → Each Point(x, y, z) → Point(screenX, screenY)

5. Draw in fixed layer order (back to front — no per-polygon depth sort)

6. Apply fog/distance effect while drawing:
   → alpha = max(0, (1 - distance/range)²)

7. Optionally draw raw polygons to debugCtx (skipping any tagged skipDebug,
   e.g. the synthetic ground plane)
```

### Layer Priority (back to front)

1. Ground plane (grass trapezoid, `skipDebug`)
2. Road surface (flat asphalt envelopes)
3. Lane markings (dividers, parking lines/bays)
4. Painted markings (zebra crossings, stop/yield paint + words, target)
5. Car shadows (flat, dark, on ground)
6. Road border walls
7. Building polygons (walls + ceiling, then pitched roof)
8. Tree polygons
9. Traffic-light gates
10. Traffic car polygons
11. Best car polygons (gold)
12. Key car polygons (always on top, never occluded)

---

## Ground-level detail (road surface, markings, signage)

Beyond the extruded objects, the camera paints the road itself and its markings
as **flat polygons at `z = 0` / `z = -1`**, gathered in `#getPolygons` and
mixed into the same painter's-order list.

### Ground plane

A single flat grass trapezoid covering the whole field of view, built from the
frustum's near corners (nudged just in front of the camera to avoid a
divide-by-zero in projection) out to `left`/`right` at `range`. Drawn first so
everything sits on top. Tagged `skipDebug = true` so it is omitted from the
top-view debug overlay.

### Road surface (near-plane clipping)

`world.envelopes` polygons are drawn flat as dark asphalt. They are clipped only
against the **near plane** (`CameraFrustum#nearPlaneClip` — a Sutherland–Hodgman clip against
a single line just ahead of the camera), **not** the frustum triangle. The
triangle collapses to a point at the camera and drops the wedge right in front
of it, which left a grass gap under/behind the car; the straight near plane
fills the asphalt continuously up to the camera. Off-screen sides project
harmlessly off the canvas; far envelopes are distance-culled by checking the
envelope's single-segment `skeleton` (O(1)) against `range` — cheaper than
calling `distanceToPoint` on the (multi-point, rounded) `envelope.polygon`.

### Lane markings (mirrors the 2D map)

Generated per `world.graph.segments`, matching `World.#drawLaneMarkings`:

- `laneCount = seg.lanes ?? (seg.oneWay ? 1 : 2)`; road width = `laneCount * LANE_WIDTH_PX`.
- **N−1 dividers** at each lane boundary. The **centre divider** is thicker with
  longer dashes (solid on hard-`separated` roads); other lane lines are thin
  dashes. **One-way** roads use thin dashes throughout. Roads with
  `laneMarkings === false` are left bare.
- **Parking lanes** (`parkingRight` / `parkingLeft`) get a solid boundary line at
  the driving-lane edge plus **bay ticks** across the parking lane on the tagged
  side(s) (`+perp` = right, matching the envelope's `lateralOffset` convention).

Each line is emitted via `Camera#emitRoadLine`, which frustum-clips it to its visible
range (`CameraFrustum#visibleRange`) and, for dashes, anchors the pattern to the segment's
fixed world start (`dashSegmentAnchored`) so the paint stays world-locked
instead of crawling as the camera moves.

### Traffic lights

`Light` markings become short colour-coded **gates** across the road: the
marking's base polygon extruded to height 34, filled by the light's live
`state` (green / yellow / red / off, read at draw time).

### Zebra crossings

`Crossing` markings render as individual white **stripes** (`zebraStripes`),
matching the 2D `Crossing.draw` look: bars span the full crossing depth
(`height`, along travel) and repeat across the road `width`.

### Stop / yield paint

`Stop` and `Yield` markings are painted like the 2D map: a white **line across
the road** plus the **word** written on the tarmac via the `roadText.ts` stroke
font (`textStrokeQuads`). The word runs across the road (reading horizontally for
the approaching driver). Per the canonical direction convention,
`directionVector` is the travel direction, so the letters stand upright ALONG it
directly — no 180° flip — and the line sits just above it.

### Flat-paint helpers (`extrusion.ts`)

| Helper                            | Purpose                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `segmentToFlatQuad`               | A flat rectangular quad centred on a segment (lane lines, stop lines)                |
| `dashSegmentAnchored`             | Dash quads within a `[tMin, tMax]` range, anchored to a fixed world start (no crawl) |
| `zebraStripes`                    | The white bars of a zebra crossing                                                   |
| `textStrokeQuads` (`roadText.ts`) | Stroke-font quads for a road word (STOP / YIELD)                                     |

---

## `getFake3dPoint` Utility (Top-Down View)

A simpler perspective projection used for individual items in the 2D top-down viewport (not the camera view):

```typescript
function getFake3dPoint(point: Point, viewPoint: Point, height: number): Point {
  const dir = normalize(subtract(point, viewPoint));
  const dist = distance(point, viewPoint);
  const scaler = Math.atan(dist / 300) / (Math.PI / 2);
  return add(point, scale(dir, height * scaler));
}
```

This creates a "pseudo-3D" parallax effect in the top-down view:

- Building tops are offset away from the viewer
- Closer buildings have more visible offset
- The `atan` function provides natural diminishing at distance
- Used by `Building.draw()` and `Tree.draw()` in the main viewport

---

## Debug Drawing (`draw`)

The camera can render its frustum outline on the game canvas for debugging:

```typescript
draw(ctx: CanvasRenderingContext2D): void {
  // Draw triangle outline: center → left → right → center
  ctx.beginPath();
  ctx.moveTo(this.center.x, this.center.y);
  ctx.lineTo(this.left.x, this.left.y);
  ctx.lineTo(this.right.x, this.right.y);
  ctx.closePath();
  ctx.strokeStyle = 'cyan';
  ctx.stroke();
}
```

This shows exactly what the camera can "see" — useful for understanding culling behavior.
