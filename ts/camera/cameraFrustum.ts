/**
 * Owns the camera's view-frustum/projection math: frustum-point computation,
 * point projection, polygon/segment visibility filtering, and near-plane
 * clipping. Separate from `Camera`'s scene-assembly logic.
 */
import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';
import { Polygon } from '../math/primitives/polygon.js';
import { cross, subtract, distance } from '../math/utils.js';

export class CameraFrustum {
  #x!: number;
  #y!: number;
  #z!: number;
  #angle!: number;

  #center!: Point;
  #tip!: Point;
  #left!: Point;
  #right!: Point;
  #polygon!: Polygon;
  // Camera centre→tip projection axis, rebuilt only when the camera moves so
  // projectPoint() doesn't allocate a new Segment per projected point.
  #projSegment!: Segment;

  /**
   * Recomputes the frustum points from the camera's current position/angle.
   */
  updateFrustumPoints(
    x: number,
    y: number,
    z: number,
    angle: number,
    range: number,
  ): {
    center: Point;
    tip: Point;
    left: Point;
    right: Point;
    polygon: Polygon;
  } {
    this.#x = x;
    this.#y = y;
    this.#z = z;
    this.#angle = angle;

    this.#center = new Point(x, y);
    this.#tip = new Point(
      x - range * Math.sin(angle),
      y - range * Math.cos(angle),
    );
    this.#left = new Point(
      x - range * Math.sin(angle - Math.PI / 4),
      y - range * Math.cos(angle - Math.PI / 4),
    );
    this.#right = new Point(
      x - range * Math.sin(angle + Math.PI / 4),
      y - range * Math.cos(angle + Math.PI / 4),
    );
    this.#polygon = new Polygon([this.#center, this.#left, this.#right]);
    this.#projSegment = new Segment(this.#center, this.#tip);

    return {
      center: this.#center,
      tip: this.#tip,
      left: this.#left,
      right: this.#right,
      polygon: this.#polygon,
    };
  }

  /**
   * Projects a 3D point onto the 2D canvas based on the camera's perspective.
   */
  projectPoint(ctx: CanvasRenderingContext2D, p: Point): Point {
    const { point: p1 }: { point: Point; offset: number } =
      this.#projSegment.projectPoint(p);

    // The camera position equals the frustum centre, so reuse it directly
    // instead of allocating a fresh Point per projected point.
    const thisPoint = this.#center;
    const c: number = cross(subtract(p1, thisPoint), subtract(p, thisPoint));
    const x: number =
      (Math.sign(c) * distance(p, p1)) / distance(thisPoint, p1);
    const y: number = (p.z - this.#z) / distance(thisPoint, p1);

    const cX: number = ctx.canvas.width / 2;
    const cY: number = ctx.canvas.height / 2;
    const scaler: number = Math.max(cX, cY);

    return new Point(cX + x * scaler, cY + y * scaler);
  }

  /**
   * Filters polygons to only those visible within the camera's view frustum.
   *
   * @param clip - When `true` (default), polygons that straddle the frustum
   *   edge are clipped to the visible region. When `false`, any polygon that is
   *   even partially visible is returned whole (uncut). Use `false` for
   *   discrete objects such as cars and trees, whose base must stay intact so
   *   that extrusion produces a correct 3D shape — clipping a car base below 4
   *   points breaks `extrudeCarShape`, and clipping a tree base makes its top
   *   wobble as parts move in and out of view.
   */
  filter(polygons: Polygon[], clip: boolean = true): Polygon[] {
    const filteredPolygons: Polygon[] = [];
    for (const polygon of polygons) {
      if (polygon.intersectsPolygon(this.#polygon)) {
        if (!clip) {
          filteredPolygons.push(polygon);
          continue;
        }
        const copy1: Polygon = new Polygon(polygon.points);
        const copy2: Polygon = new Polygon(this.#polygon.points);

        Polygon.break(copy1, copy2, true);

        const points: Point[] = copy1.segments.map(
          (segment: Segment) => segment.p1,
        );
        const filteredPoints: Point[] = points.filter(
          (point: Point) =>
            point.intersection || this.#polygon.containsPoint(point),
        );

        if (filteredPoints.length > 0) {
          filteredPolygons.push(new Polygon(filteredPoints));
        }
      } else if (this.#polygon.containsPolygon(polygon)) {
        filteredPolygons.push(polygon);
      }
    }
    return filteredPolygons;
  }

  /** Unit forward vector (camera looks along −sin/−cos of its angle). */
  forward(): { x: number; y: number } {
    return { x: -Math.sin(this.#angle), y: -Math.cos(this.#angle) };
  }

  /** True when `p` lies ahead of the camera (avoids behind-camera projection). */
  inFront(p: Point): boolean {
    const f = this.forward();
    return (p.x - this.#x) * f.x + (p.y - this.#y) * f.y > 1;
  }

  /**
   * True when every vertex of `poly` lies in front of the camera. Discrete
   * objects drawn whole (unclipped, `filter(..., false)`) keep their full point
   * count so extrusion stays correct, but a vertex beside/behind the camera
   * projects into visible screen space as a floating artifact. Callers use this
   * to drop such objects instead of drawing them broken.
   */
  fullyInFront(poly: Polygon): boolean {
    return poly.points.every((p: Point) => this.inFront(p));
  }

  /**
   * Clips a flat polygon against the camera's near plane (a line just in front
   * of the camera, perpendicular to the view direction), keeping only the part
   * ahead of it. Unlike clipping to the full frustum triangle — which collapses
   * to a point at the camera and drops the wedge right in front of it — the near
   * plane is straight, so road surfaces stay filled all the way up to the
   * camera (no grass gap under the car). Off-screen sides project harmlessly off
   * the canvas. Returns `null` when nothing survives.
   */
  nearPlaneClip(poly: Polygon): Polygon | null {
    const f = this.forward();
    const nx = this.#x + f.x * 2;
    const ny = this.#y + f.y * 2;
    const side = (p: Point): number => (p.x - nx) * f.x + (p.y - ny) * f.y;
    const pts = poly.points;
    const out: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i];
      const nxt = pts[(i + 1) % pts.length];
      const dCur = side(cur);
      const dNxt = side(nxt);
      if (dCur >= 0) out.push(new Point(cur.x, cur.y, cur.z));
      if (dCur >= 0 !== dNxt >= 0) {
        const t = dCur / (dCur - dNxt);
        out.push(
          new Point(
            cur.x + t * (nxt.x - cur.x),
            cur.y + t * (nxt.y - cur.y),
            cur.z + t * (nxt.z - cur.z),
          ),
        );
      }
    }
    return out.length >= 3 ? new Polygon(out) : null;
  }

  /**
   * Returns the visible sub-range `[tMin, tMax]` (distances from `a`) of the
   * segment `a`→`b` after frustum-clipping, or `null` if nothing is visible.
   * Callers anchor dashes to `a` within this range so they stay world-locked.
   */
  visibleRange(a: Point, b: Point): { tMin: number; tMax: number } | null {
    const segLen = distance(a, b);
    if (segLen < 1) return null;
    const dirX = (b.x - a.x) / segLen;
    const dirY = (b.y - a.y) / segLen;
    const clipped = this.filter([
      new Polygon([new Point(a.x, a.y), new Point(b.x, b.y)]),
    ]);
    if (!clipped.length) return null;
    let tMin = Infinity;
    let tMax = -Infinity;
    for (const poly of clipped) {
      for (const pt of poly.points) {
        const t = (pt.x - a.x) * dirX + (pt.y - a.y) * dirY;
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
      }
    }
    tMin = Math.max(0, tMin);
    tMax = Math.min(segLen, tMax);
    return tMax > tMin ? { tMin, tMax } : null;
  }
}
