# Street-Aware Road Name Labels and Speed-Change Signs

**Date:** 2026-07-22
**Slug:** road-signage-placement
**Entry points affected:** none — shared `ts/` only (rendering change visible on all pages that draw a World: `html/world.html`, `html/simulator.html`, `html/traffic.html`)
**Save-file impact:** none
**Backward compat:** preserved (no brain, save-schema, or localStorage changes)

## Goal

Road-name labels and speed-limit signs currently render **per segment**, so OSM-imported streets (split into many segments at every intersection) get a label and a sign at every segment midpoint — overlapping each other and cluttering the map. Replace per-segment placement with:

1. **Street-aware name labels** — group connected same-name segments into street polylines and distribute labels evenly along the total street length (~1000 px spacing, min 1 per street).
2. **Speed signs only at limit changes** — draw a sign only at graph nodes where incident segments have differing `maxSpeed` values (one sign per affected segment, offset ~60 px into the segment from the node), plus one fallback sign for a speed zone that never meets a different limit.

## Context (read first)

- `ts/world/world.ts` — `draw()` at lines 301-406; current `#drawRoadNames` (lines 537-563) and `#drawSpeedLimits` (lines 565-599). World imports math helpers (`lerp2D`, `normalize`, `scale`, `add`, `subtract`) from `ts/math/utils.ts`.
- `ts/math/primitives/segment.ts` — `Segment` carries optional OSM metadata (`name`, `maxSpeed`, `lanes`, `highwayType`, `surface`) as the 5th constructor arg; has `length()`, `directionVector()`, `includes(point)`.
- `ts/math/primitives/point.ts` — `Point.equals()`, `distance()`.
- `ts/math/graph/graph.ts` — `Graph.points`, `Graph.segments`, `getSegmentsWithPoint(point)` (line 95), `hash()` (lines 47-69). Note: `hash()` currently folds points + segment endpoints + `oneWay`/`separated`/`lanes` flags but **not** `name`/`maxSpeed` — this plan extends it.
- `ts/math/utils.ts` — `add`, `subtract`, `scale`, `normalize`, `lerp2D`, `magnitude`.
- `tests/helpers/makePoint.ts`, `tests/helpers/makeSegment.ts`, `tests/helpers/makeGraph.ts` — test factories (`makeGraphFromSegments` dedups shared endpoint Points like a real graph, but does NOT pass metadata — construct `new Segment(p1, p2, false, false, { name, maxSpeed })` directly in tests).
- `tests/unit/math/graph/graph.test.ts` — existing hash/graph tests to extend.
- AGENTS.md § Architecture rules (config constants centralised, magic numbers as named constants, no runtime deps, `.js` import extensions).

## Scope

- **In scope:**
  - New pure-logic module `ts/world/roadSignage.ts` with street-label and speed-sign placement computation (no canvas/DOM — unit-testable).
  - Rewire `World.#drawRoadNames` / `World.#drawSpeedLimits` in `ts/world/world.ts` to consume cached placements; cache invalidated by `Graph.hash()`.
  - Extend `Graph.hash()` to fold `Segment.name` and `Segment.maxSpeed` so metadata edits invalidate the signage cache.
  - Keep text upright: normalize label rotation so street names are never drawn upside down.
  - Label/sign collision avoidance: name labels are nudged or skipped when they land within 100 px of a speed sign.
  - Unit tests for the new module and the hash extension.
- **Out of scope:**
  - Zoom-dependent restyling, new sign artwork, sign orientation/perpendicular road-edge placement (signs stay centered on the road axis, circular, as today).
  - Editing UI for `maxSpeed`/`name` (metadata still comes only from OSM import).
  - Changing the existing `MIN_SIGNAGE_ZOOM = 0.4` visibility threshold.
  - Car/sensor/brain behavior — this is purely rendering (see AGENTS.md § Visual vs behavioral).

## Implementation

### `ts/world/roadSignage.ts` (new file)

Pure placement logic, no canvas. Exports:

```ts
export const STREET_LABEL_SPACING_PX = 1000;
export const SPEED_SIGN_NODE_OFFSET_PX = 60;
export const LABEL_SIGN_AVOID_RADIUS_PX = 100;
export const LABEL_SIGN_AVOID_SHIFT_PX = 150;
export const MIN_SIGNAGE_ZOOM = 0.4;

export interface StreetLabelPlacement {
  x: number;
  y: number;
  angle: number; // normalized so text is never upside down
  name: string;
}

export interface SpeedSignPlacement {
  x: number;
  y: number;
  maxSpeed: number;
}

export function computeSpeedSignPlacements(graph: Graph): SpeedSignPlacement[];

export function computeStreetLabelPlacements(
  segments: Segment[],
  opts?: {
    spacing?: number; // default STREET_LABEL_SPACING_PX
    avoid?: { x: number; y: number }[]; // sign centers to steer around
    avoidRadius?: number; // default LABEL_SIGN_AVOID_RADIUS_PX
  },
): StreetLabelPlacement[];
```

