# World Editor & Environment

The `ts/world-editor/` directory contains the procedural world generation system, interactive editing tools, traffic management, environmental items, and road markings.

---

## World Generation (`ts/world-editor/world.ts`)

### Class Structure

```typescript
interface Corridor {
  borders: Segment[];
  skeleton: Segment[];
}

class World {
  // Configuration
  graph: Graph;
  roadWidth: number; // Default: 100
  roadRoundness: number; // Default: 10
  buildingWidth: number; // Width of building footprints
  buildingMinLength: number; // Minimum building side length
  spacing: number; // Gap between buildings and roads
  treeSize: number; // Base tree radius

  // Generated geometry
  envelopes: Envelope[]; // Road surface shapes
  roadBorders: Segment[]; // Outer edges of roads
  buildings: Building[]; // Generated structures
  trees: Tree[]; // Placed vegetation
  laneGuides: Segment[]; // Center-lane guidance lines
  markings: Marking[]; // Traffic signs, lights, crossings

  // Simulation
  trafficManager: TrafficManager;
  corridor: Corridor | null; // Racing path (start → target)
  cars: Car[]; // Active vehicles

  // Viewport state
  zoom?: number;
  offset?: Point;

  // Methods
  generate(generateWorld?: boolean): void;
  generateCorridor(start: Point, end: Point, extendEnd?: number): void;
  static load(info: any): World;
  draw(ctx, viewPoint, showStartMarkings?, renderRadius?): void;
}
```

### Road Generation Pipeline

```
Graph segments
    │
    ▼ (wrap each in Envelope)
Envelopes[] (rounded rectangles)
    │
    ▼ (Polygon.union)
roadBorders[] (merged outer edges)
    │
    ▼ (half-width envelopes)
laneGuides[] (center-lane markers)
```

1. **Envelope creation**: Each graph segment gets wrapped in an Envelope with `roadWidth` and `roadRoundness`
2. **Union operation**: All envelope polygons are merged via `Polygon.union()` to produce clean outer road borders (no internal edges between overlapping roads)
3. **Lane guides**: Smaller envelopes (half width) generate lane center lines for AI navigation
4. **One-way arrows**: Direction markings auto-generated for one-way segments

### Building Generation (`#generateBuildings`)

1. Create wider envelopes around road segments (road + building width + spacing)
2. Union these wider envelopes → extract guide segments
3. Place building supports along these guides with minimum spacing
4. Convert supports to rectangular polygons (building footprints)
5. Filter: Remove buildings that overlap roads, other buildings, or are too close

### Tree Generation (`#generateTrees`)

1. Find valid placement zones (not on roads, not inside buildings)
2. Random placement attempts with rejection sampling
3. Constraints:
   - Minimum distance from other trees (spacing)
   - Must be near roads/buildings (not isolated in empty space)
   - Cannot overlap road borders or building footprints
4. Each tree gets randomized size within a range

### Corridor Generation (`generateCorridor`)

Used by racing and training modes to create a defined path:

1. Find start marking and target marking positions
2. Compute shortest path between them via `graph.getShortestPath()`
3. Extend end point beyond target (for smooth finish detection)
4. Generate envelopes around path segments
5. Union envelopes → corridor borders
6. Store `corridor.borders` (for collision) and `corridor.skeleton` (for progress measurement)

### Drawing

