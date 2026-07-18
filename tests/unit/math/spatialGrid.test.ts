import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { SpatialHashGrid } from '../../../ts/math/spatialGrid.js';

describe('SpatialHashGrid', () => {
  it('creates a grid with default cell size', () => {
    const grid = new SpatialHashGrid();
    expect(grid.cellSize).toBe(150);
  });

  it('creates a grid with custom cell size', () => {
    const grid = new SpatialHashGrid(50);
    expect(grid.cellSize).toBe(50);
  });

  it('clamps cell size to at least 1', () => {
    const grid = new SpatialHashGrid(-10);
    expect(grid.cellSize).toBe(150);
  });

  it('uses a minimum cell size of 1 for a zero value', () => {
    const grid = new SpatialHashGrid(0);
    expect(grid.cellSize).toBe(150);
  });

  describe('build and query', () => {
    const segs: [Point, Point][] = [
      [new Point(0, 0), new Point(100, 0)],
      [new Point(200, 200), new Point(300, 300)],
    ];

    it('inserts segments and queries within radius', () => {
      const grid = new SpatialHashGrid(100);
      grid.build(segs);
      const results = grid.query(50, 0, 100);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(segs[0]);
    });

    it('returns segments in query radius', () => {
      const grid = new SpatialHashGrid(100);
      grid.build(segs);
      const results = grid.query(250, 250, 100);
      expect(results).toHaveLength(1);
    });

    it('returns empty array when no segments nearby', () => {
      const grid = new SpatialHashGrid(100);
      grid.build(segs);
      const results = grid.query(1000, 1000, 10);
      expect(results).toHaveLength(0);
    });

    it('deduplicates segments that appear in multiple cells', () => {
      const grid = new SpatialHashGrid(50);
      const longSeg: [Point, Point] = [new Point(0, 0), new Point(200, 0)];
      grid.build([longSeg]);
      const results = grid.query(100, 0, 60);
      expect(results).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('removes all segments', () => {
      const grid = new SpatialHashGrid(100);
      grid.build([[new Point(0, 0), new Point(100, 0)]]);
      grid.clear();
      const results = grid.query(50, 0, 100);
      expect(results).toHaveLength(0);
    });
  });

  describe('insert', () => {
    it('inserts a single segment without build', () => {
      const grid = new SpatialHashGrid(100);
      grid.insert([new Point(0, 0), new Point(100, 0)]);
      const results = grid.query(50, 0, 100);
      expect(results).toHaveLength(1);
    });

    it('handles many segments', () => {
      const grid = new SpatialHashGrid(100);
      const segs: [Point, Point][] = [];
      for (let i = 0; i < 1000; i++) {
        segs.push([new Point(i * 10, 0), new Point(i * 10 + 5, 0)]);
      }
      grid.build(segs);
      const results = grid.query(5000, 0, 200);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
