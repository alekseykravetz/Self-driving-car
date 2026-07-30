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

  describe('lateralOffset', () => {
    // Horizontal skeleton (0,0)->(100,0): perpendicular = (0,1), so a positive
    // offset shifts the band toward +y.
    it('shifts the polygon perpendicular to the skeleton', () => {
      const base = new Envelope(skeleton, 20, 1, undefined, 0);
      const shifted = new Envelope(skeleton, 20, 1, undefined, 15);
      const meanY = (e: Envelope): number =>
        e.polygon.points.reduce((s, p) => s + p.y, 0) / e.polygon.points.length;
      expect(meanY(shifted) - meanY(base)).toBeCloseTo(15, 5);
    });

    it('leaves the skeleton (metadata source) untouched', () => {
      const seg = new Segment(
        new Point(0, 0),
        new Point(100, 0),
        false,
        false,
        {
          highwayType: 'primary',
        },
      );
      const env = new Envelope(seg, 20, 1, undefined, 10);
      expect(env.skeleton).toBe(seg);
      expect(env.skeleton.highwayType).toBe('primary');
    });

    it('does not change the band width (perpendicular extent)', () => {
      const base = new Envelope(skeleton, 20, 1, undefined, 0);
      const shifted = new Envelope(skeleton, 20, 1, undefined, 15);
      const extent = (e: Envelope): number => {
        const ys = e.polygon.points.map((p) => p.y);
        return Math.max(...ys) - Math.min(...ys);
      };
      expect(extent(shifted)).toBeCloseTo(extent(base), 5);
    });
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
