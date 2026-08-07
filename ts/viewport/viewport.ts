import { Point } from '../math/primitives/point.js';
import { ScaleIndicator } from './scaleIndicator.js';
import { scale, subtract, add } from '../math/utils.js';
import { WORLD_PIXELS_PER_METER } from '../math/worldUnits.js';
import { PointerGestures } from '../input/pointerGestures.js';

export interface DragState {
  start: Point;
  end: Point;
  offset: Point; // The difference between end and start during a drag
  active: boolean;
}

/**
 * Controls how the scroll wheel behaves:
 * - 'mouse': wheel scroll zooms directly (no modifier needed).
 * - 'touchpad': two-finger scroll pans; pinch / Ctrl+scroll zooms.
 */
export type ViewportMode = 'mouse' | 'touchpad';

/**
 * Controls how single-finger touch is routed:
 * - 'one-finger': one finger pans the map (default; simulators/traffic).
 * - 'two-finger-only': single-finger touches flow to another consumer (a
 *   world-editor drawing tool), so only two-finger gestures pan/zoom here.
 */
export type TouchPanMode = 'one-finger' | 'two-finger-only';

/** Default (fast) zoom increment applied per scroll-wheel notch. */
const ZOOM_STEP_FAST = 0.3;
/** Slow, fine-grained zoom increment used while Shift is held. */
const ZOOM_STEP_SLOW = 0.1;
/** Most zoomed-in value (smallest world slice visible). */
const MIN_ZOOM = 0.8;
/** Most zoomed-out value — raised so a whole city of spawned traffic fits on screen. */
const MAX_ZOOM = 30;

/** Axis-aligned world-space rectangle currently visible on the canvas. */
export interface VisibleWorldRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class Viewport {
  public canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #scaleIndicator: ScaleIndicator;

