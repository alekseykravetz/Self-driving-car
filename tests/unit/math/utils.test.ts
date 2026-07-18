import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import {
  getNearestPoint,
  getNearestSegment,
  distance,
  radiansToDegrees,
  formatDegrees,
  average,
  dot,
  cross,
  add,
  subtract,
  scale,
  normalize,
  magnitude,
  perpendicular,
  translate,
  angle,
  getIntersection,
  getIntersectionOffset,
  lerp,
  mulberry32,
  lerp2D,
  invLerp,
  rotate,
  degToRad,
  getFake3dPoint,
} from '../../../ts/math/utils.js';

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance(new Point(3, 4), new Point(3, 4))).toBe(0);
  });

  it('computes Pythagorean distance', () => {
    expect(distance(new Point(0, 0), new Point(3, 4))).toBe(5);
  });

  it('handles negative coordinates', () => {
    expect(distance(new Point(-1, -1), new Point(2, 3))).toBe(5);
  });
});

describe('getNearestPoint', () => {
  const points = [new Point(0, 0), new Point(10, 0), new Point(5, 5)];

  it('returns the closest point within threshold', () => {
    const result = getNearestPoint(new Point(1, 0), points, 5);
    expect(result).toEqual(points[0]);
  });

  it('returns null when no point is within threshold', () => {
    const result = getNearestPoint(new Point(100, 100), points, 5);
    expect(result).toBeNull();
  });

  it('returns null for empty array', () => {
    const result = getNearestPoint(new Point(0, 0), [], 10);
    expect(result).toBeNull();
  });

  it('uses MAX_SAFE_INTEGER threshold by default', () => {
    const result = getNearestPoint(new Point(1000, 1000), points);
    expect(result).toBe(points[2]);
  });
});

describe('getNearestSegment', () => {
  const segs = [
    new Segment(new Point(0, 0), new Point(10, 0)),
    new Segment(new Point(0, 10), new Point(10, 10)),
  ];

  it('returns the closest segment within threshold', () => {
    const result = getNearestSegment(new Point(5, 1), segs, 5);
    expect(result).toBe(segs[0]);
  });

  it('returns null when no segment within threshold', () => {
    const result = getNearestSegment(new Point(5, 100), segs, 5);
    expect(result).toBeNull();
  });

  it('returns null for empty array', () => {
    const result = getNearestSegment(new Point(0, 0), [], 10);
    expect(result).toBeNull();
  });
});

describe('radiansToDegrees', () => {
  it('converts PI to 180', () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
  });

  it('converts 0 to 0', () => {
    expect(radiansToDegrees(0)).toBe(0);
  });

  it('converts PI/2 to 90', () => {
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
  });
});

describe('formatDegrees', () => {
  it('formats radians as integer degrees with degree symbol', () => {
    expect(formatDegrees(Math.PI)).toBe('180°');
  });
});

describe('average', () => {
  it('returns midpoint of two points', () => {
    const result = average(new Point(0, 0), new Point(10, 20));
    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
  });
});

describe('dot', () => {
  it('computes dot product', () => {
    expect(dot(new Point(1, 2), new Point(3, 4))).toBe(11);
  });

  it('returns 0 for perpendicular vectors', () => {
    expect(dot(new Point(1, 0), new Point(0, 1))).toBe(0);
  });
});

describe('cross', () => {
  it('computes 2D cross product', () => {
    expect(cross(new Point(1, 0), new Point(0, 1))).toBe(1);
  });

  it('returns negative for reversed order', () => {
    expect(cross(new Point(0, 1), new Point(1, 0))).toBe(-1);
  });
});

describe('add', () => {
  it('adds two points component-wise', () => {
    const result = add(new Point(1, 2), new Point(3, 4));
    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
  });
});

describe('subtract', () => {
  it('subtracts two points component-wise', () => {
    const result = subtract(new Point(5, 7), new Point(2, 3));
    expect(result.x).toBe(3);
    expect(result.y).toBe(4);
  });
});

describe('scale', () => {
  it('scales a point by a factor', () => {
    const result = scale(new Point(3, 4), 2);
    expect(result.x).toBe(6);
    expect(result.y).toBe(8);
  });
});

describe('normalize', () => {
  it('returns a unit vector', () => {
    const result = normalize(new Point(3, 4));
    expect(result.x).toBeCloseTo(0.6);
    expect(result.y).toBeCloseTo(0.8);
    expect(magnitude(result)).toBeCloseTo(1);
  });
});

describe('magnitude', () => {
  it('computes vector length', () => {
    expect(magnitude(new Point(3, 4))).toBe(5);
  });

  it('returns 0 for zero vector', () => {
    expect(magnitude(new Point(0, 0))).toBe(0);
  });
});

