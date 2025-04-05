class GraphEditor {
  private viewport: Viewport;
  private canvas: HTMLCanvasElement;
  private graph: Graph;
  private ctx: CanvasRenderingContext2D;

  private selected: Point | null = null;
  private hovered: Point | null = null;
  private dragging: boolean = false;
  private mouse: Point | null = null; // Current mouse position (relative to viewport/canvas)

  // Store bound functions for correct 'this' and easy removal
  private boundMouseDown: (event: MouseEvent) => void;
  private boundMouseMove: (event: MouseEvent) => void;
  private boundMouseUp: () => void;
  private boundContextMenu: (event: MouseEvent) => void;
  private boundKeyDown: (event: KeyboardEvent) => void;

  // Temporary points for specific operations (like corridor generation)
  private startPoint: Point | null = null;
  private endPoint: Point | null = null;

  constructor(viewport: Viewport, graph: Graph) {
    this.viewport = viewport;
    this.canvas = viewport.canvas;
    this.graph = graph;

    this.ctx = this.canvas.getContext('2d')!;

    // Initialize bound functions in the constructor
    this.boundMouseDown = this.#handleMouseDown.bind(this);
    this.boundMouseMove = this.#handleMouseMove.bind(this);
    this.boundMouseUp = () => {
      this.dragging = false;
    };
    this.boundContextMenu = (e: MouseEvent) => e.preventDefault();
    this.boundKeyDown = this.#handleKeyDown.bind(this);
  }

  /**
   * Activates the graph editor by adding event listeners.
   */
  public enable(): void {
    this.#addEventListeners();
  }

  /**
   * Deactivates the graph editor by removing event listeners and resetting state.
   */
  public disable(): void {
    this.#removeEventListeners();
    this.selected = null;
    this.hovered = null;
    this.dragging = false;
    this.startPoint = null;
    this.endPoint = null;
  }

  #addEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  #removeEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  /**
   * Handles keyboard events for specific editor actions.
   */
  #handleKeyDown(e: KeyboardEvent): void {
    if (this.mouse) {
      if (e.key === 's') {
        this.startPoint = this.mouse;
        console.log('Start point set:', this.startPoint);
      }
      if (e.key === 'e') {
        this.endPoint = this.mouse;
        console.log('End point set:', this.endPoint);
      }
    }

    if (this.startPoint && this.endPoint) {
      // todo: global world reference needs to be handled appropriately
      // world.generateCorridor(this.startPoint, this.endPoint);
    }
  }

  /**
   * Handles mouse movement over the canvas. Updates hovered state and drags selected points.
   */
  #handleMouseMove(e: MouseEvent): void {
    this.mouse = this.viewport.getMouse(e, true);
    this.hovered = getNearestPoint(
      this.mouse,
      this.graph.points,
      10 * this.viewport.zoom, // Use dynamic threshold based on zoom
    );

    if (this.dragging && this.selected) {
      // Update the position of the selected point to the current mouse position
      this.selected.x = this.mouse.x;
      this.selected.y = this.mouse.y;
    }
  }

  /**
   * Handles mouse button presses on the canvas. Manages point selection, creation, and removal.
   */
  #handleMouseDown(e: MouseEvent): void {
    // Right-click (button === 2)
    if (e.button === 2) {
      if (this.selected) {
        // If a point is selected, deselect it on right-click
        this.selected = null;
      } else if (this.hovered) {
        // If hovering over a point and nothing is selected, remove the hovered point
        this.#removePoint(this.hovered);
      }
    }

    // Left-click (button === 0)
    if (e.button === 0) {
      if (this.mouse) {
        // Ensure mouse position is available
        if (this.hovered) {
          // If clicking on an existing point (hovered)
          this.#selectPoint(this.hovered); // Select it (and try to add segment if another was selected)
          this.dragging = true; // Start dragging the selected point
          return; // Prevent adding a new point
        }
        // If clicking on empty space, add a new point at the mouse position
        this.graph.addPoint(this.mouse);
        // Select the newly added point
        this.#selectPoint(this.mouse);
        // The new point is now also the hovered point
        this.hovered = this.mouse;
      }
    }
  }

  /**
   * Selects a point. If another point was previously selected, attempts to add a segment between them.
   * @param point - The point to select.
   */
  #selectPoint(point: Point): void {
    if (this.selected && this.selected !== point) {
      // If a point was already selected, try to create a segment to the new point
      this.graph.tryAddSegment(new Segment(this.selected, point));
    }
    // Set the clicked point as the currently selected point
    this.selected = point;
  }

  #removePoint(point: Point): void {
    this.graph.removePoint(point);
    this.hovered = null;
    if (this.selected === point) {
      this.selected = null;
    }
    if (this.startPoint === point) {
      this.startPoint = null;
    }
    if (this.endPoint === point) {
      this.endPoint = null;
    }
  }

  public dispose(): void {
    this.graph.dispose();
    this.selected = null;
    this.hovered = null;
  }

  /**
   * Renders the graph and editor-specific visuals (hovered, selected points, intent line) onto the canvas.
   */
  public display(): void {
    this.graph.draw(this.ctx);

    if (this.hovered) {
      this.hovered.draw(this.ctx, { fill: true });
    }

    if (this.selected) {
      const intent = this.hovered ?? this.mouse;
      new Segment(this.selected, intent!).draw(this.ctx, {
        dash: [3, 3],
      });
      this.selected.draw(this.ctx, { outline: true });
    }
  }
}
