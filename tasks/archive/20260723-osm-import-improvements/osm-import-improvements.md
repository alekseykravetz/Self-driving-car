# OSM Import Improvements

**Date:** 2026-07-23
**Slug:** osm-import-improvements
**Entry points affected:** `html/world.html` (world editor), `html/simulator.html`, `html/traffic.html` (all use shared `ts/world/` rendering)
**Save-file impact:** New optional fields on Segment metadata — old `.world` saves load fine (new fields are `undefined`, same as hand-drawn segments). No migration needed.
**Backward compat:** Preserved. All new Segment fields are optional. `Graph.load()` restores new fields if present, ignores them if absent. `Graph.hash()` folds new metadata so signage caches invalidate on import.

## Goal

Fix OSM import bugs (oneway=-1, missing `_link` types, broken query filter) and add rich metadata parsing (ref, destination, bridge/layer, lane_markings, maxspeed:type, junction=roundabout, name:en) with full visual rendering: road shield signs for `ref`, gantry exit signs for `destination`, bridge elevation shadows, and automatic `name:en` fallback for street labels.

## Context (read first)

- `ts/math/osm-importer/osm.ts` — the `Osm.parseRoads()` parser (full file, 210 lines). Read entirely.
- `ts/math/primitives/segment.ts` — the `Segment` class with metadata fields (85 lines). Read entirely.
- `ts/world/roadTiers.ts` — `HIGHWAY_TIER_RANK` table + `sortEnvelopesByTier()` (36 lines). Read entirely.
- `ts/world/roadSignage.ts` — `computeSpeedSignPlacements()` + `computeStreetLabelPlacements()` (235 lines). Read entirely.
- `ts/world/oneWayArrows.ts` — `computeOneWayArrowPlacements()` (read for pattern).
- `ts/world/world.ts` — `getRoadFillColor()` (lines 74-94), `#drawLaneMarkings()` (lines 439-471), `#drawSimpleLaneMarkings()` (lines 452-470), `#drawMultiLaneDividers()` (lines 514-556), `#drawRoadNames()` (lines 590-615), `#drawSpeedLimits()` (lines 620-641), `#getSignage()` (lines 558-573), `#getDrawOrderedEnvelopes()` (lines 575-583), `#getOneWayArrows()` (lines 585-593), the `draw()` method (lines 340-420). Read all these ranges.
- `ts/math/graph/graph.ts` — `Graph.load()` (lines 20-39), `Graph.hash()` (lines 49-79). Read entirely.
- `ts/world/generation/worldGenerator.ts` — `getSegmentRoadWidth()` (lines 54-56), `wgGenerateLaneGuides` (lines 58+). Read the lane guide section.
- `saves/osm-data-loading-readme.txt` — the Overpass query + sample data. Read entirely.
- `tests/unit/math/osm-importer/osm.test.ts` — existing OSM parser tests (297 lines). Read entirely.
- `AGENTS.md` § "Segment OSM metadata", § "Per-segment road width", § "Per-lane lane guides", § "Road signage placement", § "Road-type draw order".

## Scope

### In scope

**P0 Bug fixes:**

1. Fix `oneway: "-1"` handling — reverse one-ways must set `oneWay=true` and swap p1/p2.
2. Add `*_link` highway types (`motorway_link`, `trunk_link`, `primary_link`, `secondary_link`, `tertiary_link`) to `HIGHWAY_TIER_RANK`, `getRoadFillColor()`, and `defaultLaneCount()`.
3. Add `unclassified` to `getRoadFillColor()` and `defaultLaneCount()`.
4. Fix the Overpass query in `saves/osm-data-loading-readme.txt`: `['highway' !~'private']` → `['access' !~'private']`, consolidate exclusions into a single regex.

**P1 Features:** 5. Parse `ref` tag → store as `ref?: string` on Segment → render road shield signs. 6. Parse `lane_markings: "no"` → store as `laneMarkings?: boolean` on Segment → skip lane markings when `false`. 7. Parse `maxspeed:type` → store as `maxspeedType?: string` → infer `maxSpeed` from a `MAXSPEED_TYPE_DEFAULTS` lookup table when `maxspeed` is absent.

