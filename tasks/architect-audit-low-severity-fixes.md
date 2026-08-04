# Architect Audit — Low-Severity Follow-Up Fixes

**Date:** 2026-08-04
**Slug:** architect-audit-low-severity-fixes
**Audience:** an AI coding agent with **zero prior context** on this
conversation — everything needed is in this file.

## Background

A full architecture audit of this repo (see `.opencode/agents/architect.md` for
the audit methodology, and `AGENTS.md` at the repo root for project
conventions) was run on 2026-08-04. The build was fully green: `tsc --noEmit`,
`eslint`, `prettier --check`, and `vitest run` (98 files / 1402 tests) all
passed with zero errors. No 🔴 High or 🟠 Medium severity violations were found
— layer isolation, the `Car`/`Sensor`/`NeuralNetwork` decoupling contracts, the
centralized `KeyboardManager`, and the zero-runtime-dependency rule all hold.

Only two 🟡 Low severity items came out of the audit, both purely
documentation/comment hygiene (no logic changes, no test changes required
beyond re-running the existing suite). This task fixes both.

## Task 1 — Clarify `CameraControls.#loop()`'s canvas use

**File:** [ts/car/controls/cameraControls.ts](../ts/car/controls/cameraControls.ts)

**Why:** The architect audit's canvas-ops checklist flags any `ctx.*` mutation
(`save`, `beginPath`, `arc`, `fillRect`, etc.) found outside a method named
`draw*`/`display` — the convention used everywhere else in this codebase to
keep canvas rendering out of physics/update/constructor code. `#loop()` in this
file trips that check, but it is **not** a real violation: this class captures
a phone-camera video frame onto a canvas purely to call `getImageData()` for
marker detection (computer vision), not to render a visual frame. Add a short
comment so this is understood as intentional on the next read/audit, instead of
being re-flagged.

**Edit:** Locate the `#loop()` method. It currently reads:

```ts
    // Draw mirrored video onto the main canvas
    this.ctx.save();
    this.ctx.translate(this.canvas.width, 0);
    this.ctx.scale(-1, 1); // Mirror horizontally
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // Get image data from the main canvas
    const imageData = this.ctx.getImageData(
```

Change the first comment to make the non-rendering intent explicit:

```ts
    // Draw mirrored video onto the main canvas as a pixel buffer for marker
    // detection below (getImageData) — not a visual render pass.
    this.ctx.save();
    this.ctx.translate(this.canvas.width, 0);
    this.ctx.scale(-1, 1); // Mirror horizontally
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // Get image data from the main canvas
    const imageData = this.ctx.getImageData(
```

No other changes to this file.

## Task 2 — Fix stale test-count line in `AGENTS.md`

**File:** [AGENTS.md](../AGENTS.md)

**Why:** The Testing section states a test-suite size that no longer matches
reality. Run `npm test` (or `node ./node_modules/.bin/vitest run`) if you want
to reconfirm the current numbers before editing — as of this task they are
**98 test files, 1402 tests**.

**Edit:** Find this line (in the `## Testing` section):

```
The project has a **multi-phase test suite**: **81 test files, 1115 tests** (~70% statement coverage) across math, neural-network, car, world, simulator, panels, viewport, and store modules. Tests live in three directories:
```

Replace the bolded counts only (leave the coverage percentage and rest of the
sentence as-is unless you've just measured fresh coverage too):

```
The project has a **multi-phase test suite**: **98 test files, 1402 tests** (~70% statement coverage) across math, neural-network, car, world, simulator, panels, viewport, and store modules. Tests live in three directories:
```

If you re-ran `npm run test:coverage` and the statement/branch/function
percentages near the bottom of the same section have also drifted, update
those numbers too — otherwise leave them.

## Verification

After both edits:

1. `npm run fix:all` (format + lint) — must exit clean.
2. `node ./node_modules/.bin/tsc --noEmit` — must exit 0.
3. `npm test` — all tests must still pass (this task doesn't change behavior,
   only comments/docs, so the count should be unchanged from what you observe).
4. Commit both files together in one pass — this is a single small cleanup,
   no need to split into multiple commits/branches.

## Findings reviewed with no action needed

The parent audit raised three more 🟡/🟢 items. Each was investigated and
closed as a non-issue — listed here so they aren't silently dropped or
re-investigated from scratch on a future audit pass:

- **Canvas-ops grep sweep** (`rg -n "ctx\.(beginPath|fillRect|arc|save)" ts/ | rg -v "Renderer|draw|/rendering/"`,
  ~50 hits across `miniMap.ts`, `graphEditor.ts`, `trafficSimulator.ts`,
  `inspectEditor.ts`, `world.ts`, and others). All are **false positives**: the
  grep filters out lines containing the literal word `draw`/`Renderer`, but the
  enclosing method name (`draw()`, `display()`, `#draw*()`) is on a different
  line than the flagged `ctx.*` call, so the filter misses them. Manually
  checked every hit's enclosing method — all canvas mutation is confined to
  `draw()`/`display()`/`#draw*` methods as required. No fix needed.
- **Deep relative import chains** (`rg -n "from '\.\./\.\./\.\./" ts/`, 8 hits,
  all under `ts/simulator/training/**` and `ts/simulator/humanTraining/**`
  reaching `ts/car/`, `ts/store/`, `ts/world/`). This is expected: those
  modules are nested two levels deep (`ts/simulator/training/modes/`,
  `ts/simulator/training/genetics/`, etc.), so three `../` segments is the
  correct, shortest path back to the shared layers — not a hoisting smell. No
  fix needed.
- **God-object size watch-list** (`worldEditor.ts` 883 lines, `world.ts` 843,
  `trainingPanel.ts` 806, `worldGenerator.ts` 803, `osm.ts` 758, `camera.ts`
  713 — all over the 400-line soft threshold in `.opencode/agents/architect.md`).
  All six are already on the existing watch-list in the architect agent spec;
  none are new offenders introduced since the last audit. No refactor is
  requested by this task — do not split these files unless a separate task
  explicitly asks for it.

## Out of scope

- No CSS design-token audit was performed in the parent audit — do not expand
  this task to cover `styles/`.
- No god-object refactors are requested here (see list above) — they remain
  watch-list items only.
