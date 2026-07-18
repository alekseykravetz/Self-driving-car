import { describe, it, expect } from 'vitest';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { drawSegment } from '../../../ts/rendering/segmentRenderer.js';

describe('segmentRenderer', () => {
  it('drawSegment calls beginPath, moveTo, lineTo, stroke', () => {
    const mock = mockCanvas2D();
    const segment = new Segment(new Point(0, 0), new Point(10, 10));

    drawSegment(mock.ctx, segment);

    const methods = mock.calls.map((c) => c.method);
    expect(methods).toContain('beginPath');
    expect(methods).toContain('moveTo');
    expect(methods).toContain('lineTo');
    expect(methods).toContain('stroke');
  });

  it('drawSegment applies custom options', () => {
    const mock = mockCanvas2D();
    const segment = new Segment(new Point(0, 0), new Point(10, 10));

    drawSegment(mock.ctx, segment, {
      color: 'red',
      width: 4,
      dash: [5, 3],
      cap: 'round',
    });

    expect(mock.ctx.strokeStyle).toBe('red');
    expect(mock.ctx.lineWidth).toBe(4);
    expect(mock.ctx.lineCap).toBe('round');
    expect(mock.calls.filter((c) => c.method === 'setLineDash').length).toBe(2); // set + restore
  });
});
