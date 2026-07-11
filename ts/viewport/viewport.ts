import { Point } from '../math/primitives/point.js';
import { ScaleIndicator } from './scaleIndicator.js';
import { scale, subtract, add } from '../math/utils.js';
import { WORLD_PIXELS_PER_METER } from '../math/worldUnits.js';

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

  // Timer used to commit a touchpad pan once two-finger scrolling stops,
  // mirroring the way a mouse drag commits on mouseup.
  #wheelPanCommitTimer: ReturnType<typeof setTimeout> | null = null;

  #boundHandleMouseWheel: (e: WheelEvent) => void;
  #boundHandleMouseDown: (e: MouseEvent) => void;
  #boundHandleMouseMove: (e: MouseEvent) => void;
  #boundHandleMouseUp: (e: MouseEvent) => void;

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
  public getMouse(e: MouseEvent, subtractDragOffset: boolean = false): Point {
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

  public getPixelsPerMeter(): number {
    return WORLD_PIXELS_PER_METER / this.zoom;
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

  #addEventListeners(): void {
    this.canvas.addEventListener('wheel', this.#boundHandleMouseWheel, {
      passive: false,
    }); // Use WheelEvent, prevent default scroll
    this.canvas.addEventListener('mousedown', this.#boundHandleMouseDown);
    this.canvas.addEventListener('mousemove', this.#boundHandleMouseMove);
    // Listen to mouseup on the window/document to catch cases where mouse is released outside canvas
    window.addEventListener('mouseup', this.#boundHandleMouseUp);
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
      // Zoom in/out
      const direction = Math.sign(e.deltaY);
      const step = 0.1;
      this.zoom -= direction * step;
      this.zoom = Math.max(1, Math.min(5, this.zoom));
    } else {
      // Two-finger scroll on trackpad → pan.
      // Accumulate the pan into the temporary drag offset (the same layer the
      // mouse middle-drag uses) so it stays visible even while an external
      // owner — e.g. car tracking — keeps overwriting the permanent offset.
      this.#drag.active = true;
      this.#drag.offset = add(
        this.#drag.offset,
        new Point(-e.deltaX * this.zoom, -e.deltaY * this.zoom),
      );
      // Commit the accumulated pan once scrolling pauses, like a mouseup.
      this.#scheduleWheelPanCommit();
    }
  }

  /**
   * Commits the accumulated touchpad pan from the temporary drag offset into
   * the permanent offset after two-finger scrolling stops. This mirrors the
   * mouseup behaviour: on free-panning pages the pan persists, while on
   * tracking pages the permanent offset is overwritten next frame so the view
   * snaps back to the tracked target.
   */
  #scheduleWheelPanCommit(): void {
    if (this.#wheelPanCommitTimer !== null) {
      clearTimeout(this.#wheelPanCommitTimer);
    }
    this.#wheelPanCommitTimer = setTimeout(() => {
      this.offset = add(this.offset, this.#drag.offset);
      this.#resetDrag();
      this.#wheelPanCommitTimer = null;
    }, 150);
  }
}
