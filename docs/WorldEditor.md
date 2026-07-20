# World Editor & Environment

The `ts/world/` directory contains the procedural world generation system, interactive editing tools, traffic management, environmental items, and road markings.

---

## World Generation (`ts/world/world.ts`)

The `World` class is intentionally lean: it holds the class structure, all world
properties, the `draw` function and the static loader. The procedural
generation logic lives in a dedicated `WorldGenerator`
(`ts/world/generation/worldGenerator.ts`), and corridors are a standalone
`Corridor` class (`ts/world/corridor.ts`).

### Class Structure

```typescript
class World implements IWorld {
  // Configuration
  graph: Graph; // Road network (nodes + edges)
  roadWidth: number; // Default: 100
  roadRoundness: number; // Default: 10 (arc points per envelope end)
  buildingWidth: number; // Width of building footprints
  buildingMinLength: number; // Minimum building side length
  spacing: number; // Gap between buildings and roads
  treeSize: number; // Base tree radius

  // Tree decoration (reproducible prototype set, referenced by instances)
  treeSeed: number; // seeds the canopy prototype set
  treePrototypeCount: number; // number of prototypes generated from the seed
  treePrototypes: TreePrototype[]; // per-vertex noise profiles (not serialized directly)

  // Generated geometry (rebuilt on load; NOT saved in the lean v2 file)
  envelopes: Envelope[]; // Road surface shapes
  roadBorders: Segment[]; // Outer edges of roads (merged)
  separatorBorders: Segment[]; // Hard-separation center lines (collision)
  buildings: Building[]; // Generated structures
  trees: Tree[]; // Placed vegetation
  laneGuides: Segment[]; // Center-lane guidance lines (for markings)
  markings: Marking[]; // Traffic signs, lights, crossings

  // Simulation
  trafficManager: TrafficManager;
  corridors: Corridor[]; // Authored or generated drivable paths
  cars: Car[]; // Active vehicles
  bestCar: Car | null;

  // Viewport state (saved/loaded with world)
  zoom?: number;
  offset?: Point;

  // Convenience: first corridor (or null), kept for race/training callers
  get corridor(): Corridor | null;

  // Methods
  generate(opts?: { roads?; buildings?; trees? }): void; // delegates to WorldGenerator
  generateCorridor(start: Point, end: Point, extendEnd?: boolean): void;
  addCorridor(corridor: Corridor): void;
  getCollisionBorders(): Segment[]; // roadBorders + separators + corridors
  static load(info: any): World;
  toJSON(): object; // lean v2 serialization (see SaveLoad.md)
  draw(ctx, options: WorldDrawOptions): void;
}
```

### Generation split (staged `WorldGenerator`)

`WorldGenerator` exposes independently callable stages so cheap geometry can be
refreshed continuously while expensive placement runs only on demand:

- `generateRoads(world)` — **cheap, deterministic**: envelopes, `roadBorders`,
  `laneGuides`, `separatorBorders`. Safe to run on every graph edit.
- `generateBuildings(world)` — **expensive**: O(n²) footprint collision filter.
- `generateTrees(world)` — **expensive**: rejection sampling; ensures the tree
  prototype set exists, then assigns each instance a prototype/type/scale.
- `reanchorMarkings(world)` — re-anchors markings to the (possibly edited) graph.
- `generate(world, opts?)` — convenience that runs a chosen subset of stages
  (`{ roads?, buildings?, trees? }`, all default `true`) + `reanchorMarkings`.

**Lazy generation in the editor:** graph edits call only
`generateRoads` + `reanchorMarkings` (fast); the expensive item placement is
rebuilt exclusively via the **♻️ Regenerate items** action in the World Layers
panel. When items become outdated after a graph edit, the regenerate button is
tinted ("stale") until rebuilt.

---

## World Layers toolbar (`<world-layers-toolbar>`)

The editor's bottom "Generate" checkbox has been replaced by a floating
`<world-layers-toolbar>` (`ts/ui/molecules/worldLayersToolbar.ts` +
`templates/worldLayersToolbarTemplate.ts`). It gives independent **visibility**
control over each world layer via emoji toggles, plus the ♻️ Regenerate action:

