# OSM Import: Lane Count, Highway Types, and Road Names

**Date:** 2026-07-21
**Slug:** osm-import-lanes
**Entry points affected:** `html/world.html` (OSM dialog styling), all HTML pages (road rendering)
**Save-file impact:** Segment serialization now includes `highwayType`, `name`, `lanes`, `surface`, `maxSpeed` fields (backward-compat: optional, defaults remain)
**Backward compat:** preserved — all new fields are optional, existing worlds without metadata render as before (default 2-lane roads at 100px width)

## Goal

Improve the OSM road import to represent real-world road data more accurately:

1. **Lane count** → variable road width per segment + lane divider lines
2. **Highway type** → different road envelope colors by type (motorway, primary, secondary, residential, etc.)
3. **Road name labels** → rendered on the map at readable zoom levels
4. **Surface & speed** → stored as metadata for future rendering/behavior use

## Context (read first)

- `AGENTS.md` — project conventions, architecture rules, layer isolation.
- `ts/math/osm-importer/osm.ts` — current OSM parser (reads only `oneway`, `lanes`, `junction` tags).
- `ts/math/primitives/segment.ts` — the `Segment` class (currently has `p1`, `p2`, `oneWay`, `separated`).
- `ts/world/generation/worldGenerator.ts` — `generateRoads()` creates road envelopes at uniform `world.roadWidth`.
- `ts/world/world.ts` — `#drawLaneMarkings()` draws center lines (solid/dashed/arrows); `draw()` renders envelopes at fixed color.
- `ts/math/worldUnits.ts` — coordinate system constants.
- `ts/math/graph/graph.ts` — Graph.hash() and Graph.load() that must preserve new metadata.

### Key design decisions

- **LANE_WIDTH_PX = 50**: At 14px/m scale, 50px ≈ 3.57m, matching real-world lane width (~3.5-3.7m). The existing default `world.roadWidth = 100` matches a 2-lane road.
- **Per-segment road width**: `(segment.lanes ?? 2) * LANE_WIDTH_PX`. `world.roadWidth` is kept as a reference for building setback / marking sizing but each envelope gets its own computed width.
- **Lane defaults by highway type**: motorway=4, primary=2, secondary=2, tertiary=2, residential=2, service=1. Only used when no explicit `lanes` tag exists.
- **Road name rendering**: When zoom level is high enough (viewport zoom > ~0.4) and segment length > 100px, draw the name at the segment center, rotated to match road direction.
- **Highway type colors**: motorway=#999, primary=#DD8833, secondary=#EECC55, tertiary=#BBB, residential=#BBB (current default), service=#AAA, unclassified=#BBB.

## Acceptance criteria

1. **OSM import reads `highway`, `name`, `lanes`, `surface`, `maxspeed`** from way tags and stores them on each `Segment`.
2. **Default lane count** inferred from highway type when `lanes` tag missing.
3. **Variable road width** — each road segment's envelope is sized by its lane count × LANE_WIDTH_PX.
4. **Lane divider lines** drawn for multi-lane roads (N-1 dividers, dashed for same-direction, solid for opposing-direction center divider).
5. **Highway-type coloring** — road envelope fill color varies by highway type.
6. **Road name labels** rendered at segment centers, rotated to road direction, visible when zoomed in.
7. **Graph.hash() includes lane count** so hash changes when lanes change.
8. **Graph.load() restores all metadata**.
9. **All existing tests pass** (updated where needed).
10. **New tests** cover new OSM parsing, variable width, lane divider rendering (pure logic).

## Implementation steps

### Step 1: Add LANE_WIDTH_PX constant

**File:** `ts/math/worldUnits.ts`

Add at the end of the file (before or after existing constants):

```ts
/** Pixels per lane for road width calculation in OSM import. */
export const LANE_WIDTH_PX = 50;
```

### Step 2: Extend Segment with OSM metadata

**File:** `ts/math/primitives/segment.ts`

1. Add optional fields to the `Segment` class:

```ts
  // Optional OSM metadata
  highwayType?: string;
  name?: string;
  lanes?: number;
  surface?: string;
  maxSpeed?: number;
```

2. Update the constructor to accept an optional 5th parameter:

```ts
  constructor(
    p1: Point,
    p2: Point,
    oneWay = false,
    separated = false,
    metadata?: { highwayType?: string; name?: string; lanes?: number; surface?: string; maxSpeed?: number },
  ) {
    this.p1 = p1;
    this.p2 = p2;
    this.oneWay = oneWay;
    this.separated = separated;
    if (metadata) {
      this.highwayType = metadata.highwayType;
      this.name = metadata.name;
      this.lanes = metadata.lanes;
      this.surface = metadata.surface;
      this.maxSpeed = metadata.maxSpeed;
    }
  }
```

