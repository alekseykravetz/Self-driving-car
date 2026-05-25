# Mathematical Foundations

All geometric and spatial logic lives in `ts/math/`. These primitives power road generation, collision detection, sensor ray-casting, pathfinding, and 3D projection.

---

## Geometric Primitives (`ts/math/primitives/`)

### Point (`point.ts`)

The fundamental 2D/3D position unit.

```typescript
class Point {
  x: number;
  y: number;
  z: number; // Used for 3D projection (height)
  intersection?: boolean; // Flag for polygon union operations

  equals(point: Point): boolean;
  draw(ctx: CanvasRenderingContext2D, options?: PointDrawOptions): void;
}
```

**Draw options**: `size`, `color`, `outline`, `fill`

**Usage**: Road graph nodes, polygon vertices, car positions, intersection detection results.

---

### Segment (`segment.ts`)

A directed line between two points.

```typescript
class Segment {
  p1: Point; // Start point
  p2: Point; // End point
  oneWay: boolean; // Directed edge (for one-way roads)

  length(): number;
  directionVector(): Point; // Normalized p1→p2 direction
  equals(segment: Segment): boolean;
  includes(point: Point): boolean;
  distanceToPoint(point: Point): number;
  projectPoint(point: Point): { point: Point; offset: number };
  draw(ctx, options?: SegmentDrawOptions): void;
}
```

**Key methods**:

- **`distanceToPoint(p)`** — Perpendicular distance from point to segment line (clamped to segment bounds)
- **`projectPoint(p)`** — Projects point onto segment axis, returns projected position and normalized offset (0 = at p1, 1 = at p2)
- **`directionVector()`** — Unit vector from p1 to p2 (used for marking orientation)

**Draw options**: `width`, `color`, `dash` (for lane markings)

---

### Polygon (`polygon.ts`)

A closed shape defined by ordered vertices.

```typescript
class Polygon {
  points: Point[];
  segments: Segment[]; // Auto-generated from consecutive point pairs

  // Static operations
  static union(polygons: Polygon[]): Segment[];
  static break(poly1: Polygon, poly2: Polygon): void;

  // Instance methods
  containsPoint(p: Point): boolean;
  containsPolygon(poly: Polygon): boolean;
  intersectsPolygon(poly: Polygon): boolean;
  distanceToPoint(p: Point): number;
  distanceToPolygon(poly: Polygon): number;
  draw(ctx, options?: PolygonDrawOptions): void;
  drawSegments(ctx): void;
}
```

**Critical algorithms**:

#### `Polygon.union(polygons)` — Road Border Generation

1. For every pair of polygons, call `break()` to split segments at intersection points
2. Filter out segments that are **inside** any other polygon
3. Return only the outer boundary segments

This is how overlapping road envelopes merge into clean road borders.

#### `Polygon.break(poly1, poly2)` — Intersection Splitting

For each segment in poly1, check intersection with all segments of poly2. Where they cross, split both segments at the intersection point (marked with `intersection = true`).

#### `containsPoint(p)` — Ray Casting Algorithm

Cast a horizontal ray from the point to infinity. Count how many polygon edges it crosses. Odd count = inside, even = outside.

#### `intersectsPolygon(poly)` — Collision Detection

Check if any segment of this polygon intersects any segment of the other polygon, OR if either polygon fully contains the other.

**Usage**: Car bodies (rotated rectangles), road borders, building footprints, tree bases, marking shapes.

---

### Envelope (`envelope.ts`)

Generates a rounded rectangular polygon around a line segment.

```typescript
class Envelope {
  skeleton: Segment; // The central axis
  polygon: Polygon; // The generated shape

  constructor(
    skeleton: Segment,
    width: number,
    roundness: number,
    generatedPolygon?: Polygon,
  );
}
```

**Generation algorithm** (`#generatePolygon`):

1. Calculate perpendicular direction to the skeleton segment
2. At each end (p1, p2), generate `roundness` points along a circular arc
3. Connect all arc points to form a closed polygon
4. Result: A "pill" or "stadium" shape around the segment

**Parameters**:

- `width` — Total width of the envelope
- `roundness` — Number of arc points per end (higher = smoother corners; 1 = rectangle)

**Usage**:

- Road surface generation (graph segments → road envelopes → union → borders)
- Building placement guides (wider envelopes around roads)
- Corridor generation for racing paths

---

## Graph System (`ts/math/graph/graph.ts`)

Represents the road network as nodes and edges.