| Emoji | Layer       | Draws                                                       |
| ----- | ----------- | ----------------------------------------------------------- |
| 🛣️    | `roads`     | envelopes, road borders, lane/dash/arrow/separator markings |
| 🚦    | `markings`  | stop/yield/light/crossing/parking/start/target              |
| 🛤️    | `corridors` | authored corridors                                          |
| 📍    | `itemBases` | flat building footprints + tree base circles (placeholders) |
| 🌳    | `trees`     | rendered pseudo-3D trees                                    |
| 🏢    | `buildings` | rendered pseudo-3D buildings                                |

- Visibility is a **local editor preference** persisted to `localStorage` under
  `editor:worldLayers` — it is **not** saved into the world file.
- Rendering honors the mask via `WorldDrawOptions.layers` (a
  `Partial<WorldLayerVisibility>` merged over `DEFAULT_LAYER_VISIBILITY` in
  `World.draw()`). Visibility toggles never trigger generation.
- The graph editor overlay (nodes + edges) is **not** a togglable layer — it is
  always drawn in the editor since it is the primary editing surface.
- `DEFAULT_LAYER_VISIBILITY` is a **runtime** const in `ts/world/types.ts`, so
  every page that loads `world.js` must also load `js/world/types.js` before it
  (world/simulator/race/traffic pages).
- The same `<world-layers-toolbar>` is reused by the **training** and **traffic**
  simulators (not race). There, shared handling lives in `SimulatorShell`
  (persisted under `sim:worldLayers`, the ♻️ Items group hidden via
  `hideItems()`), and hiding `trees`/`buildings` applies to **both** the
  top-down 2D view (`world.draw` `layers`) and the 3D camera view
  (`camera.render` `showTrees`/`showBuildings`).
