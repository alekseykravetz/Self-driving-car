# Human Backpropagation — Bugfixes & Panel Redesign

**Date:** 2026-07-16
**Slug:** human-backprop-bugfixes
**Entry points affected:** `html/human-training.html` (panel only); shared `ts/` (Car, Controls, NeuralNetwork, HumanBackpropSimulator, HumanTrainingPanel, panel template, CSS)
**Save-file impact:** none — no schema changes; `humanTrainedCar` localStorage key unchanged
**Backward compat:** preserved — all changes are additive or bugfixes to the human-training mode only

## Goal

Fix four issues in the Human Backpropagation training mode and redesign the panel to be more informative:

1. **Accuracy metric is misleading** — forward-only frames dominate the cumulative percentage, hiding left/right mismatches. Switch to a rolling window and show per-channel accuracy.
2. **No learning toggle** — learning always runs when keys are pressed. Add an L-key toggle (and panel button) to start/stop learning independently of driving.
3. **Autopilot checkbox not working** — the `Controls` keyboard listeners overwrite the brain's controls between frames. Add a `frozen` flag to `Controls` that makes the listeners no-op when autopilot is active. Also add visual feedback so the user can confirm autopilot is engaged.
4. **Panel is hard to understand and has empty space** — add a "How it works" section, car speed, learning state indicator, per-channel accuracy, weight-change pulse indicator, and training frame counter.

## Context (read first)

- `AGENTS.md` — architecture rules (layer isolation, `#` private fields, `.js` import extensions, centralised `KeyboardManager`, `LatchedToggle`).
- `ts/car/car.ts` — `#processBrain()` (lines 290-353), `#learningFromHuman`/`#autopilot`/`#learningRate`/`#lastBrainOutput` fields (lines 101-114), `setLearningFromHuman`/`setAutopilot`/`setLearningRate`/`lastBrainOutput` API (lines 383-418), `respawn()` (lines 420-428).
- `ts/car/controls/controls.ts` — `Controls` class, `#addKeyboardListeners()` (lines 45-86) registers `document` keydown/keyup that set `this.forward`/`left`/`right`/`reverse`.
- `ts/neural-network/network.ts` — `NeuralNetwork.trainStep()` (lines 150-189), currently returns `void`.
- `ts/simulator/humanTraining/humanBackpropSimulator.ts` — `#updateAccuracy()` (lines 367-397), `#wirePanel()` (lines 504-533), `#initKeyboardManager()` (lines 568-621), `update()` (lines 322-365), `draw()` (lines 399-470).
- `ts/simulator/humanTraining/humanTrainingPanel.ts` — `HumanTrainingPanelElement` class, `connectedCallback()` (lines 19-52), public API (lines 54-112).
- `ts/simulator/humanTraining/templates/humanTrainingPanelTemplate.ts` — panel HTML template (50 lines).
- `ts/panels/keyboardManager.ts` — `KeyboardManager`, `ShortcutBinding` interface (lines 1-23), `setBindings()` (line 63), toggle bindings create `LatchedToggle` internally (lines 117-128), `#handleKeyDown` routes toggle keys (lines 149-151).
- `ts/panels/latchedToggle.ts` — `LatchedToggle` class, held/latched state machine.
- `ts/panels/shortcutsToolbar.ts` — `ShortcutDef` interface (lines 23-42), `kind: 'toggle'` for sticky mode keys.
- `ts/math/worldUnits.ts` — `pxPerFrameToKmh(pxPerFrame)` (line 13), `formatKmhFromPxPerFrame(pxPerFrame)` (line 25).
- `styles/style.css` — `human-training-panel` styles (lines 1826-1881), `.ht-key` styles (lines 1847-1876).

## Scope

