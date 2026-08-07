import { describe, it, expect, beforeEach } from 'vitest';
import { setupImageMock } from '../../../../helpers/setupImageMock.js';

setupImageMock();

import {
  SimpleSimState,
  updateSimpleTraffic,
  updateSimpleCars,
  SIMPLE_MODE_CONFIG,
} from '../../../../../ts/simulator/training/modes/simpleModeBehavior.js';
import { Car } from '../../../../../ts/car/car.js';
import { Point } from '../../../../../ts/math/primitives/point.js';

function createMockSimpleWorld(laneCount = 3, roadWidth = 180) {
  const laneWidth = roadWidth / laneCount;
  return {
    getLaneCount: () => laneCount,
    getLaneCenter: (lane: number) =>
      -roadWidth / 2 + laneWidth / 2 + lane * laneWidth,
  };
}

const START_INFO = { x: 0, y: 100, angle: 0 };

describe('SimpleSimState', () => {
  it('constructor has empty traffic and default y', () => {
    const state = new SimpleSimState();
    expect(state.traffic).toEqual([]);
    expect(state.lastGeneratedTrafficY).toBe(-700);
    expect(state.simpleViewY).toBe(0);
  });

  it('reset() clears traffic and resets y', () => {
    const state = new SimpleSimState();
    state.traffic.push(new Car({ x: 0, y: 0, controlType: 'DUMMY' }));
    state.lastGeneratedTrafficY = -100;
    state.reset();
    expect(state.traffic).toEqual([]);
    expect(state.lastGeneratedTrafficY).toBe(-700);
  });

  it('reset() accepts custom startTrafficY', () => {
    const state = new SimpleSimState();
    state.reset(-500);
    expect(state.lastGeneratedTrafficY).toBe(-500);
  });
});

function makeCarAt(x: number, y: number): Car {
  return new Car({ x, y, controlType: 'DUMMY' });
}

describe('updateSimpleTraffic', () => {
  let state: SimpleSimState;

  beforeEach(() => {
    state = new SimpleSimState();
  });

  it('generates traffic rows when bestCar moves beyond lookahead', () => {
    const bestCar = makeCarAt(0, 0);
    const world = createMockSimpleWorld(3);
    updateSimpleTraffic(state, bestCar, world, [], START_INFO);
    expect(state.traffic.length).toBeGreaterThan(0);
  });

  it('creates cars at valid lane centers', () => {
    const bestCar = makeCarAt(0, 0);
    const world = createMockSimpleWorld(3);
    const expectedLanes = [-60, 0, 60];
    updateSimpleTraffic(state, bestCar, world, [], START_INFO);
    for (const car of state.traffic) {
      expect(expectedLanes).toContain(Math.round(car.x));
    }
  });

  it('positions cars at expected y intervals', () => {
    const bestCar = makeCarAt(0, 0);
    const world = createMockSimpleWorld(3);
    updateSimpleTraffic(state, bestCar, world, [], START_INFO);
    const actualYs = [...new Set(state.traffic.map((c) => Math.round(c.y)))];
    expect(actualYs).toEqual(
      expect.arrayContaining([-902, -1102, -1302, -1502]),
    );
  });

  it('decrements lastGeneratedTrafficY by trafficSpeed', () => {
    const bestCar = makeCarAt(2000, 2000);
    const world = createMockSimpleWorld(3);
    const prevY = state.lastGeneratedTrafficY;
    updateSimpleTraffic(state, bestCar, world, [], START_INFO);
    expect(state.lastGeneratedTrafficY).toBe(
      prevY - SIMPLE_MODE_CONFIG.trafficSpeed,
    );
  });

  it('handles single lane', () => {
    const bestCar = makeCarAt(0, 0);
    const world = createMockSimpleWorld(1);
    updateSimpleTraffic(state, bestCar, world, [], START_INFO);
    expect(state.traffic.length).toBeGreaterThan(0);
    for (const car of state.traffic) {
      expect(car.x).toBe(0);
    }
  });

  it('does not generate traffic when lookahead range is satisfied', () => {
    const bestCar = makeCarAt(0, 2000);
    const world = createMockSimpleWorld(3);
    updateSimpleTraffic(state, bestCar, world, [], START_INFO);
    expect(state.traffic.length).toBe(0);
  });

  it('culls traffic that has passed behind the car', () => {
    const bestCar = makeCarAt(0, 2000);
    const world = createMockSimpleWorld(3);
    const oldCar = makeCarAt(0, 800);
    const keptCar = makeCarAt(0, 500);
    state.traffic.push(oldCar, keptCar);
    updateSimpleTraffic(state, bestCar, world, [], START_INFO);
    expect(state.traffic).not.toContain(oldCar);
    expect(state.traffic).toContain(keptCar);
  });

  it('sorts traffic by y ascending', () => {
    const bestCar = makeCarAt(0, 0);
    const world = createMockSimpleWorld(3);
    updateSimpleTraffic(state, bestCar, world, [], START_INFO);
    for (let i = 1; i < state.traffic.length; i++) {
      expect(state.traffic[i].y).toBeGreaterThanOrEqual(state.traffic[i - 1].y);
    }
  });
});