- The toolbar also hosts an **"Overlays"** group with a 🌡️ **traffic congestion
  heatmap** toggle, used only by the simulators. The editor calls
  `hideOverlays()` to hide the group (it has no live traffic to record). See
  [Simulators → Spatial Congestion Heatmap](Simulators.md#spatial-congestion-heatmap-tsmathheatmapgridts--tsrenderingheatmaprendererts).

## Tree types & prototypes (`ts/world/items/tree.ts`)

A `Tree` no longer bakes a canopy polygon. It references a reproducible
`TreePrototype` (per-vertex noise, built from a seed via `buildTreePrototypes`)
plus a per-instance render `type`, `scale` and prototype index. Three render
styles exist:

- **Type 0 — classic**: stacked noisy round canopy (the original look, now
  driven by the prototype noise rather than `center.x`).
- **Type 1 — conifer/pine**: a small trunk under stacked narrowing triangular
  tiers, darker green.
- **Type 2 — broadleaf cluster**: overlapping lobes forming a bushy olive crown.

All types expose a round `base` polygon for collision, the `itemBases` layer,
and the camera's `extrudeTreeShapes`. `Tree.toInstance()` serializes to the
compact `{ x, y, p, s, t }` form (see SaveLoad.md).

---

## Road Generation Pipeline

```
Graph segments
    │
    ▼ (wrap each in Envelope with roadWidth + roadRoundness)
Envelopes[] (rounded rectangles around each road segment)
    │
    ▼ (Polygon.union — merge overlapping shapes)
roadBorders[] (clean outer edges only — no internal boundaries)
    │
    ▼ (half-width envelopes along same segments)
laneGuides[] (center-lane markers for marking placement)
```

### Step 1: Envelope Creation

Each graph segment is wrapped in an Envelope with the configured `roadWidth` and `roadRoundness`:

```typescript
for (const segment of this.graph.segments) {
  this.envelopes.push(
    new Envelope(segment, this.roadWidth, this.roadRoundness),
  );
}
```

Result: overlapping "pill-shaped" polygons where roads intersect.

### Step 2: Polygon Union

All envelope polygons are merged via `Polygon.union()`:

```typescript
this.roadBorders = Polygon.union(this.envelopes.map((e) => e.polygon));
```

This removes internal edges between overlapping roads, producing clean outer road borders only. Intersections become smooth joined areas.

### Step 3: Lane Guides

Smaller envelopes (half width) generate lane center lines:

```typescript
for (const segment of this.graph.segments) {
  laneGuides.push(
    new Envelope(segment, this.roadWidth / 2, this.roadRoundness),
  );
}
```

These guide segments are used for:

- Marking placement (stop signs, traffic lights snap to lane guides)
- One-way direction arrows
- Lane marking rendering (dashed center lines)

### Step 4: One-Way Arrows

For each one-way segment in the graph, a direction arrow marking is auto-generated at the segment's midpoint.

---

## Building Generation (`wgGenerateBuildings`)

```
1. Create wider envelopes around road segments
   width = roadWidth + buildingWidth + spacing × 2
   → Defines the "building zone" around each road

2. Union these wider envelopes → extract guide segments
   → These are the potential building placement lines

3. Place building supports along guide segments
   - Walk along each guide at regular intervals
   - Minimum spacing enforced between supports
   - Each support is a short segment perpendicular to the guide

4. Convert supports to rectangular polygons (building footprints)
   - Each support → Building with random height variation

5. Filter out invalid buildings:
   - Overlaps road borders? → Remove
   - Overlaps other buildings? → Remove
   - Too close to road? → Remove
   - Inside another building? → Remove
```

### Building Parameters

| Parameter           | Effect                                  |
| ------------------- | --------------------------------------- |
| `buildingWidth`     | How deep buildings extend from the road |
| `buildingMinLength` | Minimum length of building footprint    |
| `spacing`           | Gap between buildings and road edge     |

---

## Tree Generation (`wgGenerateTrees`)

Uses rejection sampling to place trees in valid positions:

```
1. Define valid placement zone:
   - NOT on roads (outside road borders)
   - NOT inside buildings
   - Near roads or buildings (not isolated in empty space)

2. Attempt random placements (many iterations):
   For each attempt:
     - Random position within world bounds
     - Check constraints:
       a. Minimum distance from other trees (prevent clustering)
       b. Must be within proximity of a road or building
       c. Cannot overlap road borders
       d. Cannot overlap building footprints
     - If all pass: place tree with randomized size

3. Each tree gets:
   - Random size within [treeSize × 0.5, treeSize × 1.5]
   - Fixed height (200 units for 3D rendering)
   - Simple circular base polygon for collision
```

---

## Corridors (`ts/world/corridor.ts`)

A `Corridor` is a standalone, drivable path through the road network. It is a
reusable world object with its own consistent draw style, used both by the
world editor (authored, multiple per world, saved with the world) and by the
race game / training simulator (built on the fly between start and target).

```typescript
class Corridor {
  borders: Segment[]; // Collision walls of the path
  skeleton: Segment[]; // Center-line, used for progress measurement
  openStart: boolean; // Start cap removed (open / tunnel)
  openEnd: boolean; // End cap removed (open / tunnel)

  static fromPath(skeleton, roadWidth, roadRoundness, options): Corridor;
  static load(info): Corridor;
  draw(ctx, { color, width }): void; // single source of truth for styling
}
```

`Corridor.fromPath` unions road envelopes along the `skeleton`. When `openStart`
or `openEnd` is set, the rounded end-cap border segments at that endpoint are
removed so cars can pass straight through — this lets several corridors be
chained into a longer path (e.g. a tunnel on a large map). The `extendEnd`
option pushes the closing cap beyond the target (used by the race game so the
finish line is reachable) independently of `openEnd`.

`World.generateCorridor(start, end, extendEnd?)` builds a single corridor and
replaces `world.corridors` with it. `World.addCorridor(corridor)` appends one
(used by the corridor editor). Every corridor's `borders` are included in
`World.getCollisionBorders()` alongside `roadBorders` and `separatorBorders`.

**Corridor usage:**

- **Borders**: Define the drivable area (cars that leave are damaged)
- **Skeleton**: Center-line path for measuring how far a car has traveled (fitness in world mode)

---

## Hard-Separation Roads

A two-way road segment can be marked as **hard-separated** (a solid white
center line that cars cannot cross), modelled like the existing one-way flag:

- `Segment.separated: boolean` (4th constructor arg, serialized in the graph).
- `WorldGenerator` collects the center lines of `separated && !oneWay` segments
  into `world.separatorBorders`, which act as collision borders.
- `World.draw` renders separated two-way roads with a **solid** white center
  line instead of the usual dashed lane separator.

---

## Drawing Order (Painter's Algorithm)

The world draws in this order to ensure proper visual layering:

```
1. Road envelopes (gray fill) — flat road surface
2. Road borders (white lines) — road edges
3. Lane markings (dashed center lines) — lane separators
4. Markings (traffic lights, stop signs, crossings)
5. Buildings (3D perspective via getFake3dPoint)
   → Sorted by distance to viewPoint (far first)
6. Trees (3D perspective via getFake3dPoint)
   → Sorted by distance to viewPoint (far first)
```

Buildings and trees are sorted by distance to the viewport center so that closer objects are drawn on top of farther ones (correct depth ordering in the top-down pseudo-3D view).

---

## Traffic Management (`ts/world/trafficManager.ts`)

### Class Structure

```typescript
type lightControlCenterPoint = Point & {
  lights: Light[]; // All traffic lights at this intersection
  ticks: number; // Frame counter for light cycling
};

class TrafficManager {
  graph: Graph;
  markings: Marking[];
  controlCenters: lightControlCenterPoint[];
  frameCount: number;

  // Override API
  overrideLight(light: Light, state: LightState): void;
  releaseOverride(light: Light): void;
  releaseAllOverrides(): void;

  update(): void;
}
```

### Initialization

```
1. Find all crossroads:
   → Graph points with degree > 2 (3+ connected segments = intersection)

2. Group all Light markings by nearest crossroad:
   → For each Light in world.markings:
     → Find nearest point in the crossroad set
     → Assign light to that control center

3. Create control centers:
   → Each crossroad with lights becomes a controlCenter
   → Contains: position, lights array, tick counter
```

### Traffic Light Coordination

**Update cycle** (each frame):

```typescript
for (const center of this.controlCenters) {
  const greenDuration = 120; // 2 seconds at 60fps
  const yellowDuration = 60; // 1 second at 60fps
  const cycleDuration = center.lights.length * (greenDuration + yellowDuration);

  const currentTick = this.frameCount % cycleDuration;

  for (let i = 0; i < center.lights.length; i++) {
    const offset = i * (greenDuration + yellowDuration);
    const localTick = (currentTick - offset + cycleDuration) % cycleDuration;

    if (localTick < greenDuration) {
      center.lights[i].state = 'green';
    } else if (localTick < greenDuration + yellowDuration) {
      center.lights[i].state = 'yellow';
    } else {
      center.lights[i].state = 'red';
    }
  }
}
```

**Coordination guarantee**: Only one direction is green at any intersection at a time. Lights cycle through green → yellow → red in sequence, with each direction getting equal time.

### Manual Override

Individual lights can be **overridden** to pause automatic cycling and hold a specific state:

- `overrideLight(light, state)` — sets the light to the given state and marks it as overridden. `update()` skips state changes for overridden lights.
- `releaseOverride(light)` — releases the override and lets `update()` resume normal cycling.
- `releaseAllOverrides()` — releases all overridden lights at once.

In the **World Editor**, left-clicking a placed light when the Light editor is active:

1. First click pauses automatic cycling and sets the light to 'off'
2. Subsequent clicks cycle: off → green → yellow → red → release (back to regular cycling)

A cyan "M" badge is drawn above overridden lights.

In the **Live Traffic Jam** page and **Training Simulator** (world mode), pressing `G` toggles a global green wave — all lights are forced green on the first press, and `releaseAllOverrides()` restores normal cycling on the second press. The 'G' shortcut is shown in the shortcuts toolbar on both pages.

Override state is **ephemeral** and not saved with the world file. See [Simulators → Traffic Control Override](Simulators.md) for the simulator hotkey.

**Timing:**

- Green: 2 seconds (120 frames)
- Yellow: 1 second (60 frames)
- Full cycle: `N_lights × 3 seconds`

---

## Markings System (`ts/world/markings/`)

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
  center: Point; // Position on road (snapped to lane guide)
  directionVector: Point; // Facing direction (derived from guide segment)
  width: number; // Cross-road extent
  height: number; // Along-road extent
  support: Segment; // Central axis segment
  polygon: Polygon; // Collision/interaction area
  type: MarkingType;
  anchor?: MarkingAnchor; // Graph-relative anchor (see below)

  setAnchor(graph): void; // Capture a graph-relative anchor from current center
  reanchor(graph): void; // Recompute center/direction from the anchor
  static load(info: any): Marking; // Factory: dispatches to correct subclass
  draw(ctx): void;
}
```

#### Graph-relative anchoring

Markings used to be stored purely as absolute positions, so editing or
regenerating the road network left them stranded in place. Each marking now
keeps an optional `anchor` describing its position **relative to a graph
segment**:

```typescript
interface MarkingAnchor {
  p1: Point; // Anchor segment endpoints (to re-find the segment)
  p2: Point;
  offset: number; // 0..1 position along the segment
  lateral: number; // Signed perpendicular distance from the segment
}
```

On regeneration, `World.generate` calls `marking.reanchor(graph)` for every
marking. `reanchor` re-finds the anchor segment (by matching endpoints, falling
back to the nearest segment) and recomputes `center` / `directionVector`, then
rebuilds the marking geometry via a protected `rebuildGeometry()` hook
(subclasses override it to refresh cached borders, e.g. `Stop.border`). If no
matching segment exists, the marking keeps its last absolute position. Old
saved worlds without an `anchor` still load and gain one the first time they are
placed near a segment.

### Marking Types

| Type     | File          | Description                              | Visual                           |
| -------- | ------------- | ---------------------------------------- | -------------------------------- |
| Start    | `start.ts`    | Car spawn point with direction           | Blue car icon + direction arrow  |
| Stop     | `stop.ts`     | Stop line (car must stop)                | Red border + "STOP" text         |
| Yield    | `yield.ts`    | Yield sign marking                       | Inverted red/white triangle      |
| Crossing | `crossing.ts` | Pedestrian crosswalk                     | White zebra stripes              |
| Light    | `light.ts`    | Traffic light (state managed externally) | Red/yellow/green stacked circles |
| Parking  | `parking.ts`  | Parking spot                             | "P" letter marking               |
| Target   | `target.ts`   | Race destination / navigation goal       | Concentric target circles        |

### Light Marking

```typescript
type LightState = 'off' | 'green' | 'yellow' | 'red';