The world draws in this order (painter's algorithm):

1. Road envelopes (gray fill)
2. Road borders (white lines)
3. Lane markings (dashed center lines)
4. Markings (traffic lights, stop signs, etc.)
5. Buildings (3D perspective)
6. Trees (3D perspective)

Objects are sorted by distance to `viewPoint` for proper depth ordering.

---

## Traffic Management (`ts/world-editor/trafficManager.ts`)

### Class Structure

```typescript
type lightControlCenterPoint = Point & {
  lights: Light[];
  ticks: number;
};

class TrafficManager {
  graph: Graph;
  markings: Marking[];
  controlCenters: lightControlCenterPoint[];
  frameCount: number;

  update(): void;
}
```

### Traffic Light Coordination

**Initialization**:

1. Find all crossroads (graph points with degree > 2, i.e., intersections)
2. Group all Light markings by nearest crossroad
3. Each crossroad becomes a `controlCenter` managing its lights

**Update cycle** (each frame):

```
For each controlCenter:
  greenDuration = 2 seconds (120 frames at 60fps)
  yellowDuration = 1 second (60 frames)
  cycleDuration = lights.count * (green + yellow)

  currentTick = frameCount % cycleDuration

  For each light in center:
    phase = light's position in sequence
    offset = phase * (green + yellow)
    localTick = (currentTick - offset) % cycleDuration

    if localTick < greenDuration:    light.state = "green"
    elif localTick < green+yellow:   light.state = "yellow"
    else:                            light.state = "red"
```

This ensures only one direction is green at any intersection at a time.

---

## Markings System (`ts/world-editor/markings/`)

### Base Class

```typescript
type MarkingType =
  | 'marking'
  | 'crossing'
  | 'parking'
  | 'light'
  | 'start'
  | 'stop'
  | 'yield'
  | 'target';

class Marking {
  center: Point; // Position on road
  directionVector: Point; // Facing direction (from segment)
  width: number; // Cross-road extent
  height: number; // Along-road extent
  support: Segment; // Central axis segment
  polygon: Polygon; // Collision/interaction area
  type: MarkingType;

  static load(info: any): Marking; // Factory method for deserialization
  draw(ctx): void;
}
```

### Marking Types

| Type     | File          | Description                              | Visual                   |
| -------- | ------------- | ---------------------------------------- | ------------------------ |
| Start    | `start.ts`    | Car spawn point with direction           | Blue car icon            |
| Stop     | `stop.ts`     | Stop line (car must stop)                | Red border + "STOP" text |
| Yield    | `yield.ts`    | Yield sign marking                       | Inverted triangle        |
| Crossing | `crossing.ts` | Pedestrian crosswalk                     | White stripes            |
| Light    | `light.ts`    | Traffic light (state managed externally) | Red/yellow/green circles |
| Parking  | `parking.ts`  | Parking spot                             | "P" marking              |
| Target   | `target.ts`   | Race destination / navigation goal       | Target circle            |

### Light Marking States

```typescript
class Light extends Marking {
  state: 'green' | 'yellow' | 'red'; // Managed by TrafficManager
  border: Segment; // Stop line for cars

  draw(ctx): void; // Colored circle based on state
}
```

---

## Editor System (`ts/world-editor/editors/`)

### World Editor (Master Coordinator)

```typescript
class WorldEditor {
  viewport: Viewport;
  graphEditor: GraphEditor;
  markingEditors: Map<string, MarkingEditor>;
  worldGenerationCheckbox: HTMLInputElement;

  enable(editorType: string): void;
  disable(): void;
  save(): void;
  load(worldInfo: any): void;
  onGraphChange(): void;
}
```

Manages which editor is active, triggers world regeneration when the graph changes, and handles save/load.

### Graph Editor (`graphEditor.ts`)

The primary tool for designing the road network.

**Mouse interactions**:

- **Left-click on empty space**: Create new point
- **Left-click on existing point**: Select it
- **Right-click on second point**: Create segment connecting selected → hovered
- **Drag**: Move selected point (graph segments follow)
- **Right-click on empty space**: Deselect

**Keyboard shortcuts**:
| Key | Action |
|-----|--------|
| `S` | Mark hovered point as path **start** |
| `E` | Mark hovered point as path **end** |
| `C` | Clear computed shortest path |
| `O` | Toggle **one-way** mode for next segment |
| `Delete` | Remove selected point and its segments |

**Visual feedback**:

- Hovered point: highlighted with larger radius
- Selected point: distinct color
- Shortest path: drawn in red
- One-way segments: drawn with directional arrow

### Marking Editor (Base Class)

```typescript
class MarkingEditor {
  world: World;
  canvas: HTMLCanvasElement;
  viewport: Viewport;
  markings: Marking[];
  intent: Marking | null; // Preview of marking to place

  enable(): void;
  disable(): void;
  createMarking(center, directionVector): Marking; // Override in subclass
}
```

**Workflow**:

1. Mouse moves over road → snap to nearest lane guide segment
2. Calculate center point and direction vector from segment
3. Show preview marking (`intent`) at cursor position
4. Left-click → add marking to world
5. Right-click on existing → remove it

### Specialized Editors

Each extends `MarkingEditor` with a specific `createMarking()` implementation:

| Editor         | File                | Creates                |
| -------------- | ------------------- | ---------------------- |
| StopEditor     | `stopEditor.ts`     | Stop markings          |
| StartEditor    | `startEditor.ts`    | Start/spawn markings   |
| LightEditor    | `lightEditor.ts`    | Traffic light markings |
| CrossingEditor | `crossingEditor.ts` | Pedestrian crossings   |
| TargetEditor   | `targetEditor.ts`   | Destination markers    |
| ParkingEditor  | `parkingEditor.ts`  | Parking spots          |
| YieldEditor    | `yieldEditor.ts`    | Yield signs            |

---

## Environmental Items (`ts/world-editor/items/`)

### Building (`building.ts`)

```typescript
class Building {
  base: Polygon; // 2D footprint
  height: number; // Vertical extent (default: 200)

  draw(ctx, viewPoint): void;
}
```

**3D Rendering**:

1. Calculate top face by projecting base points upward using `getFake3dPoint()`
2. Create 4 side polygons (connecting base edges to top edges)
3. Sort sides by average distance to camera (painter's algorithm)
4. Draw: furthest sides first, then roof, with shading for depth cues

**Visual style**: White walls, slightly darkened roof, shadows based on angle to viewer.

### Tree (`tree.ts`)

```typescript
class Tree {
  center: Point; // Base position
  size: number; // Canopy radius
  height: number; // Total height (default: 200)
  base: Point[]; // Simple collision polygon

  draw(ctx, viewPoint): void;
}
```

**Procedural canopy** (`#generateLevel`):

1. Generate 7 vertical levels (layers) from base to top
2. Each level is a polygon with `size * (1 - levelIndex/7)` radius
3. Vertices have **noisy radius**: pseudo-random variation using `cos(angle * seed)` for consistent irregular shapes
4. Colors interpolate from dark green (base) to bright green (top)
5. Each level projected to 3D height using `getFake3dPoint()`

The noise is deterministic (same seed = same shape) so trees look consistent across frames.

---

## Serialization

### World Save Format (`.world` files)

```javascript
const worldData = ({
  graph: {
    points: [{ x: 100, y: 200 }, ...],
    segments: [{ p1: { x: 100, y: 200 }, p2: { x: 300, y: 400 }, oneWay: false }, ...]
  },
  roadWidth: 100,
  roadRoundness: 10,
  buildingWidth: 150,
  buildingMinLength: 150,
  spacing: 50,
  treeSize: 160,
  envelopes: [...],
  roadBorders: [...],
  buildings: [...],
  trees: [...],
  laneGuides: [...],
  markings: [{ center: {...}, directionVector: {...}, type: "light", ... }, ...],
  zoom: 1.5,
  offset: { x: -200, y: -100 }
})
```

### Loading

`World.load(info)` reconstructs all objects:

- Points → `new Point(x, y)`
- Segments → `new Segment(p1, p2)`
- Graph → `Graph.load()`
- Markings → `Marking.load()` (dispatches to correct subclass by `type`)
- Envelopes → `new Envelope(skeleton, width, roundness, polygon)`
- Buildings → `new Building(polygon, height)`
- Trees → `new Tree(center, size, height)`
