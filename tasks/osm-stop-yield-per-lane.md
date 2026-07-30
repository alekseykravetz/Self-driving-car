# OSM Stop / Yield — per-lane markings

**Date:** 2026-07-30
**Slug:** osm-stop-yield-per-lane
**Entry points affected:** `html/world.html` (OSM import is the only place this
runs). Rendered stop/yield markings appear in every page that draws a `World`
(`simulator.html`, `traffic.html`, `race.html`, `human-training.html`).
**Save-file impact:** None to the schema. The importer just produces MORE `Stop`
/ `Yield` markings (one per approach lane instead of one per node). They are
ordinary markings already handled by `markingLoader` and the v2 save format.
**Backward compat:** Preserved. Hand-placed stop/yield markings and saved worlds
are untouched. Only the OSM _import_ changes.

## Problem

When importing OSM data, each `highway=stop` / `highway=give_way` node currently
produces **one** `Stop` / `Yield` marking centred on the node, spanning the road
with a single `directionVector`. On a **two-way** road that single centred
marking can only face one travel direction — so it is correct for one lane and
backwards for the opposing lane, and it visually straddles both directions.

A hand-placed marking does not have this problem: the editor places a marking on
**one lane guide** (`StopEditor` / `YieldEditor` target `world.laneGuides`), so
it inherits that lane's exact direction. This task makes the OSM importer do the
same — expand each node into **one marking per approach lane**:

- **One-way road:** every lane flows into the junction → a marking on **all** lanes.
- **Two-way road:** only the lanes travelling **into** the junction get a marking
  (the departing lanes leave the junction and get none).

## Background — how it works today (read first)

Read these before writing code:

- `ts/math/osm-importer/osm.ts` — `Osm.parseRoads()` returns
  `{ points, segments, lights, crossings, stops, yields }`. For a stop/yield the
  placement is `{ center, directionVector, width, height }` where:
  - `center` is the **node position** — it is one of the `points` returned, so it
    equals a `Segment` endpoint (`segment.p1.equals(center)` /
    `segment.p2.equals(center)` will be true for the incident segments).
  - `directionVector` is the **lane-guide convention** direction (it is
    `approachFacingDir(entry)` **negated** — see the "OSM node-marking import"
    bullet in `AGENTS.md`). This is exactly the orientation a lane guide would
    have for the approaching direction: a car travels **opposite** to it, i.e.
    toward the junction. Concretely `directionVector` points from the node
    **upstream** (toward the far end of the approach road).
  - `width = height = roadWidth/2` where `roadWidth = lanes * LANE_WIDTH_PX`.
  - **Do NOT change osm.ts's stop/yield math** — the single placement it emits
    is the correct per-node "seed". This task expands that seed in the world
    layer, where lane geometry is available.
- `ts/world/editors/worldEditor.ts` — `parseOsmData()` builds `Stop` / `Yield`
  from `result.stops` / `result.yields` and pushes them onto `world.markings`
  **in place** (~lines 540-565). This is the loop to replace.
- `ts/world/generation/worldGenerator.ts` — `wgGenerateLaneGuides(graph)` builds
  per-lane guides. **Direction convention (authoritative):**
  - `laneCount = segment.lanes ?? (segment.oneWay ? 1 : 2)`.
  - `perpDir = normalize((-dir.y, dir.x))` where `dir = segment.directionVector()`.
  - lane `k` centre offset from road centre = `(k + 0.5) * LANE_WIDTH_PX − (laneCount*LANE_WIDTH_PX)/2`.
  - **Two-way:** even `k` → guide `p1→p2`; odd `k` → guide `p2→p1`.
  - **One-way:** all lanes → guide `p2→p1`.
  - A car travels **opposite** to the guide's `directionVector()`.
    `LANE_WIDTH_PX = 50` (`ts/math/worldUnits.ts`).
- `ts/world/editors/stopEditor.ts` / `yieldEditor.ts` — the manual reference:
  `createMarking(center, dir)` = `new Stop(center, dir, roadWidth/2, roadWidth/2)`
  with `dir = laneGuide.directionVector()`, placed on `world.laneGuides`.