class Light extends Marking {
  state: LightState; // Managed by TrafficManager
  border: Segment; // Stop line for cars approaching

  // Override API
  get overridden(): boolean; // True when manually overridden
  override(state: LightState): void; // Set state and pause automatic cycling
  releaseOverride(): void; // Resume automatic cycling

  draw(ctx): void; // Draws colored circles based on current state
}
```

The `state` property is normally updated by `TrafficManager.update()` each frame, cycling through green → yellow → red. When a light is **overridden**, automatic cycling pauses and the light keeps its manually set state. A cyan "M" badge is drawn above overridden lights. Override state is ephemeral — it is not saved with the world.

**In the World Editor**, left-clicking a placed light cycles through states via `TrafficManager.overrideLight()` / `releaseOverride()`:

1. First click (not overridden) → pauses automatic cycling, sets state to 'off'
2. Next clicks → cycles through off → green → yellow → red
3. After 'red' → releases override, light resumes normal automatic cycling

Right-clicking removes the light as with other markings.

AI cars with `sensor.stateAware: true` additionally perceive `Light` markings through their sensor rays — a `TrafficControlGrid` (see [Simulators](Simulators.md#traffic-control-grid-tssimulatortrafficcontrolutilsts--tsmathtrafficcontrolgridts)) indexes light polygons and feeds each ray the live state (green/off=0, yellow=0.5, red=1) when the light sits in front of the road-border hit. Lights update inside `World.draw()`, so perception reads the previous frame's state (one-frame lag).

### Marking Serialization

`Marking.load(info)` is a factory method that dispatches based on `info.type`:

```typescript
static load(info: any): Marking {
  switch (info.type) {
    case 'start': return new Start(center, dir, width, height);
    case 'stop': return new Stop(center, dir, width, height);
    case 'light': return new Light(center, dir, width, height);
    case 'crossing': return new Crossing(center, dir, width, height);
    case 'target': return new Target(center, dir, width, height);
    case 'parking': return new Parking(center, dir, width, height);
    case 'yield': return new Yield(center, dir, width, height);
    default: return new Marking(center, dir, width, height);
  }
}
```

---

## Editor System (`ts/world/editors/`)

### World Editor (Master Coordinator)

```typescript
class WorldEditor {
  viewport: Viewport;
  graphEditor: GraphEditor;
  markingEditors: Map<string, MarkingEditor>;
  worldGenerationCheckbox: HTMLInputElement;

