import { describe, it, expect } from 'vitest';
import { setupImageMock } from '../../../../helpers/setupImageMock.js';

setupImageMock();

import { Car } from '../../../../../ts/car/car.js';
import { handleCollisionWithRoadBorders } from '../../../../../ts/simulator/training/modes/borderCollision.js';
import { COLLISION_ANGLE_CORRECTION } from '../../../../../ts/car/config.js';

function makeCarAt(x: number, y: number, angle: number = 0): Car {
  return new Car({ x, y, controlType: 'DUMMY', angle });
}

describe('handleCollisionWithRoadBorders', () => {
  it('pushes car back along its angle', () => {
    // Car facing down (angle = Math.PI), position (0, 5)
    const car = makeCarAt(0, 5, Math.PI);
    const xBefore = car.x;
    const yBefore = car.y;
    const pushDistance = Math.hypot(car.width, car.height) / 2;

    handleCollisionWithRoadBorders(car, []);

    // Car should move BACK along its angle:
    // angle = PI → sin(PI) = 0, cos(PI) = -1
    // push: x += 0 * push = 0, y += (-1) * push = -push
    expect(car.x).toBeCloseTo(xBefore, 5);
    expect(car.y).toBeCloseTo(yBefore - pushDistance, 0.001);
  });

  it('sets speed to 0 after collision', () => {
    const car = makeCarAt(0, 5);
    car.speed = 10;
    handleCollisionWithRoadBorders(car, []);
    expect(car.speed).toBe(0);
  });

  it('adjusts angle by COLLISION_ANGLE_CORRECTION', () => {
    const car = makeCarAt(0, 5, 0);
    const angleBefore = car.angle;
    handleCollisionWithRoadBorders(car, []);
    expect(car.angle).toBe(angleBefore + COLLISION_ANGLE_CORRECTION);
  });

  it('clears damaged flag', () => {
    const car = makeCarAt(0, 5);
    car.damaged = true;
    handleCollisionWithRoadBorders(car, []);
    expect(car.damaged).toBe(false);
  });

  it('pushes car back with correct direction at various angles', () => {
    // Angle = 0 (facing up)
    // Movement: x -= sin(0)*s = 0, y -= cos(0)*s = -s
    // Bump back: x += 0 = 0, y += 1 = +y
    const car = makeCarAt(10, 20, 0);
    const pushDistance = Math.hypot(car.width, car.height) / 2;
    handleCollisionWithRoadBorders(car, []);
    expect(car.x).toBeCloseTo(10, 5);
    expect(car.y).toBeCloseTo(20 + pushDistance, 0.001);
  });
});
