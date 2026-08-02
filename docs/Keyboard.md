# Keyboard Architecture

The project uses a centralized keyboard manager to route all keyboard shortcuts,
replacing the previous pattern of scattered `window.addEventListener('keydown', ...)`
calls across editors and simulators.

---

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    KeyboardManager                            │
│  (ts/input/keyboardManager.ts)                               │
│                                                               │
│  - Single window keydown/keyup listener pair                  │
│  - Registry: ShortcutBinding[] (root + pushed contexts)       │
│  - LatchedToggle state machines for toggle shortcuts          │
│  - Communicates via ToolbarUpdater interface                  │
│  - Context stack via pushBindings / popBindings               │
└──────────────────────┬───────────────────────────────────────┘
                       │ delegates to (via ToolbarUpdater)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                 ShortcutsToolbarElement                       │
│  (ts/ui/molecules/shortcutsToolbar.ts)                        │
│                                                               │
│  - Purely presentational (renders key-cap indicators)         │
│  - No key listeners of its own                                │
│  - Implements ToolbarUpdater interface                        │
│  - Receives state updates from KeyboardManager                │
└──────────────────────────────────────────────────────────────┘
```

### Two kinds of indicators

| Kind          | Behavior                                 | Visual sync                                                                        |
| ------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| **momentary** | One-shot action (e.g., `S`, `C`)         | `flash(id)` on keydown                                                             |
| **toggle**    | Sticky mode (e.g., `O`, `R`)             | `setActive(id, bool)` via LatchedToggle — held while key pressed, latched on click |
| **display**   | Informational only (e.g., `Ctrl`, `↑/W`) | `setActive(id, bool)` while the physical key is held                               |

---

## ShortcutBinding

Each shortcut is declared as a `ShortcutBinding` object that bundles the visual
definition, the physical key, and the behavioural handlers all in one place:

```typescript
interface ShortcutBinding extends ShortcutDef {
  key: string; // KeyboardEvent.key (lowercase)
  handler?: { onKeyDown: () => void }; // for momentary
  toggle?: {
    // for toggle
    onActivate: () => void;
    onDeactivate: () => void;
  };
}
```

Example — a momentary key:

```typescript
{
  id: 'keyC',
  key: 'c',
  label: 'C',
  title: 'C — Clear computed path',
  group: 'Graph',
  kind: 'momentary',
  handler: {
    onKeyDown: () => {
      this.#startPoint = null;
      this.#endPoint = null;
      this.shortestPath = null;
    },
  },
}
```

Example — a toggle key:

```typescript
{
  id: 'keyO',
  key: 'o',
  label: 'O',
  title: 'O — One-way road mode',
  group: 'Graph',
  kind: 'toggle',
  toggle: {
    onActivate: () => { this.#isOneWay = true; },
    onDeactivate: () => { this.#isOneWay = false; },
  },
}
```

---

## LatchedToggle (`ts/ui/atoms/latchedToggle.ts`)

A reusable state machine that replaces four copies of identical held/latched
boilerplate (previously in `GraphEditor`, `CorridorEditor`, and `TrafficSimulator`).

```typescript
class LatchedToggle {
  get active(): boolean; // held || latched
  setPhysicalHold(held: boolean): void; // from keydown/keyup
  toggleLatch(): void; // from toolbar click
  reset(): void; // clear both held and latched
  setOnChange(cb): void; // notified on every state change
}
```

The `KeyboardManager` creates one `LatchedToggle` per toggle binding and wires it
to both the physical key (`setPhysicalHold`) and the toolbar click (`toggleLatch`).
The binding's `toggle.onActivate` / `onDeactivate` fire automatically when the
effective state changes.

---

## Lifecycle

### World Editor (editors use push/pop)

```
WorldEditor constructor:
  → new KeyboardManager(toolbar)
  → km.setBindings([...zoomViewBindings(), keyG, keyI])  // root: Ctrl/Shift + mode keys

GraphEditor.enable():
  → km.pushBindings([keyS, keyE, keyC, keyO, keyH])  // editor-specific
  → toolbar shows root + pushed merged

GraphEditor.disable():
  → km.popBindings()                   // restores root-only
```

The `CorridorEditor` follows the same pattern with its own `[keyT]` bindings.

The `keyO` / `keyH` / `keyT` bindings are marked `hidden: true`, so they are
routed and toggled by `KeyboardManager` but are **not rendered** in the
`<shortcuts-toolbar>` — their visual state lives in the `<world-editor-panel>`
Path Tools section instead. `#rebuild()` filters `hidden` bindings out of the
`defs` passed to `setShortcuts()` while still creating their `LatchedToggle`s and
routing key events.

### Training Simulator (static set)

```
TrainingSimulator.#initKeyboardManager():
  → new KeyboardManager(toolbar)
  → km.setBindings([
       ...driveKeyBindings('the 🎮 user car'),
       greenWaveBinding({ group: 'Traffic', ... }),
       ...zoomViewBindings(!isSimple),
       visualizerDensityBinding(...),
     ])
```

All bindings are always-active — there is no editor context switching. The Drive
arrows, green-wave `G`, and visualizer `V` come from the shared factories in
`simulatorShortcuts.ts`; the `Ctrl` / `Shift` View indicators from
`zoomViewBindings()` (see **Shared shortcuts** below). The `Shift` fine-zoom key
is omitted in simple mode.

### Traffic Simulator (static set)

```
TrafficSimulator.#initToolbar():
  → new KeyboardManager(toolbar)
  → km.setBindings([
       keyR,
       greenWaveBinding({ group: 'Spawn', ... }),
       ...zoomViewBindings(),
       visualizerDensityBinding(...),
     ])
```

### Human Backpropagation Simulator (static set)

```
HumanBackpropSimulator.#initKeyboardManager():
  → new KeyboardManager(toolbar)
  → km.setBindings([
       keyL,
       ...driveKeyBindings(),
       ...zoomViewBindings(this.#mode !== 'simple'),
       visualizerDensityBinding(...),
     ])
```

As with training, the `Shift` fine-zoom indicator is hidden in simple mode.

---

## Shared shortcuts

Bindings that recur across pages are declared once as small factory functions
that return **fresh** `ShortcutBinding` objects (so one page's mutable bindings
are never shared with another's), then spread into each page's root set.

### View / zoom (`ts/input/viewShortcuts.ts`)

Every page with a pannable/zoomable `Viewport` shows the same two scroll-wheel
modifier indicators in the **View** group:

| Key     | Behavior                                                           |
| ------- | ------------------------------------------------------------------ |
| `Ctrl`  | Hold + scroll wheel to zoom in touchpad mode.                      |
| `Shift` | Hold + scroll wheel for slow, fine-grained zoom (default is fast). |

```typescript
km.setBindings([
  ...otherBindings,
  ...zoomViewBindings(includeShift), // Ctrl (+ Shift when includeShift)
]);
```

Pass `includeShift: false` for **simple-mode** simulators (the flat,
vertically-scrolling road), where fine-zoom framing is not useful — so the
`Shift` indicator is hidden there.

### Simulator gameplay (`ts/input/simulatorShortcuts.ts`)

The three simulators share several identical gameplay bindings, each exposed as a
factory:

| Factory                          | Produces                       | Used by                           |
| -------------------------------- | ------------------------------ | --------------------------------- |
| `driveKeyBindings(carLabel?)`    | `↑↓←→ / WASD` Drive indicators | training, human-backprop          |
| `greenWaveBinding({ group, … })` | `G` green-wave toggle          | training, traffic                 |
| `visualizerDensityBinding(cb)`   | `V` visualizer-density toggle  | training, traffic, human-backprop |

The per-instance differences (which car the keys drive, the toolbar group, and
the activate/toggle callbacks) are passed as arguments, so a wording or key
change is made in exactly one place instead of being copy-pasted across every
page.

---

## Files

| File                                                   | Role                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `ts/input/keyboardManager.ts`                          | Central orchestrator — owns window listeners, routing, LatchedToggle management, toolbar sync          |
| `ts/input/viewShortcuts.ts`                            | `zoomViewBindings()` — shared Ctrl / Shift View-group zoom indicators reused by every page             |
| `ts/input/simulatorShortcuts.ts`                       | `driveKeyBindings()` / `greenWaveBinding()` / `visualizerDensityBinding()` — shared simulator bindings |
| `ts/ui/atoms/latchedToggle.ts`                         | Held/latched state machine (extracted from 4 prior copies)                                             |
| `ts/ui/molecules/shortcutsToolbar.ts`                  | `<shortcuts-toolbar>` custom element — purely presentational rendering of key indicators               |
| `ts/ui/molecules/shortcutsToolbarTemplate.ts`          | Static HTML template for the toolbar                                                                   |
| `ts/world/editors/worldEditor.ts`                      | Creates `KeyboardManager`, sets root bindings, passes to editors                                       |
| `ts/world/editors/graphEditor.ts`                      | Defines shortcut bindings for S/E/C/O/H keys, calls `pushBindings`/`popBindings`                       |
| `ts/world/editors/corridorEditor.ts`                   | Defines shortcut bindings for T key, calls `pushBindings`/`popBindings`                                |
| `ts/simulator/training/trainingSimulator.ts`           | Creates `KeyboardManager` with training simulator bindings (arrows, G, Ctrl/Shift)                     |
| `ts/simulator/traffic/trafficSimulator.ts`             | Creates `KeyboardManager` with traffic simulator bindings (R, G, Ctrl/Shift)                           |
| `ts/simulator/humanTraining/humanBackpropSimulator.ts` | Creates `KeyboardManager` with Human Backpropagation bindings (L, arrows, Ctrl/Shift)                  |

---

## Architecture rules

1. **No direct `window` keydown/keyup.** All keyboard routing goes through
   `KeyboardManager`. The only exception is `controls.ts` (arrow/WASD for car
   driving — though `controls.frozen` can suppress them when the brain is in
   autopilot), which has no toolbar indicator and is not part of the shortcut
   system.

2. **Toolbar is presentation-only.** `ShortcutsToolbarElement` has no key listeners
   and knows nothing about what the shortcuts do. It only renders indicators and
   exposes `flash()`, `setActive()`, and `setToggleHandler()`.

3. **Bindings are self-documenting.** A `ShortcutBinding` describes everything
   about a shortcut — its visual appearance, its physical key, and its behaviour —
   in one object literal. No more wiring between `setShortcuts()`, `setClickListener()`,
   and separate keyboard handlers.

4. **Toggle state is managed centrally.** The `KeyboardManager` owns all
   `LatchedToggle` instances. Domain code only provides `onActivate`/`onDeactivate`
   callbacks and never touches `setActive` or held/latched state directly.

5. **Editors own their bindings.** `GraphEditor` and `CorridorEditor` define their
   own shortcut sets and register them via `pushBindings`/`popBindings`. The world
   editor only sets the root (always-active) bindings like Ctrl.

6. **Modal dialogs receive KeyboardManager.** `TrainingInitModalElement` and
   `HumanTrainingConfigModalElement` get a `KeyboardManager` reference via
   `setKeyboardManager()` and use `pushBindings`/`popBindings` for the Escape key
   (pushed on open, popped on close via `#start()` or `#cancel()`).

7. **`v` key is a momentary binding in simulators.** The network-visualizer density
   toggle (`visDensity`) is registered as a `momentary` binding in each simulator's
   KeyboardManager setup (`TrainingSimulator`, `HumanBackpropSimulator`,
   `TrafficSimulator`). `RaceSimulator` lacks a KeyboardManager and does not
   expose the binding. The old raw `keydown` listener in `simulatorShell.ts` was
   removed in favour of this centralised approach.
