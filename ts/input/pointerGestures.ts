/**
 * Unified touch/pen gesture recognizer for a single canvas.
 *
 * Wraps the native Pointer Events API and emits high-level callbacks so the
 * viewport, editors, and minimap don't each re-implement multi-touch
 * bookkeeping. Mouse pointers are intentionally ignored — desktop mouse input
 * keeps flowing through the pre-existing `mousedown`/`wheel` listeners on the
 * same element. Only `touch`/`pen` pointers are synthesized into taps, drags,
 * pinch, and the secondary (right-click-equivalent) gesture.
 *
 * Single-finger recognition is deferred: a drag only begins once the finger
 * moves past a small tolerance, so a stationary touch resolves to a tap (or, if
 * held, a long-press) instead. This cleanly separates "tap to place" from
 * "drag to move" from "long-press to delete" without any of them firing
 * prematurely on `pointerdown`.
 */

export interface GesturePoint {
  x: number;
  y: number;
}

export interface PointerGestureCallbacks {
  /** Single-finger drag begins (fired once movement passes the tolerance). */
  onDragStart?: (p: GesturePoint, e: PointerEvent) => void;
  /** Single-finger drag update. */
  onDragMove?: (p: GesturePoint, e: PointerEvent) => void;
  /** Single-finger drag ends. */
  onDragEnd?: (p: GesturePoint, e: PointerEvent) => void;
  /** Single-finger tap (press + release, no significant move, short hold). */
  onTap?: (p: GesturePoint, e: PointerEvent) => void;
  /** Two-finger pinch. `scale` = current/previous distance; `focal` = midpoint. */
  onPinch?: (scale: number, focal: GesturePoint) => void;
  /** Two-finger drag pan. `dx`/`dy` are canvas-px deltas since the last move. */
  onTwoFingerPan?: (dx: number, dy: number) => void;
  /** Right-click equivalent: two-finger tap OR long-press. */
  onSecondaryTap?: (p: GesturePoint, e: PointerEvent) => void;
}

export interface PointerGestureOptions {
  /** Long-press duration before {@link PointerGestureCallbacks.onSecondaryTap}. */
  longPressMs?: number;
  /** Movement (px) beyond which a touch is a drag, not a tap. */
  tapMoveTolerancePx?: number;
  /** Max hold (ms) for a press+release to count as a tap. */
  tapMaxDurationMs?: number;
  /**
   * When it returns true, all single-finger gestures (drag + tap) are ignored
   * so they can flow to another consumer (e.g. the viewport suppresses
   * single-finger pan while a world-editor tool is active). Two-finger
   * gestures are unaffected.
   */
  singleFingerDisabled?: () => boolean;
}

interface PointerRecord {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startT: number;
}

const DEFAULT_LONG_PRESS_MS = 500;
const DEFAULT_TAP_MOVE_TOLERANCE_PX = 8;
const DEFAULT_TAP_MAX_DURATION_MS = 300;

export class PointerGestures {
  #canvas: HTMLCanvasElement;
  #cb: PointerGestureCallbacks;
  #longPressMs: number;
  #tapMoveTolerancePx: number;
  #tapMaxDurationMs: number;
  #singleFingerDisabled: () => boolean;

  #pointers = new Map<number, PointerRecord>();
  #longPressTimer: ReturnType<typeof setTimeout> | null = null;
  #dragActive = false;
  /** Set when a long-press / two-finger tap fired, to suppress the trailing tap. */
  #gestureConsumed = false;
  /** True once two pointers were active this gesture; blocks stray single-finger. */
  #multiTouch = false;
  #prevDist = 0;
  #prevMidX = 0;
  #prevMidY = 0;
  #twoFingerMoved = false;
  #twoFingerStartT = 0;

