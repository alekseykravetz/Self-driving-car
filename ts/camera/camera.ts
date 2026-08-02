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
import { lerp, cross, subtract, distance } from '../math/utils.js';
import { drawPolygon } from '../rendering/polygonRenderer.js';
import {
  extrudePolygons,
  extrudeTreeShapes,
  extrudeCarShape,
  segmentToFlatQuad,
  dashSegmentFlat,
} from './extrusion.js';

/** Fill colour of a traffic-light "gate" by its current state. */
const LIGHT_STATE_COLORS: Record<string, string> = {
  green: 'rgba(40, 220, 90, 0.55)',
  yellow: 'rgba(245, 205, 40, 0.6)',
  red: 'rgba(240, 60, 60, 0.6)',
  off: 'rgba(120, 120, 120, 0.4)',
};

/** Fill colour of a flat painted marking by its type. */
const MARKING_FLAT_COLORS: Record<string, string> = {
  crossing: 'rgba(235, 235, 235, 0.85)',
  stop: 'rgba(235, 235, 235, 0.9)',
  target: 'rgba(90, 200, 120, 0.6)',
};

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

    this.#updateFrustumPoints();
  }

  /**
   * Moves the camera instantly to a position without interpolation.
   */
  simpleMove({ x, y, angle }: ICameraPoint): void {
    this.x = x + this.distanceBehind * Math.sin(angle);
    this.y = y + this.distanceBehind * Math.cos(angle);
    this.z = -40;
    this.angle = angle;

    this.#updateFrustumPoints();
  }

  /**
   * Updates the camera's view frustum points based on current position/angle.
   */
  #updateFrustumPoints(): void {
    this.center = new Point(this.x, this.y);
    this.tip = new Point(
      this.x - this.range * Math.sin(this.angle),
      this.y - this.range * Math.cos(this.angle),
    );
    this.left = new Point(
      this.x - this.range * Math.sin(this.angle - Math.PI / 4),
      this.y - this.range * Math.cos(this.angle - Math.PI / 4),
    );
    this.right = new Point(
      this.x - this.range * Math.sin(this.angle + Math.PI / 4),
      this.y - this.range * Math.cos(this.angle + Math.PI / 4),
    );
    this.polygon = new Polygon([this.center, this.left, this.right]);
  }

  /**
   * Projects a 3D point onto the 2D canvas based on the camera's perspective.
   */
  #projectPoint(ctx: CanvasRenderingContext2D, p: Point): Point {
    const segment: Segment = new Segment(this.center, this.tip);
    const { point: p1 }: { point: Point; offset: number } =
      segment.projectPoint(p);

    const thisPoint = new Point(this.x, this.y);
    const c: number = cross(subtract(p1, thisPoint), subtract(p, thisPoint));
    const x: number =
      (Math.sign(c) * distance(p, p1)) / distance(thisPoint, p1);
    const y: number = (p.z - this.z) / distance(thisPoint, p1);

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
  #filter(polygons: Polygon[], clip: boolean = true): Polygon[] {
    const filteredPolygons: Polygon[] = [];
    for (const polygon of polygons) {
      if (polygon.intersectsPolygon(this.polygon)) {
        if (!clip) {
          filteredPolygons.push(polygon);
          continue;
        }
        const copy1: Polygon = new Polygon(polygon.points);
        const copy2: Polygon = new Polygon(this.polygon.points);

        Polygon.break(copy1, copy2, true);

        const points: Point[] = copy1.segments.map(
          (segment: Segment) => segment.p1,
        );
        const filteredPoints: Point[] = points.filter(
          (point: Point) =>
            point.intersection || this.polygon.containsPoint(point),
        );

        if (filteredPoints.length > 0) {
          filteredPolygons.push(new Polygon(filteredPoints));
        }
      } else if (this.polygon.containsPolygon(polygon)) {
        filteredPolygons.push(polygon);
      }
    }
    return filteredPolygons;
  }

  /** Unit forward vector (camera looks along −sin/−cos of its angle). */
  #forward(): { x: number; y: number } {
    return { x: -Math.sin(this.angle), y: -Math.cos(this.angle) };
  }

  /** True when `p` lies ahead of the camera (avoids behind-camera projection). */
  #inFront(p: Point): boolean {
    const f = this.#forward();
    return (p.x - this.x) * f.x + (p.y - this.y) * f.y > 1;
  }

  /**
   * Cheap per-segment frustum cull for flat ground markings. Requires both
   * endpoints ahead of the camera (so projection stays well-defined) and any of
   * the endpoints/midpoint inside the view triangle.
   */
  #segmentVisible(p1: Point, p2: Point): boolean {
    if (!this.#inFront(p1) || !this.#inFront(p2)) return false;
    if (this.polygon.containsPoint(p1) || this.polygon.containsPoint(p2)) {
      return true;
    }
    const mid = new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    return this.polygon.containsPoint(mid);
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

    // Buildings
    const buildingPolygons: Polygon[] = showBuildings
      ? extrudePolygons(this.#filter(world.buildings.map((b) => b.base)), 200)
      : [];

    // Trees (drawn whole even when partially in view so the top stays stable)
    const treePolygons: Polygon[] = showTrees
      ? extrudeTreeShapes(
          this.#filter(
            world.trees.map((t) => t.base),
            false,
          ),
          200,
        )
      : [];

    // Road borders
    const roadSegments: Segment[] = world.corridors.length
      ? world.corridors.flatMap((c: Corridor) => c.borders)
      : world.roadBorders || [];
    const roadPolygons: Polygon[] = extrudePolygons(
      this.#filter(roadSegments.map((s: Segment) => new Polygon([s.p1, s.p2]))),
      10,
    );

    // Key car (always extruded as detailed 3D car)
    let keyCarPolygons: Polygon[] = [];
    if (keyCar && keyCar.polygon.length >= 4) {
      const filteredKeyCar: Polygon[] = this.#filter(
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
        const filteredBase: Polygon[] = this.#filter(
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
      const filteredCarBase: Polygon[] = this.#filter(
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
    const carShadowBases: Polygon[] = this.#filter(
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

    // Road surface: envelope polygons drawn flat on the ground (asphalt).
    const roadSurfacePolygons: Polygon[] = this.#filter(
      (world.envelopes ?? []).map((e) => e.polygon),
    ).map((poly) => {
      const flat = new Polygon(
        poly.points.map((p) => new Point(p.x, p.y, 0)),
      ) as IColoredPolygon;
      flat.fill = 'rgba(45, 45, 50, 1)';
      flat.stroke = 'rgba(45, 45, 50, 1)';
      return flat;
    });

    // Lane dividers: one dashed line down each road centreline (a 2-lane road
    // gets a single central dashed line). The graph segment IS the centreline,
    // so a divider is only drawn for roads with >=2 lanes; separated roads use
    // the solid separator below, and `laneMarkings === false` roads are bare.
    // Segments are frustum-clipped so the road under the camera keeps its line.
    const dividerBases: Polygon[] = [];
    for (const seg of world.graph?.segments ?? []) {
      const lanes = seg.lanes ?? 2;
      if (lanes < 2 || seg.separated || seg.laneMarkings === false) continue;
      dividerBases.push(
        new Polygon([
          new Point(seg.p1.x, seg.p1.y),
          new Point(seg.p2.x, seg.p2.y),
        ]),
      );
    }
    const laneMarkingPolygons: Polygon[] = [];
    for (const poly of this.#filter(dividerBases)) {
      const pts = poly.points;
      for (let i = 0; i + 1 < pts.length; i++) {
        for (const quad of dashSegmentFlat(pts[i], pts[i + 1], 3, -1)) {
          const c = quad as IColoredPolygon;
          c.fill = 'rgba(225, 225, 205, 0.8)';
          c.stroke = 'rgba(225, 225, 205, 0.8)';
          laneMarkingPolygons.push(quad);
        }
      }
    }

    // Separators: solid yellow centre lines of hard-divided two-way roads.
    const separatorPolygons: Polygon[] = [];
    for (const s of world.separatorBorders ?? []) {
      if (!this.#segmentVisible(s.p1, s.p2)) continue;
      const quad = segmentToFlatQuad(s.p1, s.p2, 5, -1);
      if (!quad) continue;
      const c = quad as IColoredPolygon;
      c.fill = 'rgba(240, 210, 80, 0.9)';
      c.stroke = 'rgba(240, 210, 80, 0.9)';
      separatorPolygons.push(quad);
    }

    // Painted markings (crossings, stop/yield lines, target) and traffic
    // lights (short colour-coded gates across the road).
    const paintedMarkingPolygons: Polygon[] = [];
    const lightPolygons: Polygon[] = [];
    for (const m of world.markings) {
      if (!m.polygon) continue;
      const type = (m as { type?: string }).type;
      if (!this.#inFront(m.center)) continue;
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
      ...separatorPolygons,
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
          polygon.points.map((point: Point) => this.#projectPoint(ctx, point)),
        ),
    );

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const thisPoint = new Point(this.x, this.y);
    for (let i = 0; i < projectedPolygons.length; i++) {
      const dist: number = polygons[i].distanceToPoint(thisPoint);
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
