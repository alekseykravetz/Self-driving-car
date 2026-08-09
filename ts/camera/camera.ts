/**
 * Represents a camera in a 2D/3D environment, handling projection and rendering.
 */
import {
  ICameraPoint,
  IColoredPolygon,
  ICameraRenderOptions,
} from './types.js';
import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';
import { Polygon } from '../math/primitives/polygon.js';

import { IWorld } from '../world/types.js';
import { Corridor } from '../world/corridor.js';
import {
  lerp,
  distance,
  normalize,
  perpendicular,
  add,
  scale,
} from '../math/utils.js';
import { LANE_WIDTH_PX, PARKING_LANE_WIDTH_PX } from '../math/worldUnits.js';
import { drawPolygon } from '../rendering/polygonRenderer.js';
import {
  extrudePolygons,
  extrudeTreeShapes,
  extrudeCarShape,
  segmentToFlatQuad,
  dashSegmentAnchored,
  zebraStripes,
} from './extrusion.js';
import { textStrokeQuads } from './roadText.js';
import { CameraFrustum } from './cameraFrustum.js';

/** Fill colour of a traffic-light "gate" by its current state. */
const LIGHT_STATE_COLORS: Record<string, string> = {
  green: 'rgba(40, 220, 90, 0.55)',
  yellow: 'rgba(245, 205, 40, 0.6)',
  red: 'rgba(240, 60, 60, 0.6)',
  off: 'rgba(120, 120, 120, 0.4)',
};

/** Fill colour of a flat painted marking by its type. */
const MARKING_FLAT_COLORS: Record<string, string> = {
  target: 'rgba(90, 200, 120, 0.6)',
};

/** White used for painted road lines/words. */
const ROAD_PAINT = 'rgba(240, 240, 240, 0.9)';

export class Camera implements ICameraPoint {
  public x!: number;
  public y!: number;
  public z!: number;
  public angle!: number;
  public range: number;
  public distanceBehind: number;

  public center!: Point;
  public tip!: Point;
  public left!: Point;
  public right!: Point;
  public polygon!: Polygon;

  #frustum = new CameraFrustum();

  constructor(
    { x, y, angle }: ICameraPoint,
    range: number = 1000,
    distanceBehind: number = 100,
  ) {
    this.range = range;
    this.distanceBehind = distanceBehind;
    this.simpleMove({ x, y, angle });
  }

  /**
   * Moves the camera smoothly towards a target position using interpolation.
   */
  move({ x, y, angle }: ICameraPoint): void {
    const t: number = 0.15;

    this.x = lerp(this.x, x + this.distanceBehind * Math.sin(angle), t);
    this.y = lerp(this.y, y + this.distanceBehind * Math.cos(angle), t);
    this.z = -40;
    this.angle = lerp(this.angle, angle, t);

    this.#applyFrustumUpdate();
  }

  /**
   * Moves the camera instantly to a position without interpolation.
   */
  simpleMove({ x, y, angle }: ICameraPoint): void {
    this.x = x + this.distanceBehind * Math.sin(angle);
    this.y = y + this.distanceBehind * Math.cos(angle);
    this.z = -40;
    this.angle = angle;

    this.#applyFrustumUpdate();
  }

