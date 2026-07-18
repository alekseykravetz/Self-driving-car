import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Light } from '../../../ts/world/markings/light.js';
import { TrafficControlGrid } from '../../../ts/math/trafficControlGrid.js';
import {
  buildTrafficControls,
  queryTrafficControlsNearCar,
} from '../../../ts/simulator/trafficControlUtils.js';
import type { IWorld } from '../../../ts/world/types.js';
import type { Marking } from '../../../ts/world/markings/marking.js';
import type { Car } from '../../../ts/car/car.js';

function makeMockWorld(markings: Marking[]): IWorld {
  return { markings } as IWorld;
}

function makeMockCar(
  overrides: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    sensor: { rayLength: number } | null;
  }>,
) {
  return {
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 25,
    height: overrides.height ?? 63,
    sensor: overrides.sensor ?? { rayLength: 200 },
  } as Car;
}

describe('buildTrafficControls', () => {
  it('world with lights returns entries with polygon and getState', () => {
    const center = new Point(100, 100);
    const dir = new Point(0, 1);
    const light = new Light(center, dir, 50);
    const world = makeMockWorld([light]);
    const entries = buildTrafficControls(world);
    expect(entries.length).toBe(1);
    expect(entries[0].polygon.length).toBeGreaterThan(0);
    expect(typeof entries[0].getState).toBe('function');
  });

  it('getState returns live state from light', () => {
    const center = new Point(100, 100);
    const dir = new Point(0, 1);
    const light = new Light(center, dir, 50);
    expect(light.state).toBe('off');
    const world = makeMockWorld([light]);
    const entries = buildTrafficControls(world);
    expect(entries[0].getState()).toBe('off');
    light.state = 'green';
    expect(entries[0].getState()).toBe('green');
  });

  it('world with no markings returns empty array', () => {
    const world = makeMockWorld([]);
    const entries = buildTrafficControls(world);
    expect(entries).toEqual([]);
  });

  it('non-Light markings are filtered out', () => {
    const mockMarking = { type: 'crossing' } as unknown as Marking;
    const world = makeMockWorld([mockMarking]);
    const entries = buildTrafficControls(world);
    expect(entries).toEqual([]);
  });
});

describe('queryTrafficControlsNearCar', () => {
  it('car near light returns matching controls', () => {
    const grid = new TrafficControlGrid(100);
    const center = new Point(100, 100);
    const dir = new Point(0, 1);
    const light = new Light(center, dir, 50);
    grid.rebuild(
      buildTrafficControls(makeMockWorld([light])).map((e) => ({
        polygon: e.polygon,
        getState: e.getState,
      })),
    );
    const car = makeMockCar({ x: 100, y: 100, sensor: { rayLength: 200 } });
    const controls = queryTrafficControlsNearCar(grid, car);
    expect(controls.length).toBeGreaterThanOrEqual(1);
  });

  it('car far from lights returns empty array', () => {
    const grid = new TrafficControlGrid(100);
    const center = new Point(10000, 10000);
    const dir = new Point(0, 1);
    const light = new Light(center, dir, 50);
    grid.rebuild(
      buildTrafficControls(makeMockWorld([light])).map((e) => ({
        polygon: e.polygon,
        getState: e.getState,
      })),
    );
    const car = makeMockCar({ x: 0, y: 0, sensor: { rayLength: 200 } });
    const controls = queryTrafficControlsNearCar(grid, car);
    expect(controls).toEqual([]);
  });

  it('car without sensor uses fallback MIN_RANGE', () => {
    const grid = new TrafficControlGrid(100);
    const center = new Point(50, 50);
    const dir = new Point(0, 1);
    const light = new Light(center, dir, 50);
    grid.rebuild(
      buildTrafficControls(makeMockWorld([light])).map((e) => ({
        polygon: e.polygon,
        getState: e.getState,
      })),
    );
    const car = makeMockCar({ x: 50, y: 50, sensor: null });
    const controls = queryTrafficControlsNearCar(grid, car);
    expect(controls.length).toBeGreaterThanOrEqual(1);
  });
});
