import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';

describe('Point', () => {
  it('creates a point with default coordinates', () => {
    const p = new Point();
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
    expect(p.z).toBe(0);
  });

  it('creates a point with given coordinates', () => {
    const p = new Point(3, 4);
    expect(p.x).toBe(3);
    expect(p.y).toBe(4);
    expect(p.z).toBe(0);
  });

  it('creates a point with z coordinate', () => {
    const p = new Point(1, 2, 3);
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
    expect(p.z).toBe(3);
  });

  describe('equals', () => {
    it('returns true for identical points', () => {
      const a = new Point(3, 4);
      const b = new Point(3, 4);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different x', () => {
      const a = new Point(3, 4);
      const b = new Point(5, 4);
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for different y', () => {
      const a = new Point(3, 4);
      const b = new Point(3, 5);
      expect(a.equals(b)).toBe(false);
    });

    it('ignores z for equality', () => {
      const a = new Point(1, 2, 5);
      const b = new Point(1, 2, 10);
      expect(a.equals(b)).toBe(true);
    });
  });

  it('intersection property is undefined by default', () => {
    const p = new Point(0, 0);
    expect(p.intersection).toBeUndefined();
  });
});
