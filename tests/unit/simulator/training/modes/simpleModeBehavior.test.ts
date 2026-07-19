import { describe, it, expect, beforeEach } from 'vitest';
import { setupImageMock } from '../../../../helpers/setupImageMock.js';

setupImageMock();

import {
  SimpleSimState,
  updateSimpleTraffic,
  SIMPLE_MODE_CONFIG,
} from '../../../../../ts/simulator/training/modes/simpleModeBehavior.js';
import { Car } from '../../../../../ts/car/car.js';

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
