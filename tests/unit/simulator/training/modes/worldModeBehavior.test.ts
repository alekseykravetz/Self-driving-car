import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupImageMock } from '../../../../helpers/setupImageMock.js';

setupImageMock();

import { updateWorldCars } from '../../../../../ts/simulator/training/modes/worldModeBehavior.js';
import { Car } from '../../../../../ts/car/car.js';
import { SpatialHashGrid } from '../../../../../ts/math/spatialGrid.js';
import { TrafficControlGrid } from '../../../../../ts/math/trafficControlGrid.js';
import { Point } from '../../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../../ts/math/primitives/segment.js';
import { makeCar } from '../../../../helpers/makeCar.js';

function makeAliveCar(x = 0, y = 0): Car {
  return makeCar({ controlType: 'AI', x, y });
}

function makeCarWithSensor(
  x = 0,
  y = 0,
  stateAware = false,
  rayLength = 200,
): Car {
  const car = new Car({
    x,
    y,
    controlType: 'AI',
    sensor: { stateAware, rayLength },
  });
  return car;
}

function createEmptyGrids() {
  return {
    borderGrid: new SpatialHashGrid(50),
    trafficGrid: new TrafficControlGrid(50),
    collisionBorders: [] as Segment[],
  };
}

describe('updateWorldCars', () => {
  let grids: ReturnType<typeof createEmptyGrids>;

  beforeEach(() => {
    grids = createEmptyGrids();
  });

  it('updates alive cars and counts them', () => {
    const cars = [makeAliveCar(0, 0), makeAliveCar(100, 0)];
    const bestCar = cars[0];

    const spy0 = vi.spyOn(cars[0], 'update');
    const spy1 = vi.spyOn(cars[1], 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      false,
      0,
    );

    expect(result).toEqual({ aliveCount: 2, deadCount: 0, frozenCount: 0 });
    expect(spy0).toHaveBeenCalledOnce();
    expect(spy1).toHaveBeenCalledOnce();
  });

  it('skips damaged cars when borderMode is not collision', () => {
    const cars = [
      makeAliveCar(0, 0),
      makeAliveCar(100, 0),
      makeAliveCar(200, 0),
    ];
    cars[1].damaged = true;
    const bestCar = cars[0];

    const spy = vi.spyOn(cars[1], 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      false,
      0,
    );

    expect(result).toEqual({ aliveCount: 2, deadCount: 1, frozenCount: 0 });
    expect(spy).not.toHaveBeenCalled();
  });

  it('counts dead cars', () => {
    const cars = [makeAliveCar(0, 0), makeAliveCar(100, 0)];
    cars[0].damaged = true;
    cars[1].damaged = true;
    const bestCar = cars[0];

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      false,
      0,
    );

    expect(result).toEqual({ aliveCount: 0, deadCount: 2, frozenCount: 0 });
  });

  it('freezes cars far behind bestCar when idleEnabled', () => {
    const cars = [
      makeAliveCar(0, 0),
      makeAliveCar(100, 0),
      makeAliveCar(200, 0),
    ];
    const bestCar = cars[0];
    bestCar.fitness = 100;
    cars[1].fitness = 0;
    cars[2].fitness = 10;

    const spy1 = vi.spyOn(cars[1], 'update');
    const spy2 = vi.spyOn(cars[2], 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      true,
      50,
    );

    // bestCar fitness (100) - cars[1].fitness (0) = 100 > 50 → frozen
    // bestCar fitness (100) - cars[2].fitness (10) = 90 > 50 → frozen
    expect(result).toEqual({ aliveCount: 1, deadCount: 0, frozenCount: 2 });
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
  });

  it('does NOT freeze bestCar itself', () => {
    const cars = [makeAliveCar(0, 0), makeAliveCar(100, 0)];
    const bestCar = cars[0];
    bestCar.fitness = 100;
    cars[1].fitness = 0;

    const spy0 = vi.spyOn(cars[0], 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      true,
      10,
    );

    // bestCar is always alive (reference check car !== bestCar)
    // cars[1]: 100 - 0 = 100 > 10 → frozen
    expect(result).toEqual({ aliveCount: 1, deadCount: 0, frozenCount: 1 });
    expect(spy0).toHaveBeenCalledOnce();
  });

  it('does NOT freeze cars close to bestCar', () => {
    const cars = [makeAliveCar(0, 0), makeAliveCar(100, 0)];
    const bestCar = cars[0];
    bestCar.fitness = 100;
    cars[1].fitness = 80;

    const spy1 = vi.spyOn(cars[1], 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      true,
      50,
    );

    // 100 - 80 = 20 <= 50, not frozen
    expect(result).toEqual({ aliveCount: 2, deadCount: 0, frozenCount: 0 });
    expect(spy1).toHaveBeenCalledOnce();
  });

  it('calls handleCollisionWithRoadBorders for damaged cars in collision mode', () => {
    const cars = [makeAliveCar(0, 0), makeAliveCar(100, 0)];
    const bestCar = cars[0];
    cars[1].damaged = true;

    const border = new Segment(new Point(-20, 0), new Point(20, 0));
    const collisionBorders = [border];

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'collision',
      collisionBorders,
      bestCar,
      false,
      0,
    );

    // cars[1] is damaged but with collision mode, it gets repaired
    // and counted as alive
    expect(result).toEqual({ aliveCount: 2, deadCount: 0, frozenCount: 0 });
    expect(cars[1].damaged).toBe(false);
  });

  it('passes trafficControls to car.update() when sensor is stateAware', () => {
    const car = makeCarWithSensor(0, 0, true);
    const bestCar = car;
    const cars = [car];

    const spy = vi.spyOn(car, 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      false,
      0,
    );

    expect(result).toEqual({ aliveCount: 1, deadCount: 0, frozenCount: 0 });
    expect(spy).toHaveBeenCalledOnce();
    // Third arg is otherCars (empty []), second arg is trafficControls
    const args = spy.mock.calls[0];
    expect(args[2]).toEqual([]);
  });

  it('does not query trafficControls when sensor is not stateAware', () => {
    const car = makeCarWithSensor(0, 0, false);
    const bestCar = car;
    const cars = [car];

    const spy = vi.spyOn(car, 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      false,
      0,
    );

    expect(result).toEqual({ aliveCount: 1, deadCount: 0, frozenCount: 0 });
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0];
    // Non-stateAware → empty traffic controls array
    expect(args[1]).toEqual([]);
  });

  it('returns zero counts for empty cars array', () => {
    const result = updateWorldCars(
      [],
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      {} as Car,
      false,
      0,
    );

    expect(result).toEqual({ aliveCount: 0, deadCount: 0, frozenCount: 0 });
  });

  it('returns all dead when all cars are damaged (damage mode)', () => {
    const cars = [
      makeAliveCar(0, 0),
      makeAliveCar(100, 0),
      makeAliveCar(200, 0),
    ];
    cars[0].damaged = true;
    cars[1].damaged = true;
    cars[2].damaged = true;
    const bestCar = cars[0];

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      false,
      0,
    );

    expect(result).toEqual({ aliveCount: 0, deadCount: 3, frozenCount: 0 });
  });

  it('returns all alive when all cars are damaged (collision mode)', () => {
    const cars = [
      makeAliveCar(0, 0),
      makeAliveCar(100, 0),
      makeAliveCar(200, 0),
    ];
    cars[0].damaged = true;
    cars[1].damaged = true;
    cars[2].damaged = true;
    const bestCar = cars[0];

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'collision',
      grids.collisionBorders,
      bestCar,
      false,
      0,
    );

    // Collision mode repairs damaged cars, so all are alive
    expect(result).toEqual({ aliveCount: 3, deadCount: 0, frozenCount: 0 });
  });

  it('freezes all non-best cars when all are far behind (idleEnabled)', () => {
    const cars = [
      makeAliveCar(0, 0),
      makeAliveCar(100, 0),
      makeAliveCar(200, 0),
    ];
    const bestCar = cars[0];
    bestCar.fitness = 100;
    cars[1].fitness = 0;
    cars[2].fitness = 10;

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      true,
      5,
    );

    expect(result).toEqual({ aliveCount: 1, deadCount: 0, frozenCount: 2 });
  });

  it('does not freeze any cars when idleEnabled is false', () => {
    const cars = [
      makeAliveCar(0, 0),
      makeAliveCar(100, 0),
      makeAliveCar(200, 0),
    ];
    const bestCar = cars[0];
    bestCar.fitness = 100;
    cars[1].fitness = 0;
    cars[2].fitness = 10;

    const spy1 = vi.spyOn(cars[1], 'update');
    const spy2 = vi.spyOn(cars[2], 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      false,
      5,
    );

    expect(result).toEqual({ aliveCount: 3, deadCount: 0, frozenCount: 0 });
    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
  });

  it('updates with queried borders when borderMode is not none', () => {
    const car = makeAliveCar(0, 0);
    const bestCar = car;
    const cars = [car];

    const spy = vi.spyOn(car, 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'damage',
      grids.collisionBorders,
      bestCar,
      false,
      0,
    );

    expect(result).toEqual({ aliveCount: 1, deadCount: 0, frozenCount: 0 });
    expect(spy).toHaveBeenCalledOnce();
    // Empty grid means no borders near car
    expect(spy.mock.calls[0][0]).toEqual([]);
  });

  it('updates with empty borders when borderMode is none', () => {
    const car = makeAliveCar(0, 0);
    const bestCar = car;
    const cars = [car];

    const spy = vi.spyOn(car, 'update');

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'none',
      grids.collisionBorders,
      bestCar,
      false,
      0,
    );

    expect(result).toEqual({ aliveCount: 1, deadCount: 0, frozenCount: 0 });
    expect(spy).toHaveBeenCalledOnce();
    // borderMode='none' → empty array passed to update, no grid query
    expect(spy.mock.calls[0][0]).toEqual([]);
  });

  it('skips freeze for damaged cars in collision mode', () => {
    const cars = [makeAliveCar(0, 0), makeAliveCar(100, 0)];
    const bestCar = cars[0];
    bestCar.fitness = 100;
    cars[1].damaged = true;
    cars[1].fitness = 0;

    const border = new Segment(new Point(-20, 0), new Point(20, 0));

    const result = updateWorldCars(
      cars,
      grids.borderGrid,
      grids.trafficGrid,
      'collision',
      [border],
      bestCar,
      true,
      50,
    );

    // cars[1] is damaged but borderMode='collision', so:
    // - first if: car.damaged && borderMode !== 'collision' → false (borderMode IS collision)
    // - freeze check: idleEnabled && car !== bestCar && 100-0 > 50 && !(car.damaged && borderMode === 'collision')
    //   → the last condition `!(car.damaged && borderMode === 'collision')` → !(true && true) → false
    //   → so the freeze check ALSO returns false (not frozen)
    // - then handleCollisionWithRoadBorders is called
    // - car.update() is called → alive
    expect(result).toEqual({ aliveCount: 2, deadCount: 0, frozenCount: 0 });
    expect(cars[1].damaged).toBe(false);
  });
});