  #boundDown: (e: PointerEvent) => void;
  #boundMove: (e: PointerEvent) => void;
  #boundUp: (e: PointerEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: PointerGestureCallbacks,
    options: PointerGestureOptions = {},
  ) {
    this.#canvas = canvas;
    this.#cb = callbacks;
    this.#longPressMs = options.longPressMs ?? DEFAULT_LONG_PRESS_MS;
    this.#tapMoveTolerancePx =
      options.tapMoveTolerancePx ?? DEFAULT_TAP_MOVE_TOLERANCE_PX;
    this.#tapMaxDurationMs =
      options.tapMaxDurationMs ?? DEFAULT_TAP_MAX_DURATION_MS;
    this.#singleFingerDisabled = options.singleFingerDisabled ?? (() => false);

    this.#boundDown = this.#handleDown.bind(this);
    this.#boundMove = this.#handleMove.bind(this);
    this.#boundUp = this.#handleUp.bind(this);
  }

  enable(): void {
    this.#canvas.addEventListener('pointerdown', this.#boundDown);
    this.#canvas.addEventListener('pointermove', this.#boundMove);
    this.#canvas.addEventListener('pointerup', this.#boundUp);
    this.#canvas.addEventListener('pointercancel', this.#boundUp);
  }

  disable(): void {
    this.#canvas.removeEventListener('pointerdown', this.#boundDown);
    this.#canvas.removeEventListener('pointermove', this.#boundMove);
    this.#canvas.removeEventListener('pointerup', this.#boundUp);
    this.#canvas.removeEventListener('pointercancel', this.#boundUp);
    this.#clearLongPress();
    this.#pointers.clear();
    this.#reset();
  }

  #reset(): void {
    this.#dragActive = false;
    this.#gestureConsumed = false;
    this.#multiTouch = false;
    this.#prevDist = 0;
    this.#twoFingerMoved = false;
  }

  #clearLongPress(): void {
    if (this.#longPressTimer !== null) {
      clearTimeout(this.#longPressTimer);
      this.#longPressTimer = null;
    }
  }

  /**
   * Maps a pointer event to canvas-buffer coordinates.
   *
   * `offsetX/offsetY` are in CSS pixels relative to the element, but the drawing
   * buffer uses `canvas.width/height`. On mobile (e.g. Android Chrome) the URL
   * bar collapsing changes the canvas's CSS-rendered height while the buffer
   * resolution lags, so `offsetY` no longer maps 1:1 and touches land at the
   * wrong Y. Scaling `clientX/clientY - rect` by `buffer / rect` size keeps the
   * mapping correct regardless of CSS scaling. Falls back to `offsetX/offsetY`
   * when `getBoundingClientRect` is unavailable (e.g. unit-test mocks).
   */
  #point(e: PointerEvent): GesturePoint {
    const rect = this.#canvas.getBoundingClientRect?.();
    if (rect && rect.width > 0 && rect.height > 0) {
      const sx = this.#canvas.width / rect.width;
      const sy = this.#canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * sx,
        y: (e.clientY - rect.top) * sy,
      };
    }
    return { x: e.offsetX, y: e.offsetY };
  }

  #handleDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse') return; // desktop mouse keeps its own path

    try {
      this.#canvas.setPointerCapture(e.pointerId);
    } catch {
      // Some pointerId capture races are harmless; ignore.
    }

    const now = performance.now();
    const p = this.#point(e);
    this.#pointers.set(e.pointerId, {
      x: p.x,
      y: p.y,
      startX: p.x,
      startY: p.y,
      startT: now,
    });

    if (this.#pointers.size === 2) {
      // Transition into a two-finger gesture: abandon any single-finger state.
      this.#clearLongPress();
      if (this.#dragActive) {
        this.#cb.onDragEnd?.(this.#point(e), e);
        this.#dragActive = false;
      }
      this.#multiTouch = true;
      this.#twoFingerMoved = false;
      this.#twoFingerStartT = now;
      const [a, b] = [...this.#pointers.values()];
      this.#prevDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.#prevMidX = (a.x + b.x) / 2;
      this.#prevMidY = (a.y + b.y) / 2;
      return;
    }

    if (this.#pointers.size === 1 && !this.#multiTouch) {
      // Arm the long-press timer; a stationary hold becomes a secondary tap.
      if (this.#cb.onSecondaryTap && !this.#singleFingerDisabled()) {
        this.#clearLongPress();
        this.#longPressTimer = setTimeout(() => {
          this.#longPressTimer = null;
          if (this.#pointers.size !== 1 || this.#dragActive) return;
          this.#gestureConsumed = true;
          this.#cb.onSecondaryTap?.(this.#point(e), e);
        }, this.#longPressMs);
      }
    }
  }

  #handleMove(e: PointerEvent): void {
    if (e.pointerType === 'mouse') return;
    const rec = this.#pointers.get(e.pointerId);
    if (!rec) return;
    const p = this.#point(e);
    rec.x = p.x;
    rec.y = p.y;

    if (this.#pointers.size >= 2) {
      this.#handleTwoFingerMove();
      e.preventDefault();
      return;
    }

    if (this.#multiTouch) return; // leftover finger after a multi-touch gesture

    const movedDist = Math.hypot(rec.x - rec.startX, rec.y - rec.startY);

    if (!this.#dragActive) {
      if (movedDist <= this.#tapMoveTolerancePx) return;
      // Movement crossed the tap tolerance → this is a drag, not a tap.
      this.#clearLongPress();
      if (this.#singleFingerDisabled()) return;
      this.#dragActive = true;
      this.#cb.onDragStart?.({ x: rec.startX, y: rec.startY }, e);
    }

    this.#cb.onDragMove?.(this.#point(e), e);
    e.preventDefault();
  }

  #handleTwoFingerMove(): void {
    const pts = [...this.#pointers.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    if (this.#prevDist > 0 && dist > 0) {
      const scale = dist / this.#prevDist;
      if (scale !== 1) this.#cb.onPinch?.(scale, { x: midX, y: midY });
    }

    const dx = midX - this.#prevMidX;
    const dy = midY - this.#prevMidY;
    if (dx !== 0 || dy !== 0) this.#cb.onTwoFingerPan?.(dx, dy);

    if (
      Math.abs(dist - this.#prevDist) > this.#tapMoveTolerancePx ||
      Math.abs(dx) + Math.abs(dy) > this.#tapMoveTolerancePx
    ) {
      this.#twoFingerMoved = true;
    }

    this.#prevDist = dist;
    this.#prevMidX = midX;
    this.#prevMidY = midY;
  }

  #handleUp(e: PointerEvent): void {
    if (e.pointerType === 'mouse') return;
    const rec = this.#pointers.get(e.pointerId);
    const wasTwoFinger = this.#pointers.size === 2;
    this.#pointers.delete(e.pointerId);
    try {
      this.#canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Capture may already be gone; ignore.
    }

    if (wasTwoFinger) {
      // Second-to-last finger lifted after a two-finger gesture.
      this.#clearLongPress();
      if (!this.#twoFingerMoved) {
        const now = performance.now();
        if (now - this.#twoFingerStartT <= this.#tapMaxDurationMs) {
          this.#gestureConsumed = true;
          this.#cb.onSecondaryTap?.(
            { x: this.#prevMidX, y: this.#prevMidY },
            e,
          );
        }
      }
      return; // leftover finger stays inert until full release
    }

    if (this.#pointers.size > 0) return; // still multi-touch

    // Last finger up — resolve single-finger outcome.
    this.#clearLongPress();
    if (this.#dragActive) {
      this.#cb.onDragEnd?.(this.#point(e), e);
    } else if (
      rec &&
      !this.#gestureConsumed &&
      !this.#multiTouch &&
      !this.#singleFingerDisabled()
    ) {
      const movedDist = Math.hypot(rec.x - rec.startX, rec.y - rec.startY);
      const held = performance.now() - rec.startT;
      if (
        movedDist <= this.#tapMoveTolerancePx &&
        held <= this.#tapMaxDurationMs
      ) {
        this.#cb.onTap?.({ x: rec.startX, y: rec.startY }, e);
      }
    }
    this.#reset();
  }
}
