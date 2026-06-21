/**
 * World-mode update logic for the simulator.
 * Updates AI cars against the world's road borders, handling collision
 * correction and spatial filtering of nearby border segments.
 *
 * Border lookup uses a {@link SpatialHashGrid} so each car only tests the
 * segments within its sensor range. The query radius is derived from the car's
 * own sensor ray length so cars with long rays still see every relevant border
 * (the previous fixed proximity threshold missed borders when rayLength was
 * larger than the threshold).
 *
 * Cars farther than `idleRange` from the best car are frozen (skipped) when
 * idle is enabled, keeping the simulation fast with very large populations.
 */
function updateWorldCars(
  cars: Car[],
  borderGrid: SpatialHashGrid,
  borderMode: BorderMode,
  collisionBorders: Segment[],
  bestCar: Car,
  idleEnabled: boolean,
  idleRange: number,
): { aliveCount: number; deadCount: number; frozenCount: number } {
  // Minimum border lookup range, independent of sensor length, so damage
  // detection and collision correction always have nearby borders to test.
  const MIN_BORDER_RANGE = 100;

  let aliveCount = 0;
  let deadCount = 0;
  let frozenCount = 0;

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];

    if (car.damaged && borderMode !== 'collision') {
      deadCount++;
      continue;
    }

    // Freeze cars that are far from the best car (idle out-of-range).
    if (
      idleEnabled &&
      car !== bestCar &&
      Math.hypot(car.x - bestCar.x, car.y - bestCar.y) > idleRange &&
      !(car.damaged && borderMode === 'collision')
    ) {
      frozenCount++;
      continue;
    }

    if (car.damaged && borderMode === 'collision') {
      handleCollisionWithRoadBorders(car, collisionBorders);
    }

    // Query only the border segments within the car's sensor/collision range.
    let bordersForUpdate: Point[][] = [];
    if (borderMode !== 'none') {
      const rayLength = car.sensor?.rayLength ?? MIN_BORDER_RANGE;
      const reach = Math.max(rayLength, MIN_BORDER_RANGE);

      // Broad phase: grab every segment in the grid cells around the car.
      const broadRadius = reach + borderGrid.cellSize;
      const candidates = borderGrid.query(car.x, car.y, broadRadius);

      // Narrow phase: keep only the segments this specific car can actually
      // reach (sensor length + half the car body), discarding cell neighbours
      // that are still too far. Squared distances avoid a sqrt per segment.
      const bodyMargin = Math.hypot(car.width, car.height) * 0.5;
      const narrowRadius = reach + bodyMargin;
      const narrowRadiusSq = narrowRadius * narrowRadius;
      for (let j = 0; j < candidates.length; j++) {
        const seg = candidates[j];
        const distSq = pointToSegmentDistanceSq(
          car.x,
          car.y,
          seg[0].x,
          seg[0].y,
          seg[1].x,
          seg[1].y,
        );
        if (distSq <= narrowRadiusSq) {
          bordersForUpdate.push(seg);
        }
      }
    }

    car.update(bordersForUpdate);
    aliveCount++;
  }

  return { aliveCount, deadCount, frozenCount };
}

/**
 * Squared distance from point (px, py) to the line segment (ax, ay)-(bx, by).
 * Allocation-free and sqrt-free, for hot per-car/per-segment filtering.
 */
function pointToSegmentDistanceSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lenSq = abx * abx + aby * aby;
  let t = lenSq > 0 ? (apx * abx + apy * aby) / lenSq : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}
