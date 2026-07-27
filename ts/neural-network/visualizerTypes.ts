/**
 * Shared geometry / hit-testing types for the neural-network visualizer.
 *
 * These are plain data shapes describing the cached per-frame layout that
 * {@link NetworkVisualizer} builds for drawing and mouse hit-testing. They are
 * kept in their own declaration-only module so the drawing primitives
 * (`visualizerPrimitives.ts`) and the visualizer class can share them without a
 * cycle. This is a types module, not a re-export barrel.
 */

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
