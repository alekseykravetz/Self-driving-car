'use strict';
/**
 * Moves two points towards each other by a percentage of the distance between them.
 * Modifies the points in place.
 */
function movePointsInward(p1, p2, percent = 0.3) {
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
function getCentroid(points) {
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
function extrudePolygons(polygons, height = 10) {
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
function extrudeCarShape(polygon, height = 15, wheelRadius = 5) {
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
 * Extrudes tree base polygons into cone-shaped trees using a single centroid peak.
 * @param polygons - An array of 2D Polygons representing tree bases.
 * @param height - The height of the tree peak. Defaults to 200.
 */
function extrudeTreeShapes(polygons, height = 200) {
  const extrudedPolygons = [];
  for (const polygon of polygons) {
    const centroid = getCentroid(polygon.points);
    centroid.z = -height;
    const sides = [];
    for (let i = 0; i < polygon.points.length; i++) {
      const p1 = polygon.points[i];
      const p2 = polygon.points[(i + 1) % polygon.points.length];
      sides.push(new Polygon([p1, p2, centroid]));
    }
    sides.forEach((poly) => {
      const cPoly = poly;
      cPoly.fill = 'rgba(34, 196, 74, 0.2)';
      cPoly.stroke = 'rgba(34, 196, 74, 0.2)';
    });
    extrudedPolygons.push(...sides);
  }
  return extrudedPolygons;
}
