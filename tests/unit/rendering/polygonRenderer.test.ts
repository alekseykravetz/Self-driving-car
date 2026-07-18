import { describe, it, expect } from 'vitest';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';
import { Polygon } from '../../../ts/math/primitives/polygon.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { drawPolygon } from '../../../ts/rendering/polygonRenderer.js';

describe('polygonRenderer', () => {
  it('drawPolygon calls beginPath, moveTo, lineTo, closePath, fill, stroke', () => {
    const mock = mockCanvas2D();
    const poly = new Polygon([
      new Point(0, 0),
      new Point(10, 0),
      new Point(10, 10),
      new Point(0, 10),
    ]);

    drawPolygon(mock.ctx, poly);

    const methods = mock.calls.map((c) => c.method);
    expect(methods).toContain('beginPath');
    expect(methods).toContain('moveTo');
    expect(methods).toContain('lineTo');
    expect(methods).toContain('closePath');
    expect(methods).toContain('fill');
    expect(methods).toContain('stroke');
  });

  it('drawPolygon applies custom options', () => {
    const mock = mockCanvas2D();
    const poly = new Polygon([
      new Point(0, 0),
      new Point(10, 0),
      new Point(10, 10),
    ]);

    drawPolygon(mock.ctx, poly, {
      stroke: 'red',
      fill: 'rgba(255,0,0,0.3)',
      lineWidth: 3,
      join: 'round',
    });

    expect(mock.ctx.strokeStyle).toBe('red');
    expect(mock.ctx.fillStyle).toBe('rgba(255,0,0,0.3)');
    expect(mock.ctx.lineWidth).toBe(3);
    expect(mock.ctx.lineJoin).toBe('round');
  });
});
