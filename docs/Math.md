# Mathematical Foundations

All geometric and spatial logic lives in `ts/math/`. These primitives power road generation, collision detection, sensor ray-casting, pathfinding, and 3D projection.

---

## Geometric Primitives (`ts/math/primitives/`)

### Point (`point.ts`)

The fundamental 2D/3D position unit used throughout the project.

```typescript
class Point {
  x: number;
  y: number;
  z: number; // Used for 3D projection (height), default: 0
  intersection?: boolean; // Flag for polygon union operations

  equals(point: Point): boolean;
}
```

> Drawing is done via `drawPoint(ctx, point, options?)` from `ts/rendering/pointRenderer.ts`.

**Usage**: Road graph nodes, polygon vertices, car positions, intersection detection results, 3D projected screen coordinates.

---

### Segment (`segment.ts`)

A directed line between two points. The fundamental edge unit for roads, borders, and rays.

```typescript
class Segment {
  p1: Point; // Start point
  p2: Point; // End point
  oneWay: boolean; // Directed edge flag (for one-way roads)

  length(): number;
  directionVector(): Point; // Normalized p1→p2 direction
  equals(segment: Segment): boolean;
  includes(point: Point): boolean;
  distanceToPoint(point: Point): number;
  projectPoint(point: Point): { point: Point; offset: number };
}
```

> Drawing is done via `drawSegment(ctx, segment, options?)` from `ts/rendering/segmentRenderer.ts`.

**Key methods:**

#### `distanceToPoint(p: Point): number`

Perpendicular distance from a point to the segment line, clamped to segment bounds:

```
1. Project point onto segment axis
2. Clamp projection to [p1, p2] range
3. Return distance from point to clamped projection
```

If the projection falls before p1 or after p2, the distance is to the nearest endpoint.

#### `projectPoint(p: Point): { point: Point; offset: number }`

Projects a point onto the segment axis:

- `point`: The closest point on the segment to `p`
- `offset`: Normalized position along segment (0 = at p1, 1 = at p2, can exceed bounds)

Used extensively for: car progress tracking along corridors, sensor ray starting position, collision correction.

#### `directionVector(): Point`

Unit vector from p1 to p2. Used for:

- Marking orientation (which way does the stop line face?)
- One-way road arrows
- Camera heading calculation

**Usage**: Road edges, sensor rays, graph connections, marking axes, corridor skeletons.

---

### Polygon (`polygon.ts`)

A closed shape defined by ordered vertices. The workhorse of collision detection and road generation.

```typescript
class Polygon {
  points: Point[];
  segments: Segment[]; // Auto-generated from consecutive point pairs + closing segment

  // Static operations (road generation)
  static union(polygons: Polygon[]): Segment[];
  static break(poly1: Polygon, poly2: Polygon): void;

  // Instance methods
  containsPoint(p: Point): boolean;
  containsPolygon(poly: Polygon): boolean;
  intersectsPolygon(poly: Polygon): boolean;
  distanceToPoint(p: Point): number;
  distanceToPolygon(poly: Polygon): number;
}
```

> Drawing is done via `drawPolygon(ctx, polygon, options?)` from `ts/rendering/polygonRenderer.ts`. Envelopes delegate to `drawPolygon` via `drawEnvelope` from `ts/rendering/envelopeRenderer.ts`.

**Critical algorithms:**

#### `Polygon.union(polygons: Polygon[]): Segment[]` — Road Border Generation

The core algorithm for creating clean road edges from overlapping road surfaces:

```
1. For every pair of polygons (i, j):
   call break(polygons[i], polygons[j])
   → Splits segments at intersection points

2. For each segment in each polygon:
   if segment midpoint is inside ANY other polygon:
     mark as "internal" (discard)
   else:
     mark as "external" (keep)

3. Return only external segments
   → These form the clean outer boundary
```

**Result**: Overlapping road envelopes merge into a single clean border. No internal edges between adjacent roads.

#### `Polygon.break(poly1: Polygon, poly2: Polygon): void` — Intersection Splitting

For each segment in poly1, check intersection with all segments of poly2. Where they cross, split both segments at the intersection point:

```
For each seg_a in poly1:
  For each seg_b in poly2:
    intersection = getIntersection(seg_a.p1, seg_a.p2, seg_b.p1, seg_b.p2)
    if intersection exists:
      Split seg_a at intersection point (mark as intersection: true)
      Split seg_b at intersection point (mark as intersection: true)
```

After breaking, each polygon's segments array is rebuilt with the new split points.

#### `containsPoint(p: Point): boolean` — Ray Casting Algorithm

```
Cast a horizontal ray from point p toward +infinity
Count how many polygon edges the ray crosses
if (count is odd) → point is INSIDE
if (count is even) → point is OUTSIDE
```

Used for: determining if road points are inside building footprints, testing if polygon union segments are internal.

#### `intersectsPolygon(poly: Polygon): boolean` — Collision Detection

```
1. Check if any segment of this polygon intersects any segment of other polygon
   → Uses getIntersection() for each pair
2. OR check if either polygon fully contains the other
   → Uses containsPoint() on vertices
3. Return true if any check passes
```

Used for: car collision detection, building overlap testing, camera frustum culling.

**Usage**: Car bodies (rotated rectangles), road envelopes, building footprints, tree bases, marking shapes, camera frustum.

---

### Envelope (`envelope.ts`)

Generates a rounded rectangular polygon around a line segment. This is how road surfaces are created.

```typescript
class Envelope {
  skeleton: Segment; // The central axis (road center line)
  polygon: Polygon; // The generated shape (road surface)

  constructor(
    skeleton: Segment,
    width: number,
    roundness: number,
    generatedPolygon?: Polygon,
  );
}
```

**Generation algorithm** (`#generatePolygon`):

```
1. Calculate perpendicular direction to skeleton segment
   perpDir = normalize(rotate90(p2 - p1))

2. At p1: generate `roundness` points along a semicircular arc
   for i = 0 to roundness-1:
     angle = interpolate from -90° to +90° (relative to perpendicular)
     point_i = p1 + rotate(perpDir * width/2, angle)

3. At p2: generate `roundness` points along opposite semicircular arc
   for i = 0 to roundness-1:
     angle = interpolate from +90° to +270°
     point_i = p2 + rotate(perpDir * width/2, angle)

4. Connect all points to form closed polygon
   Result: A "pill" or "stadium" shape around the segment
```

**Parameters:**

| Parameter   | Effect                                                   |
| ----------- | -------------------------------------------------------- |
| `width`     | Total width of the envelope (road width)                 |
| `roundness` | Arc points per end (1 = rectangle, 10+ = smooth rounded) |

**Usage:**

- Road surface generation: graph segments → envelopes → Polygon.union → borders
- Building placement guides: wider envelopes define building zones
- Corridor generation: racing path wrapped in collision boundaries

---

## Graph System (`ts/math/graph/graph.ts`)

Represents the road network as nodes (intersections) and edges (road segments).

```typescript
class Graph {
  points: Point[];
  segments: Segment[];

  // Modification
  addPoint(point: Point): void;
  removePoint(point: Point): void; // Also removes connected segments
  tryAddPoint(point: Point): boolean; // Rejects if too close to existing
  addSegment(segment: Segment): void;
  removeSegment(segment: Segment): void;
  tryAddSegment(segment: Segment): boolean; // Rejects duplicates

  // Queries
  containsPoint(point: Point): boolean;
  containsSegment(segment: Segment): boolean;
  getSegmentsWithPoint(point: Point): Segment[];
  getSegmentsLeavingFromPoint(point: Point): Segment[]; // One-way aware
  dispose(): void;
  hash(): string; // For change detection

  // Pathfinding
  getShortestPath(start: Point, end: Point): Segment[];

  static load(info: any): Graph;
}
```

### Shortest Path — Dijkstra's Algorithm

```
1. Initialize:
   - All distances = Infinity
   - start.distance = 0
   - All nodes unvisited

2. While unvisited nodes exist:
   - current = unvisited node with minimum distance
   - Mark current as visited
   - For each neighbor of current:
     - Get edge weight (segment length)
     - newDist = current.distance + edge.weight
     - If newDist < neighbor.distance:
       - neighbor.distance = newDist
       - neighbor.previous = current

3. Trace path from end back to start via .previous links
4. Return as Segment[] array

One-way enforcement:
   - getSegmentsLeavingFromPoint() only returns segments
     where current is p1 (respecting direction)
   - Bidirectional segments work in both directions
```