All existing call sites that don't pass a 5th arg continue to work (optional).

### Step 3: Update Graph.load() and Graph.hash()

**File:** `ts/math/graph/graph.ts`

1. In `Graph.load()`, restore metadata from saved segments:

```ts
// After creating segments from loaded info:
info.segments.forEach((s, idx) => {
  segments[idx].highwayType = s.highwayType;
  segments[idx].name = s.name;
  segments[idx].lanes = s.lanes;
  segments[idx].surface = s.surface;
  segments[idx].maxSpeed = s.maxSpeed;
});
```

2. In `hash()`, extend the mix line to include lane count:

```ts
// Current: mix((s.oneWay ? 1 : 0) | (s.separated ? 2 : 0));
// New:
const hFlags =
  (s.oneWay ? 1 : 0) | (s.separated ? 2 : 0) | ((s.lanes ?? 2) << 2);
mix(hFlags);
```

### Step 4: Update Osm.parseRoads()

**File:** `ts/math/osm-importer/osm.ts`

1. Update the `OsmWayTags` interface — it already has `lanes: string`, add `highway`, `name`, `surface`, `maxspeed`, `junction` explicitly (they're already covered by `[key: string]: string` but explicit types help readability).

2. Add a helper function or inline logic for default lane count:

```ts
/** Returns a default lane count based on highway type when no explicit lanes tag exists. */
function defaultLaneCount(
  highwayType: string | undefined,
  oneWay: boolean,
): number {
  switch (highwayType) {
    case 'motorway':
      return 4;
    case 'primary':
      return 2;
    case 'secondary':
      return 2;
    case 'tertiary':
      return 2;
    case 'residential':
      return 2;
    case 'service':
      return 1;
    case 'living_street':
      return 1;
    case 'track':
      return 1;
    default:
      return oneWay ? 1 : 2;
  }
}
```

3. In the way-processing loop (where segments are created), parse more tags:

```ts
const highwayType = way.tags.highway;
const name = way.tags.name;
const surface = way.tags.surface;
const speedStr = way.tags.maxspeed;
let maxSpeed: number | undefined;
if (speedStr) {
  const num = parseFloat(speedStr);
  if (!isNaN(num)) maxSpeed = num;
}
const lanesTag = way.tags.lanes ? parseInt(way.tags.lanes, 10) : undefined;
// If lanesTag is NaN or 0, treat as undefined
const laneCount =
  lanesTag && lanesTag > 0 ? lanesTag : defaultLaneCount(highwayType, isOneWay);
```

4. Pass metadata to Segment constructor:

```ts
segments.push(
  new Segment(prevPoint, currentPoint, isOneWay, false, {
    highwayType,
    name,
    lanes: laneCount,
    surface,
    maxSpeed,
  }),
);
```

5. Keep the existing `separated` detection logic. For now, `separated` stays `false` for all OSM roads (we can add `median` detection later).

### Step 5: Update WorldGenerator.generateRoads() for variable width

**File:** `ts/world/generation/worldGenerator.ts`

1. Import `LANE_WIDTH_PX` from `worldUnits.js`.

2. Add a helper function:

```ts
/** Compute road width for a segment based on its lane count. */
function getSegmentRoadWidth(segment: Segment): number {
  return (segment.lanes ?? 2) * LANE_WIDTH_PX;
}
```

3. In `generateRoads()`, use per-segment width for envelopes:

```ts
for (const segment of world.graph.segments) {
  world.envelopes.push(
    new Envelope(segment, getSegmentRoadWidth(segment), world.roadRoundness),
  );
}
```

4. In `wgGenerateLaneGuides()`, update to use per-segment half-width:

```ts
for (const segment of graph.segments) {
  tempEnvelopes.push(
    new Envelope(segment, getSegmentRoadWidth(segment) / 2, roadRoundness),
  );
}
```

5. In `wgGenerateBuildings()`, update the envelope width calculation to use per-segment width:

```ts
for (const seg of world.graph.segments) {
  const segWidth = getSegmentRoadWidth(seg);
  tempEnvelopes.push(
    new Envelope(
      seg,
      segWidth + world.buildingWidth + world.spacing * 2,
      world.roadRoundness,
    ),
  );
}
```

### Step 6: Update road rendering for multi-lane dividers and highway colors

**File:** `ts/world/world.ts`

1. **Import** `LANE_WIDTH_PX` from worldUnits.

2. **Highway type envelope colors**: In the `draw()` method, update the envelope rendering loop:

```ts
if (layers.roads) {
  for (const env of this.envelopes) {
    const seg = env['#skeleton'] as Segment;
    const fillColor = getRoadFillColor(seg);
    const strokeColor = getRoadStrokeColor(seg);
    drawEnvelope(ctx, env, {
      fill: fillColor,
      stroke: strokeColor,
      lineWidth: 15,
    });
  }
  // ... rest of road drawing
}
```

Add a helper function:

```ts
/** Returns the fill color for a road envelope based on its highway type. */
function getRoadFillColor(seg: Segment): string {
  switch (seg.highwayType) {
    case 'motorway':
      return '#999';
    case 'trunk':
      return '#AA9966';
    case 'primary':
      return '#DD8833';
    case 'secondary':
      return '#EECC55';
    case 'tertiary':
      return '#CCC';
    case 'service':
      return '#AAA';
    case 'living_street':
      return '#AAA';
    default:
      return '#BBB'; // residential and others
  }
}

function getRoadStrokeColor(seg: Segment): string {
  switch (seg.highwayType) {
    case 'motorway':
    case 'trunk':
      return '#888';
    default:
      return '#BBB';
  }
}
```

**Important:** The `Envelope` class uses `#skeleton` (a private field) to store the segment. We access it as `env['#skeleton']`. Verify this is accessible — if not, we can instead look up the segment another way (e.g., store the segment reference on the envelope, or pass it alongside). Since the field is truly private (ES2022 `#`), we need another approach. Options:

- Add a public getter `getSkeleton()` on `Envelope` that returns `this.#skeleton`
- Store a `Map<Envelope, Segment>` in the generator
- Use the graph segments directly and match them by position

**Recommendation:** Add a public `get skeleton(): Segment` getter to `Envelope`:

```ts
// In envelope.ts
get skeleton(): Segment {
  return this.#skeleton;
}
```

Then use `env.skeleton.highwayType` in the rendering code.

3. **Multi-lane divider lines**: Update `#drawLaneMarkings()`:

After the existing per-segment logic (arrows for oneWay, solid for separated, dashed otherwise), add multi-lane divider drawing:

```ts
// Multi-lane dividers (for roads with > 2 lanes OR explicit lanes tag)
const laneCount = seg.lanes ?? (seg.oneWay ? 1 : 2);
if (laneCount > 1) {
  const dir = seg.directionVector();
  const perpDir = normalize(new Point(-dir.y, dir.x));
  const roadWidth = laneCount * LANE_WIDTH_PX;
  const laneWidth = roadWidth / laneCount;

  // For N lanes, draw N-1 dividers
  for (let i = 0; i < laneCount - 1; i++) {
    // Offset from center: (i + 1 - laneCount/2) * laneWidth
    const offset = (i + 1 - laneCount / 2) * laneWidth;

    // Only draw the divider if it's not at the road border
    if (Math.abs(offset) >= roadWidth / 2 - 1) continue;

    // Determine if this is a center divider (closest to offset 0)
    const distFromCenter = Math.abs(offset);
    const isCenterDivider = distFromCenter < laneWidth * 0.6;

    // Draw divider line
    const p1 = add(seg.p1, scale(perpDir, offset));
    const p2 = add(seg.p2, scale(perpDir, offset));

    if (seg.oneWay) {
      // Same direction: all dividers are dashed
      drawSegment(ctx, new Segment(p1, p2), {
        color: 'white',
        width: 2,
        dash: [8, 16],
      });
    } else if (seg.separated && isCenterDivider) {
      // Opposing direction with separation: solid divider
      drawSegment(ctx, new Segment(p1, p2), { color: 'white', width: 4 });
    } else if (isCenterDivider) {
      // Center divider in two-way road (opposing traffic): dashed (default)
      drawSegment(ctx, new Segment(p1, p2), {
        color: 'white',
        width: 4,
        dash: [15, 25],
      });
    } else {
      // Same-direction divider: thin dashed
      drawSegment(ctx, new Segment(p1, p2), {
        color: 'white',
        width: 2,
        dash: [8, 16],
      });
    }
  }
}
```

**Note:** The existing single center-line drawing (arrows/solid/dashed) should be kept for backward compatibility with single-lane roads. For multi-lane roads, the center divider is already drawn as part of the multi-lane dividers loop above. We must ensure we don't double-draw.

**Strategy:** Only draw the single center line (existing code) when `laneCount <= 2` (it's already handled by dividers for >2). Or better: skip the existing center-line drawing entirely when multi-lane dividers are drawn, and let the dividers handle everything.

Let me simplify: Replace the existing `#drawLaneMarkings` logic with the multi-lane approach that handles all cases:

For each segment:

- If `oneWay`: draw direction arrows + N-1 dashed dividers
- If `separated` and NOT `oneWay`: draw dividers, with center divider(s) solid
- Else (two-way, not separated): draw dividers, with center divider dashed

But the existing arrows and center-line code is quite specific. Let me keep both: the existing code handles lanes=2 (the common case), and the new multi-lane code activates when `lanes > 2`.

**Simpler approach:** Keep the existing `#drawLaneMarkings` for single/double-lane roads, and only add multi-lane dividers for `(lanes ?? 2) > 2`. This minimizes changes to existing behavior.

```ts
#drawLaneMarkings(ctx: CanvasRenderingContext2D): void {
  for (const seg of this.graph.segments) {
    const laneCount = seg.lanes ?? (seg.oneWay ? 1 : 2);
    const roadWidth = laneCount * LANE_WIDTH_PX;

    if (laneCount > 2) {
      // Multi-lane: draw all dividers
      this.#drawMultiLaneDividers(ctx, seg, laneCount, roadWidth);
    } else {
      // 1-2 lanes: existing center-line logic
      this.#drawCenterLine(ctx, seg, laneCount, roadWidth);
    }
  }
}
```

Extract the existing center-line logic into `#drawCenterLine` and add `#drawMultiLaneDividers`.

4. **Road name labels**: Add a new method `#drawRoadNames(ctx)` called in the `draw()` method when `layers.roads` is true:

```ts
#drawRoadNames(ctx: CanvasRenderingContext2D): void {
  // Only draw at reasonable zoom levels
  if (this.zoom && this.zoom < 0.4) return;

  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const seg of this.graph.segments) {
    if (!seg.name || seg.length() < 100) continue; // Skip short segments or unnamed

    const mid = lerp2D(seg.p1, seg.p2, 0.5);
    const dir = seg.directionVector();
    const angle = Math.atan2(dir.y, dir.x);

    ctx.save();
    ctx.translate(mid.x, mid.y);
    ctx.rotate(angle);

    // Draw text background for readability
    const textWidth = ctx.measureText(seg.name).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-textWidth / 2 - 4, -10, textWidth + 8, 20);

    ctx.fillStyle = 'white';
    ctx.fillText(seg.name, 0, 0);
    ctx.restore();
  }
}
```

Call `this.#drawRoadNames(ctx)` after drawing lane markings in the `draw()` method (inside the `if (layers.roads)` block).

**Note:** Need to import `lerp2D` in the import section if not already imported.

### Step 7: Update the OSM dialog for feedback

**File:** `html/world.html`

Minor: after parsing, show a brief summary (e.g., in the existing alert or a status div) showing:

- Number of roads imported
- Number of lanes detected
- Highway types found

This is low priority but nice to have. The current alert on error is sufficient. For the plan, let's keep this minimal — the existing flow works.

### Step 8: Tests

#### Update existing tests

**File:** `tests/unit/math/osm-importer/osm.test.ts`

- Update test data to include `highway`, `name`, `surface`, `lanes`, `maxspeed` tags
- Add tests for:
  - Lane count parsing (explicit `lanes` tag)
  - Default lane count by highway type
  - Highway type stored on segment
  - Name stored on segment
  - Surface stored on segment
  - Max speed parsing
  - `lanes=1` still implies one-way
  - `junction=roundabout` still implies one-way

**File:** `tests/unit/world/generation/worldGenerator.test.ts`

- Update `generateRoads` test to verify per-segment width varies by lane count
- Add a test with segments having different lane counts

#### No changes needed for draw-based tests (covered by visual/playwright tests)

### Step 9: Verify all tests pass

Run `npm test` to ensure nothing is broken.

## Risks and mitigations

| Risk                                                                | Mitigation                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Envelope.#skeleton` is truly private (ES2022 `#` prefix)           | Add a public `get skeleton()` getter to `Envelope`                   |
| Lane divider drawing overlaps existing center-line logic            | Cleanly separate: existing code for 1-2 lanes, new code for 3+ lanes |
| Road names may look cluttered at low zoom                           | Gate on `this.zoom > 0.4` and segment length > 100px                 |
| Building setback uses per-segment road width, may look inconsistent | Use segment-specific width in building generation too                |
| Graph hash changes affect editor change detection                   | Intentional — metadata changes should trigger regen                  |

## Files affected (complete list)

| File                                                 | Change                                                |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `ts/math/worldUnits.ts`                              | Add `LANE_WIDTH_PX = 50`                              |
| `ts/math/primitives/segment.ts`                      | Add optional metadata fields + constructor param      |
| `ts/math/primitives/envelope.ts`                     | Add public `skeleton` getter                          |
| `ts/math/graph/graph.ts`                             | `load()` restores metadata; `hash()` includes lanes   |
| `ts/math/osm-importer/osm.ts`                        | Parse more tags; default lane counts; pass to Segment |
| `ts/world/generation/worldGenerator.ts`              | Per-segment road width; helper functions              |
| `ts/world/world.ts`                                  | Highway colors; multi-lane dividers; road name labels |
| `tests/unit/math/osm-importer/osm.test.ts`           | New tests for extended tag parsing                    |
| `tests/unit/world/generation/worldGenerator.test.ts` | Test variable lane widths                             |