**P2 Features:** 8. Parse `destination` / `destination:ref` → store as `destination?` / `destinationRef?` on Segment → render gantry exit signs on `_link` roads. 9. Parse `bridge: "yes"` + `layer` → store as `bridge?: boolean` + `layer?: number` on Segment → render bridge shadow/elevation. 10. Store `junction: "roundabout"` as `roundabout?: boolean` on Segment metadata.

**P3 Features:** 11. Parse `name:en` → store as `nameEn?: string` on Segment → automatic fallback in `computeStreetLabelPlacements` when `name` contains non-Latin characters.

**Tests:** 12. Add unit tests for all new parser behavior and bug fixes.

### Out of scope

- Re-including `service` roads in the Overpass query (user chose to keep excluded).
- Roundabout-specific junction markings (circular arrows, yield signs) — only storing the `roundabout` flag for future use.
- UI toggle for name language — automatic fallback only.
- Tunnel rendering (`layer` negative) — only bridge (positive/zero layer with `bridge=yes`) gets visual treatment.
- Updating `saves/*.json` world files — existing saves are unaffected (new fields default to `undefined`).

## Implementation

### Phase 1: Segment metadata expansion + parser fixes

#### `ts/math/primitives/segment.ts`

- Add new optional fields to the class: `ref?: string`, `destination?: string`, `destinationRef?: string`, `bridge?: boolean`, `layer?: number`, `laneMarkings?: boolean`, `roundabout?: boolean`, `nameEn?: string`, `maxspeedType?: string`.
- Extend the `metadata` constructor parameter type to include all new fields.
- In the constructor, assign all new fields from `metadata` if present (same pattern as existing `highwayType`, `name`, etc.).

#### `ts/math/osm-importer/osm.ts`

- **Fix `oneway: "-1"`:** After computing `isOneWay`, check if `oneWayTag === '-1'`. If so, set `isOneWay = true` AND swap `prevPoint`/`currentPoint` when creating the Segment (so the segment direction matches the one-way flow). The swap must happen per-segment in the inner loop — swap the two `nodeMap.get()` results before constructing the `Segment`.
- **Parse new tags** from `way.tags`:
  - `ref` → `way.tags.ref` (string)
  - `destination` → `way.tags.destination` (string)
  - `destination:ref` → `way.tags['destination:ref']` (string, note the colon in key)
  - `bridge` → `way.tags.bridge === 'yes'` (boolean)
  - `layer` → `parseInt(way.tags.layer, 10)` if present (number, default 0)
  - `lane_markings` → `way.tags.lane_markings === 'no'` → store as `laneMarkings: false` (omit/true otherwise)
  - `junction` → `way.tags.junction === 'roundabout'` → store as `roundabout: true`
  - `name:en` → `way.tags['name:en']` (string)
  - `maxspeed:type` → `way.tags['maxspeed:type']` (string, note the colon in key)
- **`maxspeed:type` inference:** After parsing `maxspeed`, if `maxSpeed` is still `undefined` but `maxspeedType` is present, look up the default speed from a `MAXSPEED_TYPE_DEFAULTS` table (defined in `osm.ts`, see below). Set `maxSpeed` to the looked-up value.
- **Add `MAXSPEED_TYPE_DEFAULTS` constant** in `osm.ts`:
  ```typescript
  const MAXSPEED_TYPE_DEFAULTS: Record<string, number> = {
    'IL:motorway': 110,
    'IL:trunk': 90,
    'IL:primary': 90,
    'IL:secondary': 80,
    'IL:tertiary': 80,
    'IL:urban': 50,
    'IL:rural': 80,
  };
  ```
  This is extensible — users can add more country codes. Only `IL:*` entries are populated by default since the sample data is from Israel. Unknown `maxspeed:type` values leave `maxSpeed` as `undefined`.
- **Extend `OsmWayTags` interface** to include the new tag keys: `ref`, `destination`, `bridge`, `layer`, `lane_markings`, `maxspeed:type`. The existing `[key: string]: string` index signature already covers `name:en` and `destination:ref`, but add explicit entries for clarity.
- **Pass all new fields** into the `Segment` constructor's `metadata` parameter.