  enable(editorType: string): void; // Activate a specific editor
  disable(): void; // Deactivate current editor
  save(): void; // Save world to file
  load(worldInfo: any): void; // Load world from file
  onGraphChange(): void; // Triggers world.generate()
}
```

Manages which editor is active at a time, triggers world regeneration when the graph changes, and handles save/load operations.

The viewport wheel-mode toggle and the World file actions (load / OSM import) are hosted by the shared `<world-toolbar>`: the editor calls `showWorldEditorActions()` to reveal the OSM button and Storage group (Save / Clear), `hideGroups(...)` to hide the simulator-only groups, and `setViewportModeListener(...)` to drive `setViewportMode()`.

### Graph Editor (`graphEditor.ts`)

The primary tool for designing the road network.

**Mouse interactions:**

| Action                | Input                     | Effect                             |
| --------------------- | ------------------------- | ---------------------------------- |
| Create new point      | Left-click on empty space | Adds point to graph                |
| Select existing point | Left-click on point       | Sets as "selected"                 |
| Create segment        | Right-click on 2nd point  | Connects selected → hovered        |
| Move point            | Drag selected point       | Relocates point (segments follow)  |
| Deselect              | Right-click on empty      | Clears selection                   |
| Delete point          | Left-click on selected    | Removes point + connected segments |

**Keyboard shortcuts:**

| Key        | Action                                                    |
| ---------- | --------------------------------------------------------- |
| `S`        | Mark hovered point as path **start** (for pathfinding)    |
| `E`        | Mark hovered point as path **end** (for pathfinding)      |
| `C`        | Clear computed shortest path (also clears start/end)      |
| `O` (hold) | Enable **one-way** mode; next segment is directed         |
| `H` (hold) | Enable **hard-separation** mode; next segment is split    |
| `T` (hold) | Enable **tunnel** (open-ended) mode for the next corridor |

These keys are mirrored in the shared `<shortcuts-toolbar>` (top-left). `S` / `E`
/ `C` flash when pressed; `O` and `H` light while held and can be **clicked to
latch** their mode on permanently (effective state = latched OR key-held). `T`
belongs to the Corridor group and latches the open-ended (tunnel) corridor mode.

**Visual feedback:**

- Hovered point: highlighted with larger radius + outline
- Selected point: distinct color (yellow)
- Intent segment: when a point is selected, dragging/hovering to draw a new segment displays a floating measurement badge showing the segment's length in meters and its angle in degrees
- Shortest path: drawn in red overlay
- One-way segments: drawn with directional arrow at midpoint
- Hard-separated segments: drawn with a solid white center line

### Corridor Editor (`corridorEditor.ts`)

Authors `Corridor` world objects. Left-click a first graph point to set the
corridor start, then a second point to build a corridor along the shortest path
between them and add it to `world.corridors`. Multiple corridors can be added.
Hold or latch `T` (tunnel) to build the next corridor with **open ends**.
Right-click removes the corridor nearest the cursor (or cancels an in-progress
pick). Corridors are saved with the world and drawn via `Corridor.draw` for a
consistent style everywhere.

### Marking Editor (Base Class)

```typescript
class MarkingEditor {
  world: World;
  canvas: HTMLCanvasElement;
  viewport: Viewport;
  markings: Marking[]; // Reference to world.markings
  intent: Marking | null; // Preview of marking to place

