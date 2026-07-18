import { describe, it, expect } from 'vitest';
import { HeatmapGrid, HeatmapCell } from '../../../ts/math/heatmapGrid.js';

describe('HeatmapGrid', () => {
  it('creates a grid with default cell size', () => {
    const grid = new HeatmapGrid();
    expect(grid.cellSize).toBe(150);
  });

  it('creates a grid with custom cell size', () => {
    const grid = new HeatmapGrid(50);
    expect(grid.cellSize).toBe(50);
  });

  it('clamps cell size to at least 1', () => {
    const grid = new HeatmapGrid(-10);
    expect(grid.cellSize).toBe(150);
  });

  describe('totalFrames', () => {
    it('starts at 0', () => {
      const grid = new HeatmapGrid();
      expect(grid.totalFrames).toBe(0);
    });

    it('increments with each record call', () => {
      const grid = new HeatmapGrid();
      grid.record([]);
      grid.record([]);
      expect(grid.totalFrames).toBe(2);
    });
  });

  describe('record', () => {
    it('records occupancy for moving vehicles', () => {
      const grid = new HeatmapGrid(100);
      grid.record([
        { x: 50, y: 50, speed: 10, damaged: false },
        { x: 250, y: 250, speed: 5, damaged: false },
      ]);
      const data = grid.getHeatmapData();
      expect(data).toHaveLength(2);
    });

    it('does not record damaged vehicles', () => {
      const grid = new HeatmapGrid(100);
      grid.record([{ x: 50, y: 50, speed: 0, damaged: true }]);
      expect(grid.getHeatmapData()).toHaveLength(0);
    });

    it('records idle frames for slow vehicles', () => {
      const grid = new HeatmapGrid(100);
      grid.record([{ x: 50, y: 50, speed: 0.1, damaged: false }]);
      const data = grid.getHeatmapData();
      expect(data[0].occupancyFrames).toBe(1);
      expect(data[0].idleFrames).toBe(1);
    });

    it('does not count fast vehicles as idle', () => {
      const grid = new HeatmapGrid(100);
      grid.record([{ x: 50, y: 50, speed: 10, damaged: false }]);
      const data = grid.getHeatmapData();
      expect(data[0].idleFrames).toBe(0);
    });

    it('accumulates vehicle in the same cell', () => {
      const grid = new HeatmapGrid(100);
      grid.record([{ x: 50, y: 50, speed: 1, damaged: false }]);
      grid.record([{ x: 60, y: 60, speed: 1, damaged: false }]);
      grid.record([{ x: 70, y: 70, speed: 1, damaged: false }]);
      const data = grid.getHeatmapData();
      expect(data).toHaveLength(1);
      expect(data[0].occupancyFrames).toBe(3);
    });
  });

  describe('getHeatmapData', () => {
    it('returns empty array for no recordings', () => {
      const grid = new HeatmapGrid();
      expect(grid.getHeatmapData()).toEqual([]);
    });

    it('returns HeatmapCell instances', () => {
      const grid = new HeatmapGrid(100);
      grid.record([{ x: 50, y: 50, speed: 5, damaged: false }]);
      const data = grid.getHeatmapData();
      expect(data[0]).toBeInstanceOf(HeatmapCell);
    });
  });

  describe('reset', () => {
    it('clears all data and resets frame count', () => {
      const grid = new HeatmapGrid(100);
      grid.record([{ x: 50, y: 50, speed: 1, damaged: false }]);
      grid.reset();
      expect(grid.totalFrames).toBe(0);
      expect(grid.getHeatmapData()).toHaveLength(0);
    });
  });
});

describe('HeatmapCell', () => {
  it('creates with given col and row, zeroed counts', () => {
    const cell = new HeatmapCell(3, 5);
    expect(cell.col).toBe(3);
    expect(cell.row).toBe(5);
    expect(cell.occupancyFrames).toBe(0);
    expect(cell.idleFrames).toBe(0);
  });
});