- **In scope:**
  - Add `frozen: boolean` flag to `Controls` — when true, keydown/keyup listeners are no-op.
  - Wire `Car.setAutopilot(true)` → set `controls.frozen = true` (when controls is `Controls`).
  - Add L-key toggle for learning via `KeyboardManager` toggle binding; wire to `Car.setLearningFromHuman` + panel UI sync.
  - Change `NeuralNetwork.trainStep` return type from `void` to `boolean` (true if any weight/bias was updated).
  - Add `#brainChangedThisFrame: boolean` to `Car`, exposed via getter, set from `trainStep` return value.
  - Replace cumulative accuracy with rolling-window (last 120 frames) + per-channel accuracy tracking.
  - Redesign `<human-training-panel>` template: add "How it works" collapsible section, car speed display, learning state indicator (LEARNING/PAUSED + L key hint), per-channel accuracy %, weight-change pulse indicator, training frame counter.
  - Add panel API methods for the new info: `setSpeed(kmh)`, `setLearningState(active)`, `setWeightChangePulse(active)`, `setTrainingFrames(count)`, `setPerChannelAccuracy(pcts)`.
  - CSS for the redesigned panel sections.
  - Add autopilot visual feedback — when autopilot is on, the panel shows "AUTOPILOT ACTIVE" banner and the learning state shows PAUSED.
- **Out of scope:**
  - No changes to the existing training simulator, traffic simulator, race, or world editor.
  - No changes to `NeuralNetwork.trainStep` algorithm (STE backprop) — only the return type changes.
  - No changes to brain serialization, save format, or `CarInfo` schema.
  - No changes to the config modal.

## Implementation

### 1. `ts/car/controls/controls.ts` — add `frozen` flag

Add a public `frozen: boolean = false` field to the `Controls` class.

In `#addKeyboardListeners()`, add `if (this.frozen) return;` at the top of both the `keydown` and `keyup` handler functions (inside the arrow functions, before the `switch`).

This makes the keyboard listeners no-op when `frozen` is true, so when autopilot is engaged the brain's controls are not overwritten by human key events between frames.

### 2. `ts/car/car.ts` — wire `frozen` to autopilot, add brain-change flag, add learning-state getter

**Autopilot wiring:** In `setAutopilot(enabled: boolean)`, after setting `this.#autopilot = enabled`, add:

```ts
if (this.controls instanceof Controls) {
  this.controls.frozen = enabled;
}
```

`Controls` is already imported at line 2 of `ts/car/car.ts` (`import { Controls } from './controls/controls.js'`). No new import needed.

**Brain-change flag:** Add a private field `#brainChangedThisFrame: boolean = false` (after `#lastBrainOutput`).

In `#processBrain()`, change the `trainStep` call to capture the return value:

```ts
this.#brainChangedThisFrame = NeuralNetwork.trainStep(
  this.brain as NeuralNetwork,
  [
    this.controls.forward ? 1 : 0,
    this.controls.left ? 1 : 0,
    this.controls.right ? 1 : 0,
    this.controls.reverse ? 1 : 0,
  ],
  this.#learningRate,
);
```

