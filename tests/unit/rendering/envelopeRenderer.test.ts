import { describe, it, expect } from 'vitest';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';
import { Envelope } from '../../../ts/math/primitives/envelope.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { drawEnvelope } from '../../../ts/rendering/envelopeRenderer.js';

describe('drawEnvelope', () => {
  it('calls drawPolygon with envelope.polygon', () => {
    const mock = mockCanvas2D();
    const env = new Envelope(
      new Segment(new Point(0, 0), new Point(10, 0)),
      10,
      1,
    );

    drawEnvelope(mock.ctx, env);

    const methods = mock.calls.map((c) => c.method);
    expect(methods).toContain('beginPath');
    expect(methods).toContain('moveTo');
    expect(methods).toContain('lineTo');
    expect(methods).toContain('closePath');
    expect(methods).toContain('fill');
    expect(methods).toContain('stroke');
  });

  it('works with default options', () => {
    const mock = mockCanvas2D();
    const env = new Envelope(
      new Segment(new Point(0, 0), new Point(10, 0)),
      10,
      1,
    );

    drawEnvelope(mock.ctx, env);

    expect(mock.ctx.fillStyle).toBe('rgba(0,0,255,0.3)');
    expect(mock.ctx.strokeStyle).toBe('blue');
    expect(mock.ctx.lineWidth).toBe(2);
    expect(mock.ctx.lineJoin).toBe('miter');
  });

  it('passes custom options to drawPolygon', () => {
    const mock = mockCanvas2D();
    const env = new Envelope(
      new Segment(new Point(0, 0), new Point(10, 0)),
      10,
      1,
    );

    drawEnvelope(mock.ctx, env, {
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

  it('renders without throwing for valid envelope', () => {
    const mock = mockCanvas2D();
    const env = new Envelope(
      new Segment(new Point(0, 0), new Point(10, 0)),
      10,
      1,
    );

    expect(() => drawEnvelope(mock.ctx, env)).not.toThrow();
  });

  it('does not crash with undefined options', () => {
    const mock = mockCanvas2D();
    const env = new Envelope(
      new Segment(new Point(0, 0), new Point(10, 0)),
      10,
      1,
    );

    expect(() => drawEnvelope(mock.ctx, env, undefined)).not.toThrow();
    expect(mock.calls.length).toBeGreaterThan(0);
  });
});