**`computeSpeedSignPlacements(graph)`:**

1. For each `point` in `graph.points`, get `incident = graph.getSegmentsWithPoint(point)`; skip when `incident.length < 2`.
2. Collect each incident segment's `maxSpeed` (`number | undefined`). Treat `undefined` as a distinct value. If the distinct-value count is `< 2`, the limit doesn't change at this node — skip.
3. Otherwise, for every incident segment that **has** a defined `maxSpeed` differing from at least one other incident segment's value: place a sign at `point + normalize(subtract(otherEnd, point)) * SPEED_SIGN_NODE_OFFSET_PX`, where `otherEnd` is the segment's endpoint that is not this node. If the segment is shorter than the offset, use its midpoint instead.
4. **Isolated-zone fallback:** build connected components of segments with a defined `maxSpeed`, where two segments union only when they share an endpoint AND have equal `maxSpeed`. For each component, check every node its segments touch: if none of those nodes is a change node (step 2 produced signs there, i.e. the node touches a segment with a different or undefined `maxSpeed`), the zone never transitions — place exactly one sign at the midpoint of the component's longest segment.

**`computeStreetLabelPlacements(segments, opts)`:**

1. Filter to segments with a truthy `name`; group by exact name string.
2. Within each name group, build connected components: two segments connect when they share an endpoint (`p1`/`p2` cross-checked with `Point.equals`).
3. Per component, order segments into a walk: start from a segment with a free endpoint (endpoint shared with no other segment in the component) if one exists; repeatedly append an unvisited segment sharing the current endpoint, orienting each appended segment along the walk. If the walk stalls with unvisited segments remaining (branched street), start a new chain from any unvisited segment and concatenate. Produce `walk: { start: Point; end: Point; length: number }[]`.
4. Total length `L = Σ walk lengths`. Label count `n = max(1, Math.round(L / spacing))`. Target arc positions `(i + 0.5) * L / n` for `i = 0..n-1`.
5. Map each arc position onto the walk → `point = lerp2D(start, end, tLocal)`; `angle = Math.atan2(dir.y, dir.x)` from the oriented segment's `directionVector()`. Normalize: if `angle > π/2` or `angle < -π/2`, add `π` (and wrap back into `(-π, π]`) so text reads upright.
6. **Avoidance:** if `opts.avoid` is provided and a candidate position lies within `avoidRadius` of any avoid point, retry at `arcPos + LABEL_SIGN_AVOID_SHIFT_PX` (clamped to `L`); if still colliding, retry at `arcPos - LABEL_SIGN_AVOID_SHIFT_PX` (clamped to 0); if still colliding, skip this label.

### `ts/math/graph/graph.ts`

- Extend `hash()` (lines 47-69) to fold metadata per segment, after the existing `mix(hFlags)`:
  - `mix(((s.maxSpeed ?? 0) * 10) | 0)` (scaled to preserve one decimal).
  - Name chars: `if (s.name) { for (let i = 0; i < s.name.length; i++) mix(s.name.charCodeAt(i)); } mix(0);` — the trailing `mix(0)` separates named/unnamed and delimits names.
- Update the `hash()` doc comment to state it now covers `name`/`maxSpeed` metadata (aligns with the AGENTS.md claim that metadata changes trigger regen — currently only `lanes` actually does).

### `ts/world/world.ts`

- Add a private cache field and accessor:

```ts
#signageCache: {
  hash: string;
  labels: StreetLabelPlacement[];
  signs: SpeedSignPlacement[];
} | null = null;

#getSignage(): { labels: StreetLabelPlacement[]; signs: SpeedSignPlacement[] } {
  const hash = this.graph.hash();
  if (!this.#signageCache || this.#signageCache.hash !== hash) {
    const signs = computeSpeedSignPlacements(this.graph);
    const labels = computeStreetLabelPlacements(this.graph.segments, {
      avoid: signs,
    });
    this.#signageCache = { hash, labels, signs };
  }
  return this.#signageCache;
}
```

