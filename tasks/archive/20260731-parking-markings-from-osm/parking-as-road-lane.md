# Parking as a Road Lane (envelope-integrated, collision-correct)

**Date:** 2026-07-30
**Slug:** parking-as-road-lane
**Depends on / supersedes:** `tasks/osm-parking-import.md` (already implemented —
parking currently imported as standalone `Parking` markings placed OUTSIDE the
road envelope). This task **refactors** that: parking becomes a per-segment
property that widens the road envelope so the collision border sits AFTER the
parking lane.
**Entry points affected:** `html/world.html` (editor panel + OSM import +
road generation). Because road envelopes/borders are consumed by every
simulator, the change is visible in `simulator.html`, `traffic.html`,
`race.html`, and `human-training.html` (training collision correctness).
**Save-file impact:** Additive. Two new optional boolean fields
(`parkingLeft` / `parkingRight`) on `Segment`, serialized with the graph. Old
worlds load with both `undefined` → no parking lane, identical geometry to
today. No schema version bump.
**Backward compat:** Preserved. Segments without parking flags generate exactly
the current envelope/border/lane-guide geometry.

## Motivation (the two problems)

### Small problem — editor panel has no parking control

`<world-editor-panel>` exposes brush properties (`bridge`, `oneWay`,
`separated`, `lanes`, `laneMarkings`, …) that `GraphEditor.setBrushState()`
stamps onto hand-drawn segments. There is no way to say "this road has parking
on the right/left/both". We need a parking-side control wired exactly like the
existing `bridge` checkbox.

### Big problem — parking bays sit OUTSIDE the collision border

Road collision for AI training is driven by `world.roadBorders` (plus
`separatorBorders` and corridor borders), aggregated in
`buildRoadBorders()` ([ts/simulator/spatialGridUtils.ts](ts/simulator/spatialGridUtils.ts))
and raycast by the car sensors. Those borders are
`Polygon.union(envelopes.map(e => e.polygon))`, and each envelope is
`new Envelope(segment, getSegmentRoadWidth(segment), roundness)` — a **symmetric**
band of width `lanes * LANE_WIDTH_PX` centred on the segment.

The just-shipped OSM parking places `Parking` markings at
`roadWidth/2 + bayWidth/2` — i.e. **beyond** the road edge, OUTSIDE the border.
For a driving car those bays are off-road: the sensor border is BEFORE the
parking, so a car that pulls into a parking bay "crashes". That is wrong — a
parking lane is part of the paved road; the crash border must be AFTER it.

### The idea (from the user, see the roundabout screenshot)

Treat each parking side as an **extra lane baked into the road envelope**:

```
            BEFORE (current)                         AFTER (this task)
   border ─┐                                border ──────────────┐
           │  ┌────── asphalt ──────┐                 ┌── asphalt (+ parking) ──┐
   P P P P │  │ lane │ lane │        │        │ lane │ lane │ P P P P (parking) │ │
           │  └─────────────────────┘                 └──────────────────────────┘
   (bays outside the border →                 (parking lane is INSIDE the
    car crashes if it parks)                   envelope; border is past it →
                                               car can pull in without crashing)
```

The driving lanes stay where they are; the asphalt (and the collision border)
extends by one parking-lane width on each tagged side. The parking lane is
visually marked with the "P" treatment but is otherwise ordinary road for
collision purposes.

## Key facts about the current code (read before implementing)

- **Envelope is symmetric** ([ts/math/primitives/envelope.ts](ts/math/primitives/envelope.ts)):
  `#generatePolygon(width, roundness)` builds a band of `radius = width/2` on
  BOTH sides of the skeleton. There is no lateral-offset or asymmetric option.
  `get skeleton()` returns the skeleton `Segment`, and the **renderer reads
  metadata off it** — `env.skeleton.highwayType` for fill color, `env.skeleton.bridge`
  for shadows/deck, and `getHighwayTierRank(env.skeleton)` for draw order
  ([ts/world/world.ts](ts/world/world.ts) lines ~310, ~520-575;
  [ts/world/roadTiers.ts](ts/world/roadTiers.ts)). **Any geometry change MUST keep
  `env.skeleton` pointing at the real segment** so these reads keep working.
- **Road generation** ([ts/world/generation/worldGenerator.ts](ts/world/generation/worldGenerator.ts)):
  `generateRoads()` rebuilds `envelopes`, `roadBorders`,
  `laneGuides`, `separatorBorders` from the graph on every graph change (cheap,
  deterministic). `getSegmentRoadWidth(seg) = (seg.lanes ?? 2) * LANE_WIDTH_PX`.
  `wgGenerateLaneGuides()` places one guide per **driving** lane using
  `segment.lanes` (NOT `getSegmentRoadWidth`) — so lane guides are already
  decoupled from envelope width and need no change.
