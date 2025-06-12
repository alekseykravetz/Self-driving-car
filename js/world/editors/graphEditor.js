'use strict';
class GraphEditor {
  viewport;
  canvas;
  graph;
  ctx;
  selected = null;
  hovered = null;
  dragging = false;
  mouse = null; // Current mouse position (relative to viewport/canvas)
  isOneWay = false;
  // Temporary points for finding shortest path operation
  startPoint = null;
  endPoint = null;
  shortestPath = null;
  boundMouseDown;
  boundMouseMove;
  boundMouseUp;
  boundContextMenu;
  boundKeyDown;
  boundKeyUp;
  constructor(viewport, graph) {
    this.viewport = viewport;
    this.canvas = viewport.canvas;
    this.graph = graph;
    this.ctx = this.canvas.getContext('2d');
    this.boundMouseDown = this.#handleMouseDown.bind(this);
    this.boundMouseMove = this.#handleMouseMove.bind(this);
    this.boundMouseUp = () => {
      this.dragging = false;
    };
    this.boundContextMenu = (e) => e.preventDefault();
    this.boundKeyDown = this.#handleKeyDown.bind(this);
    this.boundKeyUp = this.#handleKeyUp.bind(this);
  }

  #addEventListeners() {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  #removeEventListeners() {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  // Activates the graph editor by adding event listeners.
  enable() {
    this.#addEventListeners();
  }

  // Deactivates the graph editor by removing event listeners and resetting state.
  disable() {
    this.#removeEventListeners();
    this.selected = null;
    this.hovered = null;
    this.dragging = false;
    this.startPoint = null;
    this.endPoint = null;
  }

  // Handles keyboard events for specific editor actions like finding shortest path or creating one way segments.
  #handleKeyDown(e) {
    if (this.mouse) {
      if (e.key === 's') {
        this.startPoint = this.mouse;
      }
      if (e.key === 'e') {
        this.endPoint = this.mouse;
      }
    }
    if (e.key === 'c') {
      this.startPoint = null;
      this.endPoint = null;
      this.shortestPath = null;
    }
    if (e.key === 'o') {
      this.isOneWay = true;
    }
    if (this.startPoint && this.endPoint) {
      this.shortestPath = this.graph.getShortestPath(
        this.startPoint,
        this.endPoint,
      );
    }
  }

  #handleKeyUp(e) {
    if (e.key === 'o') {
      this.isOneWay = false;
      console.log(this.isOneWay);
    }
  }

  // Handles mouse movement over the canvas. Updates hovered state and drags selected points.
  #handleMouseMove(e) {
    this.mouse = this.viewport.getMouse(e, true);
    this.hovered = getNearestPoint(
      this.mouse,
      this.graph.points,
      10 * this.viewport.zoom,
    );
    if (this.dragging && this.selected) {
      // Update the position of the selected point to the current mouse position
      this.selected.x = this.mouse.x;
      this.selected.y = this.mouse.y;
    }
  }

  // Handles mouse button presses on the canvas. Manages point selection, creation, and removal.
  #handleMouseDown(e) {
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
  #selectPoint(point) {
    if (this.selected && this.selected !== point) {
      // If a point was already selected, try to create a segment to the new point
      this.graph.tryAddSegment(
        new Segment(this.selected, point, this.isOneWay),
      );
    }
    this.selected = point;
  }

  #removePoint(point) {
    this.graph.removePoint(point);
    this.hovered = null;
    if (this.selected === point) {
      this.selected = null;
    }
  }

  dispose() {
    this.graph.dispose();
    this.selected = null;
    this.hovered = null;
    this.dragging = false;
    this.mouse = null;
    this.shortestPath = null;
    this.startPoint = null;
    this.endPoint = null;
  }

  // todo: change name to draw in all editors
  // Renders the graph and editor-specific visuals (hovered, selected points, intent line) onto the canvas.
  display() {
    this.graph.draw(this.ctx);
    if (this.hovered) {
      this.hovered.draw(this.ctx, { fill: true });
    }
    if (this.selected) {
      const intent = this.hovered ?? this.mouse;
      new Segment(this.selected, intent).draw(this.ctx, {
        dash: [3, 3],
      });
      this.selected.draw(this.ctx, { outline: true });
    }
    if (this.shortestPath) {
      this.shortestPath.forEach((seg) => {
        seg.draw(this.ctx, { color: 'red', width: 4 });
      });
    }
  }
}
