# Split Osm — Extract Marking-Placement Helpers

**Date:** 2026-08-04
**Slug:** split-osm-ts
**Entry points affected:** html/world.html (OSM import)
**Save-file impact:** none
**Backward compat:** preserved (no public API changes visible to callers)

**Audience:** an AI coding agent with **zero prior context** on this
conversation — everything needed is in this file.

## Goal

`ts/math/osm-importer/osm.ts` (758 lines) is on the architecture audit's
god-object watch-list (see `AGENTS.md` "Anti-Patterns to Flag"). It mixes two
distinct concerns: (1) parsing raw OSM node/way JSON into `Point`/`Segment`
graph data (the `Osm.parseRoads`/`parseRoadsChunked` methods), and (2) purely
geometric marking-orientation logic (`placeApproachMarking`,
`approachFacingDir`, `throughAxis`) that decides which way a traffic light,
stop sign, or give-way sign should face. Extract the marking-orientation
logic into its own pure module. No behavior change.

## Context (read first)

- [ts/math/osm-importer/osm.ts](../ts/math/osm-importer/osm.ts) — read in
  full. The extraction target is the three free functions at the bottom of
  the file: `placeApproachMarking`, `approachFacingDir`, `throughAxis`
  (roughly the last ~180 lines, after the closing brace of the `Osm` class),
  plus the types they depend on: `MarkingKind`, `MarkNeighbor`,
  `MarkAccumulator`, `SIGNAL_CLUSTER_RADIUS_PX`.
- [tests/unit/math/osm-importer/osm.test.ts](../tests/unit/math/osm-importer/osm.test.ts)
  — imports only `Osm` and the `OsmData` type from `osm.js`. It does **not**
  import `placeApproachMarking`/`approachFacingDir`/`throughAxis` directly —
  they are exercised indirectly through `Osm.parseRoads(...)` results
  (`describe('directional marking orientation (direction tag)', ...)` and
  the parent `parseRoads` describe block). This means the extraction is safe
  as long as `Osm.parseRoads`'s behavior is bit-for-bit identical — the test
  does not care which file the helper functions live in.
- AGENTS.md § "Segment OSM metadata" and § "OSM node-marking import" — long,
  detailed bullets describing exactly what `placeApproachMarking`/
  `approachFacingDir`/`throughAxis` must do (priority order for resolving
  facing direction, the `SIGNAL_CLUSTER_RADIUS_PX` clustering radius, the
  canonical travel-direction convention). Re-read these before moving
  anything — the comments on each function already restate this contract in
  detail; preserve every comment verbatim during the move.
- The architect agent's Layer 1 rule (AGENTS.md "Architecture rules" /
  `.opencode/agents/architect.md` § "Core Architectural Constraints") — this
  file lives in `ts/math/osm-importer/`, which is Layer 1 (pure math/
  primitives, zero project imports beyond `ts/math/`). The new file must
  stay in the same directory and must NOT import from `ts/world/`,
  `ts/car/`, or any Layer 2+ module — it already only depends on
  `Point`/`Segment` (Layer 1) and math utils, so this constraint is easy to
  keep as long as you don't add new imports.

## Scope

- **In scope:**
  - Create `ts/math/osm-importer/osmMarkingPlacement.ts` exporting
    `placeApproachMarking`, `approachFacingDir`, `throughAxis`, and the
    `MarkingKind`, `MarkNeighbor`, `MarkAccumulator` types (and
    `SIGNAL_CLUSTER_RADIUS_PX`, since `placeApproachMarking` uses it) —
    moved verbatim including doc comments.
  - `osm.ts` imports these from the new file and uses them exactly as today
    inside the "Assemble markings from tagged nodes" loop at the end of
    `parseRoadsChunked`.
  - The `OsmMarkingPlacement` interface (used as the return type of both
    `placeApproachMarking` and the `ParsedRoads.lights`/`crossings`/`stops`/
    `yields` arrays) can stay in `osm.ts` (it's a shared public export used by
    `WorldEditor`) — import it into the new file with `import type`.
- **Out of scope:**
  - `Osm.parseRoads`/`Osm.parseRoadsChunked` and the node/way parsing loop —
    stays in `osm.ts`.
  - `hasParkingSide` and the `MAXSPEED_TYPE_DEFAULTS` table — stay in
    `osm.ts` (they're way-tag parsing concerns, not marking-orientation
    geometry; leave them where they are, do not fold them into this task).
  - No change to `ts/world/osmDirectionalMarkings.ts` (the per-lane expansion
    module downstream of this one) — it consumes `OsmMarkingPlacement`
    output and is unaffected by where the placement functions live.

## Implementation

### `ts/math/osm-importer/osmMarkingPlacement.ts` (new file)

- Move `SIGNAL_CLUSTER_RADIUS_PX`, the `MarkingKind` type, `MarkNeighbor`
  interface, `MarkAccumulator` interface, `placeApproachMarking`,
  `approachFacingDir`, `throughAxis` — verbatim, including every doc comment.
- Imports needed: `Point`, `subtract`/`normalize`/`dot`/`add`/`scale`/
  `distance` from `../utils.js`, and `import type { OsmMarkingPlacement } from './osm.js'`.

### `ts/math/osm-importer/osm.ts`

- Remove the four moved items; add
  `import { placeApproachMarking, approachFacingDir, throughAxis } from './osmMarkingPlacement.js'`
  and `import type { MarkingKind, MarkAccumulator } from './osmMarkingPlacement.js'`
  (the `markAccum` map and `MarkAccumulator`-shaped entries are still built
  inside `parseRoadsChunked`, just using the imported type).
- Everything else in the file (types, `hasParkingSide`, the `Osm` class body)
  is unchanged.

## Brain / persistence considerations

None — this task touches no save-file schema, sensor, or brain code.

## Acceptance criteria

- `tests/unit/math/osm-importer/osm.test.ts` passes unmodified, including the
  `directional marking orientation (direction tag)` and
  `on-street parking (parking:* way attribute)` describe blocks — these
  exercise `placeApproachMarking`/`approachFacingDir` indirectly through
  `Osm.parseRoads` and must produce byte-identical `OsmMarkingPlacement`
  results.
- `npx tsc --noEmit` confirms no Layer 1 boundary violation was introduced
  (the new file must not import anything outside `ts/math/`).
- `npm run rebuild`, `npm run fix:all`, `npx tsc --noEmit`, `npm test` all
  pass with the same test count as before this change.

## Docs to update

- None required — no documented convention or behavior changes; this is an
  internal code-motion refactor within the already-documented OSM-import
  system described in AGENTS.md § "Segment OSM metadata" / "OSM node-marking
  import".
