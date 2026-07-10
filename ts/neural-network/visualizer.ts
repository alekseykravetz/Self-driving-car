/**
 * Neural-network visualizer.
 *
 * `NetworkVisualizer` is a small *stateful* renderer for a {@link NeuralNetwork}.
 * Unlike a pure draw function it caches the geometry (`NetworkLayout`) it builds
 * each frame so the owning canvas can hit-test the mouse against neurons and
 * connections and reveal their exact numeric values on hover.
 *
 * Features:
 *  - Diverging amber(+) ↔ cyan(−) palette that stays legible on the black canvas
 *    (no dark-blue-on-black), with an alpha floor so weak weights never vanish.
 *  - Data-driven animation: particles travel along connections that are actually
 *    carrying signal for the current inputs (speed/size/brightness ∝ |signal|).
 *    Idle connections are calm dim lines. Particle phase is derived from `time`
 *    so there are no per-frame particle allocations.
 *  - Hover inspection: hover a neuron to see its bias/activation and every
 *    connection weight (incoming and outgoing) labelled by its line; hover a
 *    connection for a tooltip with its weight and live `input × weight`
 *    contribution.
 *  - Density toggle (`v` key / on-canvas button) to show every value at once, and
 *    an always-on colour legend.
 */

import { NeuralNetwork } from './network.js';
import { lerp } from '../math/utils.js';

/** Direction of an output-neuron arrow glyph. */
export type ArrowDir = 'up' | 'down' | 'left' | 'right';

/** A single drawn neuron with the geometry needed for hit-testing. */
export interface NeuronNode {
  x: number;
  y: number;
  r: number;
  /** Activation value carried by this neuron (input value or output value). */
  value: number;
  /** Threshold bias — `null` for the input row (inputs have no bias). */
  bias: number | null;
  rowIndex: number;
  nodeIndex: number;
  /** Axis label text (e.g. `ray1`, `speed`, `forward`) or `null`. */
  label: string | null;
  /** Direction arrow drawn inside output neurons, or `null`. */
  arrow: ArrowDir | null;
}

/** A single drawn connection (weight) with the geometry needed for hit-testing. */
export interface ConnectionEdge {
  /** Source (input-side, lower) endpoint. */
  x1: number;
  y1: number;
  /** Target (output-side, upper) endpoint. */
  x2: number;
  y2: number;
  weight: number;
  /** Activation of the source neuron. */
  input: number;
  /** Live contribution `input × weight`. */
  signal: number;
  fromRow: number;
  i: number;
  j: number;
}

/** Cached per-frame geometry used for both drawing and hit-testing. */
export interface NetworkLayout {
  neurons: NeuronNode[];
  edges: ConnectionEdge[];
  rows: number;
}

/** What the mouse is currently over (indices into the cached layout). */
export type Hover =
  | { kind: 'neuron'; index: number }
  | { kind: 'connection'; index: number }
  | null;

export class NetworkVisualizer {
  /** Geometry from the most recent draw, retained for hit-testing. */
  #layout: NetworkLayout | null = null;
  /** Current hover target (neuron/connection) or `null`. */
  #hover: Hover = null;
  /** Last known mouse position in canvas pixels (for tooltip placement). */
  #mouseX = 0;
  #mouseY = 0;
  /** When true every value is drawn, not just the hovered one. */
  #showAllValues = false;
  /** When true, input neurons are labelled as distance/state pairs. */
  #stateAware = false;

  set stateAware(v: boolean) {
    this.#stateAware = v;
  }

  /** Bounds of the on-canvas density-toggle button (set each draw). */
  #toggleRect: { x: number; y: number; w: number; h: number } | null = null;

  private static readonly NODE_RADIUS = 18;
  private static readonly MARGIN = 30;
  /** |signal| below this counts as "idle" (no particles). */
  private static readonly SIGNAL_THRESHOLD = 0.04;
  /** Pixel tolerance when hit-testing a connection line. */
  private static readonly EDGE_HIT_TOLERANCE = 5;
  /** Height of the reserved bottom strip that holds the colour legend. */
  private static readonly LEGEND_BAND = 30;

  // ---------------------------------------------------------------------------
  // Public API used by the owning canvas / simulator shell
  // ---------------------------------------------------------------------------

  /** Toggle the "show every value" density mode. */
  toggleDensity(): void {
    this.#showAllValues = !this.#showAllValues;
  }

  get showAllValues(): boolean {
    return this.#showAllValues;
  }

