# Split WorldEditor — Extract OSM Import Collaborator

**Date:** 2026-08-04
**Slug:** split-world-editor-ts
**Entry points affected:** html/world.html
**Save-file impact:** none
**Backward compat:** preserved (no public API changes visible to callers)

**Audience:** an AI coding agent with **zero prior context** on this
conversation — everything needed is in this file.

## Goal

`ts/world/editors/worldEditor.ts` (883 lines) is on the architecture audit's
god-object watch-list (see `AGENTS.md` "Anti-Patterns to Flag" and
`tasks/archive/architect-audit-low-severity-fixes.md`'s "Findings reviewed
with no action needed" section, which explicitly left this file un-refactored
pending a dedicated task — this is that task). Extract the self-contained OSM
import routine into its own collaborator class so `WorldEditor` stays focused
on editor-mode orchestration, DOM wiring, and the draw loop. This is a
structural extraction only — no behavior change.

## Context (read first)

- [ts/world/editors/worldEditor.ts](../ts/world/editors/worldEditor.ts) — read
  in full. The extraction target is: the `OSM_FILTER` constant, and the
  `openOsmPanel`, `closeOsmPanel`, `openOverpassTurbo`, `copyOsmFilter`, and
  `parseOsmData` methods (roughly lines 55–65 and 470–650 in the current file
  — search for `OSM_FILTER` and `async parseOsmData`).
- [tests/unit/world/editors/worldEditor.test.ts](../tests/unit/world/editors/worldEditor.test.ts)
  — has a `describe('parseOsmData', ...)` block (around line 750) that
  constructs a `WorldEditor` and calls `editor.parseOsmData()` directly as a
  **public** method. This test must keep passing **unmodified** — `parseOsmData`
  must remain a public method on `WorldEditor` (even if it becomes a one-line
  delegate to the new collaborator).
- `docs/WorldEditor.md` "Non-blocking import" section — describes the current
  chunked-import behavior this extraction must preserve exactly.
- See AGENTS.md § "Time-sliced world generation + progress overlay (perf)" for
  why `parseOsmData` is `async` and drives `runChunkedGenerator`/`yieldToBrowser`
  — none of that behavior changes, only which class owns the code.

## Scope

- **In scope:**
  - Create `ts/world/editors/worldEditorOsmImport.ts` exporting a class
    (suggested name `WorldEditorOsmImporter`) that owns: the `OSM_FILTER`
    constant, `openPanel()`/`closePanel()` (DOM show/hide of the OSM panel),
    `openOverpassTurbo()`, `copyFilter()`, and `parse()` (the body of today's
    `parseOsmData`).
  - `WorldEditor` constructs one instance of this collaborator (after
    `#assignElementReferences()`, since it needs the OSM panel DOM refs) and
    its existing public methods (`openOsmPanel`, `closeOsmPanel`,
    `openOverpassTurbo`, `copyOsmFilter`, `parseOsmData`) become thin
    one-line delegates to the collaborator, so the class's existing public
    surface (and the test file above) is unaffected.
  - The collaborator needs access to state that changes over the editor's
    lifetime (world can be replaced by `#initializeWorldEditor`, likewise
    viewport). Pass **accessor callbacks**, not direct references, e.g. a
    constructor options object:
    ```ts
    {
      getWorld: () => World;
      getViewport: () => Viewport;
      getCanvas: () => HTMLCanvasElement;
      getAutoRegen: () => boolean;
      onGraphHashUpdated: (hash: string) => void; // replaces this.#oldGraphHash = ...
      osmPanel: HTMLElement;
      osmDataContainer: HTMLTextAreaElement;
      copyFilterBtn: HTMLButtonElement;
      worldLayersToolbar: WorldLayersToolbarElement;
      generationProgress: GenerationProgressElement | null;
      generatingGuard: { get: () => boolean; set: (v: boolean) => void }; // replaces this.#generating
    }
    ```
    Adjust the exact shape as needed, but preserve the re-entrancy guard
    (`#generating`), the busy/stale toolbar signaling, and the viewport
    auto-fit-to-imported-data logic byte-for-byte.
  - Move only these methods/constant. Do NOT touch `regenerateItems` /
    `#runGeneration` (those are shared with non-OSM regeneration and are out
    of scope here — leave them on `WorldEditor`).
- **Out of scope:**
  - `regenerateItems()` / `#runGeneration()` — stay on `WorldEditor`.
  - Any change to `WorldGenerator`, `Osm`, or the generation progress overlay
    behavior.
  - Renaming any DOM element IDs or altering `html/world.html`.

## Implementation

### `ts/world/editors/worldEditorOsmImport.ts` (new file)

- Export the collaborator class with the constructor options shape above.
- Move `OSM_FILTER`, `openOsmPanel`→`openPanel`, `closeOsmPanel`→`closePanel`,
  `openOverpassTurbo`, `copyOsmFilter`→`copyFilter`, `parseOsmData`→`parse`
  verbatim (adjusting `this.#world`/`this.#viewport`/etc. references to use
  the injected accessors instead).
- Keep all imports it needs (`Osm`, `OsmData`, `Point`, `Segment`, `Light`,
  `Crossing`, `Stop`, `Yield`, `expandDirectionalMarking`,
  `OSM_STOP_YIELD_SIZE_PX`, `yieldToBrowser`, `runChunkedGenerator`).

### `ts/world/editors/worldEditor.ts`

- Remove the extracted code; import `WorldEditorOsmImporter` and construct
  `#osmImporter` once DOM refs exist.
- Replace `openOsmPanel`/`closeOsmPanel`/`openOverpassTurbo`/`copyOsmFilter`/
  `parseOsmData` bodies with one-line delegates, e.g.
  `parseOsmData(): Promise<void> { return this.#osmImporter.parse(); }`
  (keep the same method names so the existing test file and
  `#addEventListeners()` wiring don't need to change).
- `#oldGraphHash` is currently mutated inside `parseOsmData` — expose it via
  the `onGraphHashUpdated` callback (or a small getter/setter pair) so the
  draw loop's change-detection still sees the updated hash immediately after
  import.

## Brain / persistence considerations

None — this task touches no save-file schema, sensor, or brain code.

## Acceptance criteria

- `tests/unit/world/editors/worldEditor.test.ts` passes unmodified (all
  `describe('parseOsmData', ...)` cases, including the empty-textarea alert
  case and the successful-parse case).
- Opening `html/world.html`, pasting a sample OSM JSON payload (see
  `saves/osm-data-loading-readme.txt` for a source) into the OSM panel and
  clicking Parse still imports roads, markings, and viewport auto-fit
  identically to before.
- `npm run rebuild` (wipes `js/` and recompiles — catches stale compiled
  files from the new/renamed source), then `npm run fix:all`, then
  `npx tsc --noEmit`, then `npm test` — all must pass with the same test count
  as before this change (98 files / 1402 tests, or whatever `npm test`
  reports as the current baseline — do not expect the count to shrink).

## Docs to update

- None required — this is an internal structural refactor with no
  user-visible or documented-behavior change. If you introduce a new public
  class name worth mentioning, a one-line addition to `docs/WorldEditor.md`
  under "Non-blocking import" noting "OSM import logic lives in
  `WorldEditorOsmImporter`" is optional but not required.
