# Human Backpropagation — Round 2 Bugfixes

**Date:** 2026-07-16
**Slug:** human-backprop-bugfixes-r2
**Entry points affected:** `html/human-training.html` (panel only); shared `ts/` (Car, Controls, KeyboardManager, HumanBackpropSimulator, HumanTrainingPanel, panel template, CSS)
**Save-file impact:** none
**Backward compat:** preserved — all changes are additive or bugfixes to the human-training mode only

## Goal

Fix 6 remaining bugs in the Human Backpropagation training mode and add a brain weights/biases inspector:

1. **Autopilot off → car still drives forward** — when autopilot is turned off, the brain's last controls (e.g. `forward=true`) remain in the `Controls` object because the keyboard listeners were frozen during autopilot and no keyup fires to reset them. Fix: reset all controls to `false` when autopilot is disabled.
2. **L key not working reliably** — the `LatchedToggle` uses held/latched semantics (hold key = active, release = inactive). The L key needs press-to-toggle (latch-only) behavior. Fix: add a `latchOnly` option to `ShortcutBinding`; when true, keydown calls `toggleLatch()` instead of `setPhysicalHold(true)`, and keyup is a no-op.
3. **"How it works" not clickable** — the `<details>` element's default marker (triangle) inherits the panel's base text color, which is unset and defaults to black on a dark background — invisible. Fix: set `color: #ccc` on `#trainingManagerPanel` so all text and markers are visible.
4. **Brain weights/biases display** — add a compact, scrollable inspector below the status line showing each layer's weight matrix and bias vector as formatted numbers.
5. **Traffic cars overlap after crash in simple mode** — `#regenTraffic()` sets `lastGeneratedTrafficY = startInfo.y` (100), but the initial hardcoded traffic is at y=-100..-700. Dynamic generation then creates cars at -100, -300, etc. — same positions as the initial cars. Fix: set `lastGeneratedTrafficY` to `SIMPLE_MODE_CONFIG.initialTrafficY` (-700).
6. **Panel titles/text black and hard to see** — same root cause as bug #3: `#trainingManagerPanel` doesn't set a `color` property, so text inherits from the body (black). Fix: set `color: #ccc` on `#trainingManagerPanel`.

## Context (read first)

- `ts/car/car.ts` — `setAutopilot()` (lines 393-398), `#processBrain()` (lines 291-355), `#brainChangedThisFrame` (line 115).
- `ts/car/controls/controls.ts` — `Controls` class, `frozen` field (line 14), `#addKeyboardListeners()` (lines 45-86).
- `ts/panels/keyboardManager.ts` — `ShortcutBinding` interface (lines 8-23), `#handleKeyDown` (lines 136-154), `#handleKeyUp` (lines 156-167), `setToggleActive` (lines 89-95).
- `ts/panels/latchedToggle.ts` — `LatchedToggle` class, `#held`/`#latched` fields, `active` getter (line 14), `setPhysicalHold()` (line 22), `toggleLatch()` (line 28).
- `ts/simulator/humanTraining/humanBackpropSimulator.ts` — `#regenTraffic()` (lines 515-524), `#initKeyboardManager()` (lines 606-672), `#wirePanel()` (lines 542-571), `#applyConfigAndCreateCar()` (lines 195-242), `update()` (lines 322-383).
- `ts/simulator/humanTraining/humanTrainingPanel.ts` — `HumanTrainingPanelElement` class, `connectedCallback()` (lines 30-72), public API methods.
- `ts/simulator/humanTraining/templates/humanTrainingPanelTemplate.ts` — panel HTML template (113 lines).
- `ts/simulator/training/modes/simpleModeBehavior.ts` — `SIMPLE_MODE_CONFIG` (lines 15-23), `SimpleSimState` (lines 27-36), `updateSimpleTraffic()` (lines 38-72).
- `ts/simulator/training/modes/trafficFactory.ts` — `generateInitialTraffic()` (lines 32-48), hardcoded rows at y=-100,-300,-500,-700.
- `ts/neural-network/network.ts` — `NeuralNetwork` class, `levels: Level[]` (line 4), `Level` class (lines 213-272), `Level.inputs[]`, `Level.outputs[]`, `Level.biases[]`, `Level.weights[][]`.
- `styles/style.css` — `human-training-panel` styles (lines 1826-2028).

## Scope

