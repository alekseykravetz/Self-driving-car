# Fix Lane Guides for Variable-Width Roads — Bugfixes

**Date:** 2026-07-22
**Slug:** lane-guides-variable-width
**Entry points affected:** traffic simulator, world road rendering, marking placement
**Save-file impact:** none (lane guides are regenerated, not saved)

## Three bugs fixed

### Bug 1: One-way car heading was opposite

**Root cause:** `TrafficSimulator.#headingAt()` always used the formula
`-angle(dv) + π/2`, which makes the car face OPPOSITE to the segment's
directionVector. For one-way roads this means the car faces against traffic flow.

**Fix:** When the nearest segment is `oneWay`, add `π` to the heading so the car
faces IN the traffic-flow direction (p1→p2).

**File:** `ts/simulator/traffic/trafficSimulator.ts`

### Bug 2: 1-lane roads drew a dashed center line

**Root cause:** `World.#drawSimpleLaneMarkings` had no guard for `laneCount <= 1`.
A 1-lane road (e.g. OSM `service` or `living_street`) fell through to the `else`
branch which always draws a dashed center line, making the road look like it has
2 lanes.

**Fix:** Early return when `laneCount <= 1` — draw one-way arrows if applicable
but nothing else.

**File:** `ts/world/world.ts`

### Bug 3: Lane guides at wrong position for non-2-lane roads

**Root cause:** `wgGenerateLaneGuides` created half-width envelopes
(`roadWidth / 2`) and unioned them to produce guides at ±¼-road-width. This is
correct ONLY for 2-lane roads (where ±¼-road-width = lane centers). For 1-lane
roads, guides landed at ±12.5px (not at road center 0). For 3-lane roads, they
landed at ±37.5px (not at any lane center). The one-way direction fix then
compounded the issue by potentially swapping direction incorrectly.

**Fix:** Replace the half-width envelope union approach with direct graph
segments as center-line guides (each segment contributes `new Segment(seg.p1, seg.p2)`).
Center-line guides are correct for all lane counts. One-way direction is
inherent in the graph segment's `directionVector()`, so no post-processing is
needed.

**File:** `ts/world/generation/worldGenerator.ts`

### Bonus refactor: one-way arrow extraction

Extracted the duplicated arrow-drawing code from both `#drawSimpleLaneMarkings`
and `#drawMultiLaneDividers` into a shared `#drawOneWayArrows(ctx, seg)` method.

**File:** `ts/world/world.ts`

## Files changed

| File                                       | Change                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `ts/simulator/traffic/trafficSimulator.ts` | `#headingAt`: +π for one-way roads                                                          |
| `ts/world/world.ts`                        | `#drawSimpleLaneMarkings`: early return for `laneCount <= 1`; extracted `#drawOneWayArrows` |
| `ts/world/generation/worldGenerator.ts`    | `wgGenerateLaneGuides`: graph segments as center-line guides                                |
| `AGENTS.md`                                | Updated rules for lane guides, one-way heading, single-lane markings, one-way arrows        |
| `docs/WorldEditor.md`                      | Step 3 rewritten for center-line guide approach                                             |

## Verification

- All 1126 existing tests pass
- `tsc --noEmit` — no type errors
- `npm run fix:all` — format + lint clean