describe('perpendicular', () => {
  it('returns perpendicular vector (-y, x)', () => {
    const result = perpendicular(new Point(2, 3));
    expect(result.x).toBe(-3);
    expect(result.y).toBe(2);
  });
});

describe('translate', () => {
  it('translates a point by angle and offset', () => {
    const result = translate(new Point(0, 0), 0, 10);
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(0);
  });

  it('translates along Y for PI/2 angle', () => {
    const result = translate(new Point(0, 0), Math.PI / 2, 5);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(5);
  });
});

describe('angle', () => {
  it('returns 0 for positive x-axis', () => {
    expect(angle(new Point(1, 0))).toBe(0);
  });

  it('returns PI/2 for positive y-axis', () => {
    expect(angle(new Point(0, 1))).toBeCloseTo(Math.PI / 2);
  });
});

describe('getIntersection', () => {
  it('returns intersection point of crossing segments', () => {
    const result = getIntersection(
      new Point(0, 0),
      new Point(10, 0),
      new Point(5, -5),
      new Point(5, 5),
    );
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(5);
    expect(result!.y).toBeCloseTo(0);
    expect(result!.offset).toBeCloseTo(0.5);
  });

  it('returns null for parallel segments', () => {
    const result = getIntersection(
      new Point(0, 0),
      new Point(10, 0),
      new Point(0, 5),
      new Point(10, 5),
    );
    expect(result).toBeNull();
  });

  it('returns null for non-intersecting segments', () => {
    const result = getIntersection(
      new Point(0, 0),
      new Point(1, 0),
      new Point(2, 2),
      new Point(2, 3),
    );
    expect(result).toBeNull();
  });
});

describe('getIntersectionOffset', () => {
  it('returns t offset of intersection', () => {
    const result = getIntersectionOffset(
      new Point(0, 0),
      new Point(10, 0),
      new Point(5, -5),
      new Point(5, 5),
    );
    expect(result).toBeCloseTo(0.5);
  });

  it('returns -1 for parallel segments', () => {
    const result = getIntersectionOffset(
      new Point(0, 0),
      new Point(10, 0),
      new Point(0, 5),
      new Point(10, 5),
    );
    expect(result).toBe(-1);
  });

  it('returns -1 for non-intersecting segments', () => {
    const result = getIntersectionOffset(
      new Point(0, 0),
      new Point(1, 0),
      new Point(2, 2),
      new Point(2, 3),
    );
    expect(result).toBe(-1);
  });
});

describe('lerp', () => {
  it('returns start when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns end when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('extrapolates beyond range', () => {
    expect(lerp(10, 20, 2)).toBe(30);
  });
});

describe('lerp2D', () => {
  it('returns interpolated point at t=0.5', () => {
    const result = lerp2D(new Point(0, 0), new Point(10, 20), 0.5);
    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
  });
});

describe('invLerp', () => {
  it('returns 0 when v equals a', () => {
    expect(invLerp(10, 20, 10)).toBe(0);
  });

  it('returns 1 when v equals b', () => {
    expect(invLerp(10, 20, 20)).toBe(1);
  });

  it('returns 0.5 for midpoint', () => {
    expect(invLerp(10, 20, 15)).toBe(0.5);
  });
});

describe('rotate', () => {
  it('rotates point 90 degrees counter-clockwise', () => {
    const result = rotate(new Point(1, 0), Math.PI / 2);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(1);
  });

  it('rotates point 180 degrees', () => {
    const result = rotate(new Point(1, 0), Math.PI);
    expect(result.x).toBeCloseTo(-1);
    expect(result.y).toBeCloseTo(0);
  });
});

describe('degToRad', () => {
  it('converts 180 degrees to PI', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });

  it('converts 90 degrees to PI/2', () => {
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
  });

  it('converts 0 degrees to 0', () => {
    expect(degToRad(0)).toBe(0);
  });
});

describe('getFake3dPoint', () => {
  it('returns the same point when height is 0', () => {
    const result = getFake3dPoint(new Point(100, 100), new Point(0, 0), 0);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(100);
  });

  it('offsets point away from viewPoint with positive height', () => {
    const result = getFake3dPoint(new Point(100, 0), new Point(0, 0), 50);
    expect(result.x).toBeGreaterThan(100);
    expect(result.y).toBeCloseTo(0);
  });
});

describe('mulberry32', () => {
  it('produces deterministic sequence from seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const seq1 = [rng1(), rng1(), rng1()];
    const seq2 = [rng2(), rng2(), rng2()];
    expect(seq1).toEqual(seq2);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    expect(rng1()).not.toBe(rng2());
  });
});
