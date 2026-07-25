# Refactor: Extract Signage Rendering from `World` into a Collaborator

**Date:** 2026-07-25
**Slug:** refactor-world-signage-extraction
**Entry points affected:** all pages that render a world (`html/simulator.html`, `html/traffic.html`, `html/world.html`, `html/race.html`) — behavior must be byte-identical
**Save-file impact:** none (no serialization format change)
**Backward compat:** must be fully preserved — this is a pure internal refactor

## Goal

`ts/world/world.ts` is ~920 lines and mixes core world responsibilities (graph, envelopes, buildings, trees, markings, corridors, traffic) with a large, self-contained **signage rendering subsystem** (street-name labels, speed-limit signs, road shields, exit gantry signs, one-way arrows). Extract the signage subsystem into a dedicated renderer collaborator so `World` shrinks and the signage concern lives in one cohesive unit.

**This is a behavior-preserving refactor. The rendered output must be pixel-identical (visual regression baselines in `tests/visual/baselines/` must NOT change).**

## Context (read first)

- `AGENTS.md` (repo root) — project conventions. Especially the sections on **"Renderer decoupled"**, **"Road signage placement"**, **"One-way arrow placement"**, and **"Road-type draw order"**. These document the existing signage design that this task reorganizes.
- Layer rules: `World` is Layer 2. Pure-placement modules it calls (`ts/world/roadSignage.ts`, `ts/world/oneWayArrows.ts`) are also Layer 2 and must stay DOM/canvas-free. The new collaborator is a renderer (Layer 2, may use canvas in `draw*` methods only).
- No barrel files. Import paths use `.js` extension. Private members use `#`.

### Key source files

- `ts/world/world.ts` — the god object. Relevant members to move:
  - **Caches** (declared ~lines 127-137): `#signageCache`, `#oneWayArrowCache`, `#shieldCache`, `#exitSignCache`.
  - **Cache helpers** (~lines 560-616): `#getSignage()`, and the getter helpers that populate `#oneWayArrowCache` / `#shieldCache` / `#exitSignCache`.
  - **Draw methods**: `#drawOneWayArrows(ctx)` (~474), `#drawRoadShields(ctx)` (~763), `#drawExitSigns(ctx)` (~816), `#drawRoadNames(ctx)` (~888), `#drawSpeedLimits(ctx)` (~911).
  - **Call sites** inside `World.draw()` (~lines 355, 362, 365, 368, 369).
- `ts/world/roadSignage.ts` — pure placement (labels, speed signs, shields, exit signs) + `MIN_SIGNAGE_ZOOM`. Do NOT change.
- `ts/world/oneWayArrows.ts` — pure one-way arrow placement. Do NOT change.
- `ts/world/roadTiers.ts` — `sortEnvelopesByTier()`. Referenced by draw order; leave as-is.
- `tests/unit/world/world.test.ts` — existing World tests (helper-function level). Add tests for the new collaborator.
- `tests/visual/simulator.spec.ts`, `tests/visual/world.spec.ts` — visual baselines that MUST stay green.

## Architecture rules

1. **Behavior preservation is the hard constraint.** Every signage draw call must fire in the same order, with the same zoom guards (`this.zoom < MIN_SIGNAGE_ZOOM` early-returns), the same cache-by-`Graph.hash()` semantics, and the same ctx state.
2. **New collaborator location:** `ts/world/worldSignageRenderer.ts`, exporting `class WorldSignageRenderer`. Layer 2. Canvas work only inside its `draw*` methods.
3. **Ownership of caches moves with the methods** — the renderer owns `#signageCache`/`#oneWayArrowCache`/`#shieldCache`/`#exitSignCache` and invalidates them by `Graph.hash()` exactly as `World` does today.
4. **`World` retains orchestration.** `World.draw()` still decides _when_ signage draws (same call order relative to roads/borders/markings); it delegates the _how_ to the renderer instance, e.g. `this.#signageRenderer.drawOneWayArrows(ctx, this.graph, this.zoom)`.
5. **No new public serialization / no localStorage changes.**
6. **No canvas in constructors or non-`draw` methods** of the new class.

## Scope

### In scope

- Create `ts/world/worldSignageRenderer.ts` with `WorldSignageRenderer`.
- Move the five draw methods, the four caches, and their cache-population helpers out of `World` and into the renderer, converting the `#drawX(ctx)` methods to public `drawX(ctx, ...inputs)` methods that receive whatever `World` state they need (`graph`, `zoom`, the tier-sorted envelopes if required) as parameters instead of reading `this.*`.
- Have `World` construct one `WorldSignageRenderer` (field `#signageRenderer`) and delegate from `World.draw()` at the identical call sites/order.
- Remove the now-dead private members from `World`.
- Add `tests/unit/world/worldSignageRenderer.test.ts` covering cache-hash invalidation and the zoom-guard early-returns (pure logic; do not test `draw` pixels — those are covered by visual tests).

### Out of scope

- Any change to `roadSignage.ts` / `oneWayArrows.ts` placement math.
- Any change to road/border/lane-marking/bridge rendering.
- Any change to `Graph.hash()`.
- Splitting other parts of `World` (buildings, trees, markings) — separate task.

## Suggested steps

1. Read `World.draw()` end-to-end and list the exact order of every draw call, noting which use `this.zoom`, `this.graph`, and any tier-sorted envelope cache.
2. Create `WorldSignageRenderer` with the four caches and a private `#getSignage(graph)` mirroring the current logic.
3. Move each `#drawX` method; change `this.zoom`→ param, `this.graph`→ param, `this.#getSignage()`→ internal.
4. In `World`: add `#signageRenderer = new WorldSignageRenderer()`; replace the five internal calls with delegated calls passing `this.graph`, `this.zoom`, etc.; delete the moved members.
5. Run `npx tsc --noEmit` until clean.
6. Run `npm test` (unit) — fix any broken World tests.
7. Run `npm run test:visual` — baselines MUST pass unchanged. If they differ, the refactor changed behavior; fix until identical. Do NOT run `test:visual:update`.
8. `npm run fix:all`.

## Verification / acceptance criteria

- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint:log` clean; `npm run format:check` clean.
- [ ] `npm test` green (including new `worldSignageRenderer.test.ts`).
- [ ] `npm run test:visual` green with **no baseline changes** (proves pixel-identical output).
- [ ] `ts/world/world.ts` no longer declares the signage caches or `#drawRoadNames/#drawSpeedLimits/#drawRoadShields/#drawExitSigns/#drawOneWayArrows`.
- [ ] `wc -l ts/world/world.ts` is meaningfully lower (target: under ~700 lines).
- [ ] Update `AGENTS.md` if any documented `World.#draw*` method name is referenced there (search for the method names and adjust to the new `WorldSignageRenderer` owner).