- **`Segment` metadata** ([ts/math/primitives/segment.ts](ts/math/primitives/segment.ts)):
  optional fields + a `metadata` constructor arg. `Graph.load()` restores every
  field ([ts/math/graph/graph.ts](ts/math/graph/graph.ts) ~line 34-46) and
  `Graph.hash()` folds them into `hFlags` / per-char loops (~line 61-105) so
  edits invalidate derived caches.
- **Editor panel brush flow**: `BrushState` + `SegmentMetadata` interfaces,
  `#brushState`, per-control listeners, `#syncBrushState()`, `#applyBrush()`,
  `showSegmentMetadata()`, `reset()`
  ([ts/ui/organisms/worldEditorPanel.ts](ts/ui/organisms/worldEditorPanel.ts));
  template markup in
  [ts/ui/organisms/worldEditorPanelTemplate.ts](ts/ui/organisms/worldEditorPanelTemplate.ts)
  (`#wepBridge` is the reference control). `GraphEditor.setBrushState()` builds
  the `metadata` object passed to `new Segment(...)`
  ([ts/world/editors/graphEditor.ts](ts/world/editors/graphEditor.ts) ~line 273-294).
- **OSM parking (current)** ([ts/math/osm-importer/osm.ts](ts/math/osm-importer/osm.ts)):
  `hasParkingSide(tags, side)` + `emitParkingBays(...)` produce
  `parkings: OsmMarkingPlacement[]`; `WorldEditor.parseOsmData()` turns them into
  `Parking` markings. **This task removes the along-curb marking emission** and
  instead records `parkingLeft` / `parkingRight` on the segment metadata.
- **`LANE_WIDTH_PX = 50`** ([ts/math/worldUnits.ts](ts/math/worldUnits.ts)).

## Design decisions

1. **Parking is per-segment metadata, not markings.** Add
   `parkingLeft?: boolean` and `parkingRight?: boolean` to `Segment`. "right" /
   "left" are relative to the segment direction `p1 → p2`, matching the existing
   `perpendicular(dir)` convention (`+perp` = right in screen coords). Two
   booleans (not a `'none'|'left'|'right'|'both'` enum) compose directly with the
   OSM `parkRight`/`parkLeft` and the both-sides case.
2. **Envelope gains an optional lateral offset**, NOT an asymmetric width.
   Because the envelope is symmetric, one-sided parking is represented by
   **widening the band and shifting it toward the parking side**:

   - both sides → width `+= 2 * PARKING_LANE_WIDTH_PX`, offset `0`
   - right only → width `+= PARKING_LANE_WIDTH_PX`, offset `+PARKING_LANE_WIDTH_PX/2`
   - left only → width `+= PARKING_LANE_WIDTH_PX`, offset `−PARKING_LANE_WIDTH_PX/2`

   Verify the span: symmetric band of width `W` shifted by `s` along `perp`
   covers `[s − W/2, s + W/2]`. With driving half-width `d = drivingWidth/2` and
   parking width `P`: right-only wants `[−d, d + P]` → centre `P/2`, width
   `2d + P` ✓. Both wants `[−d − P, d + P]` → centre `0`, width `2d + 2P` ✓.

   Implement by adding a `lateralOffset` param to `Envelope` that shifts the
   generated polygon perpendicular to the skeleton **while leaving `#skeleton`
   untouched** (so `env.skeleton.highwayType` / `.bridge` / tier rank still read
   the real segment). Do NOT build the envelope on a cloned/shifted `Segment`
   (that would strip metadata and break the renderer).

3. **Driving lanes are unchanged.** `wgGenerateLaneGuides` keeps using
   `segment.lanes`, centred on the true centreline. With a one-sided offset the
   driving lanes correctly hug the non-parking edge and the parking lane occupies
   the tagged side — exactly like a real street.
4. **Parking visual is drawn from metadata**, replacing the standalone
   `Parking` markings for the OSM/panel path. A small draw pass renders the "P"
   treatment along the parking lane centre (`drivingWidth/2 + P/2` on the tagged
   side). The manual `ParkingEditor` (single-spot `Parking` markings on a lane
   guide) stays as a legacy quick tool and is out of scope.
5. **Buildings** keep-out uses the widened width so they don't overlap the
   parking lane (symmetric widening is an acceptable, slightly conservative
   keep-out; offset is optional here).

Add `PARKING_LANE_WIDTH_PX` to [ts/math/worldUnits.ts](ts/math/worldUnits.ts)
(suggested `LANE_WIDTH_PX / 2 = 25`, matching the current bay depth; keep it a
named, tunable constant).

## Scope

### In scope

1. `Segment`: `parkingLeft` / `parkingRight` fields + constructor metadata +
   `Graph.load` restore + `Graph.hash` fold.
