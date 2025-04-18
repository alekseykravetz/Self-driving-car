'use strict';
class Graph {
  points;
  segments;
  constructor(points = [], segments = []) {
    this.points = points;
    this.segments = segments;
  }

  static load(info) {
    const points = info.points.map((i) => new Point(i.x, i.y));
    const segments = info.segments.map(
      (i) =>
        new Segment(
          points.find((p) => p.equals(i.p1)),
          points.find((p) => p.equals(i.p2)),
          i.oneWay,
        ),
    );
    return new Graph(points, segments);
  }

  hash() {
    return JSON.stringify(this);
  }

  addPoint(point) {
    this.points.push(point);
  }

  containsPoint(point) {
    return this.points.find((p) => p.equals(point));
  }

  tryAddPoint(point) {
    if (!this.containsPoint(point)) {
      this.addPoint(point);
      return true;
    }
    return false;
  }

  removePoint(point) {
    const segments = this.getSegmentsWithPoint(point);
    for (let segment of segments) {
      this.removeSegment(segment);
    }
    this.points.splice(this.points.indexOf(point), 1);
  }

  getSegmentsWithPoint(point) {
    return this.segments.filter((segment) => segment.includes(point));
  }

  getSegmentsLeavingFromPoint(point) {
    return this.segments.filter((segment) =>
      segment.oneWay ? segment.p1.equals(point) : segment.includes(point),
    );
  }

  addSegment(segment) {
    this.segments.push(segment);
  }

  containsSegment(segment) {
    return this.segments.find((s) => s.equals(segment));
  }

  tryAddSegment(segment) {
    if (!this.containsSegment(segment) && !segment.p1.equals(segment.p2)) {
      this.addSegment(segment);
      return true;
    }
    return false;
  }

  removeSegment(segment) {
    this.segments.splice(this.segments.indexOf(segment), 1);
  }

  getShortestPath(start, end) {
    const startSeg = getNearestSegment(start, this.segments);
    const endSeg = getNearestSegment(end, this.segments);
    const { point: projStart } = startSeg.projectPoint(start);
    const { point: projEnd } = endSeg.projectPoint(end);
    this.points.push(projStart);
    this.points.push(projEnd);
    const tempSegments = [
      new Segment(startSeg.p1, projStart),
      new Segment(projStart, startSeg.p2),
      new Segment(endSeg.p1, projEnd),
      new Segment(projEnd, endSeg.p2),
    ];
    if (startSeg.equals(endSeg)) {
      tempSegments.push(new Segment(projStart, projEnd));
    }
    this.segments = this.segments.concat(tempSegments);
    const path = this.#getShortestPath(projStart, projEnd);
    this.removePoint(projStart);
    this.removePoint(projEnd);
    const segments = [];
    for (let i = 1; i < path.length; i++) {
      segments.push(new Segment(path[i - 1], path[i]));
    }
    return segments;
  }

  #getShortestPath(start, end) {
    for (const point of this.points) {
      point.distance = Number.MAX_SAFE_INTEGER;
      point.visited = false;
    }
    let currentPoint = start;
    currentPoint.distance = 0;
    while (!end.visited) {
      const segments = this.getSegmentsLeavingFromPoint(currentPoint);
      for (let segment of segments) {
        const otherPoint = segment.p1.equals(currentPoint)
          ? segment.p2
          : segment.p1;
        if (currentPoint.distance + segment.length() < otherPoint.distance) {
          otherPoint.distance = currentPoint.distance + segment.length();
          otherPoint.previous = currentPoint;
        }
      }
      currentPoint.visited = true;
      const unvisited = this.points.filter((p) => !p.visited);
      const distances = unvisited.map((p) => p.distance);
      currentPoint = unvisited.find(
        (p) => p.distance === Math.min(...distances),
      );
      // currentPoint = unvisited.sort((a, b) =>
      //   a.distance && b.distance ? a.distance - b.distance : 0,
      // )[0];
    }
    const path = [];
    currentPoint = end;
    while (currentPoint) {
      path.unshift(currentPoint);
      currentPoint = currentPoint.previous;
    }
    for (const point of this.points) {
      delete point.distance;
      delete point.visited;
      delete point.previous;
    }
    return path;
  }

  dispose() {
    // re instantiated the same reference
    this.points.length = 0;
    this.segments.length = 0;
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
