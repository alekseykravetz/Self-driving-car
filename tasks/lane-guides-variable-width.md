# Fix Lane Guides for Variable-Width Roads

**Date:** 2026-07-22
**Slug:** lane-guides-variable-width
**Entry points affected:** all (marking placement in world editor + simulators)
**Save-file impact:** none (lane guides are regenerated, not saved)
**Backward compat:** must preserve — 2-lane roads keep current behavior

## Goal

The lane guides (`world.laneGuides`) are used by 6 of 7 marking editors (stop,
light, start, target, yield, parking) to snap markings to road center lines.
They are generated as half-width envelope unions, which works for uniform 2-lane
roads but breaks for:

1. **One-way roads**: The lane guide direction can be wrong, causing markings to
   face the wrong way (the user reports "it switch the car direction on second
   lane").
2. **Multi-lane roads (3+ lanes)**: The half-width envelope puts the guide at the
   road center divider, not at the center of the lane where markings should be
   placed. Markings end up at the wrong lateral position.

## Problem analysis

Current generation (`worldGenerator.ts`):

```ts
for (const segment of graph.segments) {
  tempEnvelopes.push(
    new Envelope(segment, getSegmentRoadWidth(segment) / 2, roadRoundness),
  );
}
return Polygon.union(tempEnvelopes.map((e) => e.polygon));
```

This creates a half-width envelope per segment and unions them. The result is
the set of center-line segments. For a 2-lane road (100px), the half-width is
50px → center line at road center → correct.

For a 4-lane road (200px), the half-width is 100px → center line at road center
→ this is the divider between opposing traffic, not where a stop sign should go.

For a 1-lane one-way road (50px), the half-width is 25px → center line at road
center → position is correct, but the direction vector of the resulting union
segment may not match the one-way direction.

## Proposed approach

Instead of a single half-width envelope per segment, generate lane guides that
account for lane layout:

- **Two-way roads**: Keep the center-line guide (for markings that span the road
  like stop lines, crossings). This preserves current behavior for 2-lane roads.
- **One-way roads**: The guide direction must match the one-way direction. The
  position stays at the road center.
- **Multi-lane roads**: The center guide is still useful for road-spanning
  markings. The key fix is ensuring the direction is correct and the guide
  width matches the actual road width.

The direction issue is the most impactful: when `Polygon.union` merges
overlapping envelopes, the resulting segment directions can be arbitrary
(depends on which polygon's edges survive the union). For one-way roads, we
need to ensure the guide direction matches the segment's one-way direction.

### Investigation needed

1. Check if `Polygon.union` preserves or loses segment direction information
2. Determine if we need to post-process lane guides to fix directions
3. Consider whether multi-lane roads need additional per-lane guides

## Implementation steps

### Step 1: Investigate lane guide direction after Polygon.union

Check whether the union segments retain the direction of the original segments
or if they can be reversed. This determines the fix approach.

### Step 2: Fix one-way direction

If union loses direction, post-process lane guides: for each guide segment,
find the nearest graph segment and if that segment is one-way, ensure the guide
segment's direction matches (swap p1/p2 if needed).

### Step 3: Fix multi-lane positioning

For multi-lane roads, consider generating lane guides at the center of the
rightmost lane instead of the road center. Or keep the center guide but ensure
markings are sized correctly for the road width.

### Step 4: Test with OSM-imported worlds

Verify marking placement works correctly on:

- 1-lane one-way roads
- 2-lane two-way roads (regression check)
- 4-lane motorways
- Roundabouts

## Files affected

| File                                                 | Change                                        |
| ---------------------------------------------------- | --------------------------------------------- |
| `ts/world/generation/worldGenerator.ts`              | `wgGenerateLaneGuides` updated                |
| `ts/world/world.ts`                                  | Possibly update if lane guide storage changes |
| `tests/unit/world/generation/worldGenerator.test.ts` | New tests for variable-width lane guides      |

## Status

**Not started** — this is a follow-up task from the OSM import lanes feature.
The user acknowledged it may need a separate task.
