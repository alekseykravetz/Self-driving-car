# Error-Handling Surfacing — Stop Swallowing Failures

**Date:** 2026-08-10
**Slug:** error-handling-surfacing
**Entry points affected:** html/world.html (OSM import + world gen error paths)
**Save-file impact:** none
**Backward compat:** preserved — success paths unchanged; only failure paths
gain user-visible feedback.

**Audience:** an AI coding agent with **zero prior context** — everything
needed is in this file.

---

## Goal

Several catch blocks log to `console` (or swallow silently and return `null`),
so a user hitting a bad world file or malformed OSM JSON sees nothing — the app
just does nothing. Surface these failures to the user without changing any
success behavior.

---

## Scope

### 1. Silent loaders that return null

- [ts/world/loader/worldLoader.ts](ts/world/loader/worldLoader.ts) — `catch`
  logs then returns `null`. Keep returning `null` (callers depend on it) but
  ensure the failure is observable. Check how callers use the `null` return; if
  a caller can show an alert/toast, thread the error there.
- [ts/world/markings/markingLoader.ts](ts/world/markings/markingLoader.ts) —
  the bare `catch { ... }` block. Make sure it at least logs which marking
  failed to load and why, instead of swallowing.

### 2. OSM import errors → user feedback

- [ts/world/editors/worldEditorOsmImport.ts](ts/world/editors/worldEditorOsmImport.ts)
  lines ~129 and ~307: `console.error('Error parsing OSM JSON', ...)` /
  `console.error('Error processing OSM data', ...)`. The user imported a file
  and it silently failed. Surface a message via the existing UI mechanism
  (check how the editor already reports status — look for an alert, a toast, or
  the `<generation-progress>` overlay; reuse whatever exists; do NOT invent a
  new UI framework). If no mechanism exists, a `window.alert` with a clear
  message is acceptable as a minimal fix.

### 3. World-generation failure

- [ts/world/editors/worldEditor.ts](ts/world/editors/worldEditor.ts) ~line 571
  `console.error('World generation failed:', err)`: same treatment — surface to
  the user, and make sure the `#generating` re-entrancy guard is cleared in a
  `finally` so a failed generation does not lock out future generations.

### 4. Building geometry warning

- [ts/world/items/building.ts](ts/world/items/building.ts) ~line 141
  `console.warn('Building base does not have >= 4 points')`: this is a data
  invariant. Decide: is this reachable from user data (OSM) or only a
  programming error? If only programmatic, keep the warn but do not spam it
  (it's in a hot path?). If reachable from user data, handle gracefully (skip
  that building) — verify it already does.

---

## Constraints

- Do NOT change any success path.
- Do NOT remove the `console.*` logging — ADD user-visible surfacing alongside
  it (console stays useful for devs).
- Reuse existing UI feedback mechanisms; do not add dependencies.

---

## Acceptance criteria

- `npm run rebuild` compiles cleanly.
- `npm run fix:all` passes.
- `npm test` passes (add/adjust unit tests for the loaders if they have
  existing test files — check `tests/unit/world/loader/`).
- Manual: importing a deliberately-malformed OSM JSON in the world editor shows
  a visible error instead of doing nothing.
- The `#generating` guard is released on failure (world gen can be retried
  after an error).
