class MarkingEditor {
  constructor(viewport, world, targetSegments = world.graph.segments) {
    this.viewport = viewport;
    this.world = world;

    this.canvas = viewport.canvas;
    this.ctx = this.canvas.getContext('2d');

    this.mouse = null;
    this.intent = null;

    this.targetSegments = targetSegments;

    this.markings = world.markings;
  }

  // to be overwritten
  createMarking(center, directionVector) {
    return new Marking(
      center,
      directionVector,
      world.roadWidth,
      world.roadWidth,
    );
    // return center;
  }

  enable() {
    this.#addEventListeners();
  }

  disable() {
    this.#removeEventListeners();
  }

  #addEventListeners() {
    this.boundMouseDown = this.#handleMouseDown.bind(this);
    this.boundMouseMove = this.#handleMouseMove.bind(this);
    this.boundContextMenu = (e) => e.preventDefault();

    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
  }

  #removeEventListeners() {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
  }

  #handleMouseMove(e) {
    this.mouse = this.viewport.getMouse(e, true);
    const segment = getNearestSegment(
      this.mouse,
      this.targetSegments,
      10 * this.viewport.zoom,
    );
    if (segment) {
      const proj = segment.projectPoint(this.mouse);
      if (proj.offset >= 0 && proj.offset <= 1) {
        this.intent = this.createMarking(proj.point, segment.directionVector());
      } else {
        this.intent = null;
      }
    } else {
      this.intent = null;
    }
  }

  #handleMouseDown(e) {
    // left click
    if (e.button === 0) {
      if (this.intent) {
        this.markings.push(this.intent);
        this.intent = null;
      }
    }
    // right click
    if (e.button === 2) {
      for (let i = 0; i < this.markings.length; i++) {
        const poly = this.markings[i].polygon;
        if (poly.containsPoint(this.mouse)) {
          this.markings.splice(i, 1);
          return;
        }
      }
    }
  }

  display() {
    if (this.intent) {
      this.intent.draw(this.ctx);
    }
  }
}
