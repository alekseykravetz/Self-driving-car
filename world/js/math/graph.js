class Graph {
  constructor(points = [], segments = []) {
    this.points = points;
    this.segments = segments;
  }

  draw(ctx) {
    for (let segment of this.segments) {
      segment.draw(ctx);
    }
    for (let point of this.points) {
      point.draw(ctx);
    }
  }
}
