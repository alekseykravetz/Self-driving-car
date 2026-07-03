# Task 01 — Neural-network visualizer: interactivity, meaningful animation & readable colors

**Effort:** large · **Priority:** medium · **Status:** done · **Branch:** `task-1-network-visualizer`

## Problem

The neural-network visualizer ([ts/neural-network/visualizer.ts](../../ts/neural-network/visualizer.ts))
draws the best car's brain each frame, but it is a **static, stateless picture**. It has three
concrete weaknesses:

1. **No information on demand.** You can see _that_ a weight/bias is positive or negative from its
   color, but never the actual numeric value. There is no hover, no tooltip, no labels — so the
   exact weights and biases the network learned are invisible.
2. **Meaningless animation.** The only motion is a global dashed-line scroll driven by
   `networkCtx.lineDashOffset = -time / 50` in
   [ts/simulator/core/simulatorShell.ts](../../ts/simulator/core/simulatorShell.ts). It animates
   _every_ dashed stroke (bias rings + level dividers) at a constant speed regardless of what the
   network is doing. It looks busy but conveys nothing.
3. **Poor contrast on the black background.** Colors come from the shared `getRGBA()` in
   [ts/utils.ts](../../ts/utils.ts): positive values are yellow, **negative values are pure blue
   `rgba(0,0,255,a)`**, which is very hard to see on the dark canvas. Worse, `alpha = |value|`
   means small weights fade almost fully to black and disappear.

## Goal

Make the visualizer **more informative and more beautiful** without changing the network logic:

1. **Hover to inspect.** Hovering a neuron or a connection reveals its exact numeric value(s).
   - Hover a **neuron** → show its **bias** (output/hidden neurons) and/or current **activation**,
     and show **all incoming connection weights** as small labels near their lines.
   - Hover a **connection line** → show its **weight** and its live **contribution**
     (`input × weight`) in a tooltip near the cursor.
2. **Repurpose the animation.** Remove the aimless global dash scroll. Instead, animate **real
   signal flow**: pulses travel along connections that are actively carrying signal for the current
   inputs, with speed/brightness proportional to the signal magnitude. Inactive connections stay
   calm.
3. **Readable, attractive colors.** Replace the blue-on-black scheme with a high-luminance diverging
   palette and give weak values a visible floor so nothing disappears.

## Current state (what exists today)

- `Visualizer.drawNetwork(ctx, network)` computes layout inline and draws; `drawLevel(...)` draws
  connections, input nodes, output nodes, bias rings, and output labels `['↥','↤','↦','↧']`.
- `getNodeX()` spaces nodes horizontally with `lerp`.
- Node/connection colors: shared `getRGBA(value)` (yellow positive / blue negative, alpha `|value|`).
- Animation: `lineDashOffset = -time / 50` set once per frame in `drawNetworkVisualizer()`.
- Render target: `networkCanvas` (`#networkCanvas` in
  [html/simulator.html](../../html/simulator.html) and
  [html/traffic.html](../../html/traffic.html)); context is `this.networkCtx` on `SimulatorShell`.
- The visualizer keeps **no state** between frames → no geometry to hit-test against.

## What's missing (gap analysis)

| Capability                        | Today | Needed                                            |
| --------------------------------- | ----- | ------------------------------------------------- |
| Cached node/connection geometry   | ❌    | Layout object retained per frame for hit-testing  |
| Mouse tracking on `networkCanvas` | ❌    | `mousemove` / `mouseleave` listeners in the shell |
| Hit-testing (neuron & connection) | ❌    | `hitTest(x, y)` returning the hovered element     |
| Numeric value display             | ❌    | Inline labels + cursor tooltip                    |
| Meaningful, data-driven animation | ❌    | Signal-flow pulses on active connections          |
| Contrast-safe palette             | ❌    | Diverging palette + minimum-visibility floor      |

## Proposed design

### A. Colors — dedicated, high-contrast palette (do NOT change shared `getRGBA`)