  /**
   * Update the hover target from a mouse position (canvas pixels). If the
   * position is over the density-toggle button, hover is cleared but the button
   * still reacts to clicks via {@link handleClick}.
   * @returns `true` when the cursor is over an interactive element (used to set
   * the `pointer` cursor).
   */
  setMouse(x: number, y: number): boolean {
    this.#mouseX = x;
    this.#mouseY = y;
    if (this.#isOverToggle(x, y)) {
      this.#hover = null;
      return true;
    }
    this.#hover = this.#hitTest(x, y);
    return this.#hover !== null;
  }

  /** Clear hover state (call on `mouseleave`). */
  clearMouse(): void {
    this.#hover = null;
  }

  /**
   * Handle a click at the given canvas position. Toggles density mode when the
   * on-canvas button is hit.
   * @returns `true` when the click was consumed by the button.
   */
  handleClick(x: number, y: number): boolean {
    if (this.#isOverToggle(x, y)) {
      this.toggleDensity();
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  /**
   * Draw the whole network. Rebuilds and caches the layout each call.
   * @param ctx  Target 2D context.
   * @param network Brain to render.
   * @param time `requestAnimationFrame` timestamp (ms) driving the animation.
   * @param stateAware When true, input labels show distance/state pairs per ray.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    time: number,
    stateAware = false,
  ): void {
    this.#stateAware = stateAware;
    const layout = this.#buildLayout(ctx, network);
    this.#layout = layout;

    // Which elements are "focused" (hovered or related to the hovered neuron)?
    const focusedEdges = new Set<number>();
    let focusedNeuron = -1;
    if (this.#hover?.kind === 'neuron') {
      focusedNeuron = this.#hover.index;
      const n = layout.neurons[focusedNeuron];
      for (let e = 0; e < layout.edges.length; e++) {
        const edge = layout.edges[e];
        // Incoming: edges targeting this neuron.
        if (edge.fromRow === n.rowIndex - 1 && edge.j === n.nodeIndex) {
          focusedEdges.add(e);
        }
        // Outgoing: edges originating from this neuron.
        if (edge.fromRow === n.rowIndex && edge.i === n.nodeIndex) {
          focusedEdges.add(e);
        }
      }
    }
    const hasFocus = focusedNeuron >= 0 || this.#hover?.kind === 'connection';

    this.#drawEdges(ctx, layout, time, focusedEdges, hasFocus);
    this.#drawNeurons(ctx, layout, focusedNeuron, hasFocus);

    // Inline weight labels for every connection of a hovered neuron.
    if (focusedNeuron >= 0) {
      this.#drawWeightLabels(ctx, layout, focusedEdges, focusedNeuron);
    }

    this.#drawLegend(ctx);

    // Cursor tooltip for a hovered connection.
    if (this.#hover?.kind === 'connection') {
      this.#drawConnectionTooltip(ctx, layout.edges[this.#hover.index]);
    }
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  /**
   * Build the geometry for every neuron and connection. Rows run bottom→top:
   * row 0 is the input layer (bottom), the last row is the output layer (top).
   */
  #buildLayout(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
  ): NetworkLayout {
    const R = NetworkVisualizer.NODE_RADIUS;
    const marginX = NetworkVisualizer.MARGIN;
    // Reserve vertical bands so labels/legend never overlap the neuron rows:
    // extra room on top for the output text labels, and room at the bottom for
    // the input text labels plus the dedicated legend strip.
    const marginTop = 42;
    const marginBottom = 40;
    const legendBand = NetworkVisualizer.LEGEND_BAND;
    const left = marginX;
    const top = marginTop;
    const width = ctx.canvas.width - marginX * 2;
    const height = ctx.canvas.height - marginTop - marginBottom - legendBand;
    const levels = network.levels;
    const rows = levels.length + 1;

    // Per-row activation values and biases.
    const rowValues: number[][] = [levels[0].inputs];
    const rowBiases: (number[] | null)[] = [null];
    for (let r = 1; r < rows; r++) {
      rowValues.push(levels[r - 1].outputs);
      rowBiases.push(levels[r - 1].biases);
    }

    const inputLabels = NetworkVisualizer.#inputLabels(
      rowValues[0].length,
      this.#stateAware,
    );
    const outputLabels = ['forward', 'left', 'right', 'reverse'];
    const outputArrows: ArrowDir[] = ['up', 'left', 'right', 'down'];

    const rowY = (r: number): number =>
      rows === 1 ? top + height / 2 : top + height * (1 - r / (rows - 1));
    const nodeX = (count: number, idx: number): number =>
      lerp(left, left + width, count === 1 ? 0.5 : idx / (count - 1));

    // Neurons, plus an index map so edges can reference endpoints.
    const neurons: NeuronNode[] = [];
    const indexOf: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const values = rowValues[r];
      indexOf[r] = [];
      for (let n = 0; n < values.length; n++) {
        indexOf[r][n] = neurons.length;
        let label: string | null = null;
        let arrow: ArrowDir | null = null;
        if (r === 0) label = inputLabels[n] ?? null;
        else if (r === rows - 1) {
          label = outputLabels[n] ?? null;
          arrow = outputArrows[n] ?? null;
        }
        neurons.push({
          x: nodeX(values.length, n),
          y: rowY(r),
          r: R,
          value: values[n],
          bias: rowBiases[r] ? rowBiases[r]![n] : null,
          rowIndex: r,
          nodeIndex: n,
          label,
          arrow,
        });
      }
    }