2. `Envelope`: optional `lateralOffset` param shifting the generated polygon
   (skeleton untouched).
3. `WorldGenerator.generateRoads`: compute per-segment parking width + offset and
   build the collision/asphalt envelope so the border is past the parking lane.
   `wgGenerateBuildings`: widen keep-out by the parking width.
4. Parking-lane **visual** drawn from segment metadata in `World.draw()`
   (new small pass), replacing the OSM `Parking`-marking emission.
5. OSM import: set `parkingLeft` / `parkingRight` on segment metadata; remove the
   `emitParkingBays` marking path and the `parkings` return array (and its
   consumption in `WorldEditor.parseOsmData`).
6. Editor panel: a parking-side control (recommended: two checkboxes
   "Parking L" / "Parking R", or a `None/Left/Right/Both` select) wired through
   `BrushState`, `SegmentMetadata`, listeners, `#syncBrushState`,
   `showSegmentMetadata`, `reset`, template, and `GraphEditor.setBrushState`.
7. Tests + docs.

### Out of scope

- Manual `ParkingEditor` single-spot markings (unchanged; still sit on a lane
  guide and do NOT widen the envelope).
- Parking orientation styles (parallel/diagonal/perpendicular), capacity, zones.
- Making cars actually park or use the parking lane as a driving lane.
- Off-street `amenity=parking` areas.
- Changing the Overpass query.

## Implementation

### 1. `ts/math/worldUnits.ts`

- Add `export const PARKING_LANE_WIDTH_PX = LANE_WIDTH_PX / 2;` with a comment
  (curb-side parking lane width, ≈ half a driving lane).

### 2. `ts/math/primitives/segment.ts`

- Add `parkingLeft?: boolean;` and `parkingRight?: boolean;` fields.
- Extend the `metadata` constructor arg type + assignment block.

### 3. `ts/math/primitives/envelope.ts`

- Add a `lateralOffset: number = 0` parameter (after `generatedPolygon`, or via
  an options object if cleaner). In `#generatePolygon`, translate `p1`/`p2` by
  `perpendicular(directionVector) * lateralOffset` **before** building the band.
  Keep `#skeleton` = the passed skeleton (unchanged).
- `Envelope.load` and all existing call sites default to `0` → no behavior
  change.

### 4. `ts/world/generation/worldGenerator.ts`

- New helper e.g. `getSegmentEnvelope(seg)` returning `{ width, offset }`:
  - `driving = (seg.lanes ?? 2) * LANE_WIDTH_PX`
  - `right = seg.parkingRight ? 1 : 0`, `left = seg.parkingLeft ? 1 : 0`
  - `width = driving + (right + left) * PARKING_LANE_WIDTH_PX`
  - `offset = (right - left) * PARKING_LANE_WIDTH_PX / 2`
- In `generateRoads`, build `new Envelope(segment, width, roundness, undefined, offset)`.
- In `wgGenerateBuildings`, use the widened `width` (offset optional) for the
  keep-out envelope.
- Leave `wgGenerateLaneGuides` and `wgGenerateSeparatorBorders` unchanged.

### 5. `ts/math/graph/graph.ts`

