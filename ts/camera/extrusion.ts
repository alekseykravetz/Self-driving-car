/**
 * Moves two points towards each other by a percentage of the distance between them.
 * Modifies the points in place.
 */
import { Point } from '../math/primitives/point.js';
import { Polygon } from '../math/primitives/polygon.js';
import {
  lerp,
  lerp2D,
  average,
  subtract,
  add,
  scale,
  normalize,
  perpendicular,
} from '../math/utils.js';
import { IColoredPolygon } from './types.js';

export function movePointsInward(
  p1: Point,
  p2: Point,
  percent: number = 0.3,
): void {
  const new_p1: Point = lerp2D(p1, p2, percent);
  const new_p2: Point = lerp2D(p2, p1, percent);
  p1.x = new_p1.x;
  p1.y = new_p1.y;
  p2.x = new_p2.x;
  p2.y = new_p2.y;
}

/**
 * Calculates the centroid (average position) of a set of points.
 */
export function getCentroid(points: Point[]): Point {
  let xSum: number = 0;
  let ySum: number = 0;
  const n: number = points.length;

  points.forEach((p: Point) => {
    xSum += p.x;
    ySum += p.y;
  });
  return new Point(xSum / n, ySum / n);
}

/**
 * Extrudes 2D polygons vertically to create 3D shapes (like simple buildings).
 * @param polygons - An array of 2D Polygons (bases).
 * @param height - The extrusion height. Defaults to 10.
 */
export function extrudePolygons(
  polygons: Polygon[],
  height: number = 10,
): Polygon[] {
  const extrudedPolygons: Polygon[] = [];
  for (const polygon of polygons) {
    const ceiling: Polygon = new Polygon(
      polygon.points.map(
        (point: Point) => new Point(point.x, point.y, -height),
      ),
    );

    const sides: Polygon[] = [];
    for (let i: number = 0; i < polygon.points.length; i++) {
      sides.push(
        new Polygon([
          polygon.points[i],
          polygon.points[(i + 1) % polygon.points.length],
          ceiling.points[(i + 1) % ceiling.points.length],
          ceiling.points[i],
        ]),
      );
    }

    extrudedPolygons.push(...sides, ceiling);
  }
  return extrudedPolygons;
}

/**
 * Extrudes a building base into walls + a flat ceiling + a pitched (gable) roof,
 * mirroring the 2D top-view `Building.draw()` recipe so the 3D view reads as a
 * house instead of a grey block. Walls rise to `height * wallRatio`; the roof
 * ridge peaks at the full `height`. The roof is only defined for a 4-point
 * (rectangular) footprint — anything else keeps the flat ceiling only (matching
 * the 2D fallback). Returns walls and roof separately so the caller can colour
 * them (grey walls, red roof).
 */
export function extrudeBuildingShape(
  base: Polygon,
  height: number = 200,
  wallRatio: number = 0.6,
): { walls: Polygon[]; roof: Polygon[] } {
  const wallHeight = height * wallRatio;
  const ceiling: Polygon = new Polygon(
    base.points.map((p: Point) => new Point(p.x, p.y, -wallHeight)),
  );

  const walls: Polygon[] = [];
  for (let i = 0; i < base.points.length; i++) {
    const next = (i + 1) % base.points.length;
    walls.push(
      new Polygon([
        base.points[i],
        base.points[next],
        ceiling.points[next],
        ceiling.points[i],
      ]),
    );
  }
  walls.push(ceiling);

  const roof: Polygon[] = [];
  if (base.points.length >= 4) {
    // Ridge along the midpoints of edges 0→1 and 2→3, raised to full height.
    const baseMidpoints: Point[] = [
      average(base.points[0], base.points[1]),
      average(base.points[2], base.points[3]),
    ];
    const topMidpoints: Point[] = baseMidpoints.map(
      (p: Point) => new Point(p.x, p.y, -height),
    );
    roof.push(
      new Polygon([
        ceiling.points[0],
        ceiling.points[3],
        topMidpoints[1],
        topMidpoints[0],
      ]),
      new Polygon([
        ceiling.points[2],
        ceiling.points[1],
        topMidpoints[0],
        topMidpoints[1],
      ]),
    );
  }

  return { walls, roof };
}