**Usage**: Road network editing, corridor generation for races (start marking → target marking), computing training paths.

---

## Math Utilities (`ts/math/utils.ts`)

Core mathematical functions used throughout the project.

### Vector Operations

| Function    | Signature                      | Description                          |
| ----------- | ------------------------------ | ------------------------------------ |
| `add`       | `(p1, p2) → Point`             | Vector addition                      |
| `subtract`  | `(p1, p2) → Point`             | Vector subtraction (p1 - p2)         |
| `scale`     | `(p, scaler) → Point`          | Scalar multiplication                |
| `normalize` | `(p) → Point`                  | Unit vector (magnitude = 1)          |
| `magnitude` | `(p) → number`                 | Vector length (√(x² + y²))           |
| `dot`       | `(p1, p2) → number`            | Dot product (x1*x2 + y1*y2)          |
| `cross`     | `(p1, p2) → number`            | 2D cross product (x1*y2 - y1*x2)     |
| `angle`     | `(p) → number`                 | Angle of vector from positive x-axis |
| `rotate`    | `(point, angle) → Point`       | Rotate vector around origin          |
| `translate` | `(loc, angle, offset) → Point` | Move point by angle + distance       |

### Interpolation

| Function            | Signature                           | Description                             |
| ------------------- | ----------------------------------- | --------------------------------------- |
| `lerp(a, b, t)`     | `(number, number, number) → number` | Linear interpolation: `a + (b - a) * t` |
| `lerp2D(p1, p2, t)` | `(Point, Point, number) → Point`    | Interpolate between two points          |
| `invLerp(a, b, v)`  | `(number, number, number) → number` | Inverse lerp: find `t` given value `v`  |

**`lerp` is used extensively for:**

- Camera smoothing (position interpolation)
- Neural network mutation (weight perturbation)
- Animation easing
- Canvas rotation smoothing (phone controls)

### Geometry

| Function                                   | Description                              |
| ------------------------------------------ | ---------------------------------------- |
| `distance(p1, p2)`                         | Euclidean distance between two points    |
| `average(p1, p2)`                          | Midpoint between two points              |
| `getIntersection(A, B, C, D)`              | Line-line intersection of segments AB/CD |
| `getFake3dPoint(point, viewPoint, height)` | Pseudo-3D perspective for top-down view  |
| `degToRad(deg)`                            | Degrees to radians conversion            |

### Nearest-Point Queries

| Function                                       | Description                           |
| ---------------------------------------------- | ------------------------------------- |
| `getNearestPoint(loc, points, threshold?)`     | Find closest point within threshold   |
| `getNearestSegment(loc, segments, threshold?)` | Find closest segment within threshold |

### `getIntersection(A, B, C, D)` — Line-Line Intersection

The most critical utility function — used by sensors, collision detection, and polygon operations.

```typescript
function getIntersection(
  A: Point,
  B: Point, // First segment
  C: Point,
  D: Point, // Second segment
): { x: number; y: number; offset: number } | null;
```

**Algorithm** (parametric line equations):

```
denominator = (D.x - C.x)(B.y - A.y) - (D.y - C.y)(B.x - A.x)

if (denominator === 0) return null  // Parallel lines

t = ((D.x - C.x)(A.y - C.y) - (D.y - C.y)(A.x - C.x)) / denominator
u = ((C.x - A.x)(A.y - C.y) - (C.y - A.y)(A.x - C.x)) / denominator

if (0 ≤ t ≤ 1 AND 0 ≤ u ≤ 1):
  return {
    x: lerp(A.x, B.x, t),
    y: lerp(A.y, B.y, t),
    offset: t   // 0 = at A, 1 = at B
  }
else:
  return null   // Intersection outside segment bounds
```

**The `offset` return value is crucial:**

