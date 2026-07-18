import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { TrafficControlGrid } from '../../../ts/math/trafficControlGrid.js';
import type { TrafficControlState } from '../../../ts/math/trafficControlGrid.js';

function makeLightPolygon(cx: number, cy: number, size: number = 10): Point[] {
  return [
    new Point(cx - size / 2, cy - size / 2),
    new Point(cx + size / 2, cy - size / 2),
    new Point(cx + size / 2, cy + size / 2),
    new Point(cx - size / 2, cy + size / 2),
  ];
}

describe('TrafficControlGrid', () => {
  it('creates a grid with default cell size', () => {
    const grid = new TrafficControlGrid();
    expect(grid.cellSize).toBe(150);
  });

  it('creates a grid with custom cell size', () => {
    const grid = new TrafficControlGrid(75);
    expect(grid.cellSize).toBe(75);
  });

  it('clamps cell size to at least 1', () => {
    const grid = new TrafficControlGrid(0);
    expect(grid.cellSize).toBe(150);
  });

  describe('rebuild and query', () => {
    it('queries traffic controls within radius', () => {
      const grid = new TrafficControlGrid(100);
      const poly = makeLightPolygon(200, 200);
      grid.rebuild([{ polygon: poly, getState: () => 'green' as const }]);
      const hits = grid.query(200, 200, 50);
      expect(hits).toHaveLength(1);
      expect(hits[0].state).toBe('green');
      expect(hits[0].polygon).toEqual(poly);
    });

    it('returns empty array when no controls nearby', () => {
      const grid = new TrafficControlGrid(100);
      grid.rebuild([
        { polygon: makeLightPolygon(500, 500), getState: () => 'red' as const },
      ]);
      const hits = grid.query(200, 200, 50);
      expect(hits).toHaveLength(0);
    });

    it('reads live state from getState closure', () => {
      const grid = new TrafficControlGrid(100);
      let state = 'red';
      grid.rebuild([
        {
          polygon: makeLightPolygon(200, 200),
          getState: () => state as TrafficControlState,
        },
      ]);
      expect(grid.query(200, 200, 50)[0].state).toBe('red');
      state = 'green';
      expect(grid.query(200, 200, 50)[0].state).toBe('green');
    });

    it('deduplicates entries that span multiple cells', () => {
      const grid = new TrafficControlGrid(10);
      const bigPoly = makeLightPolygon(50, 50, 100);
      grid.rebuild([{ polygon: bigPoly, getState: () => 'yellow' as const }]);
      const hits = grid.query(50, 50, 60);
      expect(hits).toHaveLength(1);
    });

    it('returns multiple entries in range', () => {
      const grid = new TrafficControlGrid(100);
      grid.rebuild([
        {
          polygon: makeLightPolygon(100, 100),
          getState: () => 'green' as const,
        },
        { polygon: makeLightPolygon(200, 100), getState: () => 'red' as const },
      ]);
      const hits = grid.query(150, 100, 100);
      expect(hits).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const grid = new TrafficControlGrid(100);
      grid.rebuild([
        {
          polygon: makeLightPolygon(100, 100),
          getState: () => 'green' as const,
        },
      ]);
      grid.clear();
      expect(grid.query(100, 100, 50)).toHaveLength(0);
    });
  });

  describe('insert', () => {
    it('inserts a single entry without rebuild', () => {
      const grid = new TrafficControlGrid(100);
      grid.insert({
        polygon: makeLightPolygon(100, 100),
        getState: () => 'off' as const,
      });
      const hits = grid.query(100, 100, 50);
      expect(hits).toHaveLength(1);
      expect(hits[0].state).toBe('off');
    });
  });
});