/**
 * Extrudes a car shape with detail, including wheel wells and a sloped roof.
 * @param polygon - The base 2D Polygon of the car.
 * @param height - The main height of the car body. Defaults to 15.
 * @param wheelRadius - Used to offset the base height. Defaults to 5.
 */
export function extrudeCarShape(
  polygon: Polygon,
  height: number = 15,
  wheelRadius: number = 5,
): Polygon[] {
  if (polygon.points.length < 4) {
    console.warn('Cannot extrude car: Invalid base polygon provided.');
    return [];
  }

  // Define key points on the car base
  // Assuming polygon points are [frontRight, frontLeft, backLeft, backRight]
  const frontRight: Point = new Point(polygon.points[0].x, polygon.points[0].y);
  const frontLeft: Point = new Point(polygon.points[1].x, polygon.points[1].y);
  const backLeft: Point = new Point(polygon.points[2].x, polygon.points[2].y);
  const backRight: Point = new Point(polygon.points[3].x, polygon.points[3].y);

  // Calculate intermediate points along the sides
  const middleLeft: Point = average(frontLeft, backLeft);
  const middleRight: Point = average(frontRight, backRight);
  const quarterFrontLeft: Point = average(frontLeft, middleLeft);
  const quarterBackLeft: Point = average(backLeft, middleLeft);
  const quarterFrontRight: Point = average(frontRight, middleRight);
  const quarterBackRight: Point = average(backRight, middleRight);

  // Modify base shape for detail (tapering)
  movePointsInward(frontLeft, frontRight, 0.2);
  movePointsInward(backLeft, backRight, 0.1);

  // Create the detailed base polygon
  const base: Polygon = new Polygon([
    frontLeft,
    quarterFrontLeft,
    middleLeft,
    quarterBackLeft,
    backLeft,
    backRight,
    quarterBackRight,
    middleRight,
    quarterFrontRight,
    frontRight,
  ]);

  // Offset base points down by wheel radius
  for (const point of base.points) {
    point.z -= wheelRadius;
  }

  // Create ceiling and midline polygons
  const ceiling: Polygon = new Polygon(
    base.points.map((p: Point) => new Point(p.x, p.y, -height)),
  );
  const midLine: Polygon = new Polygon(
    base.points.map((p: Point) => new Point(p.x, p.y, -height / 2)),
  );

  // Modify ceiling shape for roofline
  const [
    c_frontLeft,
    c_quarterFrontLeft,
    c_middleLeft,
    c_quarterBackLeft,
    c_backLeft,
    c_backRight,
    c_quarterBackRight,
    c_middleRight,
    c_quarterFrontRight,
    c_frontRight,
  ] = ceiling.points;

  // Adjust Z coordinates for sloped roof
  c_frontLeft.z += 7;
  c_frontRight.z += 7;
  c_quarterFrontLeft.z += 6;
  c_quarterFrontRight.z += 6;
  c_backLeft.z += 4;
  c_backRight.z += 4;

  // Taper the ceiling inwards
  movePointsInward(c_frontLeft, c_frontRight);
  movePointsInward(c_quarterFrontLeft, c_quarterFrontRight);
  movePointsInward(c_middleLeft, c_middleRight);
  movePointsInward(c_quarterBackLeft, c_quarterBackRight);
  movePointsInward(c_backLeft, c_backRight);
  movePointsInward(c_frontLeft, c_backLeft, 0.1);
  movePointsInward(c_frontRight, c_backRight, 0.1);

  // Create side polygons (split at midline)
  const sides: Polygon[] = [];
  // Lower sides (base to midline)
  for (let i: number = 0; i < base.points.length; i++) {
    sides.push(
      new Polygon([
        base.points[i],
        base.points[(i + 1) % base.points.length],
        midLine.points[(i + 1) % midLine.points.length],
        midLine.points[i],
      ]),
    );
  }
  // Upper sides (midline to ceiling)
  for (let i: number = 0; i < base.points.length; i++) {
    sides.push(
      new Polygon([
        midLine.points[i],
        midLine.points[(i + 1) % midLine.points.length],
        ceiling.points[(i + 1) % ceiling.points.length],
        ceiling.points[i],
      ]),
    );
  }

  // Create ceiling part polygons
  const ceilingParts: Polygon[] = [];
  ceilingParts.push(
    new Polygon([
      c_frontLeft,
      c_quarterFrontLeft,
      c_quarterFrontRight,
      c_frontRight,
    ]),
  );
  ceilingParts.push(
    new Polygon([
      c_quarterFrontLeft,
      c_middleLeft,
      c_middleRight,
      c_quarterFrontRight,
    ]),
  );
  ceilingParts.push(
    new Polygon([
      c_middleLeft,
      c_quarterBackLeft,
      c_quarterBackRight,
      c_middleRight,
    ]),
  );
  ceilingParts.push(
    new Polygon([
      c_quarterBackLeft,
      c_backLeft,
      c_backRight,
      c_quarterBackRight,
    ]),
  );

  return [...sides, ...ceilingParts];
}

