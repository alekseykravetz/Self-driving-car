# Refactor Race to extend SimulatorShell

**Severity:** High
**Source:** Architectural Violation #1 — **RESOLVED**
**File:** ~~`ts/games/race.ts`~~ → `ts/simulator/racing/raceSimulator.ts`

## Problem (resolved)

Race previously managed its own full canvas lifecycle (constructor set up `gameCanvas`, `cameraCanvas`, `miniMapCanvas`, owned a raw `requestAnimationFrame` loop), completely duplicating the scaffolding already abstracted in `SimulatorShell`. It did not extend `SimulatorShell`.

362 lines of tightly-coupled code that bypassed the architectural template pattern.

## Impact (resolved)

The duplicated canvas/viewport/camera/animation lifecycle was extracted into the shared shell. Improvements to `SimulatorShell`'s render-throttled RAF loop or responsive layout now apply automatically to Race.

## Changes

- **Moved** `ts/games/race.ts` → `ts/simulator/racing/raceSimulator.ts` — extends `SimulatorShell`
- **Moved** `ts/games/racePanel.ts` → `ts/simulator/racing/racePanel.ts`
- **Extracted** generic canvas/viewport/camera/animation from Race into the shared shell (inherited via `extends SimulatorShell`)
- **Race-specific logic** (corridor progress, car generation, countdown, statistics panel) lives in `update()` and `draw(_time)` overrides
- **Updated** `html/race.html` — added `networkCanvas`, `layout-toolbar`, `animation-loop-toolbar` elements and script imports for `SimulatorPageHost`/`SimulatorShell` core
- **Deleted** old `ts/games/race.ts` and `ts/games/racePanel.ts`
- **Deleted** stale output `js/games/race.js` and `js/games/racePanel.js`
- **Added** `RaceSimulator` to eslint allowed-unused-vars list