When the learning guard is not met (learning off, autopilot on, no keys pressed, damaged), set `this.#brainChangedThisFrame = false` at the start of `#processBrain` (or ensure it's only set to true inside the guard block).

Add a public getter:

```ts
get brainChangedThisFrame(): boolean {
  return this.#brainChangedThisFrame;
}
```

**No other changes to Car.** The `setLearningFromHuman` / `learningFromHuman` API already exists and works. The L-key toggle will call `setLearningFromHuman` from the simulator.

### 3. `ts/neural-network/network.ts` — `trainStep` returns boolean

Change the return type of `static trainStep` from `void` to `boolean`.

Add a `let changed = false;` at the top of the method.

In the inner loop (line 180-187), when `error !== 0` (the `if (error === 0) continue;` block is entered), set `changed = true;` before the weight/bias updates.

At the end of the method, `return changed;`.

This is the only call site (verified by grep — only `ts/car/car.ts` line 332 calls `trainStep`), so no other code needs updating.

### 4. `ts/simulator/humanTraining/humanBackpropSimulator.ts` — rolling accuracy, L-key toggle, panel info wiring

**Replace cumulative accuracy with rolling window:**

Remove the `#matchFrames` and `#matchTotal` fields. Add:

```ts
#accuracyWindow: boolean[][] = [];  // rolling window of per-channel match arrays
#ACCURACY_WINDOW_SIZE = 120;
```

In `#updateAccuracy()`, replace the cumulative logic:

```ts
#updateAccuracy(): void {
  if (!this.#car) return;
  if (this.#panel.autopilotEnabled || this.#car.damaged) {
    this.#currentMatch = [null, null, null, null];
    this.#panel.setAccuracy(this.#currentMatch, null);
    this.#panel.setPerChannelAccuracy([null, null, null, null]);
    this.#accuracyWindow = [];
    return;
  }

  const human = this.#car.controls as Controls;
  const brain = this.#car.lastBrainOutput;
  const match: (boolean | null)[] = [
    brain.forward === human.forward,
    brain.left === human.left,
    brain.right === human.right,
    brain.reverse === human.reverse,
  ];
  this.#currentMatch = match;

  // Push to rolling window
  this.#accuracyWindow.push(match);
  if (this.#accuracyWindow.length > this.#ACCURACY_WINDOW_SIZE) {
    this.#accuracyWindow.shift();
  }

  // Overall accuracy from rolling window
  let total = 0, matched = 0;
  const perChannelMatched = [0, 0, 0, 0];
  const perChannelTotal = [0, 0, 0, 0];
  for (const frame of this.#accuracyWindow) {
    for (let i = 0; i < 4; i++) {
      total++;
      perChannelTotal[i]++;
      if (frame[i]) {
        matched++;
        perChannelMatched[i]++;
      }
    }
  }
  const pct = total > 0 ? Math.round((100 * matched) / total) : null;
  this.#panel.setAccuracy(match, pct);

  // Per-channel accuracy
  const perChannel: (number | null)[] = perChannelTotal.map((t, i) =>
    t > 0 ? Math.round((100 * perChannelMatched[i]) / t) : null,
  );
  this.#panel.setPerChannelAccuracy(perChannel);
}
```

**Add L-key toggle for learning:**

In `#initKeyboardManager()`, add a toggle binding for the L key to the `setBindings` array:

```ts
{
  id: 'keyLearn',
  key: 'l',
  label: 'L',
  title: 'L — Toggle learning on/off (when off, driving does not train the brain)',
  group: 'Training',
  kind: 'toggle',
  toggle: {
    onActivate: () => this.#setLearning(true),
    onDeactivate: () => this.#setLearning(false),
  },
},
```

Add the `#setLearning` method:

```ts
#setLearning(enabled: boolean): void {
  this.#car?.setLearningFromHuman(enabled);
  this.#panel.setLearningState(enabled);
}
```

**Learning ON by default:** In `#applyConfigAndCreateCar()`, after `this.#car.setLearningFromHuman(true)`, also call `this.#panel.setLearningState(true)`. The L-key toggle starts in the "active" state (learning on). To sync the toolbar indicator, after creating the car, call `this.#keyboardManager?.setActive('keyLearn', true)` — but since `LatchedToggle` starts inactive by default, we need to initialize it. The simplest approach: after `setBindings`, manually activate the toggle by calling the binding's `onActivate` callback. Actually, since `setBindings` creates the `LatchedToggle` internally, we can't easily set its initial state. Instead, just call `this.#panel.setLearningState(true)` in `#applyConfigAndCreateCar` and rely on the user pressing L to toggle. The toolbar indicator will start dim (not active) but learning is on — to fix this, we can make the `LatchedToggle` start active by calling `toggleLatch()` once after setup.

**Simpler approach:** Instead of relying on `LatchedToggle`'s initial state, just set the toolbar indicator active manually. After `this.#keyboardManager.setBindings([...])` in `#initKeyboardManager()`, the toolbar renders. Then in `#applyConfigAndCreateCar`, after creating the car, call `this.#panel.setLearningState(true)` to update the panel UI. For the toolbar indicator, we can use `document.querySelector<ShortcutsToolbarElement>('shortcuts-toolbar')?.setActive('keyLearn', true)` to light it up initially. When the user presses L, the `LatchedToggle` will toggle from its default (inactive) to active, calling `onActivate` → `#setLearning(true)` — but learning is already on, so this is a no-op (still on). Then pressing L again toggles to inactive → `onDeactivate` → `#setLearning(false)`. This means the first L press is a no-op (learning stays on, but indicator goes from "manually active" to "toggle active"). This is slightly confusing.

**Best approach:** Don't fight the `LatchedToggle` initial state. Instead, start with learning ON (call `setLearningFromHuman(true)` in `#applyConfigAndCreateCar`), set the panel UI to show "LEARNING", and set the toolbar indicator active via `setActive('keyLearn', true)`. The `LatchedToggle` starts inactive. When the user presses L for the first time, `LatchedToggle` goes active → `onActivate` → `#setLearning(true)` (no-op, already on) → `setActive('keyLearn', true)` (already active). Press L again → `LatchedToggle` goes inactive → `onDeactivate` → `#setLearning(false)` → `setActive('keyLearn', false)`. This works correctly from the second press onward. The first press is a no-op but the indicator doesn't change (stays active), so the user sees no visual change on first press — slightly confusing but acceptable.

**Alternative (cleaner):** Make the LatchedToggle start in the active state. Add an optional `initialState` parameter to the toggle binding or call `toggleLatch()` once right after `setBindings`. Since `LatchedToggle` is internal to `KeyboardManager`, the cleanest way is: after `setBindings`, find the toggle and activate it. But `#toggleState` is private.

**Chosen approach:** Add a method `KeyboardManager.setToggleActive(id: string, active: boolean): void` that sets the `LatchedToggle` state directly (calls `toggleLatch()` if the current state doesn't match the desired state). This lets the simulator initialize the learning toggle to active after `setBindings`. In `#applyConfigAndCreateCar`, call `this.#keyboardManager?.setToggleActive('keyLearn', true)`.

Add to `KeyboardManager`:

```ts
setToggleActive(id: string, active: boolean): void {
  const toggle = this.#toggleState.get(id);
  if (!toggle) return;
  // LatchedToggle has a way to check if it's currently active —
  // if not matching, toggle it.
  // Check the LatchedToggle API for a getter or method.
}
```

Read `ts/panels/latchedToggle.ts` to find the right method. If `LatchedToggle` has an `isActive()` getter or similar, use it. If not, add one. Then `setToggleActive` calls `toggleLatch()` when the state doesn't match.

**Wire panel info in `update()`:**

After `this.#updateAccuracy()`, add calls to update the panel with live info:

```ts
// Update panel info
this.#panel.setSpeed(pxPerFrameToKmh(Math.abs(this.#car.speed)));
this.#panel.setWeightChangePulse(this.#car.brainChangedThisFrame);
this.#panel.setTrainingFrames(this.#trainingFrames);
```

Add a `#trainingFrames: number = 0` field, increment it each frame in `update()` when learning is active and the car is not damaged and not in autopilot. Reset it on brain reset and car reset.

Import `pxPerFrameToKmh` from `../../math/worldUnits.js`.

**Wire autopilot visual feedback:**

In `#wirePanel()`, the existing `panel.onAutopilotChange` callback should also update the panel's learning state display:

```ts
panel.onAutopilotChange = (enabled) => {
  this.#car?.setAutopilot(enabled);
  this.#panel.setAutopilotActive(enabled);
  this.#accuracyWindow = [];
};
```

**Reset accuracy window on crash/reset:**

Replace all `this.#matchFrames = 0; this.#matchTotal = 0;` with `this.#accuracyWindow = [];`.

### 5. `ts/simulator/humanTraining/humanTrainingPanel.ts` — new panel API methods

Add these public methods:

```ts
setSpeed(kmh: number): void
```

Updates a `#htSpeed` element with `Speed: XX.X km/h`.

```ts
setLearningState(active: boolean): void
```

Updates a `#htLearningState` element: `LEARNING` (green) when active, `PAUSED` (orange) when inactive. Also updates the L-key hint visibility.

```ts
setAutopilotActive(active: boolean): void
```

Shows/hides a `#htAutopilotBanner` element ("AUTOPILOT ACTIVE — brain is driving"). When active, also calls `setLearningState(false)` to show PAUSED. When deactivated, restores the actual learning state (store the last learning state in a field).

```ts
setWeightChangePulse(active: boolean): void
```

Adds/removes a `.pulse` class on a `#htWeightIndicator` element. The CSS `.pulse` class triggers a brief animation.

```ts
setTrainingFrames(count: number): void
```

Updates a `#htTrainingFrames` element with `Training frames: N` (formatted as e.g. `12,345`).

```ts
setPerChannelAccuracy(pcts: (number | null)[]): void
```

Updates per-channel accuracy text elements (`#htKeyForwardPct`, `#htKeyLeftPct`, `#htKeyRightPct`, `#htKeyReversePct`) with `NN%` or `—`.

Keep the existing `setAccuracy(match, pct)` method — it still updates the overall % and the match/mismatch/idle classes on `.ht-key` elements.

Add private fields for the new DOM refs, populated in `connectedCallback`.

Add a `#learningActive: boolean = true` field to track the learning state for autopilot restore.

### 6. `ts/simulator/humanTraining/templates/humanTrainingPanelTemplate.ts` — redesigned template

Replace the entire template with a redesigned version. Structure:

```html
<div id="trainingManagerPanel">
  <!-- Header -->
  <div class="panel-section">
    <div class="section-title">Human Backpropagation</div>
    <div id="htMode">World</div>
  </div>

  <!-- How it works (collapsible) -->
  <div class="panel-section">
    <details class="ht-howto">
      <summary>How it works</summary>
      <div class="ht-howto-content">
        <p>
          <strong>1. Drive</strong> — use arrow keys or WASD. The car's neural
          network watches your keypresses and the sensor readings.
        </p>
        <p>
          <strong>2. Learn</strong> — each frame you press a key, the brain
          adjusts its weights to imitate you (backpropagation). Green rings =
          brain matches your key, red = mismatch.
        </p>
        <p>
          <strong>3. Toggle learning</strong> — press <kbd>L</kbd> to
          pause/resume learning. Drive freely without training the brain.
        </p>
        <p>
          <strong>4. Autopilot</strong> — check the box to let the brain drive.
          Learning pauses. See if it can handle the road on its own.
        </p>
        <p>
          <strong>5. Save</strong> — the brain auto-saves to localStorage every
          second and on crash/close. Reload to resume training.
        </p>
      </div>
    </details>
  </div>

  <!-- Autopilot banner (hidden by default) -->
  <div id="htAutopilotBanner" class="ht-banner" style="display:none;">
    AUTOPILOT ACTIVE — brain is driving
  </div>

  <!-- Learning state -->
  <div class="panel-section">
    <div id="htLearningState" class="ht-learning-state learning">LEARNING</div>
    <div class="ht-hint">Press L to toggle</div>
  </div>

  <!-- Autopilot toggle -->
  <div class="panel-section">
    <label class="ht-checkbox-label">
      <input type="checkbox" id="htAutopilot" />
      <span>Autopilot — let brain drive</span>
    </label>
  </div>

  <!-- Car info -->
  <div class="panel-section">
    <div class="ht-info-row">
      <span class="ht-info-label">Speed</span>
      <span id="htSpeed" class="ht-info-value">0.0 km/h</span>
    </div>
  </div>

  <!-- Accuracy -->
  <div class="panel-section">
    <div id="htAccuracy">
      <div id="htAccuracyPct">Network accuracy: —</div>
      <div class="ht-key-grid">
        <div class="ht-key-cell">
          <span class="ht-key" data-key="forward">↑</span>
          <span id="htKeyForwardPct" class="ht-key-pct">—</span>
        </div>
        <div class="ht-key-cell">
          <span class="ht-key" data-key="left">←</span>
          <span id="htKeyLeftPct" class="ht-key-pct">—</span>
        </div>
        <div class="ht-key-cell">
          <span class="ht-key" data-key="right">→</span>
          <span id="htKeyRightPct" class="ht-key-pct">—</span>
        </div>
        <div class="ht-key-cell">
          <span class="ht-key" data-key="reverse">↓</span>
          <span id="htKeyReversePct" class="ht-key-pct">—</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Weight change indicator -->
  <div class="panel-section">
    <div class="ht-info-row">
      <span class="ht-info-label">Brain activity</span>
      <span id="htWeightIndicator" class="ht-weight-dot"></span>
    </div>
    <div class="ht-info-row">
      <span class="ht-info-label">Training frames</span>
      <span id="htTrainingFrames" class="ht-info-value">0</span>
    </div>
  </div>

  <!-- Learning rate -->
  <div class="panel-section">
    <label class="ht-slider-label">
      <span>Learning rate</span>
      <div class="ht-slider-row">
        <input
          type="range"
          id="htLearningRate"
          min="0.01"
          max="0.5"
          step="0.01"
          value="0.1"
        />
        <span id="htLearningRateVal">0.10</span>
      </div>
    </label>
  </div>

  <!-- Buttons -->
  <div class="panel-section">
    <div class="btn-group-large">
      <button id="htConfig" class="btn-lg">⚙️ Config</button>
      <button id="htDownload" class="btn-lg">Download .car</button>
      <button id="htResetBrain" class="btn-lg btn-danger">Reset brain</button>
      <button id="htResetCar" class="btn-lg">Reset car</button>
    </div>
  </div>

  <!-- Status -->
  <div class="panel-section">
    <div id="htStatus" class="ht-status">Brain: fresh</div>
  </div>
</div>
```

### 7. `ts/panels/keyboardManager.ts` — add `setToggleActive` method

Add a public method:

```ts
setToggleActive(id: string, active: boolean): void {
  const toggle = this.#toggleState.get(id);
  if (!toggle) return;
  if (toggle.active !== active) {
    toggle.toggleLatch();
  }
}
```

`LatchedToggle` already has an `active` getter (line 14 of `ts/panels/latchedToggle.ts`) that returns `this.#held || this.#latched`. No changes to `LatchedToggle` are needed.

### 8. `ts/panels/latchedToggle.ts` — no changes needed

The existing `active` getter is sufficient. Skip this file.

### 9. `styles/style.css` — new panel styles

Add styles for the redesigned panel sections. The panel width stays at 200px (existing). New styles needed:

- `.ht-howto` — collapsible details element, subtle styling.
- `.ht-howto summary` — cursor pointer, small font, color accent.
- `.ht-howto-content p` — small font (11px), line-height 1.4, color #aaa, margin-bottom 4px.
- `.ht-howto-content kbd` — inline code styling (background, border, monospace, small).
- `.ht-banner` — autopilot active banner: background rgba(80, 180, 255, 0.15), border 1px solid rgba(80, 180, 255, 0.5), color #5cb8ff, padding 6px 8px, border-radius 4px, font-size 11px, font-weight 700, text-align center, margin 4px 0.
- `.ht-learning-state` — font-size 13px, font-weight 700, padding 4px 8px, border-radius 4px, text-align center.
- `.ht-learning-state.learning` — color #5cb85c, background rgba(92, 184, 92, 0.12), border 1px solid rgba(92, 184, 92, 0.3).
- `.ht-learning-state.paused` — color #f0ad4e, background rgba(240, 173, 78, 0.12), border 1px solid rgba(240, 173, 78, 0.3).
- `.ht-hint` — font-size 10px, color rgba(255,255,255,0.4), text-align center, margin-top 2px.
- `.ht-checkbox-label` — reuse existing inline styles from the current template (flex, gap, cursor pointer, font-size 12px, color #ccc).
- `.ht-info-row` — flex, justify-content space-between, font-size 11px, padding 2px 0.
- `.ht-info-label` — color rgba(255,255,255,0.5).
- `.ht-info-value` — color #ddd, font-weight 600, font-family monospace.
- `.ht-key-grid` — display grid, grid-template-columns repeat(4, 1fr), gap 4px, margin-top 4px.
- `.ht-key-cell` — flex column, align-items center, gap 2px.
- `.ht-key-pct` — font-size 10px, font-family monospace, color rgba(255,255,255,0.5).
- `.ht-weight-dot` — inline-block, width 10px, height 10px, border-radius 50%, background rgba(255,255,255,0.15), transition all 0.1s.
- `.ht-weight-dot.pulse` — background #5cb85c, box-shadow 0 0 6px rgba(92, 184, 92, 0.6).
- `.ht-slider-label` — reuse existing slider label styles (flex column, gap 3px, font-size 11px, color #aaa).
- `.ht-slider-row` — flex, align-items center, gap 6px.
- `.ht-status` — reuse existing status styles (font-size 11px, color rgba(255,255,255,0.6)).
- Keep existing `.ht-key`, `.ht-key.match`, `.ht-key.mismatch`, `.ht-key.idle` styles.
- Keep existing `#htAccuracyPct` styles.

## Brain / persistence considerations

None. No changes to brain serialization, `CarInfo` schema, or localStorage keys. The `trainStep` return type change is backward-compatible (existing code ignores the return value; the only call site is updated to use it).

## Acceptance criteria

- `npm run fix:all` passes (format + lint) and `tsc --noEmit` compiles clean.
- Opening `html/human-training.html` shows the redesigned panel with: "How it works" collapsible section, learning state indicator (LEARNING in green), autopilot checkbox, car speed display, accuracy % with per-channel percentages, brain activity dot, training frame counter, learning rate slider, buttons, and status.
- The "How it works" section is collapsed by default and expands when clicked, explaining the 5-step training flow.
- **Learning toggle (L key):** Pressing L toggles learning on/off. The panel indicator changes from LEARNING (green) to PAUSED (orange) and back. The shortcuts toolbar L indicator reflects the toggle state (lit when learning, dim when paused). When learning is PAUSED, driving the car does NOT update the brain weights (the brain activity dot stays dim). When learning is ON, the brain activity dot pulses green on frames where weights actually changed.
- **Learning ON by default:** When the page loads and the car is created, learning is ON and the indicator shows LEARNING. The L toolbar indicator is lit.
- **Autopilot fix:** Toggling the autopilot checkbox engages autopilot — the brain drives the car, human keypresses are ignored (the `Controls.frozen` flag prevents keyboard listeners from overwriting brain controls). The panel shows "AUTOPILOT ACTIVE" banner and the learning state shows PAUSED. The car visibly drives differently from human input (the brain's output controls the car, not the keyboard). Toggling autopilot off resumes human driving and restores the previous learning state.
- **Rolling-window accuracy:** The accuracy % reflects the last ~120 frames (2 seconds at 60fps), not all-time cumulative. When the user presses only forward for a long time and then presses left/right, the accuracy % drops quickly to reflect the current mismatches. Per-channel accuracy % is shown under each key indicator (↑/←/→/↓), so the user can see that left/right accuracy is lower than forward accuracy.
- **Per-channel accuracy:** Each key indicator (↑ ← → ↓) has its own accuracy percentage below it, showing what % of the last 120 frames the brain matched the human on that specific channel.
- **Car speed:** The panel shows the car's current speed in km/h, updating every frame.
- **Brain activity indicator:** A small dot that pulses green when the brain's weights were updated this frame (learning is on, keys pressed, and at least one weight changed). Stays dim when learning is off, autopilot is on, or no keys are pressed.
- **Training frame counter:** Shows the total number of frames where learning was active. Resets on "Reset brain" and "Reset car".
- Crashing the car: it auto-respawns with the same trained brain; the accuracy window clears and the training frame counter continues.
- Reloading the page: the trained brain is restored; learning is ON by default; the training frame counter resets to 0 (it's a session counter, not persisted).
- The existing `simulator.html`, `traffic.html`, `race.html`, and `world.html` pages are unchanged and still work. The `Controls.frozen` flag defaults to `false` so existing KEYS cars are unaffected.

## Docs to update

- `docs/Physics.md` — update the Human Backpropagation subsection to document: (1) the L-key learning toggle, (2) the `Controls.frozen` flag for autopilot, (3) the rolling-window accuracy metric, (4) the `trainStep` return value (boolean indicating weight changes), (5) the panel info displays (speed, brain activity, per-channel accuracy, training frames).
- `AGENTS.md` — update the "Human Backpropagation mode" bullet to mention: the L-key learning toggle (default ON), the `Controls.frozen` flag for autopilot, and the rolling-window accuracy. No new persistence keys.