  /**
   * Recomputes the frustum via `CameraFrustum` and mirrors the result onto
   * this camera's public fields (preserved for external readers/tests).
   */
  #applyFrustumUpdate(): void {
    const f = this.#frustum.updateFrustumPoints(
      this.x,
      this.y,
      this.z,
      this.angle,
      this.range,
    );
    this.center = f.center;
    this.tip = f.tip;
    this.left = f.left;
    this.right = f.right;
    this.polygon = f.polygon;
  }

  /**
   * Emits a painted road line (`a`→`b`) into `out`, frustum-clipped. Dashed
   * lines anchor their pattern to `a` so they stay world-locked as the car
   * moves; solid lines become a single clipped quad.
   */
  #emitRoadLine(
    a: Point,
    b: Point,
    out: Polygon[],
    opts: {
      color: string;
      width: number;
      dashed: boolean;
      dashLen?: number;
      gapLen?: number;
    },
  ): void {
    const range = this.#frustum.visibleRange(a, b);
    if (!range) return;
    if (opts.dashed) {
      for (const quad of dashSegmentAnchored(
        a,
        b,
        range.tMin,
        range.tMax,
        opts.width,
        -1,
        opts.dashLen ?? 30,
        opts.gapLen ?? 40,
      )) {
        const c = quad as IColoredPolygon;
        c.fill = opts.color;
        c.stroke = opts.color;
        out.push(quad);
      }
    } else {
      const segLen = distance(a, b);
      const dx = (b.x - a.x) / segLen;
      const dy = (b.y - a.y) / segLen;
      const pa = new Point(a.x + dx * range.tMin, a.y + dy * range.tMin);
      const pb = new Point(a.x + dx * range.tMax, a.y + dy * range.tMax);
      const quad = segmentToFlatQuad(pa, pb, opts.width, -1);
      if (!quad) return;
      const c = quad as IColoredPolygon;
      c.fill = opts.color;
      c.stroke = opts.color;
      out.push(quad);
    }
  }

  /**
   * Cheap superset visibility test: true when a circle of `margin` around
   * `center` could reach within the frustum's range of the camera. Used to
   * reject far-away items before the expensive frustum intersection/clip math.
   */
  #withinRange(center: Point, margin: number): boolean {
    const dx = center.x - this.x;
    const dy = center.y - this.y;
    const reach = this.range + margin;
    return dx * dx + dy * dy < reach * reach;
  }

  /**
   * Gathers, filters, and extrudes all relevant polygons from the world for rendering.
   */
  #getPolygons(world: IWorld, options: ICameraRenderOptions = {}): Polygon[] {
    const {
      keyCar,
      bestCar,
      cars = [],
      traffic,
      showTrees = true,
      showBuildings = true,
    } = options;

    // Buildings. Pre-filter by cached centroid distance before the expensive
    // frustum intersectsPolygon/clip pass — on a whole-city OSM import this
    // was the dominant per-frame cost (running full polygon math against
    // every building/tree regardless of how far it is from the camera).
    const buildingPolygons: Polygon[] = showBuildings
      ? extrudePolygons(
          this.#frustum.filter(
            world.buildings
              .filter((b) => this.#withinRange(b.center, b.boundingRadius))
              .map((b) => b.base),
          ),
          200,
        )
      : [];

    // Trees (drawn whole even when partially in view so the top stays stable)
    const treePolygons: Polygon[] = showTrees
      ? extrudeTreeShapes(
          this.#frustum.filter(
            world.trees
              .filter((t) => this.#withinRange(t.center, t.size))
              .map((t) => t.base),
            false,
          ),
          200,
        )
      : [];

    // Road borders. Distance-pre-filter before allocating a Polygon per
    // segment and running the frustum intersectsPolygon test on each — on a
    // whole-city OSM import this unfiltered path (thousands of border
    // segments) dominated both CPU (intersectsPolygon) and GC. The frustum
    // triangle's farthest point is exactly `range` from the camera centre, so
    // any segment that can intersect it has a point within `range` of centre;
    // pre-rejecting by that distance is a correct superset (no popping).
    const roadSegments: Segment[] = world.corridors.length
      ? world.corridors.flatMap((c: Corridor) => c.borders)
      : world.roadBorders || [];
    const roadPolygons: Polygon[] = extrudePolygons(
      this.#frustum.filter(
        roadSegments
          .filter((s) => s.distanceToPoint(this.center) <= this.range + 1)
          .map((s: Segment) => new Polygon([s.p1, s.p2])),
      ),
      10,
    );

    // Key car (always extruded as detailed 3D car)
    let keyCarPolygons: Polygon[] = [];
    if (keyCar && keyCar.polygon.length >= 4) {
      const filteredKeyCar: Polygon[] = this.#frustum.filter(
        [
          new Polygon(
            keyCar.polygon.map((point: Point) => new Point(point.x, point.y)),
          ),
        ],
        false,
      );
      if (filteredKeyCar.length) {
        keyCarPolygons = extrudeCarShape(filteredKeyCar[0]);
        keyCarPolygons.forEach((poly) => {
          const cPoly = poly as IColoredPolygon;
          cPoly.fill = keyCar.color || 'rgba(0, 100, 255, 0.6)';
          cPoly.stroke = 'rgba(0, 0, 0, 0.4)';
        });
      }
    }

    // Traffic cars
    let trafficPolygons: Polygon[] = [];
    if (traffic && traffic.length > 0) {
      for (const car of traffic) {
        if (!car.polygon || car.polygon.length < 4) continue;
        const filteredBase: Polygon[] = this.#frustum.filter(
          [
            new Polygon(
              car.polygon.map((point: Point) => new Point(point.x, point.y)),
            ),
          ],
          false,
        );
        if (filteredBase.length) {
          const carPolys = extrudeCarShape(filteredBase[0], 12, 4);
          carPolys.forEach((poly) => {
            const cPoly = poly as IColoredPolygon;
            cPoly.fill = car.color || 'rgba(200, 50, 50, 0.5)';
            cPoly.stroke = 'rgba(0, 0, 0, 0.3)';
          });
          trafficPolygons.push(...carPolys);
        }
      }
    }

    // Best car (highlighted, separate from keyCar)
    let bestCarPolygons: Polygon[] = [];
    const bestCarSource = bestCar ?? null;
    if (
      bestCarSource &&
      bestCarSource !== keyCar &&
      bestCarSource.polygon.length >= 4
    ) {
      const filteredCarBase: Polygon[] = this.#frustum.filter(
        [
          new Polygon(
            bestCarSource.polygon.map(
              (point: Point) => new Point(point.x, point.y),
            ),
          ),
        ],
        false,
      );
      if (filteredCarBase.length) {
        bestCarPolygons = extrudeCarShape(filteredCarBase[0]);
        bestCarPolygons.forEach((poly) => {
          const cPoly = poly as IColoredPolygon;
          cPoly.fill = 'rgba(255, 200, 0, 0.6)';
          cPoly.stroke = 'rgba(0, 0, 0, 0.4)';
        });
      }
    }

    // Car shadows (flat projections)
    const carShadowBases: Polygon[] = this.#frustum.filter(
      cars
        .filter((c) => c !== keyCar && c !== bestCarSource)
        .map(
          (c) =>
            new Polygon(
              c.polygon.map((point: Point) => new Point(point.x, point.y)),
            ),
        ),
      false,
    );
    carShadowBases.forEach((poly) => {
      const cPoly = poly as IColoredPolygon;
      cPoly.fill = 'rgba(0, 0, 0, 0.25)';
      cPoly.stroke = 'rgba(0, 0, 0, 0)';
    });

    // Style buildings
    buildingPolygons.forEach((poly) => {
      const cPoly = poly as IColoredPolygon;
      cPoly.fill = 'rgba(150, 150, 150, 0.2)';
      cPoly.stroke = 'rgba(150, 150, 150, 0.2)';
    });

    // Ground plane: a flat trapezoid covering the whole field of view (grass),
    // drawn first so everything else sits on top. Near corners are placed just
    // in front of the camera at the FOV edges so the ground fills the screen
    // bottom (a triangle would leave the lower corners empty).
    const groundPolygons: Polygon[] = [];
    {
      const near = 20;
      const nearLeft = new Point(
        this.x - near * Math.sin(this.angle - Math.PI / 4),
        this.y - near * Math.cos(this.angle - Math.PI / 4),
        0,
      );
      const nearRight = new Point(
        this.x - near * Math.sin(this.angle + Math.PI / 4),
        this.y - near * Math.cos(this.angle + Math.PI / 4),
        0,
      );
      const ground = new Polygon([
        nearLeft,
        new Point(this.left.x, this.left.y, 0),
        new Point(this.right.x, this.right.y, 0),
        nearRight,
      ]) as IColoredPolygon;
      ground.fill = 'rgba(58, 74, 52, 1)';
      ground.stroke = 'rgba(58, 74, 52, 1)';
      ground.skipDebug = true;
      groundPolygons.push(ground);
    }

    // Road surface: envelope polygons drawn flat, clipped only against the near
    // plane (not the collapsing frustum triangle) so the asphalt stays filled
    // right up to the camera — no grass gap under/behind the car.
    const roadSurfacePolygons: Polygon[] = [];
    for (const env of world.envelopes ?? []) {
      const poly = env.polygon;
      // Cheap single-segment distance check (env.skeleton) instead of
      // poly.distanceToPoint, which walks every edge of the (rounded,
      // multi-point) envelope polygon for every road segment in the world.
      if (env.skeleton.distanceToPoint(this.center) > this.range + 300)
        continue;
      const relevant =
        poly.intersectsPolygon(this.polygon) ||
        this.polygon.containsPolygon(poly) ||
        poly.containsPoint(this.center);
      if (!relevant) continue;
      const flat = new Polygon(poly.points.map((p) => new Point(p.x, p.y, 0)));
      const clipped = this.#frustum.nearPlaneClip(flat);
      if (!clipped) continue;
      const c = clipped as IColoredPolygon;
      c.fill = 'rgba(45, 45, 50, 1)';
      c.stroke = 'rgba(45, 45, 50, 1)';
      roadSurfacePolygons.push(clipped);
    }

    // Lane markings, mirroring the 2D map: N-1 white dividers per road (thicker,
    // longer dashes for the centre divider — solid on hard-separated roads —
    // and thin dashes for the rest; one-way roads get thin dashes throughout),
    // plus a solid boundary line and bay ticks for each parking lane. Every line
    // is frustum-clipped with world-anchored dashes so it stays locked in place.
    const laneMarkingPolygons: Polygon[] = [];
    for (const seg of world.graph?.segments ?? []) {
      if (seg.distanceToPoint(this.center) > this.range) continue;
      if (!this.#frustum.inFront(seg.p1) && !this.#frustum.inFront(seg.p2))
        continue;
      const laneCount = seg.lanes ?? (seg.oneWay ? 1 : 2);
      const roadWidth = laneCount * LANE_WIDTH_PX;
      const dir = normalize(seg.directionVector());
      const perp = perpendicular(dir);

      if (seg.laneMarkings !== false && laneCount >= 2) {
        for (let i = 0; i < laneCount - 1; i++) {
          const offset = (i + 1 - laneCount / 2) * LANE_WIDTH_PX;
          if (Math.abs(offset) >= roadWidth / 2 - 1) continue;
          const isCenter = Math.abs(offset) < LANE_WIDTH_PX * 0.6;
          const a = add(seg.p1, scale(perp, offset));
          const b = add(seg.p2, scale(perp, offset));
          if (!seg.oneWay && seg.separated && isCenter) {
            this.#emitRoadLine(a, b, laneMarkingPolygons, {
              color: ROAD_PAINT,
              width: 4,
              dashed: false,
            });
          } else if (!seg.oneWay && isCenter) {
            this.#emitRoadLine(a, b, laneMarkingPolygons, {
              color: ROAD_PAINT,
              width: 4,
              dashed: true,
              dashLen: 30,
              gapLen: 30,
            });
          } else {
            this.#emitRoadLine(a, b, laneMarkingPolygons, {
              color: ROAD_PAINT,
              width: 2,
              dashed: true,
              dashLen: 20,
              gapLen: 30,
            });
          }
        }
      }

      if (seg.parkingRight || seg.parkingLeft) {
        const innerHalf = roadWidth / 2;
        const outerHalf = innerHalf + PARKING_LANE_WIDTH_PX;
        const segLen = seg.length();
        const sides: number[] = [];
        if (seg.parkingRight) sides.push(1);
        if (seg.parkingLeft) sides.push(-1);
        const bays = Math.max(1, Math.floor(segLen / (LANE_WIDTH_PX * 1.5)));
        for (const s of sides) {
          this.#emitRoadLine(
            add(seg.p1, scale(perp, innerHalf * s)),
            add(seg.p2, scale(perp, innerHalf * s)),
            laneMarkingPolygons,
            { color: ROAD_PAINT, width: 2, dashed: false },
          );
          for (let i = 0; i <= bays; i++) {
            const alongPt = add(seg.p1, scale(dir, (i / bays) * segLen));
            this.#emitRoadLine(
              add(alongPt, scale(perp, innerHalf * s)),
              add(alongPt, scale(perp, outerHalf * s)),
              laneMarkingPolygons,
              { color: ROAD_PAINT, width: 2, dashed: false },
            );
          }
        }
      }
    }

    // Painted markings (crossings, stop/yield lines, target) and traffic
    // lights (short colour-coded gates across the road).
    const paintedMarkingPolygons: Polygon[] = [];
    const lightPolygons: Polygon[] = [];
    for (const m of world.markings) {
      if (!m.polygon) continue;
      const type = (m as { type?: string }).type;
      // Cheap centroid distance pre-filter before the frustum intersectsPolygon
      // test (markings can number in the thousands on a full-city import).
      if (!this.#withinRange(m.center, m.width)) continue;
      if (!this.#frustum.inFront(m.center)) continue;
      if (
        !this.polygon.containsPoint(m.center) &&
        !m.polygon.intersectsPolygon(this.polygon)
      ) {
        continue;
      }
      if (type === 'light') {
        const state = (m as unknown as { state?: string }).state ?? 'off';
        const color = LIGHT_STATE_COLORS[state] ?? LIGHT_STATE_COLORS.off;
        const base = new Polygon(
          m.polygon.points.map((p) => new Point(p.x, p.y)),
        );
        for (const wall of extrudePolygons([base], 34)) {
          const c = wall as IColoredPolygon;
          c.fill = color;
          c.stroke = 'rgba(0, 0, 0, 0.25)';
          lightPolygons.push(wall);
        }
      } else if (type === 'crossing') {
        // Real zebra bars instead of a solid white slab.
        for (const stripe of zebraStripes(
          m.center,
          m.directionVector,
          m.width,
          m.height,
        )) {
          const c = stripe as IColoredPolygon;
          c.fill = 'rgba(240, 240, 240, 0.9)';
          c.stroke = 'rgba(0, 0, 0, 0)';
          paintedMarkingPolygons.push(stripe);
        }
      } else if (type === 'stop' || type === 'yield') {
        // Painted like the 2D map: the word written across the road (reading
        // horizontally for the approaching driver) with a white line above it.
        // Canonical convention: `directionVector` is the travel direction, so
        // the letters stand upright ALONG it for the approaching driver — no flip.
        const dir = normalize(m.directionVector);
        const across = perpendicular(dir);
        const lineCenter = add(m.center, scale(dir, m.width * 0.24));
        const lineA = add(lineCenter, scale(across, m.width / 2));
        const lineB = add(lineCenter, scale(across, -m.width / 2));
        const line = segmentToFlatQuad(lineA, lineB, 6, -1);
        if (line) {
          const c = line as IColoredPolygon;
          c.fill = ROAD_PAINT;
          c.stroke = 'rgba(0, 0, 0, 0)';
          paintedMarkingPolygons.push(line);
        }
        const word = type === 'stop' ? 'STOP' : 'YIELD';
        for (const glyph of textStrokeQuads(
          word,
          m.center,
          dir,
          m.width * 0.8,
          m.width * 0.3,
          4,
          -1,
        )) {
          const c = glyph as IColoredPolygon;
          c.fill = ROAD_PAINT;
          c.stroke = 'rgba(0, 0, 0, 0)';
          paintedMarkingPolygons.push(glyph);
        }
      } else if (type && MARKING_FLAT_COLORS[type]) {
        const flat = new Polygon(
          m.polygon.points.map((p) => new Point(p.x, p.y, -1)),
        ) as IColoredPolygon;
        flat.fill = MARKING_FLAT_COLORS[type];
        flat.stroke = 'rgba(0, 0, 0, 0)';
        paintedMarkingPolygons.push(flat);
      }
    }

    return [
      ...groundPolygons,
      ...roadSurfacePolygons,
      ...laneMarkingPolygons,
      ...paintedMarkingPolygons,
      ...carShadowBases,
      ...roadPolygons,
      ...buildingPolygons,
      ...treePolygons,
      ...lightPolygons,
      ...trafficPolygons,
      ...bestCarPolygons,
      ...keyCarPolygons,
    ];
  }

  /**
   * Renders the world from the camera's perspective onto the canvas.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    world: IWorld,
    options: ICameraRenderOptions = {},
  ): void {
    const polygons: Polygon[] = this.#getPolygons(world, options);

    const projectedPolygons: Polygon[] = polygons.map(
      (polygon: Polygon) =>
        new Polygon(
          polygon.points.map((point: Point) =>
            this.#frustum.projectPoint(ctx, point),
          ),
        ),
    );

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let i = 0; i < projectedPolygons.length; i++) {
      // Depth fade uses the nearest vertex distance (cheap O(points) squared
      // distance) rather than Polygon.distanceToPoint, which projected the
      // camera onto every edge (and spread an array) per polygon each frame.
      let minDistSq = Infinity;
      for (const pt of polygons[i].points) {
        const dx = pt.x - this.x;
        const dy = pt.y - this.y;
        const d = dx * dx + dy * dy;
        if (d < minDistSq) minDistSq = d;
      }
      const dist: number = Math.sqrt(minDistSq);
      ctx.globalAlpha = Math.max(0, (1 - dist / this.range) ** 2);

      const { fill, stroke } = polygons[i] as IColoredPolygon;
      drawPolygon(ctx, projectedPolygons[i], { fill, stroke, join: 'round' });
    }
    ctx.globalAlpha = 1;

    if (options.debugCtx) {
      for (const polygon of polygons) {
        if ((polygon as IColoredPolygon).skipDebug) continue;
        drawPolygon(options.debugCtx, polygon);
      }
    }
  }

  /**
   * Draws the camera's view frustum polygon onto a context (for debugging).
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    drawPolygon(ctx, this.polygon);
  }
}
