# Road-Type Draw Order: Valuable Roads Painted Last

**Date:** 2026-07-22
**Slug:** road-type-draw-order (phase 02 of `road-rendering-polish`)
**Entry points affected:** none — shared `ts/` only (rendering change visible on every page that draws a World: `html/world.html`, `html/simulator.html`, `html/traffic.html`, `html/race.html`)
**Save-file impact:** none
**Backward compat:** preserved (no brain, save-schema, or localStorage changes)

## Goal

Road asphalt envelopes are currently drawn in raw `world.envelopes` order (graph creation order), so at overlaps/junctions a minor road can paint over a major one. Draw asphalt fills **tier-sorted**: the least valuable road types first, the most valuable last (on top). Per user decision: roads with **no `highwayType`** (hand-drawn in the editor, legacy worlds) rank at the **bottom** (drawn first), and the ordering applies to **asphalt fills only** — white road borders, lane markings, one-way arrows, and signage keep their current global-on-top behavior.

## Context (read first)

- `ts/world/world.ts` — `draw()` at ~lines 317-358; the envelope pass is lines ~337-343 (`for (const env of this.envelopes) { const seg = env.skeleton; const fill = getRoadFillColor(seg); drawEnvelope(...) }`). `getRoadFillColor` (lines 69-88) is the existing highway-type → color switch (module-private). The hash-keyed cache pattern lives in `#getSignage()` (~lines 557-570). `World.generate()` (~lines 278-284) delegates to `WorldGenerator.generate`.
- `ts/world/generation/worldGenerator.ts` — `generateRoads` (~lines 286-302) creates `world.envelopes` from graph segments, then unions their polygons into `roadBorders`. **Do not reorder `world.envelopes` itself** — `Polygon.union()` and downstream building generation consume it and AGENTS.md warns union is mutation/order sensitive. This plan sorts a cached _copy_ instead.
- `ts/math/primitives/envelope.ts` — `Envelope` exposes a public `get skeleton()` returning the source `Segment` (used today to read `highwayType` for fill colors). Pure math, constructible in Node tests (`new Envelope(segment, width, roundness)`).
- `ts/math/primitives/segment.ts` — `Segment.highwayType?: string` (5th constructor arg metadata object), populated by `Osm.parseRoads()`, preserved by `Graph.load()`, folded into `Graph.hash()` via `lanes`… note: `highwayType` itself is NOT folded into `Graph.hash()` — see the cache-invalidation note below.
- `ts/math/osm-importer/osm.ts` — highway types that occur in imports: `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `residential`, `service`, `living_street`, `track` (plus any other OSM `highway` value, e.g. `unclassified`, `footway`, `cycleway`, `pedestrian`).
- AGENTS.md § Architecture rules (config constants centralised, magic numbers as named constants, `.js` import extensions).

## Scope

- **In scope:**
  - A centralised highway-type → tier-rank table + pure rank/sort helpers (unit-testable).
  - `World.draw()` envelope pass iterates a tier-sorted copy of `world.envelopes`, cached and invalidated on graph change and on road regeneration.
  - Unit tests for the rank table and the sort helper.
- **Out of scope:**
  - Reordering white road borders (`roadBorders` polygon union), lane markings, one-way arrows, road-name labels, speed signs — all keep current draw order (user decision: fills only).
  - Changing `getRoadFillColor` colors or the tier list itself.
  - Reordering `world.envelopes` in `WorldGenerator.generateRoads` (deliberately avoided — see Context).
  - Pseudo-3D buildings/trees painter's-algorithm sorting — untouched.
  - Car/sensor/brain behavior — purely rendering.

## Implementation

### `ts/world/roadTiers.ts` (new file)

Pure logic, no canvas/DOM. Exports:

```ts
import { Envelope } from '../math/primitives/envelope.js';
import { Segment } from '../math/primitives/segment.js';

/**
 * Draw-order rank per OSM highway type. Lower ranks draw first (underneath);
 * higher ranks draw last (on top). Roads with no/unknown highwayType
 * (hand-drawn, legacy) rank 0 — the bottom tier.
 */
export const HIGHWAY_TIER_RANK: Record<string, number> = {
  track: 1,
  living_street: 2,
  service: 3,
  residential: 4,
  unclassified: 4,
  tertiary: 5,
  secondary: 6,
  primary: 7,
  trunk: 8,
  motorway: 9,
};

/** Tier rank of a segment's road type; unknown/undefined → 0 (bottom). */
export function getHighwayTierRank(seg: Segment): number {
  return (seg.highwayType && HIGHWAY_TIER_RANK[seg.highwayType]) ?? 0;
}