- For sensors: offset = 0 means obstacle at car position, offset = 1 means at max ray length
- For collision: any valid intersection means polygons overlap
- For polygon breaking: offset determines where to split the segment

### `getIntersectionOffset(A, B, C, D)` — Allocation-Free Variant

```typescript
function getIntersectionOffset(A: Point, B: Point, C: Point, D: Point): number;
```

Returns just the parametric offset `t` (0..1) where AB crosses CD, or `-1` if
there is no intersection. It computes the same math as `getIntersection` but
returns **nothing on the heap** — no `{x, y, offset}` object is allocated.

This exists purely for hot loops that run thousands of times per frame and only
need "do they cross / how close", not the actual point:

- **Sensor** `#getReading` uses it to find the closest hit per ray, then builds
  the intersection point **once** for the winning segment via `lerp`.
- **`polysIntersect`** uses it (`offset >= 0`) since it only needs a boolean.

The object-returning `getIntersection` is kept unchanged for callers that need
the coordinates (polygon breaking, etc.). Removing the per-test allocation here
was a measurable reduction in minor GC pauses at large populations.

---

## Spatial Hash Grid (`ts/math/spatialGrid.ts`)

A uniform spatial hash grid for fast range queries over line segments. It is the
foundation that lets the simulator scale to real city maps with thousands of
road-border segments and large car populations: each car's border lookup becomes
proportional to the segments near it instead of scanning the whole map (`O(n)` →
roughly `O(1)`).

**Ownership:** The grid is owned and queried by the simulators
(`TrainingSimulator`, `TrafficSimulator`, `RaceSimulator`), not by `CarPhysics`.
Each simulator calls `queryBordersNearCar()` from the shared
`spatialGridUtils.ts` to get nearby borders, then passes those pre-filtered
polygons to `car.update()`. `CarPhysics.assessDamage()` works solely with the
`polygons` array it receives — no grid dependency.

```typescript
type GridSegment = [Point, Point];

class SpatialHashGrid {
  readonly cellSize: number; // default 150

  constructor(cellSize?: number);
  build(segments: GridSegment[]): void; // clear + insert all
  insert(segment: GridSegment): void; // rasterize into overlapping cells
  query(x: number, y: number, radius: number): GridSegment[]; // unique nearby segments
  clear(): void;
}
```

**How it works:**

- Space is divided into square cells of `cellSize`. Each cell key is `"cx,cy"`.
- `insert` rasterizes a segment into **every cell its bounding box overlaps**, so
  a segment that spans multiple cells is referenced from each.
- `query(x, y, radius)` returns the **unique** segments stored in any cell that
  overlaps the axis-aligned square of half-width `radius` centered on `(x, y)`.

The query intentionally returns a square-region superset rather than an exact
circle — it is a cheap **broad phase**. Callers that need exact range apply a
**narrow phase** distance filter afterward (see `updateWorldCars` in the
[Simulators](Simulators.md) doc). This guarantees no segment within `radius` is
ever missed, regardless of sensor ray length.

**Allocation-free dedup.** A segment that spans several cells appears in each of
them, so `query` must return each segment only once. Rather than allocate a
`Set` per call (one per car per frame), the grid stores **segment indices** in
its cells and keeps a parallel `Int32Array` of per-index "stamps". Each query
bumps a monotonic `queryId` and marks a segment seen by writing that id into its
stamp slot; a numeric compare (`stamp !== queryId`) replaces `Set.has`/`add`.
`build` zero-fills the stamps and resets the counter so stale stamps from a
previous build can never be mistaken for a current-query hit. This removed
thousands of short-lived `Set` allocations per frame.

> ⚠️ The grid assumes many **short** segments (real road borders). It is **not**
> used for simple mode, whose two borders span the entire road (`±1,000,000`) and
> would rasterize into millions of cells. Simple mode passes its 2 borders
> directly via `roadBorders` — no grid created or queried.

---

## Traffic Control Grid (`ts/math/trafficControlGrid.ts`)

A sibling spatial hash grid (same 150px cell size, same allocation-free
`Int32Array`-stamp dedup) that indexes **traffic-light polygons** instead of
road-border segments, for AI traffic-light perception. Each entry stores a
`{ polygon, getState }` pair so the grid is rebuilt only when world **markings**
change while the light **state** is read live at query time via the `getState`
closure — no rebuild is needed when lights cycle.