- `Graph.load`: restore `parkingLeft` / `parkingRight`.
- `Graph.hash`: fold both into `hFlags` (e.g. `(s.parkingLeft ? 16384 : 0) |
(s.parkingRight ? 32768 : 0)` — pick unused bits above `roundabout`'s `8192`).
  This invalidates envelope/border regen and signage caches on change.

### 6. `ts/world/world.ts`

- Add a parking-lane visual pass (called from `draw()` near
  `#drawLaneMarkings`). For each segment with `parkingLeft`/`parkingRight`,
  compute the parking-lane centre offset (`driving/2 + P/2` on the tagged side
  via `perpendicular(dir)`) and render the "P" treatment along it (spaced "P"
  glyphs, reusing the along-segment `lerp2D` spacing from the old
  `emitParkingBays`, or a shaded lane band). Draw AFTER the asphalt fill and
  lane markings so it reads as a marked lane.

### 7. `ts/math/osm-importer/osm.ts`

- Keep `hasParkingSide()`. In the way loop, set `parkingRight` / `parkingLeft`
  into the segment `metadata` (respecting the reverse-one-way side swap already
  used for the current bays).
- **Remove** `emitParkingBays`, the `PARKING_BAY_*` constants only used by it,
  the `parkings` accumulation, and `parkings` from `ParsedRoads` + both returns.

### 8. `ts/world/editors/worldEditor.ts`

- Remove the `result.parkings` loop and the `Parking` import if now unused.
  (Segment metadata already carries parking; the visual comes from `World.draw`.)

### 9. `ts/world/editors/graphEditor.ts`

- In the `metadata` object built in the draw handler, add
  `parkingLeft: this.#brushState.parkingLeft || undefined` and
  `parkingRight: this.#brushState.parkingRight || undefined`.

### 10. Editor panel (`worldEditorPanel.ts` + `worldEditorPanelTemplate.ts`)

- Add the control(s) to the template near `#wepBridge`.
- Extend `BrushState` + `SegmentMetadata` with `parkingLeft` / `parkingRight`.
- Add `#parkingLeftCheck` / `#parkingRightCheck` refs, `change` listeners,
  `#syncBrushState`, `#applyBrush` (`#onMetadataChange`), `showSegmentMetadata`,
  and `reset` handling — mirror `bridge` exactly.

## Testing

### `tests/unit/math/primitives/envelope.test.ts`

- Offset envelope: a segment with `lateralOffset = k` produces a polygon whose
  centroid is shifted by ≈ `k` along `perpendicular(dir)` vs. offset `0`; width
  (perpendicular extent) unchanged. `env.skeleton` still equals the passed
  segment (metadata intact).

### `tests/unit/world/generation/worldGenerator.test.ts` (or existing)

- Two-way 2-lane segment, no parking → border half-width `= LANE_WIDTH_PX`
  (baseline).
- `parkingRight` → the border on the right side is `PARKING_LANE_WIDTH_PX`
  farther out; left side unchanged (assert via envelope polygon extent / border
  distance from centreline on each side).
- `parkingLeft` → mirror.
- Both → both sides `+PARKING_LANE_WIDTH_PX`, envelope stays centred.
- Lane-guide count/positions unchanged by parking flags.

### `tests/unit/math/osm-importer/osm.test.ts`

- Replace the `parkings`-placement tests with metadata tests: `parking:right:zone`
  → `segment.parkingRight === true`, `parkingLeft` falsy; `parking:both` → both
  true; `parking:right=no` → neither; reverse one-way swaps sides; no tag →
  both undefined.

### `tests/unit/world/editors/worldEditor.test.ts`

- Update the `Osm.parseRoads` mock to drop `parkings` (return no longer has it).
- Assert imported segments carry `parkingLeft`/`parkingRight` when the mock
  provides tagged segments (or keep the mock minimal and assert no `Parking`
  markings are created).

### `tests/unit/math/graph/graph.test.ts`

- `Graph.hash` differs when `parkingLeft`/`parkingRight` toggles.
- `Graph.load` round-trips both flags.

## Acceptance criteria

- `npm run rebuild` — no TS errors. `npm run fix:all` — clean. `npm test` — green
  (existing + updated + new).
- In `html/world.html`: drawing a road with the panel's parking toggle ON widens
  the asphalt on the chosen side and the white road border sits AFTER the "P"
  lane. Importing OSM data with `parking:*` tags does the same.
- In a training simulator, a car may drive into / across the parking lane
  without the sensor detecting the road border until beyond the parking lane
  (verify: border raycast distance on the parking side increased by
  `PARKING_LANE_WIDTH_PX`).
- One-sided parking keeps the opposite border exactly where it was
  (no phantom widening on the non-parking side).
- Worlds without parking flags render byte-for-byte identically (same envelopes,
  borders, lane guides).
- Re-importing OSM data is idempotent; `TrafficManager` still cycles imported
  lights (that array path is unaffected).

## Docs to update

- `AGENTS.md` — replace the parking portion of the "OSM node-marking import"
  bullet: parking is now a per-segment property (`parkingLeft`/`parkingRight`)
  that widens the road envelope (via `Envelope` lateral offset) so the collision
  border sits past the parking lane; the "P" visual is drawn from metadata, not
  standalone markings. Update the "Per-segment road width" bullet to mention the
  parking-lane widening + offset. Note the manual `ParkingEditor` remains a
  legacy single-spot tool.
- `docs/Math.md` — OSM Importer: parking now sets segment metadata (drop the
  `parkings` return + along-curb bay math). Add an `Envelope` lateral-offset note.
- `docs/WorldEditor.md` — Node marking import: change the parking row to a
  segment-property description; document the new panel control and the
  envelope-integrated parking lane (contrast with the manual spot tool).
- `docs/Physics.md` / collision docs — note that parking lanes extend the road
  border (training-relevant).

## Open decisions (confirm with user if unsure)

- Panel control shape: two checkboxes vs. a `None/Left/Right/Both` select.
  (Recommend two checkboxes — matches the two-boolean model and the both case.)
- Parking-lane visual: spaced "P" glyphs (closest to today) vs. a subtly shaded
  lane band vs. both. (Recommend spaced "P" glyphs for continuity.)
- `PARKING_LANE_WIDTH_PX` value (default 25 = half a driving lane).
