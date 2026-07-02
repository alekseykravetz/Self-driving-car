/** Axis-aligned bounding box, used to skip non-overlapping polygon pairs. */
interface PolygonBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Computes the AABB of a polygon from its points. */
function computePolygonBounds(polygon: Polygon): PolygonBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of polygon.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** True if two AABBs overlap (a necessary condition for polygon overlap). */
function boundsOverlap(a: PolygonBounds, b: PolygonBounds): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
}

class Polygon {
  points: Point[];
  segments: Segment[];

  constructor(points: Point[]) {
    this.points = points;
    this.segments = [];
    for (let i = 1; i <= points.length; i++) {
      this.segments.push(new Segment(points[i - 1], points[i % points.length]));
    }
  }

  static load(info: Polygon): Polygon {
    return new Polygon(info.points.map((p) => new Point(p.x, p.y)));
  }

  static union(polygons: Polygon[]): Segment[] {
    Polygon.multiBreak(polygons);
    // Bounding boxes stay valid after break: intersection points added by
    // break lie on existing edges, so they never extend a polygon's AABB.
    const bounds = polygons.map((p) => computePolygonBounds(p));
    const keptSegments: Segment[] = [];
    for (let i = 0; i < polygons.length; i++) {
      for (const segment of polygons[i].segments) {
        const midpoint = average(segment.p1, segment.p2);
        let keep = true;
        for (let j = 0; j < polygons.length; j++) {
          if (i === j) continue;
          const b = bounds[j];
          // A point outside polygon j's AABB is outside polygon j, so it
          // cannot make this segment interior. Skip the expensive ray test.
          if (
            midpoint.x < b.minX ||
            midpoint.x > b.maxX ||
            midpoint.y < b.minY ||
            midpoint.y > b.maxY
          ) {
            continue;
          }
          if (polygons[j].containsPoint(midpoint)) {
            keep = false;
            break;
          }
        }
        if (keep) {
          keptSegments.push(segment);
        }
      }
    }
    return keptSegments;
  }

  static multiBreak(polygons: Polygon[]): void {
    // Only break pairs whose bounding boxes overlap. Road envelopes overlap
    // just their immediate neighbours, so this turns the all-pairs O(n^2)
    // scan into near-linear work for large, spread-out networks.
    const bounds = polygons.map((p) => computePolygonBounds(p));
    for (let i = 0; i < polygons.length - 1; i++) {
      for (let j = i + 1; j < polygons.length; j++) {
        if (!boundsOverlap(bounds[i], bounds[j])) continue;
        Polygon.break(polygons[i], polygons[j]);
      }
    }
  }

  static break(
    polygon1: Polygon,
    polygon2: Polygon,
    markIntersections = false,
  ): void {
    const segments1 = polygon1.segments;
    const segments2 = polygon2.segments;
    for (let i = 0; i < segments1.length; i++) {
      for (let j = 0; j < segments2.length; j++) {
        const intersection = getIntersection(
          segments1[i].p1,
          segments1[i].p2,
          segments2[j].p1,
          segments2[j].p2,
        );

        if (
          intersection &&
          intersection.offset !== 1 &&
          intersection.offset !== 0
        ) {
          const point = new Point(intersection.x, intersection.y);
          if (markIntersections) {
            point.intersection = true;
          }
          let aux = segments1[i].p2;
          segments1[i].p2 = point;
          segments1.splice(i + 1, 0, new Segment(point, aux));
          aux = segments2[j].p2;
          segments2[j].p2 = point;
          segments2.splice(j + 1, 0, new Segment(point, aux));
        }
      }
    }
  }

  distanceToPoint(point: Point): number {
    return Math.min(...this.segments.map((s) => s.distanceToPoint(point)));
  }

  distanceToPolygon(polygon: Polygon): number {
    return Math.min(...this.points.map((p) => polygon.distanceToPoint(p)));
  }

  intersectsPolygon(polygon: Polygon): boolean {
    for (const s1 of this.segments) {
      for (const s2 of polygon.segments) {
        if (getIntersection(s1.p1, s1.p2, s2.p1, s2.p2)) {
          return true;
        }
      }
    }
    return false;
  }

  containsPolygon(polygon: Polygon): boolean {
    return polygon.points.some((p) => this.containsPoint(p));
  }

  containsSegment(segment: Segment): boolean {
    const midpoint = average(segment.p1, segment.p2);
    return this.containsPoint(midpoint);
  }

  containsPoint(point: Point): boolean {
    const outerPoint = new Point(-100000, -100000);
    let intersectionCount = 0;
    for (const seg of this.segments) {
      if (getIntersection(outerPoint, point, seg.p1, seg.p2)) {
        intersectionCount++;
      }
    }
    return intersectionCount % 2 === 1;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    {
      stroke = 'blue',
      lineWidth = 2,
      fill = 'rgba(0,0,255,0.3)',
      join = 'miter',
    }: PolygonDrawOptions = {},
  ): void {
    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = join;
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