- `ts/world/markings/stop.ts` / `yield.ts` — `draw()` rotates
  `angle(directionVector) − π/2`. **Do not touch** (already correct for the
  lane-guide convention).
- `ts/math/primitives/segment.ts` — `directionVector()`, `projectPoint(point)`
  (returns `{ point, offset }`; `offset` in 0..1 is within the segment),
  `equals`, `includes`.
- `ts/math/utils.ts` — `normalize`, `subtract`, `add`, `scale`, `dot`,
  `perpendicular`, `distance`.

## Design

The expansion is **pure geometry from the graph** — it does NOT need the
already-generated `world.laneGuides`, so there is no generation-ordering
concern. For each node seed `(center, dv)`:

1. **Find the approach segment.** Among `graph.segments` incident to `center`
   (`seg.p1.equals(center) || seg.p2.equals(center)`), pick the one whose
   direction _from the node toward its far endpoint_ best matches `dv`
   (`dot(normalize(farEnd − center), dv)` is maximal). Because `dv` points
   upstream (toward the far end of the approach road), this selects the road the
   driver is on. Cross streets score ≈ 0; the departing road (other side of the
   junction) scores ≈ −1.
2. **Build that segment's lane guides** with a shared per-segment helper (see
   step 1 of Implementation) — reusing the exact `wgGenerateLaneGuides`
   convention so orientations match the rest of the app.
3. **Select approach lanes:** keep guides whose `directionVector()` has
   `dot(guideDir, dv) > 0` (same orientation as the seed). One-way → all lanes;
   two-way → the half travelling into the junction.
