class GraphEditor {
  #viewport: Viewport;
  #canvas: HTMLCanvasElement;
  #graph: Graph;
  #ctx: CanvasRenderingContext2D;

  #selected: Point | null = null;
  #hovered: Point | null = null;
  #dragging: boolean = false;
  #mouse: Point | null = null; // Current mouse position (relative to viewport/canvas)
  #isOneWay: boolean = false;
  #isSeparated: boolean = false;

  // One-way mode is active while the 'o' key is held OR while latched on via a
  // click on the shortcuts toolbar. The effective `isOneWay` is `held || latched`.
  #oneWayHeld: boolean = false;
  #oneWayLatched: boolean = false;

  // Hard-separation mode mirrors one-way: active while 'h' is held OR latched.
  #separatedHeld: boolean = false;
  #separatedLatched: boolean = false;
  #toolbar: ShortcutsToolbarElement | null = null;

  // Temporary points for finding shortest path operation
  #startPoint: Point | null = null;
  #endPoint: Point | null = null;
  public shortestPath?: Segment[] | null = null;

  #boundMouseDown: (event: MouseEvent) => void;
  #boundMouseMove: (event: MouseEvent) => void;
  #boundMouseUp: () => void;
  #boundContextMenu: (event: MouseEvent) => void;
  #boundKeyDown: (event: KeyboardEvent) => void;
  #boundKeyUp: (event: KeyboardEvent) => void;

