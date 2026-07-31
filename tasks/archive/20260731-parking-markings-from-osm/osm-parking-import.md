# OSM Parking Import

**Date:** 2026-07-29
**Slug:** osm-parking-import
**Entry points affected:** `html/world.html` (world editor — the only place OSM data is imported). Imported `Parking` markings render in every page that draws a `World` (`simulator.html`, `traffic.html`, `race.html`).
**Save-file impact:** None to the schema. Imported parking markings become ordinary `Parking` entries in `world.markings`, already handled by `markingLoader` and the v2 save format. Old saves are unaffected.
**Backward compat:** Preserved. Purely additive — worlds without OSM parking tags import exactly as today.

## Goal

Import on-street parking from OpenStreetMap into the app as `Parking` markings.
OSM tags parking as a **side-of-way attribute** on road ways (e.g.
`parking:right:zone`, `parking:left`, `parking:both:orientation`), not as
discrete bays. This task generates `Parking` markings distributed **along** each
qualifying road segment, laterally offset to the **curb side(s)** indicated by
the tags, mirroring the existing node-marking import path added for traffic
lights / crossings / stops / give-ways.

## Background — how node markings are imported today (read first)

The traffic-light / crossing / stop / give-way importer already establishes the
pattern this task extends. Read it before writing code:

- `ts/math/osm-importer/osm.ts` — `Osm.parseRoads()` returns
  `{ points, segments, lights, crossings, stops, yields }`, where each marking
  array is `OsmMarkingPlacement[]` (`{ center, directionVector, width, height? }`
  — plain math primitives so the math layer never imports the world-layer
  marking classes). Node markings are built from a `markAccum` map, then placed
  in the "Assemble markings from tagged nodes" block. Read the whole file
  (~470 lines).
- `ts/world/editors/worldEditor.ts` — `parseOsmData()` calls
  `Osm.parseRoads()`, then builds `Light`/`Crossing`/`Stop`/`Yield` markings
  from the placement arrays and pushes them onto `world.markings` **in place**
  (`this.#world.markings.length = 0; ...push(...)`). The in-place mutation is
  required because `world.trafficManager` holds that exact array reference. Read
  the `parseOsmData()` method fully (~lines 500-560).
- `ts/world/markings/parking.ts` — the `Parking` marking. Constructor:
  `new Parking(center, directionVector, width, height)`. Its `draw()` renders a
  white-bordered box with a "P". `directionVector` orients the box; the box is
  drawn centred on `center`.
- `ts/world/editors/parkingEditor.ts` — how a human places parking today:
  `new Parking(center, directionVector, roadWidth / 2, roadWidth / 2)`, targeting
  `world.laneGuides`. Use these dimensions as the reference size.
- `ts/world/markings/markingLoader.ts` — already loads `type: 'parking'`. No
  change needed for save/load.
- `ts/math/worldUnits.ts` — `LANE_WIDTH_PX = 50`; per-segment road width is
  `lanes * LANE_WIDTH_PX`.
- `ts/math/utils.ts` — `subtract`, `add`, `scale`, `normalize`, `perpendicular`,
  `lerp2D`, `distance`, `angle` (all already used by `osm.ts`).
- `AGENTS.md` § "OSM node-marking import" and § "Per-segment road width".
- `tests/unit/math/osm-importer/osm.test.ts` — existing parser tests; add
  parking tests here.
- `tests/unit/world/editors/worldEditor.test.ts` — the `Osm.parseRoads` mock
  returns `{ points, segments, lights, crossings, stops, yields }`. You MUST add
  `parkings: []` to that mock or the world-editor tests break.

## OSM parking tags to support

OSM's modern `parking:*` scheme (and the older `parking:lane:*`) marks which
side of a way has parking. Support these way tags (all optional strings):

| Tag family                                        | Meaning                   |
| ------------------------------------------------- | ------------------------- |
| `parking:right`, `parking:right:*`                | Parking on the right side |
| `parking:left`, `parking:left:*`                  | Parking on the left side  |
| `parking:both`, `parking:both:*`                  | Parking on both sides     |
| `parking:lane:right`, `parking:lane:left`, `both` | Legacy equivalents        |

**Presence** of any `parking:right*` / `parking:left*` / `parking:both*` (or the
legacy `parking:lane:*`) key on a way means that side has parking. A value of
`no` / `none` means explicitly no parking — treat as absent. The sample data in
`saves/osm-data-loading-readme.txt` uses `parking:right:zone` and
`parking:both:zone`.

"Right" / "left" are relative to the way's node order (direction of drawing).
The lateral offset direction is `perpendicular(segment.directionVector())`;
determine the sign empirically and document it (see Implementation note).

## Scope

### In scope

1. Parse the parking side flags from each way in `Osm.parseRoads()`.
2. Generate `Parking` marking placements distributed along each qualifying
   segment, laterally offset to the curb (road edge) on the indicated side(s).
3. Return a new `parkings: OsmMarkingPlacement[]` array from `Osm.parseRoads()`.
4. Build `Parking` markings from that array in `WorldEditor.parseOsmData()` and
   push them onto `world.markings` in place (same pattern as the other node
   markings).