- **In scope:**
  - Fix autopilot: reset controls to all-false when autopilot is turned off.
  - Fix L key: add `latchOnly?: boolean` to `ShortcutBinding`, modify `KeyboardManager.#handleKeyDown`/`#handleKeyUp` to use `toggleLatch()` for `latchOnly` toggles, set `latchOnly: true` on the L key binding.
  - Fix panel text color: add `color: #ccc` to `#trainingManagerPanel` CSS rule.
  - Add brain weights/biases inspector: new `<div id="htBrainInspector">` in the panel template, new `setBrainInfo(html: string)` method on `HumanTrainingPanelElement`, simulator builds the HTML each frame from `car.brain` levels.
  - Fix traffic overlap: change `#regenTraffic()` to set `lastGeneratedTrafficY` to `SIMPLE_MODE_CONFIG.initialTrafficY` instead of `startInfo.y`.
  - Improve "How it works" text to explain that green = brain has learned your pattern (not a bug).
- **Out of scope:**
  - No changes to the existing training simulator, traffic simulator, race, or world editor.
  - No changes to `NeuralNetwork.trainStep` algorithm.
  - No changes to brain serialization or save format.
  - No changes to the config modal.

## Implementation

### 1. `ts/car/car.ts` — reset controls when autopilot is turned off

In `setAutopilot(enabled: boolean)`, when `enabled` is `false`, reset all controls to `false`:

```ts
setAutopilot(enabled: boolean): void {
  this.#autopilot = enabled;
  if (this.controls instanceof Controls) {
    this.controls.frozen = enabled;
    if (!enabled) {
      this.controls.forward = false;
      this.controls.left = false;
      this.controls.right = false;
      this.controls.reverse = false;
    }
  }
}
```

