import { PointerGestures } from '../../input/pointerGestures.js';

/** True when the MouseEvent was synthesized from a touch gesture (finger). */
export function isTouchSynthEvent(e: MouseEvent): boolean {
  return (e as { touchSynth?: boolean }).touchSynth === true;
}

/**
 * Actions a world-editor exposes so touch gestures can drive the same code
 * paths its mouse handlers use. Events passed here are synthesized from touch
 * points (they carry `offsetX`/`offsetY` and a `button`, which is all the
 * editors' mouse handlers read).
 */
export interface EditorGestureActions {
  /** Update hover/preview state at the pointer (mirrors `mousemove`). */
  hover(e: MouseEvent): void;
  /** Primary action — place/select (mirrors a left `mousedown`). */
  primary(e: MouseEvent): void;
  /** Secondary action — delete/deselect (mirrors a right `mousedown`). */
  secondary(e: MouseEvent): void;
  /** Drag update (defaults to {@link EditorGestureActions.hover}). */
  drag?(e: MouseEvent): void;
  /** Drag finished. */
  dragEnd?(): void;
}

/**
 * Wires a {@link PointerGestures} recognizer to an editor's actions so a tap
 * places/selects, a drag moves, and a long-press or two-finger tap deletes —
 * reusing the editor's existing mouse logic. Two-finger pan/zoom is handled by
 * the {@link Viewport} (which runs in `two-finger-only` mode while an editor is
 * active), so this helper only consumes single-finger + secondary gestures.
 */
export function createEditorGestures(
  canvas: HTMLCanvasElement,
  actions: EditorGestureActions,
): PointerGestures {
  const synth = (p: { x: number; y: number }, button: number): MouseEvent =>
    ({
      offsetX: p.x,
      offsetY: p.y,
      button,
      touchSynth: true,
      preventDefault: () => {},
    }) as unknown as MouseEvent;

  return new PointerGestures(canvas, {
    onTap: (p) => {
      actions.hover(synth(p, 0));
      actions.primary(synth(p, 0));
    },
    onDragStart: (p) => {
      actions.hover(synth(p, 0));
      actions.primary(synth(p, 0));
    },
    onDragMove: (_p, e) => (actions.drag ?? actions.hover)(e),
    onDragEnd: () => actions.dragEnd?.(),
    onSecondaryTap: (p) => {
      actions.hover(synth(p, 2));
      actions.secondary(synth(p, 2));
    },
  });
}