/**
 * Returns a new array of envelopes sorted by ascending tier rank (draw
 * first → last). Stable: equal ranks keep their relative input order.
 * Does not mutate the input array.
 */
export function sortEnvelopesByTier(envelopes: Envelope[]): Envelope[] {
  return [...envelopes].sort(
    (a, b) => getHighwayTierRank(a.skeleton) - getHighwayTierRank(b.skeleton),
  );
}
```

### `ts/world/world.ts`

- Import `sortEnvelopesByTier` from `./roadTiers.js`.
- Add the cache field + accessor:

```ts
// Tier-sorted envelope draw order; invalidated by Graph.hash() changes and
// by road regeneration (generate()).
#drawOrderCache: { hash: string; envelopes: Envelope[] } | null = null;

#getDrawOrderedEnvelopes(): Envelope[] {
  const hash = this.graph.hash();
  if (!this.#drawOrderCache || this.#drawOrderCache.hash !== hash) {
    this.#drawOrderCache = {
      hash,
      envelopes: sortEnvelopesByTier(this.envelopes),
    };
  }
  return this.#drawOrderCache.envelopes;
}
```

- In `draw()`, change the envelope pass (~line 339) from `for (const env of this.envelopes)` to `for (const env of this.#getDrawOrderedEnvelopes())`. Everything else in the pass (fill color lookup, `drawEnvelope` options) unchanged.
- In `generate()` (~line 278), reset `#drawOrderCache = null` before delegating to `WorldGenerator.generate` — envelope geometry also depends on road params (`roadWidth`, `roadRoundness`), which `Graph.hash()` does not cover, so any (re)generation must drop the stale sorted copy. (`World.load` constructs a fresh `World`, so it needs no explicit reset.)
- `highwayType` cache-invalidation note: `Graph.hash()` does not currently fold `highwayType`. Editing a segment's type is not possible in the editor UI today (metadata arrives via OSM import, which rebuilds the graph → new hash → cache refresh), so no `hash()` change is needed. Do NOT extend `hash()` in this plan.

### Tests — `tests/unit/world/roadTiers.test.ts` (new)

Pure-logic, no DOM/canvas. Build segments via `new Segment(p1, p2, false, false, { highwayType })` with `makePoint` helpers, envelopes via `new Envelope(seg, 100, 10)`. Cover:

1. Rank ordering: `motorway > trunk > primary > secondary > tertiary > residential > service > living_street > track > undefined-type` (assert pairwise via `getHighwayTierRank`).
2. `residential` and `unclassified` share the same rank.
3. Unknown string (e.g. `'footway'`, `'steps'`) and missing `highwayType` → rank 0 (bottom tier, below `track`).
4. `sortEnvelopesByTier`: shuffled input of typed envelopes → output ordered `track, service, residential, tertiary, secondary, primary, trunk, motorway` with undefined-type first.
5. Stability: two envelopes of the same tier keep their input relative order.
6. Input array is not mutated (assert original order intact after the call).

## Brain / persistence considerations

None. Rendering-only change; brain input dims, `brainsCompatible()`, save-file schemas, and localStorage keys are untouched.

## Acceptance criteria

- `npm run rebuild` completes with no TypeScript errors; `npm run fix:all` clean; `npm test` passes (all existing + new tests).
- Open `html/world.html`, load an OSM-imported world with mixed road classes (e.g. a motorway crossing residential streets): where asphalt envelopes overlap, the higher-class road's surface paints over the lower-class one (e.g. motorway gray `#888` covers residential at the junction area).
- Hand-drawn roads (no type) paint underneath all typed roads in mixed worlds; in pure hand-drawn worlds the visuals are unchanged (all rank 0, stable order = previous behavior).
- White road borders, lane dashes, one-way arrows, name labels, and speed signs still draw above all asphalt, unchanged.
- Graph edits in the world editor (and road param changes that call `generate()`) refresh the draw order on the next frame.

## Docs to update

- `AGENTS.md` — append a convention bullet under "Architecture rules": new `ts/world/roadTiers.ts` (centralised `HIGHWAY_TIER_RANK` table + `sortEnvelopesByTier`), asphalt envelopes draw tier-sorted via a `World` cache invalidated by `Graph.hash()` and reset in `generate()`; untyped/hand-drawn roads rank bottom; fills only — borders/markings/signage stay globally on top.
- `docs/Math.md` — in the Segment metadata section (where `highwayType` and per-type fill colors are documented), note that `highwayType` also drives asphalt draw order via `ts/world/roadTiers.ts`.
- No new `docs/*.md` file warranted (rendering heuristic, same class as road signage).