  enable(): void; // Start listening to mouse events
  disable(): void; // Stop listening
  createMarking(center, directionVector): Marking; // Override in subclass
}
```

**Workflow:**

1. Mouse moves over road → snap to nearest lane guide segment
2. Calculate center point and direction vector from segment orientation
3. Show preview marking (`intent`) at cursor position (semi-transparent)
4. Left-click → add marking to world permanently
5. Right-click on existing marking → remove it

### Specialized Editors

Each extends `MarkingEditor` and overrides `createMarking()`:

| Editor         | File                | Creates        |
| -------------- | ------------------- | -------------- |
| StopEditor     | `stopEditor.ts`     | Stop markings  |
| StartEditor    | `startEditor.ts`    | Start markings |
| LightEditor    | `lightEditor.ts`    | Traffic lights |
| CrossingEditor | `crossingEditor.ts` | Crosswalks     |
| TargetEditor   | `targetEditor.ts`   | Target markers |
| ParkingEditor  | `parkingEditor.ts`  | Parking spots  |
| YieldEditor    | `yieldEditor.ts`    | Yield signs    |

---

## Environmental Items (`ts/world/items/`)

### Building (`building.ts`)

```typescript
class Building {
  base: Polygon; // 2D footprint polygon
  height: number; // Vertical extent (default: 200)

  draw(ctx, options: BuildingDrawOptions): void;
}