5. Update the `Osm.parseRoads` mock in `worldEditor.test.ts` to include
   `parkings: []`.
6. Unit tests for the parsing + placement.
7. Docs.

### Out of scope

- Off-street parking areas (`amenity=parking` polygons) — those are areas, not
  ways, and are not fetched by the current Overpass query.
- Parking orientation styles (parallel / diagonal / perpendicular from
  `parking:*:orientation`) — place a uniform box; do not vary the marking shape.
- Capacity / zone-number rendering — ignore the zone value string.
- Changing the Overpass query — parking tags are already on the fetched ways.

## Implementation

### `ts/math/osm-importer/osm.ts`

- In the way loop (where way-level metadata like `oneWayTag`, `lanesTag` is read),
  compute two booleans from `way.tags`:
  - `parkRight` = any key matching `parking:right*`, `parking:both*`,
    `parking:lane:right`, `parking:lane:both` whose value is not `no`/`none`.
  - `parkLeft` = the mirror for `left` / `both`.
  - A small helper `hasParkingSide(tags, side)` scanning `Object.keys(tags)` is
    cleaner than enumerating every suffix.
- If `parkRight || parkLeft`, walk the segments created for this way and emit
  parking placements. For each segment (a real graph edge from this way):
  - `segLen = distance(p1, p2)`; skip if `segLen` is below one bay length.
  - Bay size: `bayLen = LANE_WIDTH_PX` (≈ one car), `bayWidth = LANE_WIDTH_PX / 2`.
  - Count `n = max(1, floor(segLen / (bayLen * 1.5)))` bays; place them evenly
    along the segment via `lerp2D(p1, p2, (i + 0.5) / n)`.
  - Lateral offset to the curb: `offset = perpendicular(dir)` scaled by
    `getSegmentRoadWidth(seg)/2 + bayWidth/2`. Apply `+offset` for the right
    side and `-offset` for the left (verify the sign against a known sample and
    document it — "right" is relative to `p1 → p2`).
  - `directionVector` = the segment direction (`dir`), so the "P" box aligns
    with the road. `width = bayWidth`, `height = bayLen`.
  - Push `{ center, directionVector, width, height }` to the `parkings` array.
- Add `parkings` to the `ParsedRoads` interface and to BOTH `return` statements
  (the early empty-nodes return and the final return).
- Do this in a dedicated `parkings` accumulation pass, NOT inside `markAccum`
  (parking is a way attribute distributed along the segment, not a single node
  marking). A standalone loop over `segments` after they are built — filtered by
  a per-segment "has parking side" flag — is the cleanest. Consider tagging each
  emitted segment with its parking sides during the way loop (e.g. a parallel
  array or a `Map<Segment, {right, left}>`), then emitting placements after the
  segment loop.

### `ts/world/editors/worldEditor.ts`

- In `parseOsmData()`, after the existing `lights`/`crossings`/`stops`/`yields`
  loops, add a loop over `result.parkings` building
  `new Parking(p.center, p.directionVector, p.width, p.height ?? p.width)`,
  `setAnchor`-ing each, and pushing onto `world.markings` via the existing
  `addMarking` helper.
- Import `Parking` from `../markings/parking.js`.

### `tests/unit/world/editors/worldEditor.test.ts`

- Add `parkings: []` to the `Osm.parseRoads` mock return object.

## Testing

### `tests/unit/math/osm-importer/osm.test.ts`

- A way with `parking:right:zone: "10"` → `result.parkings.length > 0`, and every
  placement is laterally offset to one side of the segment centreline (check the
  perpendicular distance from the segment line ≈ expected curb offset, sign
  consistent).
- A way with `parking:both: "yes"` → placements on BOTH sides (roughly balanced
  counts, opposite lateral signs).
- A way with `parking:right: "no"` → no parking placements for that side.
- A way with no parking tags → `result.parkings` empty.
- Placement `directionVector` is (nearly) parallel to the segment direction.

## Acceptance criteria

- `npm run rebuild` succeeds with no TypeScript errors.
- `npm run fix:all` passes (format + lint).
- `npm test` passes — existing tests plus the new parking tests, and the
  `worldEditor.test.ts` mock updated so it still passes.
- Loading an OSM JSON with `parking:*` tags in `html/world.html` renders white
  "P" boxes along the curb on the tagged side(s), not in the middle of the road.
- Re-importing the same data is idempotent (markings cleared and rebuilt in
  place; `trafficManager` still cycles any imported lights).
- Worlds without parking tags import identically to before.

## Docs to update

- `docs/Math.md` — OSM Importer section: add `parkings` to the `parseRoads`
  return type and add a bullet to step 7 (node/way markings) describing parking
  side detection + along-segment placement.
- `docs/WorldEditor.md` — "Node marking import" section: add a row for
  `parking:*` → `Parking` and a short paragraph on the along-segment, curb-offset
  placement (contrast with the node markings that sit at a point).
- `AGENTS.md` — extend the "OSM node-marking import" bullet to mention parking:
  it is a WAY-side attribute (not a node), distributed along the segment and
  offset to the curb, returned as `parkings: OsmMarkingPlacement[]`.