4. **Emit one marking per selected lane** at the lane's cross-section through the
   node: `laneCenter = guide.projectPoint(center).point` (foot of perpendicular
   from the node onto the guide's line). Optionally nudge it **upstream** by a
   small stop-line setback: `laneCenter + dv * STOP_LINE_SETBACK_PX`. Use
   `directionVector = guideDir`, `width = height = LANE_WIDTH_PX` (one lane; on a
   2-lane road this equals the manual `roadWidth/2`).
5. **Fallback:** if no incident segment is found (degenerate/orphan node) or no
   lane qualifies, emit the original single centred placement so no marking is
   lost.

### Why pure-from-graph (not from `world.laneGuides`)

Deriving lanes from the chosen approach segment avoids: (a) matching lane guides
of the _departing_ collinear road on the far side of the junction, and (b) a
dependency on `world.laneGuides` being regenerated before `parseOsmData` builds
markings. It also stays unit-testable without DOM/canvas.

## Scope

### In scope

1. Extract a pure `laneGuidesForSegment(segment): Segment[]` helper from
   `wgGenerateLaneGuides` (behaviour-preserving refactor) and export it.
2. A pure `expandDirectionalMarking(center, directionVector, graph, setback?)`
   returning `{ center, directionVector }[]` (per-lane placements, with the
   single-placement fallback).
3. Use it in `WorldEditor.parseOsmData()` for BOTH stops and yields, replacing
   the one-marking-per-node loops.
4. `STOP_LINE_SETBACK_PX` constant (tunable; may be `0` to disable the setback).
5. Unit tests + docs.

### Out of scope

- `osm.ts` stop/yield direction math (unchanged).
- Lights and crossings (lights already use `placeApproachMarking`; crossings are
  symmetric — leave both as-is).
- The manual `StopEditor` / `YieldEditor` (already per-lane).
- Stop-line geometry beyond a simple along-road setback (no per-lane width tuning
  beyond `LANE_WIDTH_PX`).

## Implementation

### 1. `ts/world/generation/worldGenerator.ts` — extract per-segment helper

Refactor `wgGenerateLaneGuides` to delegate, and export the helper:

```ts
/** Per-lane guide segments for ONE road segment (see direction convention). */
export function laneGuidesForSegment(segment: Segment): Segment[] {
  const laneCount = segment.lanes ?? (segment.oneWay ? 1 : 2);
  const dir = segment.directionVector();
  const perpDir = normalize(new Point(-dir.y, dir.x));
  const halfRoadWidth = (laneCount * LANE_WIDTH_PX) / 2;
  const guides: Segment[] = [];
  for (let k = 0; k < laneCount; k++) {
    const offset = (k + 0.5) * LANE_WIDTH_PX - halfRoadWidth;
    const p1 = add(segment.p1, scale(perpDir, offset));
    const p2 = add(segment.p2, scale(perpDir, offset));
    if (segment.oneWay) guides.push(new Segment(p2, p1));
    else if (k % 2 === 0) guides.push(new Segment(p1, p2));
    else guides.push(new Segment(p2, p1));
  }
  return guides;
}
```

`wgGenerateLaneGuides(graph)` then just flat-maps `laneGuidesForSegment` over
`graph.segments`. **Verify the existing `worldGenerator.test.ts` lane-guide
tests still pass unchanged** (this must be behaviour-preserving).

### 2. New module `ts/world/osmDirectionalMarkings.ts`

Pure, no DOM/canvas. Exports the expansion + a setback constant:

```ts
import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';
import { Graph } from '../math/graph/graph.js';
import { normalize, subtract, dot, add, scale } from '../math/utils.js';
import { laneGuidesForSegment } from './generation/worldGenerator.js';
import { LANE_WIDTH_PX } from '../math/worldUnits.js';

/** Stop line offset upstream from the junction node (world px). 0 disables. */
export const STOP_LINE_SETBACK_PX = 0; // start at 0; tune later if desired

export interface DirectionalPlacement {
  center: Point;
  directionVector: Point;
}

/**
 * Expands a single OSM stop/yield node seed into one placement per APPROACH
 * lane. `directionVector` follows the lane-guide convention (points upstream,
 * toward the approach road's far end). Falls back to the single seed placement
 * when no approach segment / lane is found.
 */
export function expandDirectionalMarking(
  center: Point,
  directionVector: Point,
  graph: Graph,
  setback: number = STOP_LINE_SETBACK_PX,
): DirectionalPlacement[] {
  // 1. Approach segment: incident to the node, pointing (node→far end) most
  //    like directionVector.
  let best: Segment | undefined;
  let bestScore = 0; // require a positive match
  for (const seg of graph.segments) {
    let far: Point | undefined;
    if (seg.p1.equals(center)) far = seg.p2;
    else if (seg.p2.equals(center)) far = seg.p1;
    if (!far) continue;
    const d = subtract(far, center);
    if (d.x === 0 && d.y === 0) continue;
    const score = dot(normalize(d), directionVector);
    if (score > bestScore) {
      bestScore = score;
      best = seg;
    }
  }
  if (!best) return [{ center, directionVector }]; // fallback

  // 2/3. Lane guides of the approach segment; keep same-direction (approach)
  //      lanes.
  const out: DirectionalPlacement[] = [];
  for (const guide of laneGuidesForSegment(best)) {
    const guideDir = guide.directionVector();
    if (dot(guideDir, directionVector) <= 0) continue; // departing lane
    // 4. Lane cross-section at the node, nudged upstream by the setback.
    const laneCenter = guide.projectPoint(center).point;
    const placed =
      setback !== 0
        ? add(laneCenter, scale(directionVector, setback))
        : laneCenter;
    out.push({ center: placed, directionVector: guideDir });
  }
  return out.length > 0 ? out : [{ center, directionVector }]; // fallback
}

/** One-lane marking size (matches manual roadWidth/2 on a 2-lane road). */
export const OSM_STOP_YIELD_SIZE_PX = LANE_WIDTH_PX;
```

### 3. `ts/world/editors/worldEditor.ts` — use the expansion

Replace the stop and yield loops in `parseOsmData()`. For each placement, expand
and build one marking per returned lane placement:

```ts
import {
  expandDirectionalMarking,
  OSM_STOP_YIELD_SIZE_PX,
} from '../osmDirectionalMarkings.js';
// ...
for (const s of result.stops) {
  for (const lane of expandDirectionalMarking(
    s.center,
    s.directionVector,
    this.#world.graph,
  )) {
    addMarking(
      new Stop(
        lane.center,
        lane.directionVector,
        OSM_STOP_YIELD_SIZE_PX,
        OSM_STOP_YIELD_SIZE_PX,
      ),
    );
  }
}
// identical loop for result.yields → new Yield(...)
```

`addMarking` already calls `setAnchor` and pushes in place — keep using it so
the `TrafficManager` array reference is preserved.

## Testing

### `tests/unit/world/generation/worldGenerator.test.ts`

- `laneGuidesForSegment`: a 2-lane two-way segment returns 2 guides pointing
  opposite ways; a 3-lane one-way returns 3 guides all the same way; guide
  count = `lanes`. Existing `wgGenerateLaneGuides` tests still pass unchanged.

### `tests/unit/world/osmDirectionalMarkings.test.ts` (new)

Build a small `Graph` by hand (two collinear points) and call
`expandDirectionalMarking`:

- **One-way, 2 lanes:** approach segment `oneWay=true, lanes=2`; node at one
  endpoint; `directionVector` = toward the far endpoint. → **2** placements, both
  with the same direction (all lanes approach).
- **Two-way, 2 lanes:** `oneWay=false, lanes=2`. → **1** placement (only the lane
  travelling into the junction), direction `dot > 0` with the seed.
- **Two-way, 4 lanes:** → **2** placements (half the lanes).
- **Every returned `directionVector`** satisfies `dot(dir, seed.directionVector) > 0`.
- **Lateral spread:** the returned centres are offset to distinct lane centres
  (perpendicular distances from the segment centreline ≈ `±(k+0.5-lanes/2)*LANE_WIDTH_PX`).
- **Setback:** with `setback > 0`, each centre is moved by `setback` along the
  seed direction vs. `setback = 0`.
- **Fallback:** a node not matching any segment endpoint → returns the single
  seed placement unchanged.

### `tests/unit/world/editors/worldEditor.test.ts`

- The `Osm.parseRoads` mock already returns empty `stops`/`yields`; add a case
  where the mock returns one stop seed on a known two-way segment and assert the
  importer produced the expected number of `Stop` markings (per-lane), each of
  type `'stop'`.

## Acceptance criteria

- `npm run rebuild` — no TS errors. `npm run fix:all` — clean. `npm test` — green
  (existing + new).
- Importing OSM data with stop/give-way nodes yields, per node:
  - one-way road → one marking per lane, all facing the driver;
  - two-way road → markings only on the lanes entering the junction, each facing
    that lane's driver (no backward marking on the departing side).
- Each imported marking renders identically to a hand-placed one on the same lane
  guide (same size, same orientation).
- `laneGuidesForSegment` refactor changes no existing lane-guide behaviour.
- Hand-placed markings and existing saved worlds are unaffected.

## Docs to update

- `AGENTS.md` — extend the "OSM node-marking import" bullet: stop/yield seeds
  from `osm.ts` are now **expanded per approach lane** in the world layer
  (`expandDirectionalMarking` + `laneGuidesForSegment`); one-way → all lanes,
  two-way → the entering lanes only; each per-lane marking uses that lane guide's
  direction (identical to a hand-placed marking). Note `osm.ts` still emits one
  seed per node.
- `docs/WorldEditor.md` — "Node marking import": update the stop/give-way
  paragraph to describe the per-lane expansion and the one-way vs two-way rule;
  add `laneGuidesForSegment` / `expandDirectionalMarking` to the flow.
- `docs/Math.md` — OSM Importer step 7: note that stop/yield are seeds expanded
  per-lane downstream (in the world layer), not one marking per node.

## Open decisions (confirm if unsure)

- `STOP_LINE_SETBACK_PX` default (0 = at the node, matching today's position;
  a small positive value sets the stop line back from the junction).
- Per-lane marking size: `LANE_WIDTH_PX` (recommended, one lane) vs. keeping the
  manual `roadWidth/2`.