describe('SIMPLE_MODE_CONFIG', () => {
  it('exports expected configuration values', () => {
    expect(SIMPLE_MODE_CONFIG).toEqual({
      initialTrafficY: -700,
      trafficLookahead: 1500,
      trafficRowGap: 200,
      trafficSpeed: 2,
      trafficCullMargin: 600,
      proximityThreshold: 400,
      simpleRoadWidth: 180,
    });
  });

  it('initialTrafficY is -700', () => {
    expect(SIMPLE_MODE_CONFIG.initialTrafficY).toBe(-700);
  });

  it('trafficSpeed is 2', () => {
    expect(SIMPLE_MODE_CONFIG.trafficSpeed).toBe(2);
  });
});

/**
 * `updateSimpleCars` decides — per frame, per car — whether the car is dead,
 * idle-frozen, or should be updated, and (for the survivors) which nearby
 * traffic polygons to feed the sensor. We drive it with lightweight mock cars
 * that record their `update()` arguments so the routing can be asserted
 * without a canvas or a real neural network.
 */
interface MockCar {
  y: number;
  fitness: number;
  damaged: boolean;
  polygon: Point[];
  sensor?: { stateAware: boolean };
  updateArgs: unknown[][];
  update: (...args: unknown[]) => void;
}

function mockCar(opts: Partial<MockCar> & { y: number }): MockCar {
  const car: MockCar = {
    fitness: 0,
    damaged: false,
    polygon: [new Point(opts.y, opts.y)],
    updateArgs: [],
    y: opts.y,
    ...opts,
    update(...args: unknown[]) {
      car.updateArgs.push(args);
    },
  };
  return car;
}

const ROAD_BORDERS: Point[][] = [[new Point(-90, 0), new Point(-90, 100)]];

describe('updateSimpleCars', () => {
  it('counts damaged cars as dead and skips their update', () => {
    const state = new SimpleSimState();
    const dead = mockCar({ y: 0, damaged: true });
    const alive = mockCar({ y: 0 });
    const cars = [dead, alive] as unknown as Car[];
    const result = updateSimpleCars(
      cars,
      state,
      ROAD_BORDERS,
      false,
      alive as unknown as Car,
      500,
    );
    expect(result.deadCount).toBe(1);
    expect(result.aliveCount).toBe(1);
    expect(dead.updateArgs).toHaveLength(0);
    expect(alive.updateArgs).toHaveLength(1);
  });

  it('freezes lagging cars when idle is enabled and fitness gap exceeds range', () => {
    const state = new SimpleSimState();
    const best = mockCar({ y: 0, fitness: 1000 });
    const lagging = mockCar({ y: 0, fitness: 100 }); // gap 900 > 500
    const close = mockCar({ y: 0, fitness: 800 }); // gap 200 < 500
    const cars = [best, lagging, close] as unknown as Car[];
    const result = updateSimpleCars(
      cars,
      state,
      ROAD_BORDERS,
      true,
      best as unknown as Car,
      500,
    );
    expect(result.frozenCount).toBe(1);
    expect(lagging.updateArgs).toHaveLength(0);
    // best + close are updated
    expect(result.aliveCount).toBe(2);
  });

  it('does not freeze anyone when idle is disabled', () => {
    const state = new SimpleSimState();
    const best = mockCar({ y: 0, fitness: 1000 });
    const lagging = mockCar({ y: 0, fitness: 0 });
    const result = updateSimpleCars(
      [best, lagging] as unknown as Car[],
      state,
      ROAD_BORDERS,
      false,
      best as unknown as Car,
      500,
    );
    expect(result.frozenCount).toBe(0);
    expect(lagging.updateArgs).toHaveLength(1);
  });

  it('only feeds traffic within the proximity window to a non-state-aware car', () => {
    const state = new SimpleSimState();
    // Sorted ascending, as the caller guarantees.
    const farBehind = mockCar({ y: -1000, polygon: [new Point(1, 1)] });
    const near1 = mockCar({ y: -100, polygon: [new Point(2, 2)] });
    const near2 = mockCar({ y: 200, polygon: [new Point(3, 3)] });
    const farAhead = mockCar({ y: 900, polygon: [new Point(4, 4)] });
    state.traffic = [farBehind, near1, near2, farAhead] as unknown as Car[];

    const player = mockCar({ y: 0 }); // window is [-400, 400]
    updateSimpleCars(
      [player] as unknown as Car[],
      state,
      ROAD_BORDERS,
      false,
      player as unknown as Car,
      500,
    );

    const [nearbyPolygons, second, third] = player.updateArgs[0];
    // Non-state-aware: nearby traffic is merged into the collision polygons.
    expect(nearbyPolygons).toEqual([
      ...ROAD_BORDERS,
      near1.polygon,
      near2.polygon,
    ]);
    expect(second).toBeUndefined();
    expect(third).toBeUndefined();
  });

  it('routes nearby traffic to the otherCars channel for a state-aware car', () => {
    const state = new SimpleSimState();
    const near = mockCar({ y: 50, polygon: [new Point(2, 2)] });
    state.traffic = [near] as unknown as Car[];

    const player = mockCar({ y: 0, sensor: { stateAware: true } });
    updateSimpleCars(
      [player] as unknown as Car[],
      state,
      ROAD_BORDERS,
      false,
      player as unknown as Car,
      500,
    );

    const [nearbyPolygons, second, otherCars] = player.updateArgs[0];
    // State-aware: road borders only in the collision set; traffic goes to arg 3.
    expect(nearbyPolygons).toEqual([...ROAD_BORDERS]);
    expect(second).toBeUndefined();
    expect(otherCars).toEqual([near.polygon]);
  });
});