interface BuildingDrawOptions {
  viewPoint: Point; // Camera position for 3D perspective
}
```

**3D Rendering in Top-Down View:**

1. Calculate top face by projecting base points upward using `getFake3dPoint()`
   - Each base corner → offset point based on distance/angle to viewPoint
2. Create 4 side polygons (connecting base edges to corresponding top edges)
3. Sort sides by average distance to viewPoint (far → near)
4. Draw: furthest sides first, then roof
5. Apply shading: sides darker based on angle, roof slightly lighter

**Visual style**: White/light gray walls with subtle shading for depth perception.

### Tree (`tree.ts`)

```typescript
class Tree {
  center: Point; // Base position (world coordinates)
  size: number; // Canopy radius
  height: number; // Total height (default: 200)
  base: Point[]; // Simple collision polygon (circle approximation)

  draw(ctx, options: TreeDrawOptions): void;
}

interface TreeDrawOptions {
  viewPoint: Point; // Camera position for 3D perspective
}
```

**Multi-level rendering:**

Trees are drawn as layered circles with perspective offset:

```
1. Generate multiple "levels" (3-4 stacked circles)
2. Each level:
   - Slightly smaller radius (tapers toward top)
   - Offset from center based on viewPoint direction (parallax)
   - Higher levels offset more (perspective effect)
3. Add noise to circle edges for organic appearance
4. Color: varying green shades per level (darker at bottom)
```

---

## World Serialization

### Save Format (`.world` files)

> The current on-disk format is the **v2 lean format** (decoration block + tree
> prototypes — see [Save & Load](SaveLoad.md) for full details). The inline
> shape shown below is the legacy/v1 representation that `World.load()` still
> accepts and that `World.toJSON()` can produce for programmatic use.

```javascript
const world = World.load({"graph":{"points":[{"x":100,"y":200},...],
"segments":[{"p1":{"x":100,"y":200},"p2":{"x":300,"y":400},"oneWay":false},...]},
"roadWidth":100,"roadRoundness":10,"buildingWidth":150,"buildingMinLength":150,
"spacing":50,"treeSize":160,"envelopes":[...],"roadBorders":[...],
"buildings":[...],"trees":[...],"laneGuides":[...],"markings":[...],
"zoom":1.5,"offset":{"x":-200,"y":-150}});
```

### Loading

`World.load(info)` reconstructs the full world:

1. Create Graph from points + segments
2. Create World with graph + config parameters
3. Recreate markings via `Marking.load()` factory
4. Call `world.generate()` to rebuild envelopes, borders, buildings, trees
5. Restore viewport state (zoom, offset)
6. Initialize TrafficManager

### WorldLoader Integration

The `WorldLoader` utility handles file parsing:

- Extracts JSON between first `(` and last `)` in the file content
- Falls back to parsing the entire content as JSON
- Passes parsed object to callback

---

## World Editor HTML (`html/world.html`)

The world editor page provides a complete UI for map creation, split across two
panels:

- **Shared `<world-toolbar>`** (top-left, from `ts/ui/molecules/`): the **World** group
  (Load 🌍 / OSM Import 🗺️) and a **Storage** group (Save 💾 / Clear ❌), plus
  the **Viewport** mode toggle (mouse 🖱️ vs. touchpad ☝️). The editor-only OSM,
  Storage group and separator are revealed via `showWorldEditorActions()`, while
  the simulator-only groups (Car, Borders, Tracking, Debug) are hidden via
  `hideGroups(...)`. Toolbar order in editor mode: World → OSM → (separator) →
  Storage → Car → Selected → Viewport → Debug.
- **Shared `<shortcuts-toolbar>`** (top-left, from `ts/ui/molecules/`): visualizes the
  graph-editor keys (`S` / `E` / `C` / `O`) plus the `Ctrl` zoom modifier. The
  `O` one-way indicator is click-latchable. Replaces the old inline
  `#keyIndicators` block that used to live in the bottom controls panel.
- **`<editor-toolbar>`** (bottom-center, from `ts/ui/molecules/editorToolbar.ts`): custom element
  wrapping the editor-mode buttons (Graph, Marking, Stop, Start,
  Light, Crossing, Target, Parking, Yield, Corridor). Replaces the old

  `<div id="controls">`. Active state is driven by CSS `.active` class instead
  of inline style mutations in `WorldEditor`.

The OSM text-area panel (`#osmPanel`) stays in `world.html`; only its open button
moved into the shared toolbar.