#### `ts/world/roadTiers.ts`

- Add `*_link` types to `HIGHWAY_TIER_RANK`:
  - `motorway_link: 9` (same as motorway)
  - `trunk_link: 8` (same as trunk)
  - `primary_link: 7` (same as primary)
  - `secondary_link: 6` (same as secondary)
  - `tertiary_link: 5` (same as tertiary)

#### `ts/world/world.ts` — `getRoadFillColor()`

- Add `*_link` cases that fall through to their parent type's color:
  - `motorway_link` → `#888` (same as motorway)
  - `trunk_link` → `#998877` (same as trunk)
  - `primary_link` → `#B5774A` (same as primary)
  - `secondary_link` → `#B0A060` (same as secondary)
  - `tertiary_link` → `#CCC` (same as tertiary)
- Add `unclassified` → `#BBB` (same as residential default).

#### `ts/math/osm-importer/osm.ts` — `defaultLaneCount()`

- Add `*_link` cases:
  - `motorway_link` → 2
  - `trunk_link` → 2
  - `primary_link` → 1
  - `secondary_link` → 1
  - `tertiary_link` → 1
- Add `unclassified` → 2 (same as residential).

#### `ts/math/graph/graph.ts` — `Graph.load()` and `Graph.hash()`

- In `Graph.load()` (lines 31-37): after restoring existing metadata fields, also restore the new fields: `ref`, `destination`, `destinationRef`, `bridge`, `layer`, `laneMarkings`, `roundabout`, `nameEn`, `maxspeedType`.
- In `Graph.hash()` (lines 61-78): fold new metadata into the hash so signage caches invalidate:
  - Fold `ref` per-char (same pattern as `name`).
  - Fold `bridge ? 1 : 0` and `layer ?? 0` into `hFlags`.
  - Fold `laneMarkings === false ? 1 : 0` into `hFlags`.
  - Fold `roundabout ? 1 : 0` into `hFlags`.
  - Fold `destination` and `destinationRef` per-char (same as `name`).
  - Fold `nameEn` per-char.
  - Fold `maxspeedType` per-char.
  - Keep the hash computation fast — only fold fields that are defined.

### Phase 2: Rendering — lane markings skip, bridge shadows, name:en fallback

#### `ts/world/world.ts` — `#drawLaneMarkings()` and `#drawSimpleLaneMarkings()` and `#drawMultiLaneDividers()`

- In `#drawLaneMarkings()`: skip the segment entirely if `seg.laneMarkings === false`. Add the check at the top of the loop body:
  ```typescript
  if (seg.laneMarkings === false) continue;
  ```

#### `ts/world/world.ts` — bridge rendering

- In the `draw()` method, after drawing road envelopes (the `for (const env of this.#getDrawOrderedEnvelopes())` loop, line ~350) and before drawing road borders (line ~357), add a bridge shadow pass:
  - Create a new private method `#drawBridgeShadows(ctx)`.
  - Iterate `this.envelopes`. For each envelope where `env.skeleton.bridge === true`:
    - Draw the envelope polygon offset by a shadow vector (e.g., `[4, 6]` px) with a semi-transparent dark fill (`rgba(0,0,0,0.3)`) and no stroke.
    - This creates a drop-shadow effect that visually elevates the bridge above the roads beneath.
  - Call `this.#drawBridgeShadows(ctx)` right before the road borders loop, so shadows are under the borders but above the asphalt fills.
  - The shadow pass must use the tier-sorted envelope order (same as `#getDrawOrderedEnvelopes()`) so higher-tier bridges cast shadows on lower-tier roads.

#### `ts/world/roadSignage.ts` — `computeStreetLabelPlacements()`

- Modify the `byName` grouping (line ~199) to use a display name that falls back to `nameEn`:
  - Before grouping, compute a `displayName` for each segment: if `seg.name` exists and contains only Latin characters (test with `/^[\x00-\x7F]*$/`), use `seg.name`. If `seg.name` exists but has non-Latin chars and `seg.nameEn` exists, use `seg.nameEn`. If `seg.nameEn` exists but `seg.name` doesn't, use `seg.nameEn`. Otherwise use `seg.name` (or skip if neither exists).
  - Group by `displayName` instead of `seg.name`.
  - The `StreetLabelPlacement.name` field should carry the `displayName`.