  public zoom: number;
  public center: Point; // Center of the canvas element itself
  public offset: Point; // Offset of the world origin relative to the scaled canvas center
  public mode: ViewportMode = 'mouse'; // Wheel behavior (mouse vs. touchpad)
  // Internal state for handling panning/dragging
  #drag: DragState = {
    start: new Point(0, 0), // Position where drag started
    end: new Point(0, 0), // Current position during drag
    offset: new Point(0, 0), // Vector difference (end - start)
    active: false, // Is a drag currently in progress?
  };

  #boundHandleMouseWheel: (e: WheelEvent) => void;
  #boundHandleMouseDown: (e: MouseEvent) => void;
  #boundHandleMouseMove: (e: MouseEvent) => void;
  #boundHandleMouseUp: (e: MouseEvent) => void;

  #touchPanMode: TouchPanMode = 'one-finger';
  #gestures: PointerGestures;

  /**
   * Creates a Viewport instance.
   * @param canvas - The HTML canvas element to manage.
   * @param zoom - Initial zoom level (default: 1).
   * @param offset - Initial world offset (default: calculated based on canvas center).
   */
  constructor(
    canvas: HTMLCanvasElement,
    zoom: number = 1,
    offset: Point | null = null,
  ) {
    this.canvas = canvas;
    this.#ctx = canvas.getContext('2d')!;

    this.zoom = zoom;
    // Canvas center remains fixed relative to the canvas element
    this.center = new Point(canvas.width / 2, canvas.height / 2);
    // Initial offset: use provided one or default to negative center (world origin at top-left)
    this.offset = offset ?? scale(this.center, -1); // Nullish coalescing for default
    this.#scaleIndicator = new ScaleIndicator(
      canvas.width,
      canvas.height,
      this,
    );

    // Bind event handlers
    this.#boundHandleMouseWheel = this.#handleMouseWheel.bind(this);
    this.#boundHandleMouseDown = this.#handleMouseDown.bind(this);
    this.#boundHandleMouseMove = this.#handleMouseMove.bind(this);
    this.#boundHandleMouseUp = this.#handleMouseUp.bind(this);

    this.#gestures = new PointerGestures(
      this.canvas,
      {
        onDragStart: (p) => this.#touchPanStart(p),
        onDragMove: (p) => this.#touchPanMove(p),
        onDragEnd: () => this.#touchPanEnd(),
        onPinch: (s, focal) => this.#applyPinch(s, focal),
        onTwoFingerPan: (dx, dy) => this.#applyTwoFingerPan(dx, dy),
      },
      { singleFingerDisabled: () => this.#touchPanMode === 'two-finger-only' },
    );

    this.#addEventListeners();
  }

  /**
   * Applies the current viewport transform (pan and zoom) to the canvas context.
   * Should be called at the beginning of each render loop.
   */
  public reset(): void {
    // Keep viewport center in sync with responsive canvas resizes.
    this.center = new Point(this.canvas.width / 2, this.canvas.height / 2);

    this.#ctx.restore(); // Restore to default state (clears previous transforms)
    this.#ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the canvas
    this.#ctx.save(); // Save the clean state before applying new transforms

    // Move canvas origin to the center, apply zoom, then apply offset
    this.#ctx.translate(this.center.x, this.center.y);
    this.#ctx.scale(1 / this.zoom, 1 / this.zoom);
    const totalOffset = this.getOffset(); // Includes permanent offset and active drag
    this.#ctx.translate(totalOffset.x, totalOffset.y);
  }

  /**
   * Calculates the mouse position in world coordinates based on a MouseEvent.
   * @param e - The MouseEvent object.
   * @param subtractDragOffset - If true, returns position ignoring temporary drag offset. Useful for visual elements that shouldn't move during drag.
   * @returns The calculated Point in world coordinates.
   */
  public getMouse(
    e: PointerEvent | MouseEvent,
    subtractDragOffset: boolean = false,
  ): Point {
    // Formula: ((mouseCanvasPos - canvasCenter) * zoom) - worldOffset
    const p = new Point(
      (e.offsetX - this.center.x) * this.zoom - this.offset.x,
      (e.offsetY - this.center.y) * this.zoom - this.offset.y,
    );

    // If dragging and flag is set, counteract the temporary drag offset
    return subtractDragOffset ? subtract(p, this.#drag.offset) : p;
  }

  /**
   * Gets the current total offset, including the base offset and any active drag offset.
   * This is the offset used when applying transformations in reset().
   * @returns The total offset Point.
   */
  public getOffset(): Point {
    // Total offset is the permanent offset plus the current drag offset
    return add(this.offset, this.#drag.offset);
  }

  public getZoom(): number {
    return this.zoom;
  }

  /**
   * The world-space rectangle currently visible on the canvas, used for
   * viewport culling. Mirrors the transform applied in {@link reset}: the
   * screen center maps to `-getOffset()` in world space, and one canvas pixel
   * spans `zoom` world units.
   * @param margin - Extra world-space padding added on every side so objects
   *   straddling the edge aren't culled prematurely (default 0).
   */
  public getVisibleBounds(margin: number = 0): VisibleWorldRect {
    const off = this.getOffset();
    const centerX = -off.x;
    const centerY = -off.y;
    const halfW = (this.canvas.width / 2) * this.zoom;
    const halfH = (this.canvas.height / 2) * this.zoom;
    return {
      minX: centerX - halfW - margin,
      minY: centerY - halfH - margin,
      maxX: centerX + halfW + margin,
      maxY: centerY + halfH + margin,
    };
  }

  public getPixelsPerMeter(): number {
    return WORLD_PIXELS_PER_METER / this.zoom;
  }

  #clampZoom(zoom: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  }

  public drawScaleIndicator(
    ctx: CanvasRenderingContext2D = this.#ctx,
    viewportWidth: number = this.canvas.width,
    viewportHeight: number = this.canvas.height,
  ): void {
    this.#scaleIndicator.draw(ctx, viewportWidth, viewportHeight);
  }

  /**
   * Sets the wheel-input mode.
   * @param mode - 'mouse' (wheel zooms) or 'touchpad' (wheel pans, Ctrl/pinch zooms).
   */
  public setMode(mode: ViewportMode): void {
    this.mode = mode;
  }

  /**
   * Sets how single-finger touch is routed. World editors switch to
   * 'two-finger-only' while a drawing tool is active so single-finger touches
   * reach the editor; simulators stay on 'one-finger'.
   */
  public setTouchPanMode(mode: TouchPanMode): void {
    this.#touchPanMode = mode;
  }

  /** Recenters the viewport so `worldPoint` sits at the canvas center. */
  public recenterOn(worldPoint: Point): void {
    this.offset = scale(worldPoint, -1);
  }

  /** Converts canvas-offset coordinates to world coordinates (ignores drag). */
  #screenToWorld(x: number, y: number): Point {
    return new Point(
      (x - this.center.x) * this.zoom - this.offset.x,
      (y - this.center.y) * this.zoom - this.offset.y,
    );
  }

  #touchPanStart(p: { x: number; y: number }): void {
    this.#drag.start = this.#screenToWorld(p.x, p.y);
    this.#drag.active = true;
  }

  #touchPanMove(p: { x: number; y: number }): void {
    if (!this.#drag.active) return;
    this.#drag.end = this.#screenToWorld(p.x, p.y);
    this.#drag.offset = subtract(this.#drag.end, this.#drag.start);
  }

  #touchPanEnd(): void {
    if (!this.#drag.active) return;
    this.offset = add(this.offset, this.#drag.offset);
    this.#resetDrag();
  }

  /** Zooms toward the pinch focal point, keeping that world point under the fingers. */
  #applyPinch(scaleFactor: number, focal: { x: number; y: number }): void {
    const worldBefore = this.#screenToWorld(focal.x, focal.y);
    // Larger finger spread (scaleFactor > 1) zooms IN, which is a smaller zoom
    // value here (zoom = world units per pixel).
    const newZoom = this.#clampZoom(this.zoom / scaleFactor);
    this.zoom = newZoom;
    this.offset = new Point(
      (focal.x - this.center.x) * newZoom - worldBefore.x,
      (focal.y - this.center.y) * newZoom - worldBefore.y,
    );
  }

  #applyTwoFingerPan(dx: number, dy: number): void {
    this.offset = add(this.offset, new Point(dx * this.zoom, dy * this.zoom));
  }

  #addEventListeners(): void {
    this.canvas.addEventListener('wheel', this.#boundHandleMouseWheel, {
      passive: false,
    }); // Use WheelEvent, prevent default scroll
    this.canvas.addEventListener('mousedown', this.#boundHandleMouseDown);
    this.canvas.addEventListener('mousemove', this.#boundHandleMouseMove);
    // Listen to mouseup on the window/document to catch cases where mouse is released outside canvas
    window.addEventListener('mouseup', this.#boundHandleMouseUp);
    this.#gestures.enable();
  }

  // public removeEventListeners(): void {
  //   this.canvas.removeEventListener('wheel', this.#boundHandleMouseWheel);
  //   this.canvas.removeEventListener('mousedown', this.#boundHandleMouseDown);
  //   this.canvas.removeEventListener('mousemove', this.#boundHandleMouseMove); // May need removal from window instead if move continues outside
  //   window.removeEventListener('mouseup', this.#boundHandleMouseUp);
  // }

  #resetDrag(): void {
    this.#drag = {
      start: new Point(0, 0), // Position where drag started
      end: new Point(0, 0), // Current position during drag
      offset: new Point(0, 0), // Vector difference (end - start)
      active: false, // Is a drag currently in progress?
    };
  }

  /**
   * Handles the mousedown event to initiate panning (drag).
   * @param e - The MouseEvent object.
   */
  #handleMouseDown(e: MouseEvent): void {
    // Typically, middle mouse button (button === 1) is used for panning
    if (e.button === 1) {
      this.#drag.start = this.getMouse(e); // Record start position in world coordinates
      this.#drag.active = true;
    }
  }

  /**
   * Handles the mousemove event to update the drag offset during panning.
   * @param e - The MouseEvent object.
   */
  #handleMouseMove(e: MouseEvent): void {
    if (this.#drag.active) {
      this.#drag.end = this.getMouse(e); // Update current position
      // Calculate the vector difference from start to end
      this.#drag.offset = subtract(this.#drag.end, this.#drag.start);
    }
  }

  /**
   * Handles the mouseup event to finalize the panning operation.
   * @param e - The MouseEvent object.
   */
  #handleMouseUp(e: MouseEvent): void {
    // Only finalize if a drag was active with the middle button
    if (this.#drag.active && e.button === 1) {
      // Add the accumulated drag offset to the permanent viewport offset
      this.offset = add(this.offset, this.#drag.offset);
      // Reset the drag state for the next interaction
      this.#resetDrag();
    }
  }

  /**
   * Handles the mousewheel event to adjust zoom or pan.
   * - 'mouse' mode: wheel scroll zooms directly (Ctrl/pinch also zooms).
   * - 'touchpad' mode: two-finger scroll pans; Ctrl+scroll or pinch zooms.
   * @param e - The WheelEvent object.
   */
  #handleMouseWheel(e: WheelEvent): void {
    e.preventDefault();

    // In mouse mode the wheel always zooms. In touchpad mode only a pinch
    // gesture or an explicit Ctrl+scroll zooms; plain scrolling pans.
    if (this.mode === 'mouse' || e.ctrlKey) {
      // Zoom in/out. Scrolling up (deltaY < 0) zooms IN, scrolling down zooms
      // OUT — matching the conventional direction used by map/design tools.
      // The default step is fast; holding Shift falls back to the slower,
      // fine-grained step for precise framing.
      const direction = Math.sign(e.deltaY);
      const step = e.shiftKey ? ZOOM_STEP_SLOW : ZOOM_STEP_FAST;
      this.zoom = this.#clampZoom(this.zoom + direction * step);
    } else {
      // Two-finger scroll on trackpad → pan directly.
      this.offset = add(
        this.offset,
        new Point(-e.deltaX * this.zoom, -e.deltaY * this.zoom),
      );
    }
  }
}
