# Keyboard Architecture

The project uses a centralized keyboard manager to route all keyboard shortcuts,
replacing the previous pattern of scattered `window.addEventListener('keydown', ...)`
calls across editors and simulators.

---

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    KeyboardManager                            │
│  (ts/panels/keyboardManager.ts)                               │
│                                                               │
│  - Single window keydown/keyup listener pair                  │
│  - Registry: ShortcutBinding[] (root + pushed contexts)       │
│  - LatchedToggle state machines for toggle shortcuts          │
│  - Automatic flash/setActive on ShortcutsToolbarElement       │
│  - Context stack via pushBindings / popBindings               │
└──────────────────────┬───────────────────────────────────────┘
                       │ delegates to
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                 ShortcutsToolbarElement                       │
│  (ts/panels/shortcutsToolbar.ts)                              │
│                                                               │
│  - Purely presentational (renders key-cap indicators)         │
│  - No key listeners of its own                                │
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

## LatchedToggle (`ts/panels/latchedToggle.ts`)

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
  → km.setBindings([keyCtrl])          // root: always-active (Ctrl display)

GraphEditor.enable():
  → km.pushBindings([keyS, keyE, keyC, keyO, keyH])  // editor-specific
  → toolbar shows root + pushed merged

GraphEditor.disable():
  → km.popBindings()                   // restores root-only
```

The `CorridorEditor` follows the same pattern with its own `[keyT]` bindings.

### Training Simulator (static set)

```
TrainingSimulator.#initKeyboardManager():
  → new KeyboardManager(toolbar)
  → km.setBindings([keyUp, keyDown, keyLeft, keyRight, keyG, keyCtrl])
```

All bindings are always-active — there is no editor context switching.

### Traffic Simulator (static set)

```
TrafficSimulator.#initToolbar():
  → new KeyboardManager(toolbar)
  → km.setBindings([keyR, keyG, keyCtrl])
```

### Human Backpropagation Simulator (static set)

```
HumanBackpropSimulator.#initToolbar():
  → new KeyboardManager(toolbar)
  → km.setBindings([keyL, keyG, keyCtrl])
```

---

## Files

| File                                                   | Role                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `ts/panels/keyboardManager.ts`                         | Central orchestrator — owns window listeners, routing, LatchedToggle management, toolbar sync |
| `ts/panels/latchedToggle.ts`                           | Held/latched state machine (extracted from 4 prior copies)                                    |
| `ts/panels/shortcutsToolbar.ts`                        | `<shortcuts-toolbar>` custom element — purely presentational rendering of key indicators      |
| `ts/panels/templates/shortcutsToolbarTemplate.ts`      | Static HTML template for the toolbar                                                          |
| `ts/world/editors/worldEditor.ts`                      | Creates `KeyboardManager`, sets root bindings, passes to editors                              |
| `ts/world/editors/graphEditor.ts`                      | Defines shortcut bindings for S/E/C/O/H keys, calls `pushBindings`/`popBindings`              |
| `ts/world/editors/corridorEditor.ts`                   | Defines shortcut bindings for T key, calls `pushBindings`/`popBindings`                       |
| `ts/simulator/training/trainingSimulator.ts`           | Creates `KeyboardManager` with training simulator bindings (arrows, G, Ctrl)                  |
| `ts/simulator/traffic/trafficSimulator.ts`             | Creates `KeyboardManager` with traffic simulator bindings (R, G, Ctrl)                        |
| `ts/simulator/humanTraining/humanBackpropSimulator.ts` | Creates `KeyboardManager` with Human Backpropagation bindings (L, G, Ctrl)                    |

---

## Architecture rules

1. **No direct `window` keydown/keyup.** All keyboard routing goes through
   `KeyboardManager`. The only exception is `controls.ts` (arrow/WASD for car
   driving — though `controls.frozen` can suppress them when the brain is in
   autopilot) and `simulatorShell.ts` (`v` for network-visualizer density toggle),
   both of which have no toolbar indicator and are not part of the shortcut system.

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
