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
          i.separated,
        ),
    );
    return new Graph(points, segments);
  }

  /**
   * Cheap change-detection signature. Folds point coordinates and segment
   * endpoints/flags into a 32-bit hash (FNV-1a style). Runs every frame in the
   * editor, so it deliberately avoids `JSON.stringify` — on large worlds that
   * allocated a multi-megabyte string per frame and dominated the frame budget.
   */
  hash() {
    let h = 2166136261;
    const mix = (n) => {
      h ^= n | 0;
      h = Math.imul(h, 16777619);
    };
    mix(this.points.length);
    for (const p of this.points) {
      mix(p.x * 1000);
      mix(p.y * 1000);
    }
    mix(this.segments.length);
    for (const s of this.segments) {
      mix(s.p1.x * 1000);
      mix(s.p1.y * 1000);
      mix(s.p2.x * 1000);
      mix(s.p2.y * 1000);
      mix((s.oneWay ? 1 : 0) | (s.separated ? 2 : 0));
    }
    return (h >>> 0).toString(36);
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
    const tempSegments = [
      new Segment(startSeg.p1, projStart, startSeg.oneWay),
      new Segment(projStart, startSeg.p2, startSeg.oneWay),
      new Segment(endSeg.p1, projEnd, endSeg.oneWay),
      new Segment(projEnd, endSeg.p2, endSeg.oneWay),
    ];
    if (startSeg.equals(endSeg)) {
      tempSegments.push(new Segment(projStart, projEnd));
    }
    // Run Dijkstra on a temporary augmented graph instead of mutating the real
    // one. Reassigning fresh arrays (rather than push/removePoint) avoids a bug
    // where a projected point that coincides with an existing vertex would,
    // on removePoint, delete the REAL segments touching that vertex (equals-
    // based matching). Restoring the original arrays guarantees no corruption.
    const savedPoints = this.points;
    const savedSegments = this.segments;
    this.points = [...savedPoints, projStart, projEnd];
    this.segments = [...savedSegments, ...tempSegments];
    const path = this.#getShortestPath(projStart, projEnd);
    this.points = savedPoints;
    this.segments = savedSegments;
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
      drawSegment(ctx, segment);
    }
    for (let point of this.points) {
      drawPoint(ctx, point);
    }
  }
}
