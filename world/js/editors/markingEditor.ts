class MarkingEditor {
  protected viewport: Viewport;
  protected world: World;
  protected targetSegments: Segment[]; // Segments where markings can be placed
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected mouse: Point | null = null;
  protected intent: Marking | null = null; // The marking preview
  protected markings: Marking[]; // Reference to world.markings

  // Bound event listeners for correct 'this' context and removal
  private boundMouseDown: (event: MouseEvent) => void;
  private boundMouseMove: (event: MouseEvent) => void;
  private boundContextMenu: (event: MouseEvent) => void;

  constructor(
    viewport: Viewport,
    world: World,
    targetSegments: Segment[] = world.graph.segments,
  ) {
    this.viewport = viewport;
    this.world = world;
    this.targetSegments = targetSegments;

    this.canvas = viewport.canvas;
    this.ctx = this.canvas.getContext('2d')!;

    this.markings = world.markings; // Store reference

    // Initialize bound functions here to ensure 'this' is correct
    this.boundMouseDown = this.#handleMouseDown.bind(this);
    this.boundMouseMove = this.#handleMouseMove.bind(this);
    this.boundContextMenu = (e: MouseEvent) => e.preventDefault();
  }

  /**
   * Creates a new marking instance. To be overridden by subclasses
   * for specific marking types.
   * @param center The center point of the marking.
   * @param directionVector The orientation vector of the marking.
   * @returns A new Marking instance.
   */
  createMarking(center: Point, directionVector: Point): Marking {
    // Base implementation creates a generic Marking
    return new Marking(
      center,
      directionVector,
      this.world.roadWidth, // Default width
      this.world.roadWidth, // Default height
    );
  }

  /** Enables the editor by adding event listeners. */
  enable(): void {
    this.#addEventListeners();
  }

  /** Disables the editor by removing event listeners and clearing intent. */
  disable(): void {
    this.#removeEventListeners();
    this.intent = null; // Clear preview when disabled
  }

  /** Adds necessary event listeners to the canvas. */
  #addEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    // Prevent default right-click menu
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
  }

  /** Removes event listeners from the canvas. */
  #removeEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
  }

  /** Handles mouse movement to update the marking intent (preview). */
  #handleMouseMove(e: MouseEvent): void {
    this.mouse = this.viewport.getMouse(e, true);
    // Find the nearest segment within a threshold based on zoom level
    const segment = getNearestSegment(
      this.mouse,
      this.targetSegments,
      10 * this.viewport.zoom, // Threshold scales with zoom
    );

    if (segment) {
      // Project the mouse point onto the segment
      const proj = segment.projectPoint(this.mouse);
      // Check if the projected point lies within the segment bounds (offset 0 to 1)
      if (proj.offset >= 0 && proj.offset <= 1) {
        // Create a marking preview (intent) at the projected point
        this.intent = this.createMarking(proj.point, segment.directionVector());
      } else {
        this.intent = null; // Mouse is beyond segment ends
      }
    } else {
      this.intent = null; // No segment nearby
    }
  }

  /** Handles mouse down events to place or remove markings. */
  #handleMouseDown(e: MouseEvent): void {
    if (!this.mouse) return; // Make sure mouse position is available

    // Left click (Place marking)
    if (e.button === 0) {
      if (this.intent) {
        // Add the current intent to the world's markings array
        this.markings.push(this.intent);
        this.intent = null; // Clear intent after placing
      }
    }
    // Right click (Remove marking)
    if (e.button === 2) {
      // Iterate backwards for safe removal while looping
      for (let i = this.markings.length - 1; i >= 0; i--) {
        const poly = this.markings[i].polygon;
        // Check if the mouse click is inside the marking's polygon
        if (poly.containsPoint(this.mouse)) {
          this.markings.splice(i, 1); // Remove the marking
          // It's possible multiple markings overlap, maybe only remove one?
          // Return here removes only the first one found under the cursor.
          return;
        }
      }
    }
  }

  /** Displays the current marking intent (preview) on the canvas. */
  display(): void {
    if (this.intent) {
      this.intent.draw(this.ctx);
    }
  }
}
