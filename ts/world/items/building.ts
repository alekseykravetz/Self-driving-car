import { Point } from '../../math/primitives/point.js';
import { Polygon } from '../../math/primitives/polygon.js';
import { average, getFake3dPoint } from '../../math/utils.js';
import { drawPolygon } from '../../rendering/polygonRenderer.js';
import { BuildingFootprint, BuildingDrawOptions } from '../types.js';

/** Fraction of building height used for the wall/ceiling top (roof peak uses full height). */
const BUILDING_CEILING_HEIGHT_RATIO = 0.6;
/** Minimum footprint vertices required for the pitched-roof geometry. */
const MIN_BUILDING_BASE_POINTS = 4;

/** Flat-roof (OSM-imported) building colors — a light warm-grey rooftop with a
 *  soft outline reads as a real roof from the top-down view, instead of the
 *  solid-white blob that reusing the wall white produced. Kept lighter/warmer
 *  than the grey asphalt so roofs don't read as roads. Exported so the 3D
 *  camera renders imported buildings with the same palette. */
export const FLAT_ROOF_FILL = '#E0DDD4';
export const FLAT_ROOF_STROKE = '#BEBAAE';
export const FLAT_ROOF_WALL_FILL = '#F0EEE7';

/** Only render a building's house number when zoomed in at least this close
 *  (smaller zoom = closer); avoids cluttering the overview with tiny text. */
const HOUSE_NUMBER_MAX_ZOOM = 6;
/** House-number label size in world pixels (scales with the viewport zoom). */
const HOUSE_NUMBER_FONT_PX = 40;

export class Building {
  readonly base: Polygon;
  readonly height: number;
  /** OSM `addr:housenumber`, drawn on the roof when zoomed in. */
  readonly houseNumber?: string;
  /** Footprint centroid, cached so per-frame culling/sorting never has to
   *  walk the polygon's edges (`Polygon.distanceToPoint`), which was the
   *  dominant per-frame cost on large OSM imports. */
  readonly center: Point;
  /** Max distance from `center` to any footprint vertex — a cheap superset
   *  radius used by the camera to reject far-away buildings before running
   *  the expensive frustum intersection/clip math. */
  readonly boundingRadius: number;

