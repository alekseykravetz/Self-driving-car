/**
 * Moves two points towards each other by a percentage of the distance between them.
 * Modifies the points in place.
 */
import { Point } from '../math/primitives/point.js';
import { Polygon } from '../math/primitives/polygon.js';
import { lerp, lerp2D, average } from '../math/utils.js';
export function movePointsInward(p1, p2, percent = 0.3) {
  const new_p1 = lerp2D(p1, p2, percent);
  const new_p2 = lerp2D(p2, p1, percent);
  p1.x = new_p1.x;
  p1.y = new_p1.y;
  p2.x = new_p2.x;
  p2.y = new_p2.y;
}
/**
 * Calculates the centroid (average position) of a set of points.
 */
export function getCentroid(points) {
  let xSum = 0;
  let ySum = 0;
  const n = points.length;
  points.forEach((p) => {
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
export function extrudePolygons(polygons, height = 10) {
  const extrudedPolygons = [];
  for (const polygon of polygons) {
    const ceiling = new Polygon(
      polygon.points.map((point) => new Point(point.x, point.y, -height)),
    );
    const sides = [];
    for (let i = 0; i < polygon.points.length; i++) {
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
 * Extrudes a car shape with detail, including wheel wells and a sloped roof.
 * @param polygon - The base 2D Polygon of the car.
 * @param height - The main height of the car body. Defaults to 15.
 * @param wheelRadius - Used to offset the base height. Defaults to 5.
 */
export function extrudeCarShape(polygon, height = 15, wheelRadius = 5) {
  if (polygon.points.length < 4) {
    console.warn('Cannot extrude car: Invalid base polygon provided.');
    return [];
  }
  // Define key points on the car base
  // Assuming polygon points are [frontRight, frontLeft, backLeft, backRight]
  const frontRight = new Point(polygon.points[0].x, polygon.points[0].y);
  const frontLeft = new Point(polygon.points[1].x, polygon.points[1].y);
  const backLeft = new Point(polygon.points[2].x, polygon.points[2].y);
  const backRight = new Point(polygon.points[3].x, polygon.points[3].y);
  // Calculate intermediate points along the sides
  const middleLeft = average(frontLeft, backLeft);
  const middleRight = average(frontRight, backRight);
  const quarterFrontLeft = average(frontLeft, middleLeft);
  const quarterBackLeft = average(backLeft, middleLeft);
  const quarterFrontRight = average(frontRight, middleRight);
  const quarterBackRight = average(backRight, middleRight);
  // Modify base shape for detail (tapering)
  movePointsInward(frontLeft, frontRight, 0.2);
  movePointsInward(backLeft, backRight, 0.1);
  // Create the detailed base polygon
  const base = new Polygon([
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
  const ceiling = new Polygon(
    base.points.map((p) => new Point(p.x, p.y, -height)),
  );
  const midLine = new Polygon(
    base.points.map((p) => new Point(p.x, p.y, -height / 2)),
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
  const sides = [];
  // Lower sides (base to midline)
  for (let i = 0; i < base.points.length; i++) {
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
  for (let i = 0; i < base.points.length; i++) {
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
  const ceilingParts = [];
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
export function extrudeTreeShapes(polygons, height = 200) {
  const extrudedPolygons = [];
  const trunkRatio = 0.3;
  const canopyBaseRatio = 0.3;
  const trunkHeight = height * trunkRatio;
  const canopyBaseHeight = height * canopyBaseRatio - 20; // Slight gap between trunk top and canopy base
  for (const polygon of polygons) {
    const centroid = getCentroid(polygon.points);
    // Trunk: narrow cylinder from ground to trunkHeight
    const trunkRadius = 0.15;
    const trunkBase = polygon.points.map(
      (p) =>
        new Point(
          lerp(centroid.x, p.x, trunkRadius),
          lerp(centroid.y, p.y, trunkRadius),
          0,
        ),
    );
    const trunkTop = trunkBase.map((p) => new Point(p.x, p.y, -trunkHeight));
    // Trunk sides
    for (let i = 0; i < trunkBase.length; i++) {
      const next = (i + 1) % trunkBase.length;
      const trunkSide = new Polygon([
        trunkBase[i],
        trunkBase[next],
        trunkTop[next],
        trunkTop[i],
      ]);
      const cPoly = trunkSide;
      cPoly.fill = 'rgba(100, 60, 20, 0.4)';
      cPoly.stroke = 'rgba(100, 60, 20, 0.4)';
      extrudedPolygons.push(trunkSide);
    }
    // Canopy: cone from canopyBaseHeight to full height
    const canopyBase = polygon.points.map(
      (p) => new Point(p.x, p.y, -canopyBaseHeight),
    );
    const peak = new Point(centroid.x, centroid.y, -height);
    for (let i = 0; i < canopyBase.length; i++) {
      const next = (i + 1) % canopyBase.length;
      const side = new Polygon([canopyBase[i], canopyBase[next], peak]);
      const cPoly = side;
      cPoly.fill = 'rgba(34, 196, 74, 0.2)';
      cPoly.stroke = 'rgba(34, 196, 74, 0.2)';
      extrudedPolygons.push(side);
    }
    // Canopy bottom cap
    const canopyBottom = new Polygon(canopyBase);
    const cBottom = canopyBottom;
    cBottom.fill = 'rgba(34, 196, 74, 0.15)';
    cBottom.stroke = 'rgba(34, 196, 74, 0.15)';
    extrudedPolygons.push(canopyBottom);
  }
  return extrudedPolygons;
}
