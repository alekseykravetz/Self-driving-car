import { describe, it, expect } from 'vitest';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { drawPoint } from '../../../ts/rendering/pointRenderer.js';

describe('pointRenderer', () => {
  it('drawPoint calls beginPath and arc', () => {
    const mock = mockCanvas2D();
    const point = new Point(5, 10);

    drawPoint(mock.ctx, point);

    expect(mock.calls.filter((c) => c.method === 'beginPath').length).toBe(1);
    expect(mock.calls.filter((c) => c.method === 'arc').length).toBe(1);
  });

  it('drawPoint with outline=true draws an additional stroke arc', () => {
    const mock = mockCanvas2D();
    const point = new Point(5, 10);

    drawPoint(mock.ctx, point, { outline: true });

    // First arc is fill, second arc is outline
    const arcs = mock.calls.filter((c) => c.method === 'arc');
    expect(arcs.length).toBe(2);
    expect(mock.calls.filter((c) => c.method === 'stroke').length).toBe(1);
  });

  it('drawPoint with fill=true draws a second fill arc', () => {
    const mock = mockCanvas2D();
    const point = new Point(5, 10);

    drawPoint(mock.ctx, point, { fill: true });

    const arcs = mock.calls.filter((c) => c.method === 'arc');
    expect(arcs.length).toBe(2); // first fill + second yellow fill
    expect(mock.calls.filter((c) => c.method === 'fill').length).toBe(2);
  });
});
