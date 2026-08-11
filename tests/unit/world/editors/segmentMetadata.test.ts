import { describe, it, expect } from 'vitest';
import { Segment } from '../../../../ts/math/primitives/segment.js';
import { Point } from '../../../../ts/math/primitives/point.js';
import {
  segmentToMetadata,
  applyMetadataToSegment,
} from '../../../../ts/world/editors/segmentMetadata.js';

const seg = () => new Segment(new Point(0, 0), new Point(10, 0));

describe('segmentMetadata', () => {
  it('reads a fully-populated segment into metadata', () => {
    const s = new Segment(new Point(0, 0), new Point(10, 0), true, true, {
      highwayType: 'primary',
      lanes: 3,
      name: 'Main',
      nameEn: 'Main',
      nameHe: 'ראשי',
      maxSpeed: 50,
      ref: '1',
      bridge: true,
      laneMarkings: false,
      parkingLeft: true,
      parkingRight: true,
    });
    const meta = segmentToMetadata(s);
    expect(meta).toMatchObject({
      highwayType: 'primary',
      lanes: 3,
      oneWay: true,
      separated: true,
      name: 'Main',
      nameEn: 'Main',
      nameHe: 'ראשי',
      maxSpeed: 50,
      ref: '1',
      bridge: true,
      laneMarkings: false,
      parkingLeft: true,
      parkingRight: true,
    });
  });

  it('round-trips metadata back onto a segment', () => {
    const src = new Segment(new Point(0, 0), new Point(10, 0), true, false, {
      highwayType: 'secondary',
      lanes: 2,
      name: 'Second',
      maxSpeed: 40,
      ref: '9',
      bridge: true,
      laneMarkings: false,
    });
    const dst = seg();
    applyMetadataToSegment(dst, segmentToMetadata(src));
    expect(segmentToMetadata(dst)).toEqual(segmentToMetadata(src));
  });

  it('treats empty strings and falsey toggles as undefined/false', () => {
    const s = seg();
    applyMetadataToSegment(s, {
      highwayType: '',
      name: '',
      ref: '',
      oneWay: undefined,
      separated: undefined,
      bridge: false,
      laneMarkings: true,
      parkingLeft: false,
      parkingRight: false,
    });
    expect(s.highwayType).toBeUndefined();
    expect(s.name).toBeUndefined();
    expect(s.ref).toBeUndefined();
    expect(s.oneWay).toBe(false);
    expect(s.separated).toBe(false);
    expect(s.bridge).toBeUndefined();
    expect(s.laneMarkings).toBeUndefined();
    expect(s.parkingLeft).toBeUndefined();
    expect(s.parkingRight).toBeUndefined();
  });
});