```typescript
class Graph {
  points: Point[];
  segments: Segment[];

  // Modification
  addPoint(point: Point): void;
  removePoint(point: Point): void;
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
  hash(): string;

  // Pathfinding
  getShortestPath(start: Point, end: Point): Segment[];

  static load(info: any): Graph;
}
```

**Shortest Path** — Dijkstra's Algorithm:

1. Initialize all distances to Infinity, start distance = 0
2. Priority queue (simple array scan for minimum)
3. For each unvisited node, relax neighbors via connected segments
4. Respects `oneWay` segments — only traversable in p1→p2 direction
5. Returns segment path from start to end

**Usage**: Road network editing, corridor generation for races, pathfinding between start/target markings.

---

## Math Utilities (`ts/math/utils.ts`)

Core mathematical functions used throughout the project.

### Vector Operations

| Function    | Signature                      | Description                          |
| ----------- | ------------------------------ | ------------------------------------ |
| `add`       | `(p1, p2) → Point`             | Vector addition                      |
| `subtract`  | `(p1, p2) → Point`             | Vector subtraction                   |
| `scale`     | `(p, scaler) → Point`          | Scalar multiplication                |
| `normalize` | `(p) → Point`                  | Unit vector (magnitude = 1)          |
| `magnitude` | `(p) → number`                 | Vector length                        |
| `dot`       | `(p1, p2) → number`            | Dot product                          |
| `cross`     | `(p1, p2) → number`            | 2D cross product (z-component)       |
| `angle`     | `(p) → number`                 | Angle of vector from positive x-axis |
| `rotate`    | `(point, angle) → Point`       | Rotate vector around origin          |
| `translate` | `(loc, angle, offset) → Point` | Move point by angle + distance       |

### Interpolation

| Function            | Description                             |
| ------------------- | --------------------------------------- |
| `lerp(a, b, t)`     | Linear interpolation: `a + (b - a) * t` |
| `lerp2D(p1, p2, t)` | Interpolate between two points          |
| `invLerp(a, b, v)`  | Inverse lerp: find `t` given value `v`  |

### Geometry

| Function                                   | Description                             |
| ------------------------------------------ | --------------------------------------- |
| `distance(p1, p2)`                         | Euclidean distance between points       |
| `average(p1, p2)`                          | Midpoint between two points             |
| `getIntersection(A, B, C, D)`              | Line-line intersection of AB and CD     |
| `getFake3dPoint(point, viewPoint, height)` | Perspective projection for 3D rendering |
| `degToRad(deg)`                            | Degrees to radians conversion           |

### Nearest-Point Queries

| Function                                       | Description                           |
| ---------------------------------------------- | ------------------------------------- |
| `getNearestPoint(loc, points, threshold?)`     | Find closest point within threshold   |
| `getNearestSegment(loc, segments, threshold?)` | Find closest segment within threshold |

### `getIntersection(A, B, C, D)` — Line-Line Intersection

Returns `{ x, y, offset }` where offset is the parameter along segment AB (0 = at A, 1 = at B). Returns `null` if segments are parallel or don't actually cross within bounds.

Uses parametric line equations:

```
t = ((D.x-C.x)(A.y-C.y) - (D.y-C.y)(A.x-C.x)) / denominator
u = ((C.x-A.x)(A.y-C.y) - (C.y-A.y)(A.x-C.x)) / denominator
```

Intersection valid only if `0 ≤ t ≤ 1` and `0 ≤ u ≤ 1`.

---

## OSM Importer (`ts/math/osm-importer/osm.ts`)

Converts OpenStreetMap JSON data (from Overpass API) into the project's Point/Segment format.

```typescript
class Osm {
  static parseRoads(data: OsmData): ParsedRoads;
}
```

**Process**:

1. Extract all nodes with lat/lon coordinates
2. Convert geographic coordinates to canvas space:
   - Latitude → Y (inverted, scaled by ~111km factor × 10)
   - Longitude → X (scaled by latitude-dependent factor)
3. Parse way elements → connect nodes as Segments
4. Detect one-way roads from tags: `oneway=yes`, `lanes=1`, `junction=roundabout`
5. Center the result on canvas origin

**Input format**: Standard Overpass API JSON with `elements[].type = "node"|"way"`, nodes have `lat/lon`, ways have `nodes[]` arrays and `tags`.

**Saved examples**: `saves/ashkelon-osm-data.json`, `saves/kohav-hazafon-osm-data.json`
