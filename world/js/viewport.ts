interface DragState {
  start: Point;
  end: Point;
  offset: Point; // The difference between end and start during a drag
  active: boolean;
}

class Viewport {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public zoom: number;
  public center: Point; // Center of the canvas element itself
  public offset: Point; // Offset of the world origin relative to the scaled canvas center
  // Internal state for handling panning/dragging
  private drag: DragState = {
    start: new Point(0, 0), // Position where drag started
    end: new Point(0, 0), // Current position during drag
    offset: new Point(0, 0), // Vector difference (end - start)
    active: false, // Is a drag currently in progress?
  };

  private boundHandleMouseWheel: (e: WheelEvent) => void;
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;

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
    this.ctx = canvas.getContext('2d')!;

    this.zoom = zoom;
    // Canvas center remains fixed relative to the canvas element
    this.center = new Point(canvas.width / 2, canvas.height / 2);
    // Initial offset: use provided one or default to negative center (world origin at top-left)
    this.offset = offset ?? scale(this.center, -1); // Nullish coalescing for default

    // Bind event handlers
    this.boundHandleMouseWheel = this.#handleMouseWheel.bind(this);
    this.boundHandleMouseDown = this.#handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.#handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.#handleMouseUp.bind(this);

    this.#addEventListeners();
  }

  /**
   * Applies the current viewport transform (pan and zoom) to the canvas context.
   * Should be called at the beginning of each render loop.
   */
  public reset(): void {
    this.ctx.restore(); // Restore to default state (clears previous transforms)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the canvas
    this.ctx.save(); // Save the clean state before applying new transforms

    // Move canvas origin to the center, apply zoom, then apply offset
    this.ctx.translate(this.center.x, this.center.y);
    this.ctx.scale(1 / this.zoom, 1 / this.zoom);
    const totalOffset = this.getOffset(); // Includes permanent offset and active drag
    this.ctx.translate(totalOffset.x, totalOffset.y);
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
    return subtractDragOffset ? subtract(p, this.drag.offset) : p;
  }

  /**
   * Gets the current total offset, including the base offset and any active drag offset.
   * This is the offset used when applying transformations in reset().
   * @returns The total offset Point.
   */
  public getOffset(): Point {
    // Total offset is the permanent offset plus the current drag offset
    return add(this.offset, this.drag.offset);
  }

  #addEventListeners(): void {
    this.canvas.addEventListener('wheel', this.boundHandleMouseWheel, {
      passive: false,
    }); // Use WheelEvent, prevent default scroll
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    // Listen to mouseup on the window/document to catch cases where mouse is released outside canvas
    window.addEventListener('mouseup', this.boundHandleMouseUp);
  }

  // public removeEventListeners(): void {
  //   this.canvas.removeEventListener('wheel', this.boundHandleMouseWheel);
  //   this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
  //   this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove); // May need removal from window instead if move continues outside
  //   window.removeEventListener('mouseup', this.boundHandleMouseUp);
  // }

  #resetDrag(): void {
    this.drag = {
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
      this.drag.start = this.getMouse(e); // Record start position in world coordinates
      this.drag.active = true;
    }
  }

  /**
   * Handles the mousemove event to update the drag offset during panning.
   * @param e - The MouseEvent object.
   */
  #handleMouseMove(e: MouseEvent): void {
    if (this.drag.active) {
      this.drag.end = this.getMouse(e); // Update current position
      // Calculate the vector difference from start to end
      this.drag.offset = subtract(this.drag.end, this.drag.start);
    }
  }

  /**
   * Handles the mouseup event to finalize the panning operation.
   * @param e - The MouseEvent object.
   */
  #handleMouseUp(e: MouseEvent): void {
    // Only finalize if a drag was active with the middle button
    if (this.drag.active && e.button === 1) {
      // Add the accumulated drag offset to the permanent viewport offset
      this.offset = add(this.offset, this.drag.offset);
      // Reset the drag state for the next interaction
      this.#resetDrag();
    }
  }

  /**
   * Handles the mousewheel event to adjust the zoom level.
   * @param e - The WheelEvent object.
   */
  #handleMouseWheel(e: WheelEvent): void {
    e.preventDefault();
    const direction = Math.sign(e.deltaY); // -1 for wheel up (zoom in), 1 for wheel down (zoom out)
    const step = 0.1;
    this.zoom -= direction * step; // Adjust zoom (subtracting direction reverses zoom sense)
    this.zoom = Math.max(1, Math.min(5, this.zoom)); // Clamp zoom between 1x and 5x (adjust as needed)
  }
}