`getRGBA()` is also used by the car/sensor rendering, so add **visualizer-local** color helpers
instead of editing the shared util:

- `weightColor(value)` and `activationColor(value)`:
  - **Positive** → warm amber/orange→yellow (`#FFB000` … `#FFE44D`).
  - **Negative** → **cyan/teal** (`#00E5FF`) instead of dark blue — bright and legible on black.
  - Encode magnitude with **lightness + line width**, not pure alpha. Clamp alpha to a floor
    (e.g. `0.25 + 0.75 * |value|`) so weak weights remain faintly visible instead of vanishing.
- Optionally render node fills as a **radial gradient** (bright core → transparent rim) so active
  neurons glow softly rather than showing a flat inner disc.
- Add a small **legend** (corner of the canvas): a color bar from cyan (−1) → dark (0) → amber (+1)
  labeled "weight / activation".

### B. Animation — signal-flow pulses (replace the global dash scroll)

- **Remove** `this.networkCtx.lineDashOffset = -time / 50;` from `drawNetworkVisualizer()`.
- Pass `time` (and later, hover state) into `Visualizer.drawNetwork(ctx, network, options)`.
- For each connection compute `signal = input[i] * weight[i][j]`. When `|signal|` exceeds a small
  threshold, draw the line with a **moving dashed pattern / traveling dot** whose offset advances by
  `time * speed`, `speed ∝ |signal|`, direction input→output. Below threshold, draw a **solid, dim**
  line (no motion). Result: you literally watch the signals that matter flow through the network for
  the current sensor readings.
- Keep bias rings **static** (no scroll); differentiate them by color/线 style only.

### C. Hover interactivity

The visualizer must retain geometry to support hit-testing. Two acceptable approaches — pick one and
note it in the PR:

- **Option 1 (preferred): make the layout a returned/cached value.** `drawNetwork` builds a
  `NetworkLayout` (array of `{ x, y, r, kind, levelIndex, nodeIndex }` for neurons and
  `{ x1, y1, x2, y2, levelIndex, i, j }` for connections) and stores it on a small stateful
  `NetworkVisualizer` instance (or returns it so the shell caches it). The shell hit-tests the last
  layout on `mousemove`.
- **Option 2:** keep `Visualizer` static but expose `computeLayout(ctx, network)` used both for
  drawing and hit-testing.

**On hover of a neuron:**

- Draw a highlight glow ring around it.
- Show its **bias** (if it has one) and current **activation** value as a label beside the node.
- Label **every incoming connection weight** as small numbers positioned along each line near the
  hovered neuron.
- Dim unrelated connections/nodes to reduce clutter and focus attention.

**On hover of a connection line:**

- Thicken/brighten that line.
- Show a **cursor tooltip**: `weight = <value>`, `contribution = input × weight = <value>`, and the
  `src → dst` indices.

**Tooltip style (beautiful + legible):** rounded semi-transparent dark rectangle
(`rgba(10,10,15,0.85)`), light text, subtle 1px border, positioned near the cursor and clamped so it
never spills off-canvas.

### D. Extras — INCLUDED in scope (previously nice-to-have)

- **Input labels** on the input layer (`ray1…rayN`, `speed`) mirroring the docs table, passed in as
  an `inputLabels` array. The best car's sensor `rayCount` drives the count; the last input is
  always `speed`.
- A small **density toggle** (keyboard shortcut, e.g. `v`, and/or a corner button) to always-show
  all weight/bias/activation values, not just on hover — useful for screenshots. Default off.

## Implementation steps

1. **Colors:** add `weightColor()` / `activationColor()` (+ optional gradient helper + legend) inside
   the visualizer module. Do not modify shared `getRGBA`.
2. **Layout extraction:** refactor `drawNetwork`/`drawLevel` to build a `NetworkLayout` describing
   every neuron and connection, and use it for drawing. Retain it for hit-testing (Option 1 or 2).
3. **Signal-flow animation:** compute per-connection `signal = input × weight`; animate only active
   connections via `time`-driven dash offset / traveling dot; remove the global `lineDashOffset`
   line in `simulatorShell.drawNetworkVisualizer()` and thread `time` through instead.