- Rewrite `#drawRoadNames(ctx)`: keep the zoom guard (`if (!this.zoom || this.zoom < MIN_SIGNAGE_ZOOM) return;` — import `MIN_SIGNAGE_ZOOM` from `roadSignage.js`), then draw each placement from `#getSignage().labels` using the existing styling: `ctx.save()` → `translate(x, y)` → `rotate(angle)` → background rect `rgba(0,0,0,0.6)` sized via `ctx.measureText(name)` (font `14px Arial`, padding 4/10 as today) → `fillStyle = 'white'` → `fillText(name, 0, 0)` → `ctx.restore()`. Remove the per-segment `length() < 150` skip (short streets are handled by grouping: `n = max(1, …)` still yields one label).
- Rewrite `#drawSpeedLimits(ctx)`: same zoom guard, then draw each placement from `#getSignage().signs` with the existing sign rendering: radius-16 white filled circle, `#D4242B` 3 px ring, `bold 14px Arial` `#222` centered number (`textAlign`/`textBaseline` center/middle). Remove the `signSpacing` / `numSigns` per-segment loop entirely.
- The call sites in `draw()` (lines 337-341) stay unchanged — both remain under `layers.roads`.

### Tests — `tests/unit/world/roadSignage.test.ts` (new)

Pure-logic, no DOM/canvas (per AGENTS.md § Testing). Build graphs with shared `Point` instances and `new Segment(p1, p2, false, false, { name, maxSpeed })`. Cover:

1. Street of 3 collinear connected segments totaling 2400 px, spacing 1000 → exactly 2 labels, positioned ≈ 600 px and ≈ 1800 px along the walk, correct name.
2. 400 px street → exactly 1 label at its midpoint.
3. Unnamed segments → zero labels.
4. Two disconnected same-name components (400 px each) → 1 label per component (2 total).
5. Right-to-left street → label `angle` normalized into `[-π/2, π/2]` (upright text).
6. Change node (segment A `maxSpeed: 50` meets segment B `maxSpeed: 30` at a shared point) → 2 signs, each 60 px from the node along its own segment, with correct `maxSpeed` values.
7. Uniform two-segment road (`50`/`50`, no other segments) → no change-node signs; fallback yields exactly 1 sign at the midpoint of the longest segment.
8. Isolated single segment with `maxSpeed` → 1 fallback sign at its midpoint.
9. Node where a `maxSpeed: 50` segment meets an undefined-maxSpeed segment → 1 sign (for the 50 segment); the 50-component touches a different value, so NO fallback sign is added.
10. Label avoidance: with a sign placed at a label's computed position, the label is shifted (or skipped) so no label lies within `LABEL_SIGN_AVOID_RADIUS_PX` of the sign.

### Tests — `tests/unit/math/graph/graph.test.ts` (extend)

11. `hash()` changes when a segment's `maxSpeed` changes (geometry unchanged) and when a segment's `name` changes; unchanged when an unrelated segment is added far away is NOT required — just assert metadata edits alter the hash.

## Brain / persistence considerations

None. Rendering-only change; brain input dims, `brainsCompatible()`, save-file schemas, and localStorage keys are untouched.

## Acceptance criteria

- `npm run rebuild` completes with no TypeScript errors; `npm run fix:all` clean; `npm test` passes (all existing + new tests).
- Open `html/world.html`, load an OSM-imported world (e.g. from `saves/`), zoom to ≥ 0.4: each named street shows labels spread evenly along its full length (≈1 per 1000 px), not one per segment; labels are upright.
- On the same world, speed signs appear only near intersections where the limit changes (offset slightly into each affected road), with no sign drawn at the midpoint of every segment; an isolated road with a uniform limit shows exactly one sign.
- Name labels no longer collide with speed signs at segment midpoints (a label within 100 px of a sign is shifted or omitted).
- Zooming below 0.4 hides both labels and signs (existing behavior preserved).
- Editing the graph in the world editor (moving points, adding/removing segments) updates labels/signs on the next frame (cache invalidates via `Graph.hash()`).

## Docs to update

- `AGENTS.md` — append a convention bullet under "Architecture rules": new `ts/world/roadSignage.ts` pure-placement module (street grouping, spacing/offset constants), World caches placements keyed by `Graph.hash()`, and `Graph.hash()` now folds `Segment.name`/`maxSpeed` (metadata edits invalidate signage cache).
- `docs/Math.md` — in the Segment metadata section (around lines 40-74), add a short note that `name`/`maxSpeed` drive on-road signage placement via `ts/world/roadSignage.ts` and are folded into `Graph.hash()`.
- No new `docs/*.md` file warranted (feature is a rendering heuristic, not a subsystem).