/**
 * Extrudes tree base polygons into trees with a trunk and an elevated cone canopy.
 * @param polygons - An array of 2D Polygons representing tree bases.
 * @param height - The total height of the tree. Defaults to 200.
 */
export function extrudeTreeShapes(
  polygons: Polygon[],
  height: number = 200,
): Polygon[] {
  const extrudedPolygons: Polygon[] = [];
  const trunkRatio: number = 0.3;
  const canopyBaseRatio: number = 0.3;
  const trunkHeight: number = height * trunkRatio;
  const canopyBaseHeight: number = height * canopyBaseRatio - 20; // Slight gap between trunk top and canopy base

  for (const polygon of polygons) {
    const centroid = getCentroid(polygon.points);

    // Trunk: narrow cylinder from ground to trunkHeight
    const trunkRadius: number = 0.15;
    const trunkBase: Point[] = polygon.points.map(
      (p: Point) =>
        new Point(
          lerp(centroid.x, p.x, trunkRadius),
          lerp(centroid.y, p.y, trunkRadius),
          0,
        ),
    );
    const trunkTop: Point[] = trunkBase.map(
      (p: Point) => new Point(p.x, p.y, -trunkHeight),
    );

    // Trunk sides
    for (let i: number = 0; i < trunkBase.length; i++) {
      const next: number = (i + 1) % trunkBase.length;
      const trunkSide: Polygon = new Polygon([
        trunkBase[i],
        trunkBase[next],
        trunkTop[next],
        trunkTop[i],
      ]);
      const cPoly = trunkSide as IColoredPolygon;
      cPoly.fill = 'rgba(100, 60, 20, 0.4)';
      cPoly.stroke = 'rgba(100, 60, 20, 0.4)';
      extrudedPolygons.push(trunkSide);
    }

    // Canopy: cone from canopyBaseHeight to full height
    const canopyBase: Point[] = polygon.points.map(
      (p: Point) => new Point(p.x, p.y, -canopyBaseHeight),
    );
    const peak: Point = new Point(centroid.x, centroid.y, -height);

    for (let i: number = 0; i < canopyBase.length; i++) {
      const next: number = (i + 1) % canopyBase.length;
      const side: Polygon = new Polygon([
        canopyBase[i],
        canopyBase[next],
        peak,
      ]);
      const cPoly = side as IColoredPolygon;
      cPoly.fill = 'rgba(34, 196, 74, 0.2)';
      cPoly.stroke = 'rgba(34, 196, 74, 0.2)';
      extrudedPolygons.push(side);
    }

    // Canopy bottom cap
    const canopyBottom: Polygon = new Polygon(canopyBase);
    const cBottom = canopyBottom as IColoredPolygon;
    cBottom.fill = 'rgba(34, 196, 74, 0.15)';
    cBottom.stroke = 'rgba(34, 196, 74, 0.15)';
    extrudedPolygons.push(canopyBottom);
  }
  return extrudedPolygons;
}