- This is a minimal change — the grouping logic and walk logic stay the same, only the key changes.

### Phase 3: Rendering — road shield signs and exit destination signs

#### `ts/world/roadSignage.ts` — new placement functions

- Add `computeRoadShieldPlacements(graph: Graph): RoadShieldPlacement[]`:

  - `RoadShieldPlacement` interface: `{ x: number; y: number; angle: number; ref: string; highwayType?: string }`.
  - Group segments by `ref` value (only segments where `ref` is defined).
  - For each `ref` group, use `buildConnectedComponents` + `orderSegmentWalk` (same helpers as street labels) to build street walks.
  - Place one shield per walk at the midpoint (arc-length 50%).
  - For longer streets (total walk length > 2000px), place shields every ~2000px (same spacing pattern as `STREET_LABEL_SPACING_PX`).
  - Angle: same upright normalization as `pointAtArc()`.
  - Export `RoadShieldPlacement` interface and `computeRoadShieldPlacements`.
  - Add `ROAD_SHIELD_SPACING_PX = 2000` constant.

- Add `computeExitSignPlacements(graph: Graph): ExitSignPlacement[]`:
  - `ExitSignPlacement` interface: `{ x: number; y: number; angle: number; destination: string; destinationRef?: string }`.
  - Only segments where `highwayType` ends with `_link` AND `destination` is defined.
  - Place one sign at the start of the link segment (the endpoint that connects to the higher-tier road — determined by checking which endpoint has more incident segments of higher tier).
  - If `destinationRef` exists, include it in the placement.
  - Angle: perpendicular to the segment direction (so the sign faces oncoming traffic).
  - Export `ExitSignPlacement` interface and `computeExitSignPlacements`.

#### `ts/world/world.ts` — shield and exit sign rendering

- Import `computeRoadShieldPlacements`, `computeExitSignPlacements`, and their types from `roadSignage.ts`.
- Add `#shieldCache` and `#exitSignCache` private fields (same pattern as `#signageCache`, `#oneWayArrowCache` — keyed by `Graph.hash()`).
- Add `#getRoadShields()` and `#getExitSigns()` private methods (same pattern as `#getSignage()`, `#getOneWayArrows()`).
- Add `#drawRoadShields(ctx)` method:
  - Guard with `MIN_SIGNAGE_ZOOM` check.
  - For each shield placement:
    - Draw a rounded rectangle badge (width ~40px, height ~24px) with a colored background based on `highwayType`:
      - `motorway`/`motorway_link`/`trunk`/`trunk_link` → blue background (`#2B6CB0`), white text.
      - `primary`/`primary_link`/`secondary`/`secondary_link` → white background, black text, black border.
      - Others → white background, black text.
    - Draw the `ref` text centered in the badge, bold 12px.
    - Rotate the badge to match the `angle` (upright, same as street labels).
- Add `#drawExitSigns(ctx)` method:
  - Guard with `MIN_SIGNAGE_ZOOM` check.
  - For each exit sign placement:
    - Draw a gantry-style sign: a green rounded rectangle (width scales with text length, height ~28px) with white text.
    - If `destinationRef` exists, draw it as a smaller badge on the left side of the sign.
    - Draw the `destination` text (may contain semicolons for multiple destinations — split on `;` and stack vertically if multiple).
    - Rotate to match `angle`.
- Call `this.#drawRoadShields(ctx)` and `this.#drawExitSigns(ctx)` in the `draw()` method, after `#drawSpeedLimits(ctx)` (line ~371), inside the `if (layers.roads)` block.

### Phase 4: Overpass query fix + tests

#### `saves/osm-data-loading-readme.txt`

