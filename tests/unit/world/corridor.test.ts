import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Corridor } from '../../../ts/world/corridor.js';

function makeSimpleSkeleton(): Segment[] {
  const p1 = new Point(0, 0);
  const p2 = new Point(0, 100);
  return [new Segment(p1, p2)];
}

describe('Corridor', () => {
  describe('fromPath', () => {
    it('with single segment returns Corridor with borders and skeleton', () => {
      const skeleton = makeSimpleSkeleton();
      const corridor = Corridor.fromPath(skeleton, 50, 4);
      expect(corridor).toBeInstanceOf(Corridor);
      expect(corridor.skeleton).toHaveLength(1);
      expect(corridor.borders.length).toBeGreaterThan(0);
    });

    it('with multiple segments has correct skeleton count', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(0, 100);
      const p3 = new Point(100, 100);
      const skeleton = [new Segment(p1, p2), new Segment(p2, p3)];
      const corridor = Corridor.fromPath(skeleton, 50, 4);
      expect(corridor.skeleton).toHaveLength(2);
      expect(corridor.borders.length).toBeGreaterThan(0);
    });

    it('openStart removes start cap', () => {
      const skeleton = makeSimpleSkeleton();
      const withCap = Corridor.fromPath(skeleton, 50, 4);
      const withoutCap = Corridor.fromPath(skeleton, 50, 4, {
        openStart: true,
      });
      expect(withoutCap.borders.length).toBeLessThan(withCap.borders.length);
    });

    it('openEnd removes end cap', () => {
      const skeleton = makeSimpleSkeleton();
      const withCap = Corridor.fromPath(skeleton, 50, 4);
      const withoutCap = Corridor.fromPath(skeleton, 50, 4, {
        openEnd: true,
      });
      expect(withoutCap.borders.length).toBeLessThan(withCap.borders.length);
    });

    it('extendEnd does not crash and produces borders', () => {
      const skeleton = makeSimpleSkeleton();
      const corridor = Corridor.fromPath(skeleton, 50, 4, {
        extendEnd: true,
      });
      expect(corridor.borders.length).toBeGreaterThan(0);
      expect(corridor.skeleton).toHaveLength(1);
    });
  });

  describe('load', () => {
    it('round-trip preserves skeleton and borders', () => {
      const skeleton = makeSimpleSkeleton();
      const original = Corridor.fromPath(skeleton, 50, 4);
      const info = {
        skeleton: original.skeleton,
        borders: original.borders,
      } as unknown as Corridor;
      const loaded = Corridor.load(info);
      expect(loaded.skeleton).toHaveLength(original.skeleton.length);
      expect(loaded.borders).toHaveLength(original.borders.length);
      expect(loaded.skeleton[0].p1.x).toBe(original.skeleton[0].p1.x);
      expect(loaded.skeleton[0].p2.y).toBe(original.skeleton[0].p2.y);
    });

    it('preserves openStart and openEnd flags', () => {
      const skeleton = makeSimpleSkeleton();
      const original = Corridor.fromPath(skeleton, 50, 4, {
        openStart: true,
        openEnd: true,
      });
      const info = {
        skeleton: original.skeleton,
        borders: original.borders,
        openStart: true,
        openEnd: true,
      } as unknown as Corridor;
      const loaded = Corridor.load(info);
      expect(loaded.openStart).toBe(true);
      expect(loaded.openEnd).toBe(true);
    });

    it('with missing flags defaults to false', () => {
      const skeleton = makeSimpleSkeleton();
      const corridor = Corridor.fromPath(skeleton, 50, 4);
      const info = {
        skeleton: corridor.skeleton,
        borders: corridor.borders,
      } as unknown as Corridor;
      const loaded = Corridor.load(info);
      expect(loaded.openStart).toBe(false);
      expect(loaded.openEnd).toBe(false);
    });
  });
});
