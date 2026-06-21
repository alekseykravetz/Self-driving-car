/**
 * Handles collision with road borders by pushing the car back onto the road.
 * Finds the nearest skeleton/border segment and corrects the car's position and angle.
 */
function handleCollisionWithRoadBorders(
  car: Car,
  bordersToCheck: Segment[],
): void {
  if (bordersToCheck.length === 0) return;

  const segment = getNearestSegment(new Point(car.x, car.y), bordersToCheck);
  if (!segment) return;

  const correctors = car.polygon.map((p: Point) => {
    const proj = segment.projectPoint(p);
    const projPoint = proj.offset > 1 ? segment.p2 : proj.point;
    return subtract(projPoint, p);
  });

  if (correctors.length === 0) return;

  const magnitudes = correctors.map((p: Point) => magnitude(p));
  const maxMagnitude = Math.max(...magnitudes);

  const correctorIndex = magnitudes.findIndex((mag) => mag === maxMagnitude);
  if (correctorIndex === -1) return;

  const corrector = correctors[correctorIndex];
  const normalizedCorrector = normalize(corrector);

  if (correctorIndex === 0 || correctorIndex === 3) {
    car.angle += 0.1;
  } else {
    car.angle -= 0.1;
  }

  car.x += normalizedCorrector.x;
  car.y += normalizedCorrector.y;
  car.damaged = false;
}
