# One-Way Arrows: Chain-Aware Placement + Real Arrow Glyph

**Date:** 2026-07-22
**Slug:** one-way-arrow-placement (phase 01 of `road-rendering-polish`)
**Entry points affected:** none — shared `ts/` only (rendering change visible on every page that draws a World: `html/world.html`, `html/simulator.html`, `html/traffic.html`, `html/race.html`)
**Save-file impact:** none
**Backward compat:** preserved (no brain, save-schema, or localStorage changes)

## Goal

One-way arrows are currently drawn **per segment**: every one-way segment ≥ 80 px gets ≥ 1 arrow (a small bare filled triangle) at even positions within that segment. On OSM-imported maps, streets split into many segments at intersections get cluttered arrow-at-every-segment placement and spacing resets at every junction. Mirror the just-merged road-signage pattern (PR #18, `ts/world/roadSignage.ts`): compute placements in a pure module by chaining connected one-way segments into walks and spacing arrows evenly along the whole walk, cache them in `World` keyed by `Graph.hash()`, and upgrade the glyph from a bare triangle to a **real arrow** (shaft line + filled triangular head, per user decision).

## Context (read first)

- `ts/world/world.ts` — `draw()` at ~lines 317-358 (roads block); `#drawLaneMarkings` (~425-436), `#drawSimpleLaneMarkings` (~438-462), `#drawOneWayArrows(ctx, seg)` (~464-504, the per-segment triangle drawer to be replaced), `#drawMultiLaneDividers` (~506-551, calls `#drawOneWayArrows` at ~549), `#getSignage()` (~557-570, the hash-keyed cache pattern to mirror). Math helpers already imported: `add`, `scale`, `lerp2D`, `normalize`, `magnitude`, `rotate` from `ts/math/utils.ts`; `Point` from `ts/math/primitives/point.ts`.
- `ts/world/roadSignage.ts` — the pattern to mirror. Its private helpers are extracted by this plan: `WalkPiece` interface (lines 30-35), `sharesEndpoint` (41-48), `buildStreetComponents` (154-175), `orderStreetWalk` (182-244). `pointAtArc` (247-273) stays in roadSignage (its upright-angle normalization is label-specific).
- `ts/math/primitives/segment.ts` — `Segment` has `oneWay` (3rd constructor arg), `length()`, `directionVector()`, `p1`/`p2`. For one-way roads, traffic flows **p1 → p2** (matches current arrows and the lane-guide convention in AGENTS.md).
- `ts/math/graph/graph.ts` — `hash()` (lines 49-78) already folds point coordinates, segment endpoints, and the `oneWay` flag (via `hFlags`), so a hash-keyed arrow cache invalidates correctly on any geometry/one-way edit. **No hash() changes needed.**
- `tests/unit/world/roadSignage.test.ts` — existing tests guarding the roadSignage refactor; must pass unchanged.
- `tests/helpers/makePoint.ts`, `tests/helpers/makeSegment.ts` — test factories; construct `new Segment(p1, p2, true /* oneWay */, false)` directly for one-way segments.
- AGENTS.md § Architecture rules (config constants centralised, magic numbers as named constants, no runtime deps, `.js` import extensions), § Key gotchas (import paths use `.js`).

## Scope

- **In scope:**
  - Extract the generic street-walk helpers from `roadSignage.ts` into a new shared pure module `ts/world/streetWalk.ts` (no behavior change to roadSignage's public API).
  - New pure placement module `ts/world/oneWayArrows.ts` computing even-spaced arrow placements along connected one-way chains (no canvas/DOM — unit-testable).
  - Rewire `World` to cache placements keyed by `Graph.hash()` and draw all arrows in one pass; remove per-segment arrow drawing from `#drawSimpleLaneMarkings` / `#drawMultiLaneDividers`.
  - New glyph: shaft line + filled triangular head (current triangle kept as the head).
  - Unit tests for the new modules.
- **Out of scope:**
  - Changing arrow color, the 200 px target spacing, or the ~80 px minimum-size cutoff semantics.
  - Zoom-dependent arrow visibility (arrows currently draw at all zooms — unchanged).
  - Arrow/label or arrow/sign collision avoidance (arrows draw under labels/signs, as today).
  - Two-way road markings, lane dividers, road borders — untouched except for removing arrow calls.
  - Car/sensor/brain behavior — purely rendering.

## Implementation

### `ts/world/streetWalk.ts` (new file)

Pure shared walk helpers extracted from `roadSignage.ts` (move, don't copy). Exports:

```ts
import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';

/** One oriented piece of a street walk (start → end along the walk). */
export interface WalkPiece {
  seg: Segment; // the source segment (new field vs roadSignage's old private type)
  start: Point; // oriented along the walk
  end: Point;
  length: number;
}

export function sharesEndpoint(a: Segment, b: Segment): boolean;
export function buildConnectedComponents(segments: Segment[]): Segment[][];
export function orderSegmentWalk(component: Segment[]): WalkPiece[];
```

- `sharesEndpoint` — verbatim from roadSignage lines 41-48.
- `buildConnectedComponents` — verbatim rename of roadSignage's private `buildStreetComponents` (lines 154-175): connected components via shared endpoints.
- `orderSegmentWalk` — verbatim move of roadSignage's `orderStreetWalk` (lines 182-244), extended so each pushed piece also carries `seg` (the segment it came from). Orientation logic unchanged: start from a segment with a free endpoint when one exists; append unvisited segments sharing the current end, orienting each along the walk; branched leftovers are appended as additional chains.

### `ts/world/roadSignage.ts` (refactor)

- Delete the moved `WalkPiece` interface, `sharesEndpoint`, `buildStreetComponents`, `orderStreetWalk`.
- Import `WalkPiece`, `buildConnectedComponents`, `orderSegmentWalk`, `sharesEndpoint` from `./streetWalk.js`.
- `computeStreetLabelPlacements`: replace `buildStreetComponents(group)` → `buildConnectedComponents(group)` and `orderStreetWalk(component)` → `orderSegmentWalk(component)`.
- `computeSpeedSignPlacements`: replace `sharesEndpoint` import usage (unchanged behavior).
- Keep `pointAtArc` and everything else as-is. Public API (`computeSpeedSignPlacements`, `computeStreetLabelPlacements`, all exported constants/interfaces) unchanged — existing tests must pass without modification.

### `ts/world/oneWayArrows.ts` (new file)

Pure placement logic, no canvas. Exports:

```ts
import { Graph } from '../math/graph/graph.js';
import { Point } from '../math/primitives/point.js';
import { lerp2D } from '../math/utils.js';
import {
  buildConnectedComponents,
  orderSegmentWalk,
  WalkPiece,
} from './streetWalk.js';

/** Target spacing between one-way arrows along a chain, in px. */
export const ONE_WAY_ARROW_SPACING_PX = 200;
/** Chains shorter than this get no arrows (mirrors the old per-segment 80px skip). */
export const ONE_WAY_ARROW_MIN_CHAIN_PX = 80;
/** Shaft length of the drawn arrow, in px. */
export const ONE_WAY_ARROW_SHAFT_PX = 30;
/** Arrowhead length, in px (was the old triangle size). */
export const ONE_WAY_ARROW_HEAD_PX = 20;
/** Half-angle of the arrowhead wings. */
export const ONE_WAY_ARROW_HEAD_ANGLE = Math.PI / 8;

export interface OneWayArrowPlacement {
  x: number; // arrow tip position
  y: number;
  angle: number; // traffic direction (radians): the containing segment's own p1→p2
}

export function computeOneWayArrowPlacements(
  graph: Graph,
): OneWayArrowPlacement[];
```

Algorithm for `computeOneWayArrowPlacements(graph)`:

1. `const oneWaySegs = graph.segments.filter((s) => s.oneWay);`
2. For each `component` of `buildConnectedComponents(oneWaySegs)`:
   - `const walk = orderSegmentWalk(component);`
   - `const L = Σ piece.length`; if `L < ONE_WAY_ARROW_MIN_CHAIN_PX`, skip the component.
   - `const count = Math.max(1, Math.round(L / ONE_WAY_ARROW_SPACING_PX));`
   - For `i = 0..count-1`, target arc position `(i + 0.5) * L / count`; map onto the walk:
     - Walk the pieces subtracting lengths (same traversal as roadSignage's `pointAtArc`): on the piece where the remaining distance falls (or the last piece), `t = piece.length > 0 ? Math.min(1, remaining / piece.length) : 0`, `point = lerp2D(piece.start, piece.end, t)`.
     - **Angle comes from the piece's source segment, not the walk orientation:** `angle = Math.atan2(piece.seg.p2.y - piece.seg.p1.y, piece.seg.p2.x - piece.seg.p1.x)` — arrows always point in the segment's own p1→p2 traffic direction even when the walk traverses it backward.
   - Push `{ x: point.x, y: point.y, angle }`.

### `ts/world/world.ts`

- Import `computeOneWayArrowPlacements`, `OneWayArrowPlacement`, and the glyph constants (`ONE_WAY_ARROW_SHAFT_PX`, `ONE_WAY_ARROW_HEAD_PX`, `ONE_WAY_ARROW_HEAD_ANGLE`) from `./oneWayArrows.js`.
- Add the cache field + accessor, mirroring `#getSignage()`:

```ts
#oneWayArrowCache: { hash: string; arrows: OneWayArrowPlacement[] } | null = null;

#getOneWayArrows(): OneWayArrowPlacement[] {
  const hash = this.graph.hash();
  if (!this.#oneWayArrowCache || this.#oneWayArrowCache.hash !== hash) {
    this.#oneWayArrowCache = {
      hash,
      arrows: computeOneWayArrowPlacements(this.graph),
    };
  }
  return this.#oneWayArrowCache.arrows;
}
```

- In `draw()`, inside `if (layers.roads)`, immediately after `this.#drawLaneMarkings(ctx);` add `this.#drawOneWayArrows(ctx);` (arrows draw above lane lines, below road names/speed signs — same relative order as today).
- Rewrite `#drawOneWayArrows` — drop the `seg` parameter, iterate cached placements, draw the **shaft + head** glyph per placement:

```ts
#drawOneWayArrows(ctx: CanvasRenderingContext2D): void {
  const arrows = this.#getOneWayArrows();
  const totalLen = ONE_WAY_ARROW_SHAFT_PX + ONE_WAY_ARROW_HEAD_PX;
  const originalLineCap = ctx.lineCap;
  const originalLineWidth = ctx.lineWidth;
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';
  ctx.lineWidth = 2;
  ctx.lineCap = 'butt';
  for (const arrow of arrows) {
    const tip = new Point(arrow.x, arrow.y);
    const back = new Point(-Math.cos(arrow.angle), -Math.sin(arrow.angle));
    const shaftStart = add(tip, scale(back, totalLen));
    const headBase = add(tip, scale(back, ONE_WAY_ARROW_HEAD_PX));
    const wing1 = add(tip, scale(rotate(back, ONE_WAY_ARROW_HEAD_ANGLE), ONE_WAY_ARROW_HEAD_PX));
    const wing2 = add(tip, scale(rotate(back, -ONE_WAY_ARROW_HEAD_ANGLE), ONE_WAY_ARROW_HEAD_PX));
    // Shaft
    ctx.beginPath();
    ctx.moveTo(shaftStart.x, shaftStart.y);
    ctx.lineTo(headBase.x, headBase.y);
    ctx.stroke();
    // Filled triangular head (same geometry as the old triangle)
    ctx.beginPath();
    ctx.moveTo(wing1.x, wing1.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(wing2.x, wing2.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineCap = originalLineCap;
  ctx.lineWidth = originalLineWidth;
}
```

- `#drawSimpleLaneMarkings`: delete both `this.#drawOneWayArrows(ctx, seg)` call sites (~lines 446 and 456); keep all line-drawing logic unchanged (including the `laneCount <= 1` early return — now without the arrow call).
- `#drawMultiLaneDividers`: delete the `if (seg.oneWay) { this.#drawOneWayArrows(ctx, seg); }` block at the end (~549-551); keep divider logic unchanged.
- Remove now-unused imports if any (e.g. `magnitude`, `normalize`, `lerp2D` were used by the old arrow code — check remaining usages before removing; `subtract`/`lerp` etc. are used elsewhere).

### Tests — `tests/unit/world/streetWalk.test.ts` (new)

Pure-logic, no DOM/canvas (per AGENTS.md § Testing). Build segments with shared `Point` instances. Cover:

1. `sharesEndpoint`: shared p1/p2 in all four combinations → true; disjoint → false.
2. `buildConnectedComponents`: two disconnected pairs → 2 components of 2 segments each; single segment → 1 component.
3. `orderSegmentWalk`: chain of 3 segments where the middle one is added "backward" (its `p2` touches the previous segment's end) → walk pieces oriented end-to-start, and the backward piece's `start`/`end` are flipped while `piece.seg` still references the original segment.

### Tests — `tests/unit/world/oneWayArrows.test.ts` (new)

Build a `Graph` via `new Graph(points, segments)` with shared `Point` instances (mirroring how `roadSignage.test.ts` builds graphs). Cover:

1. Single one-way segment of 1000 px → `Math.round(1000/200) = 5` arrows at arc positions 100/300/500/700/900 along it, correct angle (`atan2` of p1→p2).
2. Two collinear connected one-way segments of 300 px each (600 px chain) → 3 arrows at 100/300/500 measured along the **chain** (an arrow lands at the junction-crossing position 300 — old code produced 2 arrows at the segment midpoints 150/450).
3. Chain shorter than 80 px (e.g. single 50 px one-way stub) → 0 arrows.
4. Two disconnected one-way components (400 px each) → 2 arrows each (1 per 200 px… verify: `round(400/200)=2`), 4 total, positions relative to each component's own walk.
5. Two-way segments (`oneWay: false`) → 0 arrows even when long and connected.
6. Reversed-connectivity chain: segment A (p1→p2 eastward) connected to segment B whose **p2** touches A's p2 (B points back westward) → arrows on B point along B's own p1→p2 (westward), not along the walk direction.
7. Closed loop (triangle of 3 one-way segments, no free endpoint, total 900 px) → arrows still placed (`round(900/200) = 5`), one per ~180 px of walk.
8. Vertical segment p1=(0,0), p2=(0,500) → angle ≈ π/2 (within 1e-9).

### Existing tests

- `tests/unit/world/roadSignage.test.ts` — must pass **unmodified** (guards the extraction refactor).
- `tests/unit/math/graph/graph.test.ts` — untouched (no hash changes).

## Brain / persistence considerations

None. Rendering-only change; brain input dims, `brainsCompatible()`, save-file schemas, and localStorage keys are untouched.

## Acceptance criteria

- `npm run rebuild` completes with no TypeScript errors; `npm run fix:all` clean; `npm test` passes (all existing + new tests).
- Open `html/world.html`, load an OSM-imported world (e.g. from `saves/`) with one-way streets: arrows are spaced evenly (~200 px) along each connected one-way street, continuing smoothly across intersections instead of resetting per segment; very short stubs have no arrows.
- Each arrow renders as a **shaft + triangular head** (a real arrow shape), pointing in the street's traffic direction, including on segments the placement walk traverses backward (e.g. roundabouts, reversed-connectivity segments).
- Two-way roads show no arrows; lane dividers on multi-lane one-way roads still render (only the arrow drawing moved).
- Editing the graph in the world editor (adding/removing/toggling one-way segments, moving points) updates arrows on the next frame (cache invalidates via `Graph.hash()`).

## Docs to update

- `AGENTS.md` — append a convention bullet under "Architecture rules": new pure-placement module `ts/world/oneWayArrows.ts` (chain-aware one-way arrow placement, spacing/min-chain/glyph constants), shared walk helpers extracted to `ts/world/streetWalk.ts` (used by both `roadSignage.ts` and `oneWayArrows.ts`), World caches arrow placements keyed by `Graph.hash()`, and the arrow glyph is shaft + filled head drawn in one pass after lane markings.
- `docs/WorldEditor.md` — update the road-signage/road-markings section (it documents the per-segment arrow behavior after PR #18 if present; check the "One-way arrows" mention) to describe chain-aware placement and the new glyph.
- No new `docs/*.md` file warranted (rendering heuristic, same class as road signage).
