import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../ts/math/primitives/segment.js';
import { Envelope } from '../../../../ts/math/primitives/envelope.js';

describe('Envelope', () => {
  const skeleton = new Segment(new Point(0, 0), new Point(100, 0));

  it('generates a polygon from a skeleton segment', () => {
    const envelope = new Envelope(skeleton, 20, 1);
    expect(envelope.polygon).toBeDefined();
    expect(envelope.polygon.points.length).toBeGreaterThanOrEqual(4);
    expect(envelope.polygon.segments.length).toBeGreaterThanOrEqual(4);
  });

  it('creates wider envelopes with larger width', () => {
    const narrow = new Envelope(skeleton, 10, 1);
    const wide = new Envelope(skeleton, 40, 1);
    const narrowMaxY = Math.max(...narrow.polygon.points.map((p) => p.y));
    const wideMaxY = Math.max(...wide.polygon.points.map((p) => p.y));
    expect(wideMaxY).toBeGreaterThan(narrowMaxY);
  });

  it('creates more points with higher roundness', () => {
    const low = new Envelope(skeleton, 20, 1);
    const high = new Envelope(skeleton, 20, 4);
    expect(high.polygon.points.length).toBeGreaterThan(
      low.polygon.points.length,
    );
  });

  it('creates envelope with roundness 0', () => {
    const envelope = new Envelope(skeleton, 20, 0);
    expect(envelope.polygon.points.length).toBeGreaterThanOrEqual(4);
  });

  describe('static load', () => {
    it('reconstructs an envelope from serialized data', () => {
      const original = new Envelope(skeleton, 20, 1);
      const loaded = Envelope.load(
        {
          skeleton: { p1: skeleton.p1, p2: skeleton.p2 },
          polygon: original.polygon,
        },
        20,
        1,
      );
      expect(loaded.polygon.points.length).toBe(original.polygon.points.length);
    });
  });
});