- Replace the query with the fixed version:
  ```
  [out:json];
  (
    way['highway']
    ['highway' !~'pedestrian|footway|cycleway|path|corridor|steps|bridleway|proposed|construction|elevator|bus_guideway|raceway|no']
    ['access' !~'private']
    ({{bbox}});
  );
  out body;
  >;
  out skel;
  ```
  - Consolidated exclusions into a single regex with `|`.
  - Fixed `['highway' !~'private']` → `['access' !~'private']`.
  - Removed `track` and `service` exclusions (service stays excluded per user choice — keep `service` in the exclusion regex). Actually: keep `service` and `track` excluded to match current behavior. The regex above already excludes them — add `|service|track` back to the regex.
  - Final regex: `['highway' !~'pedestrian|footway|cycleway|path|service|corridor|track|steps|raceway|bridleway|proposed|construction|elevator|bus_guideway|no']`

#### `tests/unit/math/osm-importer/osm.test.ts`

- Add tests for:
  - `oneway: "-1"` → `oneWay === true` AND p1/p2 are swapped (check that the segment direction is reversed compared to the node order).
  - `trunk_link` highway type → correct tier rank, correct default lanes (2).
  - `secondary_link` highway type → correct tier rank, correct default lanes (1).
  - `tertiary_link` highway type → correct tier rank, correct default lanes (1).
  - `unclassified` highway type → correct default lanes (2).
  - `ref` tag → stored on segment.
  - `destination` tag → stored on segment.
  - `destination:ref` tag → stored on segment as `destinationRef`.
  - `bridge: "yes"` → `bridge === true` on segment.
  - `layer: "1"` → `layer === 1` on segment.
  - `lane_markings: "no"` → `laneMarkings === false` on segment.
  - `junction: "roundabout"` → `roundabout === true` on segment (in addition to `oneWay === true`).
  - `name:en` tag → stored on segment as `nameEn`.
  - `maxspeed:type: "IL:trunk"` with no `maxspeed` → `maxSpeed === 90`.
  - `maxspeed:type: "IL:urban"` with no `maxspeed` → `maxSpeed === 50`.
  - `maxspeed` present takes priority over `maxspeed:type` → `maxSpeed` is the explicit value.
  - `maxspeed:type` with unknown country code → `maxSpeed` stays `undefined`.

## Brain / persistence considerations

None. This change does not touch brain input dimensions, sensor mode, or the save schema in a breaking way. New Segment fields are optional — old saves load with `undefined` for all new fields, which is the same as hand-drawn segments. `Graph.load()` restores new fields if present in the save JSON. `Graph.hash()` folds new metadata so signage/shield/exit caches invalidate when an OSM world is re-imported with different metadata.

## Acceptance criteria

- `npm run rebuild` succeeds with no TypeScript errors.
- `npm run fix:all` passes (format + lint).
- `npm test` passes — all existing tests plus the new OSM parser tests.
- Opening `html/world.html`, loading an OSM JSON with `ref` tags (e.g., the Ashkelon sample) renders road shield badges on highways.
- Loading OSM data with `bridge: "yes"` ways renders bridge shadows.
- Loading OSM data with `lane_markings: "no"` ways does NOT draw lane markings on those segments.
- Loading OSM data with `destination` on `_link` ways renders green gantry exit signs.
- Loading OSM data with `name:en` and non-Latin `name` renders English street labels.
- Loading OSM data with `maxspeed:type: "IL:trunk"` and no `maxspeed` shows speed limit signs with 90.
- `oneway: "-1"` ways are one-way with reversed direction (cars drive the correct way).
- `trunk_link` / `secondary_link` / `tertiary_link` roads render with correct colors and draw order (not the default `#BBB` / rank 0).
- Existing hand-drawn worlds (no OSM metadata) render identically to before — no visual regression.

## Docs to update

- `docs/Math.md` — the OSM import section (around line 685) describing the import workflow and what metadata is parsed. Update the tag list to include all new tags.
- `docs/WorldEditor.md` — the OSM data loading section (around line 361) mentioning what metadata is extracted.
- `AGENTS.md` — update the "Segment OSM metadata" paragraph to list all new fields, and add a note about `oneway: "-1"` handling, `*_link` tier mapping, `lane_markings` rendering skip, bridge shadows, road shields, exit signs, and `maxspeed:type` inference. Add a new "Road shields and exit signs" bullet under the signage section.
- `saves/osm-data-loading-readme.txt` — the Overpass query is updated in Phase 4 (code change, not docs).
