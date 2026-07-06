import { Point } from '../primitives/point.js';
import { Segment } from '../primitives/segment.js';
import { getNearestSegment } from '../utils.js';
import { drawPoint } from '../../rendering/pointRenderer.js';
import { drawSegment } from '../../rendering/segmentRenderer.js';

type ShortestPathPoint = Point & {
  distance: number;
  visited: boolean;
  previous: ShortestPathPoint;
};

export class Graph {
  points: Point[];
  segments: Segment[];

  constructor(points: Point[] = [], segments: Segment[] = []) {
    this.points = points;
    this.segments = segments;
  }

  static load(info: Graph): Graph {
    const points = info.points.map((i) => new Point(i.x, i.y));
    const segments = info.segments.map(
      (i) =>
        new Segment(
          points.find((p) => p.equals(i.p1 as Point))!,
          points.find((p) => p.equals(i.p2 as Point))!,
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
  hash(): string {
    let h = 2166136261;
    const mix = (n: number): void => {
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

  addPoint(point: Point): void {
    this.points.push(point);
  }

  containsPoint(point: Point): Point | undefined {
    return this.points.find((p) => p.equals(point));
  }

  tryAddPoint(point: Point): boolean {
    if (!this.containsPoint(point)) {
      this.addPoint(point);
      return true;
    }
    return false;
  }

  removePoint(point: Point): void {
    const segments = this.getSegmentsWithPoint(point);
    for (let segment of segments) {
      this.removeSegment(segment);
    }
    this.points.splice(this.points.indexOf(point), 1);
  }

  getSegmentsWithPoint(point: Point): Segment[] {
    return this.segments.filter((segment) => segment.includes(point));
  }

  getSegmentsLeavingFromPoint(point: Point): Segment[] {
    return this.segments.filter((segment) =>
      segment.oneWay ? segment.p1.equals(point) : segment.includes(point),
    );
  }

  addSegment(segment: Segment): void {
    this.segments.push(segment);
  }

  containsSegment(segment: Segment): Segment | undefined {
    return this.segments.find((s) => s.equals(segment));
  }

  tryAddSegment(segment: Segment): boolean {
    if (!this.containsSegment(segment) && !segment.p1.equals(segment.p2)) {
      this.addSegment(segment);
      return true;
    }
    return false;
  }

  removeSegment(segment: Segment): void {
    this.segments.splice(this.segments.indexOf(segment), 1);
  }

  getShortestPath(start: Point, end: Point): Segment[] {
    const startSeg = getNearestSegment(start, this.segments)!;
    const endSeg = getNearestSegment(end, this.segments)!;

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

  #getShortestPath(start: Point, end: Point): Point[] {
    for (const point of this.points as ShortestPathPoint[]) {
      point.distance = Number.MAX_SAFE_INTEGER;
      point.visited = false;
    }

    let currentPoint: ShortestPathPoint = start as ShortestPathPoint;
    currentPoint.distance = 0;

    while (!(end as ShortestPathPoint).visited) {
      const segments = this.getSegmentsLeavingFromPoint(currentPoint);
      for (let segment of segments) {
        const otherPoint = segment.p1.equals(currentPoint)
          ? (segment.p2 as ShortestPathPoint)
          : (segment.p1 as ShortestPathPoint);
        if (currentPoint.distance + segment.length() < otherPoint.distance) {
          otherPoint.distance = currentPoint.distance + segment.length();
          otherPoint.previous = currentPoint;
        }
      }
      currentPoint.visited = true;

      const unvisited = (this.points as ShortestPathPoint[]).filter(
        (p) => !p.visited,
      );
      const distances = unvisited.map((p) => p.distance);
      currentPoint = unvisited.find(
        (p) => p.distance === Math.min(...distances),
      )!;
      // currentPoint = unvisited.sort((a, b) =>
      //   a.distance && b.distance ? a.distance - b.distance : 0,
      // )[0];
    }

    const path: ShortestPathPoint[] = [];
    currentPoint = end as ShortestPathPoint;
    while (currentPoint) {
      path.unshift(currentPoint);
      currentPoint = currentPoint.previous;
    }

    for (const point of this.points as ShortestPathPoint[]) {
      delete (point as Partial<ShortestPathPoint>).distance;
      delete (point as Partial<ShortestPathPoint>).visited;
      delete (point as Partial<ShortestPathPoint>).previous;
    }

    return path;
  }

  dispose(): void {
    // re instantiated the same reference
    this.points.length = 0;
    this.segments.length = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let segment of this.segments) {
      drawSegment(ctx, segment);
    }
    for (let point of this.points) {
      drawPoint(ctx, point);
    }
  }
}
