import { describe, it, expect } from 'vitest';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';
import { HeatmapGrid } from '../../../ts/math/heatmapGrid.js';
import {
  HeatmapRenderer,
  occupancyColor,
  VisibleWorldRect,
} from '../../../ts/rendering/heatmapRenderer.js';

describe('drawHeatmap', () => {
  it('renders heatmap grid cells', () => {
    const mock = mockCanvas2D();
    const grid = new HeatmapGrid(150);
    grid.record([{ x: 75, y: 75, speed: 1, damaged: false }]);
    const renderer = new HeatmapRenderer(grid);
    const rect: VisibleWorldRect = { minX: 0, minY: 0, maxX: 200, maxY: 200 };

    renderer.draw(mock.ctx, rect);

    expect(mock.calls.filter((c) => c.method === 'save').length).toBe(1);
    expect(mock.calls.filter((c) => c.method === 'fillRect').length).toBe(1);
    expect(mock.calls.filter((c) => c.method === 'restore').length).toBe(1);
    expect(mock.ctx.globalAlpha).toBe(0.35);
    expect(mock.ctx.fillStyle).toBe('rgb(255, 0, 0)');
  });

  it('handles empty grid (no cells)', () => {
    const mock = mockCanvas2D();
    const grid = new HeatmapGrid(150);
    const renderer = new HeatmapRenderer(grid);
    const rect: VisibleWorldRect = { minX: 0, minY: 0, maxX: 200, maxY: 200 };

    renderer.draw(mock.ctx, rect);

    expect(mock.calls.length).toBe(0);
  });

  it('uses correct color mapping for density values', () => {
    expect(occupancyColor(0)).toBe('rgb(0, 0, 255)');
    expect(occupancyColor(1 / 3)).toBe('rgb(0, 255, 255)');
    expect(occupancyColor(2 / 3)).toBe('rgb(255, 255, 0)');
    expect(occupancyColor(1)).toBe('rgb(255, 0, 0)');
  });

  it('handles single cell grid', () => {
    const mock = mockCanvas2D();
    const grid = new HeatmapGrid(150);
    grid.record([{ x: 75, y: 75, speed: 1, damaged: false }]);
    const renderer = new HeatmapRenderer(grid);
    const rect: VisibleWorldRect = { minX: 0, minY: 0, maxX: 149, maxY: 149 };

    renderer.draw(mock.ctx, rect);

    expect(mock.calls.filter((c) => c.method === 'fillRect').length).toBe(1);
  });

  it('does not throw with grid after reset (no data)', () => {
    const mock = mockCanvas2D();
    const grid = new HeatmapGrid(150);
    grid.record([{ x: 75, y: 75, speed: 1, damaged: false }]);
    grid.reset();
    const renderer = new HeatmapRenderer(grid);
    const rect: VisibleWorldRect = { minX: 0, minY: 0, maxX: 200, maxY: 200 };

    expect(() => renderer.draw(mock.ctx, rect)).not.toThrow();
    expect(mock.calls.length).toBe(0);
  });

  it('setAlpha clamps values to 0-1 range', () => {
    const grid = new HeatmapGrid(150);
    const renderer = new HeatmapRenderer(grid);

    renderer.setAlpha(0.5);
    const mock = mockCanvas2D();
    const rect: VisibleWorldRect = { minX: 0, minY: 0, maxX: 200, maxY: 200 };
    grid.record([{ x: 75, y: 75, speed: 1, damaged: false }]);
    renderer.draw(mock.ctx, rect);
    expect(mock.ctx.globalAlpha).toBe(0.5);

    renderer.setAlpha(1.5);
    mock.reset();
    renderer.draw(mock.ctx, rect);
    expect(mock.ctx.globalAlpha).toBe(1);

    renderer.setAlpha(-0.5);
    mock.reset();
    renderer.draw(mock.ctx, rect);
    expect(mock.ctx.globalAlpha).toBe(0);
  });
});