This ensures that when autopilot is disengaged, the car stops immediately (no phantom forward movement from the brain's last output). The human must press a key to drive again.

### 2. `ts/panels/keyboardManager.ts` — add `latchOnly` option for press-to-toggle behavior

Add `latchOnly?: boolean` to the `ShortcutBinding` interface (after the `toggle` field):

```ts
export interface ShortcutBinding extends ShortcutDef {
  key: string;
  handler?: { onKeyDown: () => void };
  toggle?: {
    onActivate: () => void;
    onDeactivate: () => void;
  };
  /**
   * When true, the toggle uses press-to-toggle (latch) behavior:
   * each keydown calls toggleLatch(), keyup is a no-op.
   * When false (default), uses held/latched behavior:
   * keydown sets physical hold, keyup releases it.
   */
  latchOnly?: boolean;
}
```

In `#handleKeyDown`, for toggle bindings, check `latchOnly`:

```ts
} else if (b.kind === 'toggle') {
  if (b.latchOnly) {
    this.#toggleState.get(b.id)?.toggleLatch();
  } else {
    this.#toggleState.get(b.id)?.setPhysicalHold(true);
  }
}
```

In `#handleKeyUp`, for toggle bindings, check `latchOnly`:

```ts
} else if (b.kind === 'toggle' && b.key === key) {
  if (!b.latchOnly) {
    this.#toggleState.get(b.id)?.setPhysicalHold(false);
  }
  // latchOnly: no-op on keyup — the toggle persists
}
```

This preserves the existing held/latched behavior for all current toggle bindings (graph editor, corridor editor, training simulator, traffic simulator) while adding press-to-toggle for the L key.

### 3. `ts/simulator/humanTraining/humanBackpropSimulator.ts` — set `latchOnly: true` on L key binding

In `#initKeyboardManager()`, add `latchOnly: true` to the `keyLearn` binding:

```ts
{
  id: 'keyLearn',
  key: 'l',
  label: 'L',
  title: 'L — Toggle learning on/off (when off, driving does not train the brain)',
  group: 'Training',
  kind: 'toggle',
  latchOnly: true,
  toggle: {
    onActivate: () => this.#setLearning(true),
    onDeactivate: () => this.#setLearning(false),
  },
},
```

### 4. `ts/simulator/humanTraining/humanBackpropSimulator.ts` — fix traffic overlap in `#regenTraffic`

In `#regenTraffic()`, change `lastGeneratedTrafficY` from `startInfo.y` to `SIMPLE_MODE_CONFIG.initialTrafficY`:

```ts
#regenTraffic(): void {
  if (this.#mode !== 'simple' || !this.world) return;
  const simpleWorld = this.world as SimpleWorld;
  const startInfo = this.getStartInfo();
  this.#simpleState.traffic = generateInitialTraffic(
    (lane) => simpleWorld.getLaneCenter(lane),
    startInfo.angle,
  );
  this.#simpleState.lastGeneratedTrafficY = SIMPLE_MODE_CONFIG.initialTrafficY;
}
```

Import `SIMPLE_MODE_CONFIG` is already present (line 34 of the file). `SIMPLE_MODE_CONFIG.initialTrafficY` is `-700`, which matches the y-coordinate of the last hardcoded traffic row. This ensures dynamic generation starts below the initial cars, not on top of them.

### 5. `ts/simulator/humanTraining/humanBackpropSimulator.ts` — build brain inspector data each frame

Add a `#updateBrainInspector()` method that reads the car's brain and builds a compact HTML string showing each layer's weights and biases. Call it every N frames (e.g. every 10 frames) to avoid excessive DOM updates:

```ts
#brainInspectorCounter = 0;
#BRAIN_INSPECTOR_INTERVAL = 10;

#updateBrainInspector(): void {
  if (!this.#car?.brain) return;
  const nn = this.#car.brain as import('../../neural-network/network.js').NeuralNetwork;
  let html = '';
  for (let i = 0; i < nn.levels.length; i++) {
    const level = nn.levels[i];
    html += `<div class="ht-brain-layer">`;
    html += `<div class="ht-brain-layer-title">Layer ${i + 1}: ${level.inputs.length}→${level.outputs.length}</div>`;
    // Biases
    html += `<div class="ht-brain-row"><span class="ht-brain-label">biases:</span> `;
    html += level.biases.map(b => `<span class="ht-brain-val ${b > 0 ? 'pos' : 'neg'}">${b.toFixed(2)}</span>`).join(' ');
    html += `</div>`;
    // Weights — show as compact grid
    html += `<div class="ht-brain-row"><span class="ht-brain-label">weights:</span></div>`;
    html += `<div class="ht-brain-weights">`;
    for (let j = 0; j < level.weights.length; j++) {
      html += `<div class="ht-brain-weight-row">`;
      for (let k = 0; k < level.weights[j].length; k++) {
        const w = level.weights[j][k];
        html += `<span class="ht-brain-val ${w > 0 ? 'pos' : 'neg'}">${w.toFixed(2)}</span>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    html += `</div>`;
  }
  this.#panel.setBrainInfo(html);
}
```

In `update()`, after the existing panel info updates, add:

```ts
this.#brainInspectorCounter++;
if (this.#brainInspectorCounter >= this.#BRAIN_INSPECTOR_INTERVAL) {
  this.#updateBrainInspector();
  this.#brainInspectorCounter = 0;
}
```

### 6. `ts/simulator/humanTraining/humanTrainingPanel.ts` — add `setBrainInfo` method

Add a `#htBrainInspector: HTMLElement | null = null` field.

In `connectedCallback()`, add:

```ts
this.#htBrainInspector = this.querySelector('#htBrainInspector');
```

Add public method:

```ts
setBrainInfo(html: string): void {
  if (this.#htBrainInspector) {
    this.#htBrainInspector.innerHTML = html;
  }
}
```

### 7. `ts/simulator/humanTraining/templates/humanTrainingPanelTemplate.ts` — add brain inspector section + fix "How it works" text

Add a new section after the status section (before the closing `</div>` of `#trainingManagerPanel`):

```html
<!-- Brain inspector -->
<div class="panel-section">
  <div class="section-title">Brain Inspector</div>
  <div id="htBrainInspector" class="ht-brain-inspector"></div>
</div>
```

Also update the "How it works" content to add a note about the accuracy display:

In step 2, change:

```
<p><strong>2. Learn</strong> — each frame you press a key, the brain adjusts its weights to imitate you (backpropagation). Green rings = brain matches your key, red = mismatch.</p>
```

to:

```
<p><strong>2. Learn</strong> — each frame you press a key, the brain adjusts its weights to imitate you (backpropagation). Green = brain matches your key, red = mismatch. When learning is ON, the brain adapts within 1-2 frames, so expect mostly green once it has learned a pattern. Turn learning OFF to see the brain's actual predictions vs your input — red appears when you do something the brain hasn't learned.</p>
```

### 8. `styles/style.css` — fix panel text color + add brain inspector styles

