# Camera & 3D Rendering

The camera system in `ts/camera/` provides pseudo-3D perspective rendering by projecting 2D world geometry into a first-person viewpoint.

---

## File Structure (`ts/camera/`)

| File           | Responsibility                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| `types.ts`     | Interfaces (`ICameraPoint`, `IColoredPolygon`, `ICameraRenderOptions`)                                         |
| `extrusion.ts` | Pure geometry functions for 3D extrusion (buildings, cars, trees) and flat ground paint (quads, dashes, zebra) |
| `roadText.ts`  | Tiny stroke vector font for painting road words (STOP / YIELD) flat on the tarmac                              |
| `camera.ts`    | Camera class (movement, frustum, projection, filtering, rendering)                                             |

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
  this.#updateFrustumPoints();
}
```

The camera smoothly follows the target car with a lag factor of 0.15. The position is offset `distanceBehind` units behind the target (in the direction opposite to the target's heading), creating natural-feeling third-person camera movement.

**Smoothing behavior**: At `t = 0.15`, the camera covers 15% of the remaining distance each frame. This means:

- After 10 frames: ~80% caught up
- After 20 frames: ~96% caught up
- Result: smooth, lag-free following without jarring snaps

### Instant Snap (`simpleMove`)

Sets position directly without interpolation — used for initial placement or teleportation to avoid the camera slowly drifting from a distant position.

### Frustum Update (`#updateFrustumPoints`)

After each position change, the view frustum triangle is recalculated:

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

## View Frustum Culling (`#filter`)

Before rendering, all world polygons are tested against the camera's triangular view frustum:

```typescript
#filter(polygons: Polygon[]): Polygon[] {
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

---

## 3D Projection (`#projectPoint`)

Converts world 2D+Z coordinates to screen perspective coordinates:

```typescript
#projectPoint(ctx: CanvasRenderingContext2D, p: Point): Point {
  // 1. Project point onto camera's forward axis (center → tip)
  const segment = new Segment(this.center, this.tip);
  const { point: p1 } = segment.projectPoint(p);

  // 2. Calculate lateral offset via 2D cross product
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

---

## 3D Extrusion

### Buildings (`#extrude`)

Converts flat 2D polygons into 3D prisms (sides + ceiling):

```typescript
#extrude(polygons: Polygon[], height: number = 200): Polygon[] {
  const result: Polygon[] = [];
  for (const polygon of polygons) {
    // 1. Create ceiling by copying points with z = -height
    const ceiling = polygon.points.map(p => new Point(p.x, p.y, -height));

    // 2. Create side quads connecting base edges to ceiling edges
    for (let i = 0; i < polygon.points.length; i++) {
      const next = (i + 1) % polygon.points.length;
      result.push(new Polygon([
        polygon.points[i], polygon.points[next],
        ceiling[next], ceiling[i]
      ]));
    }

    // 3. Add ceiling polygon
    result.push(new Polygon(ceiling));
  }
  return result;
}
```

Default building height: 200 units. Buildings appear as gray rectangular prisms.

### Trees (`#extrudeTrees`)

Creates cone shapes from base polygons to a single centroid peak:

```typescript
#extrudeTrees(polygons: Polygon[], height: number = 200): Polygon[] {
  const result: Polygon[] = [];
  for (const polygon of polygons) {
    // Calculate centroid of base as the peak point
    const centroid = getCentroid(polygon.points);
    centroid.z = -height;

    // Create triangular faces from each base edge to the peak
    for (let i = 0; i < polygon.points.length; i++) {
      const next = (i + 1) % polygon.points.length;
      result.push(new Polygon([
        polygon.points[i], polygon.points[next], centroid
      ]));
    }
  }
  return result;
}
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
   - Discrete objects (buildings, cars, trees) → frustum triangle (#filter)
   - Road surface → near plane only (#nearPlaneClip), so asphalt fills up
     to the camera with no gap (the frustum triangle collapses at the apex)
   - Ground-level lines → frustum-clipped visible range with world-anchored
     dashes (#emitRoadLine / #visibleRange), so paint stays put as the car moves

3. Extrude / build:
   - Buildings: height 200, gray (#AAA sides, #BBB roof)
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
7. Building polygons (sides then roof)
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
against the **near plane** (`#nearPlaneClip` — a Sutherland–Hodgman clip against
a single line just ahead of the camera), **not** the frustum triangle. The
triangle collapses to a point at the camera and drops the wedge right in front
of it, which left a grass gap under/behind the car; the straight near plane
fills the asphalt continuously up to the camera. Off-screen sides project
harmlessly off the canvas; far envelopes are distance-culled by `range`.

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

Each line is emitted via `#emitRoadLine`, which frustum-clips it to its visible
range (`#visibleRange`) and, for dashes, anchors the pattern to the segment's
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