/**
 * Builds a single flat rectangular quad centred on the segment `p1`→`p2`, held
 * at a constant height `z`. Used to paint ground-level road markings (lane
 * lines, separators, crossings) in the 3D camera view. Returns `null` for a
 * degenerate (zero-length) segment.
 */
export function segmentToFlatQuad(
  p1: Point,
  p2: Point,
  width: number,
  z: number = -1,
): Polygon | null {
  const dir = subtract(p2, p1);
  if (dir.x === 0 && dir.y === 0) return null;
  const perp = perpendicular(normalize(dir));
  const half = width / 2;
  const a = add(p1, scale(perp, half));
  const b = add(p2, scale(perp, half));
  const c = add(p2, scale(perp, -half));
  const d = add(p1, scale(perp, -half));
  return new Polygon([
    new Point(a.x, a.y, z),
    new Point(b.x, b.y, z),
    new Point(c.x, c.y, z),
    new Point(d.x, d.y, z),
  ]);
}

/**
 * Emits flat dash quads along the segment `p1`→`p2`, but only within the range
 * `[tMin, tMax]` (distances measured from `p1`). Crucially, the dash pattern is
 * anchored to `p1` (a fixed world point), so the visible dashes stay locked to
 * world positions as the camera moves instead of crawling. Used to paint dashed
 * lane dividers on the ground in the 3D camera view.
 */
export function dashSegmentAnchored(
  p1: Point,
  p2: Point,
  tMin: number,
  tMax: number,
  width: number,
  z: number = -1,
  dashLen: number = 30,
  gapLen: number = 40,
): Polygon[] {
  if (tMax <= tMin) return [];
  const dir = normalize(subtract(p2, p1));
  const period = dashLen + gapLen;
  const quads: Polygon[] = [];
  const kStart = Math.max(0, Math.floor(tMin / period));
  for (let k = kStart; k * period < tMax; k++) {
    const start = Math.max(tMin, k * period);
    const end = Math.min(tMax, k * period + dashLen);
    if (end <= start) continue;
    const a = add(p1, scale(dir, start));
    const b = add(p1, scale(dir, end));
    const quad = segmentToFlatQuad(a, b, width, z);
    if (quad) quads.push(quad);
  }
  return quads;
}

/**
 * Builds the white bars of a zebra crossing as individual flat quads (matching
 * the 2D `Crossing.draw` look): stripes run the full crossing depth (`height`,
 * along `directionVector`) and repeat across the road width (`width`). Used so
 * the 3D crossing reads as real painted stripes instead of a solid white slab.
 */
export function zebraStripes(
  center: Point,
  directionVector: Point,
  width: number,
  height: number,
  z: number = -1,
): Polygon[] {
  const depthU = normalize(directionVector);
  const acrossU = perpendicular(depthU);
  const halfDepth = height / 2;
  const stripeW = 11;
  const period = stripeW * 2; // stripe + equal gap
  const stripes: Polygon[] = [];
  for (let o = -width / 2; o + stripeW <= width / 2 + 0.001; o += period) {
    const c0 = o + stripeW / 2;
    const cc = add(center, scale(acrossU, c0));
    const a = add(
      add(cc, scale(acrossU, stripeW / 2)),
      scale(depthU, halfDepth),
    );
    const b = add(
      add(cc, scale(acrossU, stripeW / 2)),
      scale(depthU, -halfDepth),
    );
    const c = add(
      add(cc, scale(acrossU, -stripeW / 2)),
      scale(depthU, -halfDepth),
    );
    const d = add(
      add(cc, scale(acrossU, -stripeW / 2)),
      scale(depthU, halfDepth),
    );
    stripes.push(
      new Polygon([
        new Point(a.x, a.y, z),
        new Point(b.x, b.y, z),
        new Point(c.x, c.y, z),
        new Point(d.x, d.y, z),
      ]),
    );
  }
  return stripes;
}