**Fix text color:** In the `human-training-panel #trainingManagerPanel` rule (line 1830), add `color: #ccc;`:

```css
human-training-panel #trainingManagerPanel {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  background: rgba(15, 15, 20, 0.92);
  color: #ccc; /* ADD THIS — ensure all text is visible on dark background */
  border-radius: 0;
  min-width: 180px;
  max-width: 200px;
  width: 200px;
  flex-shrink: 0;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  order: 20;
}
```

This fixes both the "titles are black" issue and the "How it works not clickable" issue (the `<details>` marker inherits this color and becomes visible).

**Add brain inspector styles:**

```css
.ht-brain-inspector {
  font-family: monospace;
  font-size: 9px;
  line-height: 1.3;
  max-height: 200px;
  overflow-y: auto;
  color: rgba(255, 255, 255, 0.7);
}

.ht-brain-layer {
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.ht-brain-layer-title {
  font-size: 10px;
  font-weight: 700;
  color: #5cb8ff;
  margin-bottom: 2px;
}

.ht-brain-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 2px;
  flex-wrap: wrap;
}

.ht-brain-label {
  color: rgba(255, 255, 255, 0.4);
  font-size: 9px;
}

.ht-brain-weights {
  margin-left: 8px;
  margin-bottom: 2px;
}

.ht-brain-weight-row {
  display: flex;
  gap: 2px;
  margin-bottom: 1px;
}

.ht-brain-val {
  display: inline-block;
  min-width: 32px;
  text-align: right;
  padding: 0 2px;
  border-radius: 2px;
}

.ht-brain-val.pos {
  color: #5cb85c;
  background: rgba(92, 184, 92, 0.08);
}

.ht-brain-val.neg {
  color: #d9534f;
  background: rgba(217, 83, 79, 0.08);
}
```

## Brain / persistence considerations

None. No changes to brain serialization, `CarInfo` schema, or localStorage keys.

## Acceptance criteria

- `npm run fix:all` passes (format + lint) and `tsc --noEmit` compiles clean.
- **Autopilot fix:** Toggling autopilot ON → brain drives, keyboard frozen. Toggling autopilot OFF → car stops immediately (no phantom forward movement). The human must press a key to drive again. The car does not continue driving forward on its own after autopilot is disengaged.
- **L key fix:** Pressing L toggles learning on/off reliably. Each press flips the state (ON→OFF→ON→OFF). The state persists after releasing L (no auto-revert). The shortcuts toolbar L indicator reflects the state. The panel shows LEARNING/PAUSED accordingly. Clicking the toolbar L indicator also toggles (existing behavior preserved).
- **Panel text visibility:** All text in the panel is clearly visible on the dark background. Section titles, mode text, status text, and the "How it works" marker (triangle) are all light-colored (not black).
- **"How it works" clickable:** Clicking "How it works" expands/collapses the section. The marker (triangle) is visible. The expanded content is readable.
- **Brain inspector:** Below the status section, a "Brain Inspector" section shows the neural network's weights and biases for each layer. Values are color-coded (green for positive, red for negative). The display updates every ~10 frames. The inspector is scrollable if the content exceeds the max height. When the brain is reset, the inspector shows the fresh random weights.
- **Traffic overlap fix:** After crashing in simple mode, the car respawns and traffic regenerates without overlapping cars at the same positions. The initial hardcoded traffic pattern (y=-100,-300,-500,-700) does not overlap with dynamically generated traffic.
- **"How it works" accuracy explanation:** The expanded "How it works" content explains that green = brain has learned your pattern, and that turning learning OFF reveals the brain's actual predictions (red = mismatch).
- The existing `simulator.html`, `traffic.html`, `race.html`, and `world.html` pages are unchanged and still work. The `latchOnly` option defaults to `false` so existing toggle bindings are unaffected.

## Docs to update

- `docs/Physics.md` — update the "Learning toggle (L key)" subsection to note that L uses `latchOnly` press-to-toggle behavior (not held/latched). Update the "Autopilot toggle" subsection to note that controls are reset to false when autopilot is disengaged.
- `docs/NeuralNetwork.md` — update the "Learning toggle (L key)" section to mention `latchOnly` behavior.
- `AGENTS.md` — update the "Human Backpropagation mode" bullet to mention `latchOnly` on the L key binding and the controls reset on autopilot disengage. Add a key gotcha about the `latchOnly` option on `ShortcutBinding`.