4. **Hit-testing:** add `hitTest(x, y): HoveredNeuron | HoveredConnection | null` against the cached
   layout (nearest-node radius test; point-to-segment distance for lines).
5. **Mouse wiring:** in `SimulatorShell` (or wherever `networkCanvas` is owned), add `mousemove`
   (convert client coords → canvas coords, account for canvas CSS scaling) and `mouseleave`
   listeners; store hover state; pass it into `drawNetwork`.
6. **Hover rendering:** implement neuron highlight + inline weight/bias labels + dim-others, and the
   connection tooltip.
7. **Docs:** update [docs/NeuralNetwork.md](../../docs/NeuralNetwork.md) "Network Visualizer" section
   to describe hover inspection, signal-flow animation, and the new palette.

## Files likely affected

- [ts/neural-network/visualizer.ts](../../ts/neural-network/visualizer.ts) — main changes (colors,
  layout, animation, hover, hit-testing).
- [ts/simulator/core/simulatorShell.ts](../../ts/simulator/core/simulatorShell.ts) — remove global
  dash scroll, thread `time`/hover, add mouse listeners, cache layout.
- [ts/utils.ts](../../ts/utils.ts) — **no change** to `getRGBA` (verify nothing else regresses).
- [docs/NeuralNetwork.md](../../docs/NeuralNetwork.md) — documentation update.
- Compiled JS mirrors under `js/neural-network/` and `js/simulator/` per the project's build flow.

## Acceptance criteria

- [ ] Hovering a neuron shows its bias/activation and labels all incoming weights near their lines;
      unrelated elements dim.
- [ ] Hovering a connection shows a tooltip with weight and `input × weight` contribution.
- [ ] The old constant dashed-line scroll is gone; motion now reflects real per-connection signal
      flow for the current inputs (active lines pulse, idle lines are calm).
- [ ] Negative values are clearly legible on the black background (no dark-blue-on-black); weak
      weights remain faintly visible (alpha floor) rather than disappearing.
- [ ] Shared `getRGBA` behavior is unchanged (car/sensor rendering unaffected).
- [ ] Works in both `simulator.html` and `traffic.html`; mouse coordinates are correct under canvas
      CSS scaling; no per-frame allocations that cause GC churn.
- [ ] `docs/NeuralNetwork.md` updated to match the new behavior.
- [ ] Input layer shows `ray1…rayN` + `speed` labels driven by the car's `rayCount`.
- [ ] Density toggle (`v` / corner button) shows all values at once; default off; legend always
      visible.
- [ ] Signal flow rendered as traveling particles (amber/cyan) with speed/brightness ∝ signal, using
      a reused particle pool (no per-frame allocation).

## Decisions (locked)

These replace the earlier open questions — implement exactly as chosen:

- **Palette:** amber ↔ cyan diverging. Positive → amber/yellow (`#FFB000` … `#FFE44D`), negative →
  cyan/teal (`#00E5FF`), zero → near-transparent dark. Reads best on the black canvas and matches the
  existing yellow-positive convention.
- **Signal-flow rendering:** discrete traveling **dots/particles** along active connections (not a
  moving dash pattern). Particles read as clear "signal flowing" and stay smooth; particle
  speed/size/brightness ∝ `|signal|`, direction input→output. Idle connections draw as a dim solid
  line. Reuse a small fixed particle pool per connection — **no per-frame allocations**.
- **Architecture:** Option 1 — a **stateful `NetworkVisualizer` instance** that caches the
  `NetworkLayout` each frame and owns hover/hit-testing state. The shell holds one instance and
  forwards mouse events to it. (Keep the old static draw methods only if trivially reusable; prefer
  moving logic onto the instance.)
- **Density toggle key:** `v` toggles always-show-values; also expose a small corner button so it's
  discoverable on touch.
- **Legend:** always shown in a corner (cyan −1 → dark 0 → amber +1), with the density-toggle button
  beside it.
