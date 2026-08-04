import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { normalize } from '../../../ts/math/utils.js';
import {
  carAngleFromDirection,
  drawRotationFromDirection,
} from '../../../ts/math/direction.js';

function carForward(angle: number): Point {
  return new Point(-Math.sin(angle), -Math.cos(angle));
}

describe('carAngleFromDirection', () => {
  it('returns 0 (up) for dir = (0, -1)', () => {
    expect(carAngleFromDirection(new Point(0, -1))).toBeCloseTo(0, 9);
  });

  it('produces a car forward vector matching dir for several directions', () => {
    const dirs = [
      new Point(0, -1),
      new Point(1, 0),
      new Point(-1, 0),
      new Point(0, 1),
      new Point(1, 1),
      new Point(-2, 3),
    ];
    for (const dir of dirs) {
      const normalizedDir = normalize(dir);
      const forward = carForward(carAngleFromDirection(dir));
      expect(forward.x).toBeCloseTo(normalizedDir.x, 9);
      expect(forward.y).toBeCloseTo(normalizedDir.y, 9);
    }
  });
});

describe('drawRotationFromDirection', () => {
  it('is the negation of carAngleFromDirection', () => {
    const dirs = [
      new Point(0, -1),
      new Point(1, 0),
      new Point(3, -4),
      new Point(-1, -1),
    ];
    for (const dir of dirs) {
      expect(drawRotationFromDirection(dir)).toBeCloseTo(
        -carAngleFromDirection(dir),
        9,
      );
    }
  });
});
