import { describe, it, expect } from 'vitest';
import { setupImageMock } from '../../../../helpers/setupImageMock.js';

setupImageMock();

import { Car } from '../../../../../ts/car/car.js';
import { handleCollisionWithRoadBorders } from '../../../../../ts/simulator/training/modes/borderCollision.js';
import { Point } from '../../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../../ts/math/primitives/segment.js';

function makeCarAt(x: number, y: number, angle: number = 0): Car {
  return new Car({ x, y, controlType: 'DUMMY', angle });
}

describe('handleCollisionWithRoadBorders', () => {
  it('empty borders array is a no-op', () => {
    const car = makeCarAt(0, 0);
    const angleBefore = car.angle;
    const xBefore = car.x;
    const yBefore = car.y;
    handleCollisionWithRoadBorders(car, []);
    expect(car.angle).toBe(angleBefore);
    expect(car.x).toBe(xBefore);
    expect(car.y).toBe(yBefore);
    expect(car.damaged).toBe(false);
  });

  it('corrects position and sets damaged=false when border is near', () => {
    const car = makeCarAt(0, 5);
    const border = new Segment(new Point(-20, 0), new Point(20, 0));
    handleCollisionWithRoadBorders(car, [border]);
    expect(car.x).not.toBe(0);
    expect(car.damaged).toBe(false);
  });

  it('adjusts angle when correcting position', () => {
    const car = makeCarAt(0, 5);
    car.angle = 0;
    const border = new Segment(new Point(-20, 0), new Point(20, 0));
    const angleBefore = car.angle;
    handleCollisionWithRoadBorders(car, [border]);
    // The nearest-polygon-point logic triggers angle adjustment
    expect(car.angle).not.toBe(angleBefore);
  });

  it('uses else-branch when nearest polygon point is left-side (correctorIndex 1 or 2)', () => {
    const car = makeCarAt(-5, 0, 0);
    const border = new Segment(new Point(0, -100), new Point(0, 100));
    const originalAngle = car.angle;
    handleCollisionWithRoadBorders(car, [border]);
    expect(car.angle).toBeLessThan(originalAngle);
  });
});