    // Connections: level r links row r (inputs) → row r+1 (outputs).
    const edges: ConnectionEdge[] = [];
    for (let r = 0; r < levels.length; r++) {
      const level = levels[r];
      for (let i = 0; i < level.inputs.length; i++) {
        const src = neurons[indexOf[r][i]];
        const input = level.inputs[i];
        for (let j = 0; j < level.outputs.length; j++) {
          const dst = neurons[indexOf[r + 1][j]];
          const weight = level.weights[i][j];
          edges.push({
            x1: src.x,
            y1: src.y,
            x2: dst.x,
            y2: dst.y,
            weight,
            input,
            signal: input * weight,
            fromRow: r,
            i,
            j,
          });
        }
      }
    }

    return { neurons, edges, rows };
  }

  /** Input axis labels: `ray1…rayN` (or paired `ray1 d`/`ray1 s` when stateAware),
   *  then the trailing `speed` input.
   */
  static #inputLabels(count: number, stateAware: boolean): string[] {
    const labels: string[] = [];
    if (stateAware) {
      const rayCount = (count - 1) / 2;
      for (let i = 0; i < rayCount; i++) {
        labels.push(`ray${i + 1} d`);
        labels.push(`ray${i + 1} s`);
      }
    } else {
      for (let i = 0; i < count - 1; i++) labels.push(`ray${i + 1}`);
    }
    labels.push('speed');
    return labels;
  }

  // ---------------------------------------------------------------------------
  // Edge / neuron rendering
  // ---------------------------------------------------------------------------

  #drawEdges(
    ctx: CanvasRenderingContext2D,
    layout: NetworkLayout,
    time: number,
    focusedEdges: Set<number>,
    hasFocus: boolean,
  ): void {
    const hoveredEdge =
      this.#hover?.kind === 'connection' ? this.#hover.index : -1;

    for (let e = 0; e < layout.edges.length; e++) {
      const edge = layout.edges[e];
      const focused = focusedEdges.has(e) || e === hoveredEdge;
      // Dim everything that isn't the current focus while something is hovered.
      const dim = hasFocus && !focused;
      const mag = Math.min(1, Math.abs(edge.weight));

      ctx.beginPath();
      ctx.moveTo(edge.x1, edge.y1);
      ctx.lineTo(edge.x2, edge.y2);
      ctx.lineWidth = focused ? 3 : 1 + mag * 2;
      ctx.strokeStyle = NetworkVisualizer.#color(
        edge.weight,
        dim ? 0.08 : NetworkVisualizer.#alpha(edge.weight),
      );
      ctx.stroke();

      // Signal-flow particles on connections that are actually active.
      if (!dim && Math.abs(edge.signal) > NetworkVisualizer.SIGNAL_THRESHOLD) {
        this.#drawSignalParticles(ctx, edge, e, time, focused);
      }
    }
  }

  /**
   * Draw travelling dots along an active connection. Particle phase is a pure
   * function of `time` and a deterministic per-edge offset, so no state or
   * per-frame allocation is needed. Particles move input→output (bottom→top).
   */
  #drawSignalParticles(
    ctx: CanvasRenderingContext2D,
    edge: ConnectionEdge,
    edgeIndex: number,
    time: number,
    focused: boolean,
  ): void {
    const mag = Math.min(1, Math.abs(edge.signal));
    const count = 2;
    const speed = 0.2 + 0.8 * mag; // cycles per second
    const base = (time / 1000) * speed;
    const phase = ((edgeIndex * 37) % 100) / 100; // deterministic stagger
    const radius = (focused ? 3.5 : 2.5) + mag * 2.5;

    for (let k = 0; k < count; k++) {
      const p = (base + phase + k / count) % 1;
      const x = lerp(edge.x1, edge.x2, p);
      const y = lerp(edge.y1, edge.y2, p);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = NetworkVisualizer.#color(edge.signal, 0.6 + 0.4 * mag);
      ctx.fill();
    }
  }

  #drawNeurons(
    ctx: CanvasRenderingContext2D,
    layout: NetworkLayout,
    focusedNeuron: number,
    hasFocus: boolean,
  ): void {
    for (let n = 0; n < layout.neurons.length; n++) {
      const node = layout.neurons[n];
      const focused = n === focusedNeuron;
      const dim = hasFocus && !focused;
      const alpha = dim ? 0.25 : 1;

      // Outer disc (dark background so the coloured core reads clearly).
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fill();

      // Glowing core representing the activation via a radial gradient.
      const coreAlpha = (dim ? 0.4 : 1) * NetworkVisualizer.#alpha(node.value);
      const grad = ctx.createRadialGradient(
        node.x,
        node.y,
        0,
        node.x,
        node.y,
        node.r * 0.85,
      );
      grad.addColorStop(0, NetworkVisualizer.#color(node.value, coreAlpha));
      grad.addColorStop(1, NetworkVisualizer.#color(node.value, 0));
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Bias ring (output/hidden neurons only). Static — no animated dashes.
      if (node.bias !== null) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.arc(node.x, node.y, node.r * 0.82, 0, Math.PI * 2);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = NetworkVisualizer.#color(
          node.bias,
          dim ? 0.15 : NetworkVisualizer.#alpha(node.bias),
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Highlight ring on the hovered neuron.
      if (focused) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.arc(node.x, node.y, node.r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.stroke();
      }

      // Output direction arrow drawn inside the node.
      if (node.arrow && !dim) {
        NetworkVisualizer.#drawArrow(ctx, node.x, node.y, node.arrow, node.r);
      }

      // Axis label (ray1…/speed under inputs, control name above outputs).
      if (node.label && !dim) {
        this.#drawAxisLabel(ctx, node);
      }

      // Numeric value label (always in density mode, or for the hovered neuron).
      if ((this.#showAllValues || focused) && !dim) {
        this.#drawNeuronValue(ctx, node);
      }
    }
  }

  #drawAxisLabel(ctx: CanvasRenderingContext2D, node: NeuronNode): void {
    ctx.textAlign = 'center';
    ctx.font = '10px Arial';
    ctx.fillStyle = 'rgba(220,220,220,0.9)';
    if (node.rowIndex === 0) {
      // Input labels sit below the bottom row.
      ctx.textBaseline = 'top';
      ctx.fillText(node.label!, node.x, node.y + node.r + 6);
    } else {
      // Output labels sit above the top row.
      ctx.textBaseline = 'bottom';
      ctx.fillText(node.label!, node.x, node.y - node.r - 6);
    }
  }

  /**
   * Draw a simple direction arrow centred at (x, y). Stroked twice (dark
   * outline then white) so it reads on any node-core colour.
   */
  static #drawArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dir: ArrowDir,
    nodeRadius: number,
  ): void {
    const s = nodeRadius * 0.55; // half-length of the arrow shaft
    const rot = {
      up: 0,
      right: Math.PI / 2,
      down: Math.PI,
      left: -Math.PI / 2,
    }[dir];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Path traced pointing "up" before rotation.
    const trace = (): void => {
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.lineTo(0, -s);
      ctx.moveTo(-s * 0.55, -s * 0.35);
      ctx.lineTo(0, -s);
      ctx.lineTo(s * 0.55, -s * 0.35);
    };

    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 4;
    trace();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    trace();
    ctx.stroke();

    ctx.restore();
  }

  /** Draw a neuron's activation (and bias, if any) as a small label chip. */
  #drawNeuronValue(ctx: CanvasRenderingContext2D, node: NeuronNode): void {
    const v = Number.isFinite(node.value) ? node.value : 0;
    const lines = [`a=${v.toFixed(2)}`];
    if (node.bias !== null) lines.push(`b=${node.bias.toFixed(2)}`);
    // Estimate the chip width so it can flip to the left of the node when it
    // would otherwise overflow the right canvas edge.
    ctx.font = '10px Arial';
    let maxW = 0;
    for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
    const chipW = maxW + 8;
    const rightX = node.x + node.r + 6;
    if (rightX + chipW <= ctx.canvas.width - 4) {
      NetworkVisualizer.#drawLabelChip(ctx, lines, rightX, node.y, 'left');
    } else {
      NetworkVisualizer.#drawLabelChip(
        ctx,
        lines,
        node.x - node.r - 6,
        node.y,
        'right',
      );
    }
  }

  /**
   * When a neuron is hovered, label every connection's weight at the far end
   * from the hovered neuron (source end for incoming edges, target end for
   * outgoing), so labels spread out instead of stacking on top of the hovered
   * node.
   */
  #drawWeightLabels(
    ctx: CanvasRenderingContext2D,
    layout: NetworkLayout,
    focusedEdges: Set<number>,
    hoveredNeuron: number,
  ): void {
    const n = layout.neurons[hoveredNeuron];
    for (const e of focusedEdges) {
      const edge = layout.edges[e];
      const dx = edge.x2 - edge.x1;
      const dy = edge.y2 - edge.y1;
      const len = Math.hypot(dx, dy) || 1;
      const offset = NetworkVisualizer.NODE_RADIUS + 12;
      // Sit the label at the far end of the line from the hovered neuron.
      const isOutgoing = edge.fromRow === n.rowIndex && edge.i === n.nodeIndex;
      const x = isOutgoing
        ? edge.x2 - (dx / len) * offset
        : edge.x1 + (dx / len) * offset;
      const y = isOutgoing
        ? edge.y2 - (dy / len) * offset
        : edge.y1 + (dy / len) * offset;
      NetworkVisualizer.#drawLabelChip(
        ctx,
        [edge.weight.toFixed(2)],
        x,
        y,
        'center',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Legend + tooltip + label chips
  // ---------------------------------------------------------------------------

  #drawLegend(ctx: CanvasRenderingContext2D): void {
    const pad = 10;
    const barW = 120;
    const barH = 10;
    const x = pad;
    // Sit inside the reserved bottom band so it never overlaps the input row.
    const y = ctx.canvas.height - NetworkVisualizer.LEGEND_BAND + 4;

    // Gradient bar cyan(−1) → dark(0) → amber(+1).
    const grad = ctx.createLinearGradient(x, 0, x + barW, 0);
    grad.addColorStop(0, NetworkVisualizer.#color(-1, 1));
    grad.addColorStop(0.5, 'rgba(40,40,40,1)');
    grad.addColorStop(1, NetworkVisualizer.#color(1, 1));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, barH);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(x, y, barW, barH);

    ctx.font = '9px Arial';
    ctx.fillStyle = 'rgba(220,220,220,0.9)';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('−1', x, y + barH + 2);
    ctx.textAlign = 'center';
    ctx.fillText('weight / activation', x + barW / 2, y + barH + 2);
    ctx.textAlign = 'right';
    ctx.fillText('+1', x + barW, y + barH + 2);

    // Density-toggle button beside the legend.
    this.#drawToggleButton(ctx, x + barW + 12, y - 2);
  }

  #drawToggleButton(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const w = 68;
    const h = 18;
    this.#toggleRect = { x, y, w, h };
    ctx.beginPath();
    NetworkVisualizer.#roundRect(ctx, x, y, w, h, 4);
    ctx.fillStyle = this.#showAllValues
      ? 'rgba(255,176,0,0.85)'
      : 'rgba(20,20,26,0.85)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.#showAllValues ? '#000' : 'rgba(230,230,230,0.95)';
    ctx.fillText('values (v)', x + w / 2, y + h / 2 + 1);
  }

  #drawConnectionTooltip(
    ctx: CanvasRenderingContext2D,
    edge: ConnectionEdge,
  ): void {
    const lines = [
      `weight  ${edge.weight.toFixed(3)}`,
      `input   ${edge.input.toFixed(3)}`,
      `contrib ${edge.signal.toFixed(3)}`,
      `#${edge.i} → #${edge.j}`,
    ];
    NetworkVisualizer.#drawTooltip(
      ctx,
      lines,
      this.#mouseX + 14,
      this.#mouseY + 14,
    );
  }

  // ---------------------------------------------------------------------------
  // Hit-testing
  // ---------------------------------------------------------------------------

  #hitTest(x: number, y: number): Hover {
    const layout = this.#layout;
    if (!layout) return null;

    // Neurons take priority (they sit on top of the lines).
    for (let n = 0; n < layout.neurons.length; n++) {
      const node = layout.neurons[n];
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= (node.r + 2) * (node.r + 2)) {
        return { kind: 'neuron', index: n };
      }
    }

    // Nearest connection within tolerance.
    let best = -1;
    let bestDist = NetworkVisualizer.EDGE_HIT_TOLERANCE;
    for (let e = 0; e < layout.edges.length; e++) {
      const edge = layout.edges[e];
      const d = NetworkVisualizer.#pointSegmentDistance(
        x,
        y,
        edge.x1,
        edge.y1,
        edge.x2,
        edge.y2,
      );
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best >= 0 ? { kind: 'connection', index: best } : null;
  }

  #isOverToggle(x: number, y: number): boolean {
    const r = this.#toggleRect;
    return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // ---------------------------------------------------------------------------
  // Shared drawing / math helpers
  // ---------------------------------------------------------------------------

  /**
   * Diverging palette: positive → amber→yellow, negative → cyan. Both read
   * strongly on the black canvas (unlike the old dark blue).
   */
  static #color(value: number, alpha: number): string {
    // Brains that have never been fed (e.g. the KEYS car's brain, which is
    // built but never driven by feedForward) have undefined/NaN neuron
    // values. Treat those as 0 so the visualizer renders a neutral net
    // instead of crashing on `rgba(NaN, NaN, 255, NaN)`.
    const v = Number.isFinite(value) ? value : 0;
    const a = Number.isFinite(alpha) ? alpha : 0;
    const t = Math.max(-1, Math.min(1, v));
    let r: number;
    let g: number;
    let b: number;
    if (t >= 0) {
      // #FFB000 (low) → #FFE44D (high)
      r = 255;
      g = Math.round(lerp(176, 228, t));
      b = Math.round(lerp(0, 77, t));
    } else {
      // pale cyan (low magnitude) → pure #00E5FF (high magnitude)
      const m = -t;
      r = Math.round(lerp(140, 0, m));
      g = Math.round(lerp(210, 229, m));
      b = 255;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /** Alpha with a floor so weak values stay faintly visible instead of vanishing. */
  static #alpha(value: number): number {
    const v = Number.isFinite(value) ? value : 0;
    return 0.25 + 0.75 * Math.min(1, Math.abs(v));
  }

  /** Shortest distance from a point to a line segment. */
  static #pointSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  /** A small dark rounded chip with light text, used for inline value labels. */
  static #drawLabelChip(
    ctx: CanvasRenderingContext2D,
    lines: string[],
    x: number,
    y: number,
    align: 'left' | 'center' | 'right',
  ): void {
    ctx.font = '10px Arial';
    const padX = 4;
    const padY = 3;
    const lineH = 12;
    let maxW = 0;
    for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
    const w = maxW + padX * 2;
    const h = lines.length * lineH + padY * 2;
    const bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const by = y - h / 2;

    ctx.beginPath();
    NetworkVisualizer.#roundRect(ctx, bx, by, w, h, 4);
    ctx.fillStyle = 'rgba(10,10,15,0.9)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();

    ctx.fillStyle = 'rgba(240,240,240,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + w / 2, by + padY + lineH * (i + 0.5));
    }
  }

  /** A cursor tooltip clamped to stay fully on-canvas. */
  static #drawTooltip(
    ctx: CanvasRenderingContext2D,
    lines: string[],
    x: number,
    y: number,
  ): void {
    ctx.font = '11px monospace';
    const padX = 8;
    const padY = 6;
    const lineH = 14;
    let maxW = 0;
    for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
    const w = maxW + padX * 2;
    const h = lines.length * lineH + padY * 2;

    // Clamp so the tooltip never spills off the canvas.
    let bx = x;
    let by = y;
    if (bx + w > ctx.canvas.width) bx = ctx.canvas.width - w - 4;
    if (by + h > ctx.canvas.height) by = ctx.canvas.height - h - 4;
    if (bx < 4) bx = 4;
    if (by < 4) by = 4;

    ctx.beginPath();
    NetworkVisualizer.#roundRect(ctx, bx, by, w, h, 6);
    ctx.fillStyle = 'rgba(10,10,15,0.85)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();

    ctx.fillStyle = 'rgba(240,240,240,0.95)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + padX, by + padY + lineH * (i + 0.5));
    }
  }

  /** Trace a rounded-rectangle path (caller fills/strokes). */
  static #roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}
