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
      Math.hypot(car.x - bestCar.x, car.y - bestCar.y) > idleRange
    ) {
      frozenCount++;
      continue;
    }

    const nearbyPolygons: Point[][] = [...roadBorders];
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

    car.update(nearbyPolygons);
    aliveCount++;
  }

  return { aliveCount, deadCount, frozenCount };
}
