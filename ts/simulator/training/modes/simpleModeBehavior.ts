/**
 * Simple-mode update logic for the simulator.
 * Manages dynamic traffic generation and car updates in the simple road environment.
 */

class SimpleSimState {
  traffic: Car[] = [];
  lastGeneratedTrafficY: number = -700;
  simpleViewY: number = 0;

  reset(startTrafficY: number = -700): void {
    this.traffic = [];
    this.lastGeneratedTrafficY = startTrafficY;
  }
}

function updateSimpleTraffic(
  state: SimpleSimState,
  bestCar: Car,
  simpleWorld: SimpleWorld,
  roadBorders: Point[][],
  startInfo: { x: number; y: number; angle: number },
): void {
  const TRAFFIC_LOOKAHEAD = 1500;
  const TRAFFIC_ROW_GAP = 200;
  const TRAFFIC_SPEED = 2;

  state.lastGeneratedTrafficY -= TRAFFIC_SPEED;

  while (state.lastGeneratedTrafficY > bestCar.y - TRAFFIC_LOOKAHEAD) {
    state.lastGeneratedTrafficY -= TRAFFIC_ROW_GAP;
    state.traffic.push(
      ...generateTrafficRow(
        state.lastGeneratedTrafficY,
        (lane) => simpleWorld.getLaneCenter(lane),
        simpleWorld.getLaneCount(),
        startInfo.angle,
      ),
    );
  }

  // Cull traffic far behind start (don't cull based on bestCar to preserve road for stuck cars)
  const startY = startInfo.y;
  state.traffic = state.traffic.filter((c) => c.y < startY + 600);

  // Update traffic
  for (let i = 0; i < state.traffic.length; i++) {
    state.traffic[i].update(roadBorders);
  }

  // Sort by y for binary-search spatial lookups
  state.traffic.sort((a, b) => a.y - b.y);
}

function updateSimpleCars(
  cars: Car[],
  state: SimpleSimState,
  roadBorders: Point[][],
  idleEnabled: boolean,
  bestCar: Car,
  idleRange: number,
  borderGrid?: SpatialHashGrid,
): { aliveCount: number; deadCount: number; frozenCount: number } {
  const PROXIMITY_THRESHOLD = 400;
  let aliveCount = 0;
  let deadCount = 0;
  let frozenCount = 0;

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];

    if (car.damaged) {
      deadCount++;
      continue;
    }

    // Freeze cars that are far from the best car (idle out-of-range).
    if (
      idleEnabled &&
      car !== bestCar &&
      bestCar.fitness - car.fitness > idleRange
    ) {
      frozenCount++;
      continue;
    }

    // Broad-phase grid query for road borders near this car.
    let nearbyPolygons: Point[][] = [];
    if (borderGrid) {
      const bodyMargin = Math.hypot(car.width, car.height) * 0.5;
      const reach = Math.max(car.sensor?.rayLength ?? 100, 100);
      const broadRadius = reach + bodyMargin + borderGrid.cellSize;
      const candidates = borderGrid.query(car.x, car.y, broadRadius);
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
          nearbyPolygons.push(seg);
        }
      }
    } else {
      nearbyPolygons = [...roadBorders];
    }

    const minY = car.y - PROXIMITY_THRESHOLD;
    const maxY = car.y + PROXIMITY_THRESHOLD;

    // Binary search for first traffic car with y >= minY
    let lo = 0;
    let hi = state.traffic.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (state.traffic[mid].y < minY) lo = mid + 1;
      else hi = mid;
    }
    for (
      let j = lo;
      j < state.traffic.length && state.traffic[j].y <= maxY;
      j++
    ) {
      nearbyPolygons.push(state.traffic[j].polygon);
    }

    car.update(nearbyPolygons, borderGrid);
    aliveCount++;
  }

  return { aliveCount, deadCount, frozenCount };
}

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