  constructor(viewport: Viewport, graph: Graph) {
    this.#viewport = viewport;
    this.#canvas = viewport.canvas;
    this.#graph = graph;

    this.#ctx = this.#canvas.getContext('2d')!;

    this.#boundMouseDown = this.#handleMouseDown.bind(this);
    this.#boundMouseMove = this.#handleMouseMove.bind(this);
    this.#boundMouseUp = () => {
      this.#dragging = false;
    };
    this.#boundContextMenu = (e: MouseEvent) => e.preventDefault();
    this.#boundKeyDown = this.#handleKeyDown.bind(this);
    this.#boundKeyUp = this.#handleKeyUp.bind(this);
  }

  #addEventListeners(): void {
    this.#canvas.addEventListener('mousedown', this.#boundMouseDown);
    this.#canvas.addEventListener('mousemove', this.#boundMouseMove);
    this.#canvas.addEventListener('mouseup', this.#boundMouseUp);
    this.#canvas.addEventListener('contextmenu', this.#boundContextMenu);
    window.addEventListener('keydown', this.#boundKeyDown);
    window.addEventListener('keyup', this.#boundKeyUp);
  }

  #removeEventListeners(): void {
    this.#canvas.removeEventListener('mousedown', this.#boundMouseDown);
    this.#canvas.removeEventListener('mousemove', this.#boundMouseMove);
    this.#canvas.removeEventListener('mouseup', this.#boundMouseUp);
    this.#canvas.removeEventListener('contextmenu', this.#boundContextMenu);
    window.removeEventListener('keydown', this.#boundKeyDown);
  }

  // Activates the graph editor by adding event listeners.
  public enable(): void {
    this.#addEventListeners();
  }

  /**
   * Connect the shared <shortcuts-toolbar> so key actions light their
   * indicators and the one-way toggle can be latched by clicking it.
   */
  public setShortcutsToolbar(toolbar: ShortcutsToolbarElement): void {
    this.#toolbar = toolbar;
    toolbar.setClickListener((id) => {
      if (id === 'keyO') {
        this.#oneWayLatched = !this.#oneWayLatched;
        this.#updateOneWay();
      }
      if (id === 'keyH') {
        this.#separatedLatched = !this.#separatedLatched;
        this.#updateSeparated();
      }
    });
    this.#updateOneWay();
    this.#updateSeparated();
  }

  // Deactivates the graph editor by removing event listeners and resetting state.
  public disable(): void {
    this.#removeEventListeners();
    this.#selected = null;
    this.#hovered = null;
    this.#dragging = false;
    this.#startPoint = null;
    this.#endPoint = null;
  }

  // Handles keyboard events for specific editor actions like finding shortest path or creating one way segments.
  #handleKeyDown(e: KeyboardEvent): void {
    if (this.#mouse) {
      if (e.key === 's') {
        this.#startPoint = this.#mouse;
        this.#toolbar?.flash('keyS');
      }
      if (e.key === 'e') {
        this.#endPoint = this.#mouse;
        this.#toolbar?.flash('keyE');
      }
    }

    if (e.key === 'c') {
      this.#startPoint = null;
      this.#endPoint = null;
      this.shortestPath = null;
      this.#toolbar?.flash('keyC');
    }
    if (e.key === 'o') {
      this.#oneWayHeld = true;
      this.#updateOneWay();
    }
    if (e.key === 'h') {
      this.#separatedHeld = true;
      this.#updateSeparated();
    }

    if (this.#startPoint && this.#endPoint) {
      this.shortestPath = this.#graph.getShortestPath(
        this.#startPoint,
        this.#endPoint,
      );
    }
  }

  #handleKeyUp(e: KeyboardEvent): void {
    if (e.key === 'o') {
      this.#oneWayHeld = false;
      this.#updateOneWay();
    }
    if (e.key === 'h') {
      this.#separatedHeld = false;
      this.#updateSeparated();
    }
  }

  // Recompute the effective one-way state (held OR latched) and sync the
  // toolbar indicator.
  #updateOneWay(): void {
    this.#isOneWay = this.#oneWayHeld || this.#oneWayLatched;
    this.#toolbar?.setActive('keyO', this.#isOneWay);
  }

  // Recompute the effective hard-separation state (held OR latched) and sync
  // the toolbar indicator.
  #updateSeparated(): void {
    this.#isSeparated = this.#separatedHeld || this.#separatedLatched;
    this.#toolbar?.setActive('keyH', this.#isSeparated);
  }

  // Handles mouse movement over the canvas. Updates hovered state and drags selected points.
  #handleMouseMove(e: MouseEvent): void {
    this.#mouse = this.#viewport.getMouse(e, true);
    this.#hovered = getNearestPoint(
      this.#mouse,
      this.#graph.points,
      10 * this.#viewport.zoom, // Use dynamic threshold based on zoom
    );

    if (this.#dragging && this.#selected) {
      // Update the position of the selected point to the current mouse position
      this.#selected.x = this.#mouse.x;
      this.#selected.y = this.#mouse.y;
    }
  }

  // Handles mouse button presses on the canvas. Manages point selection, creation, and removal.
  #handleMouseDown(e: MouseEvent): void {
    // Right-click (button === 2)
    if (e.button === 2) {
      if (this.#selected) {
        // If a point is selected, deselect it on right-click
        this.#selected = null;
      } else if (this.#hovered) {
        // If hovering over a point and nothing is selected, remove the hovered point
        this.#removePoint(this.#hovered);
      }
    }

    // Left-click (button === 0)
    if (e.button === 0) {
      if (this.#mouse) {
        if (this.#hovered) {
          // If clicking on an existing point (hovered)
          this.#selectPoint(this.#hovered); // Select it (and try to add segment if another was selected)
          this.#dragging = true; // Start dragging the selected point
          return; // Prevent adding a new point
        }
        // If clicking on empty space, add a new point at the mouse position
        this.#graph.addPoint(this.#mouse);
        // Select the newly added point
        this.#selectPoint(this.#mouse);
        // The new point is now also the hovered point
        this.#hovered = this.#mouse;
      }
    }
  }

  /**
   * Selects a point. If another point was previously selected, attempts to add a segment between them.
   * @param point - The point to select.
   */
  #selectPoint(point: Point): void {
    if (this.#selected && this.#selected !== point) {
      // If a point was already selected, try to create a segment to the new point
      this.#graph.tryAddSegment(
        new Segment(this.#selected, point, this.#isOneWay, this.#isSeparated),
      );
    }
    this.#selected = point;
  }

  #removePoint(point: Point): void {
    this.#graph.removePoint(point);
    this.#hovered = null;
    if (this.#selected === point) {
      this.#selected = null;
    }
  }

  public dispose(): void {
    this.#graph.dispose();
    this.#selected = null;
    this.#hovered = null;
    this.#dragging = false;
    this.#mouse = null;
    this.shortestPath = null;
    this.#startPoint = null;
    this.#endPoint = null;
  }

  // todo: change name to draw in all editors
  // Renders the graph and editor-specific visuals (hovered, selected points, intent line) onto the canvas.
  public display(): void {
    this.#graph.draw(this.#ctx);

    if (this.#hovered) {
      drawPoint(this.#ctx, this.#hovered, { fill: true });
    }

    if (this.#selected) {
      const intent = this.#hovered ?? this.#mouse;
      const segment = new Segment(this.#selected, intent!);
      drawSegment(this.#ctx, segment, {
        dash: [3, 3],
      });
      this.#drawIntentMeasurements(segment);
      drawPoint(this.#ctx, this.#selected, { outline: true });
    }

    if (this.shortestPath) {
      this.shortestPath.forEach((seg) => {
        drawSegment(this.#ctx, seg, { color: 'red', width: 8 });
      });
    }
  }

  #drawIntentMeasurements(segment: Segment): void {
    const lengthPx = segment.length();
    if (lengthPx < 1) return;

    const dir = subtract(segment.p2, segment.p1);
    const angleFromStart = Math.atan2(dir.y, dir.x);
    const label = `${formatMetersFromWorldPixels(lengthPx)}  ${formatDegrees(angleFromStart)}`;
    const paddingX = 8;
    const paddingY = 5;
    const gap = 12 * this.#viewport.zoom;
    const fontSize = 13 * this.#viewport.zoom;
    const normal = perpendicular(normalize(dir));
    const anchor = add(segment.p2, scale(normal, gap));

    this.#ctx.save();
    this.#ctx.font = `${fontSize}px Arial`;
    this.#ctx.textBaseline = 'middle';

    const width = this.#ctx.measureText(label).width + paddingX * 2;
    const height = fontSize + paddingY * 2;
    const x = anchor.x - width / 2;
    const y = anchor.y - height / 2;

    this.#ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    this.#ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    this.#ctx.lineWidth = 1 * this.#viewport.zoom;
    this.#ctx.beginPath();
    this.#ctx.roundRect(x, y, width, height, 4 * this.#viewport.zoom);
    this.#ctx.fill();
    this.#ctx.stroke();

    this.#ctx.fillStyle = '#111';
    this.#ctx.fillText(label, x + paddingX, anchor.y);
    this.#ctx.restore();
  }
}