  constructor(polygon: Polygon, height: number = 200, houseNumber?: string) {
    this.base = polygon;
    this.height = height;
    this.houseNumber = houseNumber;
    this.center = Building.#computeCentroid(polygon.points);
    this.boundingRadius = Building.#computeBoundingRadius(
      polygon.points,
      this.center,
    );
  }

  static #computeCentroid(points: Point[]): Point {
    let sx = 0;
    let sy = 0;
    for (const p of points) {
      sx += p.x;
      sy += p.y;
    }
    return new Point(sx / points.length, sy / points.length);
  }

  static #computeBoundingRadius(points: Point[], center: Point): number {
    let max = 0;
    for (const p of points) {
      const d = Math.hypot(p.x - center.x, p.y - center.y);
      if (d > max) max = d;
    }
    return max;
  }

  static load(info: Building): Building {
    const basePolygon = Polygon.load(info.base);
    return new Building(basePolygon, info.height, info.houseNumber);
  }

  /**
   * Rebuilds a Building from its compact footprint form `{ poly, h }` (footprint
   * points + height only — no redundant polygon `segments`).
   */
  static loadFootprint(info: BuildingFootprint): Building {
    const points = info.poly.map(([x, y]) => new Point(x, y));
    return new Building(new Polygon(points), info.h ?? 200, info.n);
  }

  /**
   * Serializes to the compact footprint form stored in world files: the base
   * polygon's points plus the height. Drops the redundant `segments` array that
   * a full `Polygon` serialization would include.
   */
  toFootprint(): BuildingFootprint {
    return {
      poly: this.base.points.map((p) => [
        Math.round(p.x * 10) / 10,
        Math.round(p.y * 10) / 10,
      ]),
      h: this.height,
      ...(this.houseNumber ? { n: this.houseNumber } : {}),
    };
  }

  draw(ctx: CanvasRenderingContext2D, options: BuildingDrawOptions): void {
    const { viewPoint, flatRoof, zoom } = options;
    // Calculate the points for the top of the building (ceiling)
    const topPoints: Point[] = this.base.points.map((p) =>
      getFake3dPoint(p, viewPoint, this.height * BUILDING_CEILING_HEIGHT_RATIO),
    );
    const ceiling = new Polygon(topPoints);

    // Create polygons for the sides of the building
    const sides: Polygon[] = [];
    for (let i = 0; i < this.base.points.length; i++) {
      const nextI = (i + 1) % this.base.points.length;
      // Create a side polygon connecting base points to top points
      const sidePoly = new Polygon([
        this.base.points[i],
        this.base.points[nextI],
        topPoints[nextI], // Corresponding top point for nextI
        topPoints[i], // Corresponding top point for i
      ]);
      sides.push(sidePoly);
    }

    // Sort sides by distance to draw farther sides first (painter's algorithm)
    sides.sort(
      (a, b) => b.distanceToPoint(viewPoint) - a.distanceToPoint(viewPoint),
    );

    // --- Roof Generation (Assumes 4-point base for specific roof shape) ---
    let roofPolys: Polygon[] = [];
    // Imported OSM footprints keep a flat roof (their arbitrary outlines don't
    // suit the rectangular pitched-roof geometry). Only our own generated
    // rectangular buildings get the decorative pitched roof.
    if (
      !flatRoof &&
      this.base.points.length >= MIN_BUILDING_BASE_POINTS &&
      ceiling.points.length >= MIN_BUILDING_BASE_POINTS
    ) {
      // Calculate midpoints of specific base edges (assumes rectangular-like base)
      const baseMidpoints: Point[] = [
        average(this.base.points[0], this.base.points[1]),
        average(this.base.points[2], this.base.points[3]),
      ];

      // Calculate the peak points for the roof using the full height
      const topMidpoints: Point[] = baseMidpoints.map(
        (p) => getFake3dPoint(p, viewPoint, this.height), // Use full height for roof peak
      );

      // Create the two slanted roof polygons
      roofPolys = [
        new Polygon([
          ceiling.points[0], // Corner points of the ceiling
          ceiling.points[3],
          topMidpoints[1], // Peak points
          topMidpoints[0],
        ]),
        new Polygon([
          ceiling.points[2], // Corner points of the ceiling
          ceiling.points[1],
          topMidpoints[0], // Peak points
          topMidpoints[1],
        ]),
      ];

      // Sort roof polygons by distance as well
      roofPolys.sort(
        (a, b) => b.distanceToPoint(viewPoint) - a.distanceToPoint(viewPoint),
      );
    } else {
      // Non-rectangular footprints keep the flat ceiling only (no pitched
      // roof). Generated buildings are always 4-point rectangles, so this
      // branch is effectively unreachable in practice.
    }

    // --- Draw all parts ---

    // Draw base polygon (ground footprint)
    drawPolygon(ctx, this.base, {
      fill: 'white',
      stroke: 'rgba(0,0,0,0.2)', // Semi-transparent shadow/outline
      lineWidth: 20,
    });

    // Draw sorted sides
    for (const side of sides) {
      drawPolygon(ctx, side, {
        fill: flatRoof ? FLAT_ROOF_WALL_FILL : 'white',
        stroke: '#AAA',
      });
    }

    // Draw ceiling polygon. Flat-roof (OSM) buildings get a muted grey rooftop
    // with a darker outline so they don't read as solid-white blobs; pitched
    // buildings keep the white ceiling under their red roof.
    drawPolygon(
      ctx,
      ceiling,
      flatRoof
        ? { fill: FLAT_ROOF_FILL, stroke: FLAT_ROOF_STROKE, lineWidth: 6 }
        : { fill: 'white', stroke: 'white', lineWidth: 6 },
    );

    // Draw sorted roof polygons (if generated)
    for (const poly of roofPolys) {
      drawPolygon(ctx, poly, {
        fill: '#D44',
        stroke: '#C44',
        lineWidth: 8,
        join: 'round', // Use round line joins for roof edges
      });
    }

    // House number on the roof (only when zoomed in close enough to read it).
    if (
      this.houseNumber &&
      zoom !== undefined &&
      zoom <= HOUSE_NUMBER_MAX_ZOOM
    ) {
      this.#drawHouseNumber(ctx, topPoints);
    }
  }

  /** Draws the OSM house number centered on the (flat/ceiling) roof top. */
  #drawHouseNumber(ctx: CanvasRenderingContext2D, roofPoints: Point[]): void {
    const c = Building.#computeCentroid(roofPoints);
    ctx.save();
    ctx.font = `600 ${HOUSE_NUMBER_FONT_PX}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = HOUSE_NUMBER_FONT_PX / 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(this.houseNumber!, c.x, c.y);
    ctx.fillStyle = '#333';
    ctx.fillText(this.houseNumber!, c.x, c.y);
    ctx.restore();
  }
}