```typescript
type TrafficControlState = 'green' | 'yellow' | 'red';
interface TrafficControlEntry {
  polygon: Polygon;
  getState: () => TrafficControlState;
}
interface SensorTrafficControl {
  polygon: Polygon;
  state: TrafficControlState;
}

class TrafficControlGrid {
  readonly cellSize: number; // 150
  build(entries: TrafficControlEntry[]): void; // rebuilt on world-markings change
  query(x: number, y: number, radius: number): SensorTrafficControl[]; // live state read
}
```

`ts/simulator/trafficControlUtils.ts` exposes `buildTrafficControls(world)`
(extract `Light` markings → entries) and `queryTrafficControlsNearCar(grid, car)`
(broad phase + reach filter, mirroring `queryBordersNearCar`). World mode, Live
Traffic Jam, and Racing own one grid each and forward the queried controls into
`car.update(obstacles, trafficControls)` for cars with
`sensor.trafficAwareness === true`. See [Simulators](Simulators.md#traffic-control-grid-tssimulatortrafficcontrolutilsts--tsmathtrafficcontrolgridts).

---

## Heatmap Grid (`ts/math/heatmapGrid.ts`)

A lazy grid-based congestion counter backing the [spatial congestion heatmap
overlay](Simulators.md#spatial-congestion-heatmap-tsmathheatmapgridts--tsrenderingheatmaprendererts).
It reuses the `SpatialHashGrid` cell size (150px) for visual consistency, but is
otherwise independent: it counts **car occupancy** per cell, not segments.

```typescript
class HeatmapCell {
  col: number;
  row: number;
  occupancyFrames: number; // frames where >=1 car was in this cell
  idleFrames: number; // frames where a car in the cell was near-stationary
}

class HeatmapGrid {
  readonly cellSize: number; // default 150
  get totalFrames(): number; // frames since recording started
  record(cars: Car[]): void; // O(cars)/frame, O(1) cell lookup
  getHeatmapData(): HeatmapCell[]; // live cells (lazily created)
  reset(): void; // clear counters
}
```

- **Lazy cells** — a `Map<string, HeatmapCell>` keyed by `"col,row"`. Cells are
  created on first write, so memory is proportional to the area that has ever
  seen traffic, not the full map. No `worldWidth`/`worldHeight` is required.
- **Idle detection** — a car is idle when `|car.speed| < 0.5` px/frame.
  Damaged cars are skipped entirely.
- **`reset()`** — clears all counters; called on simulation restart, world
  change, race init, and when the overlay is toggled off.

The matching renderer (`ts/rendering/heatmapRenderer.ts`) lives in
`ts/rendering/` and paints the grid as a viewport-culled translucent overlay
(blue → cyan → yellow → red).

---

## OSM Importer (`ts/math/osm-importer/osm.ts`)

Converts OpenStreetMap JSON data (from Overpass API) into the project's Point/Segment format for creating real-world road networks.

```typescript
interface OsmData {
  elements: (OsmNodeElement | OsmWayElement)[];
}

interface OsmNodeElement {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
}

interface OsmWayElement {
  type: 'way';
  id: number;
  nodes: number[]; // Array of node IDs forming the road
  tags: {
    oneway?: string; // "yes", "no", "-1"
    lanes?: string; // Number of lanes
    junction?: string; // "roundabout"
    highway?: string; // Road classification
  };
}

class Osm {
  static parseRoads(data: OsmData): { points: Point[]; segments: Segment[] };
}
```

### Conversion Process

```
1. EXTRACT NODES
   Filter elements where type === 'node'
   Collect all lat/lon coordinates

2. CALCULATE BOUNDS
   minLat, maxLat, minLon, maxLon
   deltaLat = maxLat - minLat
   deltaLon = maxLon - minLon

3. COMPUTE SCALE
   height = deltaLat * METERS_PER_DEGREE_LATITUDE * WORLD_PIXELS_PER_METER
   // 1° latitude ≈ 111km, WORLD_PIXELS_PER_METER = 14
   // 14px = 1m, so a 100px two-lane road is ≈7.1m
   ar = deltaLon / deltaLat (aspect ratio)
   width = height * ar * cos(avgLatitude)
   // Cosine correction for longitude distance at latitude

4. CONVERT COORDINATES
   For each node:
     x = invLerp(minLon, maxLon, node.lon) * width
     y = invLerp(maxLat, minLat, node.lat) * height
     // Note: Y inverted (north = top = low Y)

5. PARSE WAYS (roads)
   For each way element:
     Connect consecutive nodes as Segments
     Detect one-way: tags.oneway === 'yes' OR tags.lanes === '1' OR tags.junction === 'roundabout'
     Set segment.oneWay = true for one-way roads
     Handle reverse one-way (tags.oneway === '-1'): swap p1/p2

6. CENTER RESULT
   Offset all points so the centroid is at (0, 0)
```

### Real-World Scale

The OSM importer uses the shared project scale from `ts/math/utils.ts`:

```typescript
const WORLD_PIXELS_PER_METER = 14;
const METERS_PER_DEGREE_LATITUDE = 111000;
```

That gives:

| Real distance | World distance |
| ------------- | -------------- |
| 1m            | 14px           |
| 3.5m lane     | 49px           |
| 7m road       | 98px           |
| 10m           | 140px          |
| 100m          | 1400px         |
| 1km           | 14000px        |

This makes the existing `100px` road envelope close to a real two-lane urban
road rather than a wide `10m` road. Longitude still needs the cosine correction
because one degree of longitude is shorter away from the equator:

```
width = height * (deltaLon / deltaLat) * cos(avgLatitude)
```

### Example Workflow

1. Go to [Overpass Turbo](https://overpass-turbo.eu/)
2. Query roads in an area (e.g., `way["highway"~"primary|secondary|tertiary"]`)
3. Export as JSON
4. Save to `saves/` directory (e.g., `ashkelon-osm-data.json`)
5. In World Editor: load the JSON file → OSM importer creates the graph
6. World generates roads from the graph automatically

---

## Math Rendering (`ts/rendering/`)

The `draw` methods were extracted from math primitives into standalone renderer
functions in `ts/rendering/`. This keeps `Point`, `Segment`, `Polygon`, and
`Envelope` as pure data structures with no dependency on Canvas 2D APIs.

### `drawPoint` (`pointRenderer.ts`)

```typescript
interface PointDrawOptions {
  size?: number; // Circle radius (default: 18)
  color?: string; // Fill color (default: 'black')
  outline?: boolean; // Draw yellow border ring
  fill?: boolean; // Fill the circle yellow
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  point: Point,
  options?: PointDrawOptions,
): void;
```

### `drawSegment` (`segmentRenderer.ts`)

```typescript
interface SegmentDrawOptions {
  width?: number; // Line width (default: 2)
  color?: string; // Stroke color (default: 'black')
  dash?: number[]; // Dash pattern (e.g., [10, 10] for lane markings)
  cap?: CanvasLineCap; // Line cap style ('round', 'butt', 'square')
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  segment: Segment,
  options?: SegmentDrawOptions,
): void;
```

### `drawPolygon` (`polygonRenderer.ts`)

```typescript
interface PolygonDrawOptions {
  stroke?: string; // Border color (default: 'blue')
  lineWidth?: number; // Border width (default: 2)
  fill?: string; // Fill color (default: 'rgba(0,0,255,0.3)')
  join?: CanvasLineJoin; // Corner join style (default: 'miter')
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  polygon: Polygon,
  options?: PolygonDrawOptions,
): void;
```

### `drawEnvelope` (`envelopeRenderer.ts`)

```typescript
function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  envelope: Envelope,
  options?: PolygonDrawOptions,
): void;
```

Delegates to `drawPolygon(ctx, envelope.polygon, options)`.

### Saved Examples

| File                          | Area                       |
| ----------------------------- | -------------------------- |
| `ashkelon-osm-data.json`      | Ashkelon, Israel           |
| `kohav-hazafon-osm-data.json` | Kohav HaZafon neighborhood |
