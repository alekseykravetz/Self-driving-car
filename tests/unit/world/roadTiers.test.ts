import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Envelope } from '../../../ts/math/primitives/envelope.js';
import {
  HIGHWAY_TIER_RANK,
  getHighwayTierRank,
  sortEnvelopesByTier,
} from '../../../ts/world/roadTiers.js';

function makeEnv(highwayType?: string): Envelope {
  const p1 = new Point(0, 0);
  const p2 = new Point(100, 0);
  const seg = new Segment(p1, p2, false, false, { highwayType });
  return new Envelope(seg, 100, 10);
}

describe('HIGHWAY_TIER_RANK', () => {
  it('motorway > trunk > primary > secondary > tertiary > residential > service > living_street > track > undefined-type', () => {
    expect(HIGHWAY_TIER_RANK.motorway).toBeGreaterThan(HIGHWAY_TIER_RANK.trunk);
    expect(HIGHWAY_TIER_RANK.trunk).toBeGreaterThan(HIGHWAY_TIER_RANK.primary);
    expect(HIGHWAY_TIER_RANK.primary).toBeGreaterThan(
      HIGHWAY_TIER_RANK.secondary,
    );
    expect(HIGHWAY_TIER_RANK.secondary).toBeGreaterThan(
      HIGHWAY_TIER_RANK.tertiary,
    );
    expect(HIGHWAY_TIER_RANK.tertiary).toBeGreaterThan(
      HIGHWAY_TIER_RANK.residential,
    );
    expect(HIGHWAY_TIER_RANK.residential).toBeGreaterThan(
      HIGHWAY_TIER_RANK.service,
    );
    expect(HIGHWAY_TIER_RANK.service).toBeGreaterThan(
      HIGHWAY_TIER_RANK.living_street,
    );
    expect(HIGHWAY_TIER_RANK.living_street).toBeGreaterThan(
      HIGHWAY_TIER_RANK.track,
    );
    // undefined type = 0, below track = 1
    expect(0).toBeLessThan(HIGHWAY_TIER_RANK.track);
  });
});

describe('getHighwayTierRank', () => {
  it('residential and unclassified share the same rank', () => {
    const seg1 = new Segment(new Point(0, 0), new Point(10, 0), false, false, {
      highwayType: 'residential',
    });
    const seg2 = new Segment(new Point(0, 0), new Point(10, 0), false, false, {
      highwayType: 'unclassified',
    });
    expect(getHighwayTierRank(seg1)).toBe(getHighwayTierRank(seg2));
  });

  it('unknown highway type (e.g. footway) and missing highwayType rank 0', () => {
    const seg1 = new Segment(new Point(0, 0), new Point(10, 0), false, false, {
      highwayType: 'footway',
    });
    const seg2 = new Segment(new Point(0, 0), new Point(10, 0));
    expect(getHighwayTierRank(seg1)).toBe(0);
    expect(getHighwayTierRank(seg2)).toBe(0);
  });

  it('steps also rank 0', () => {
    const seg = new Segment(new Point(0, 0), new Point(10, 0), false, false, {
      highwayType: 'steps',
    });
    expect(getHighwayTierRank(seg)).toBe(0);
  });
});

describe('sortEnvelopesByTier', () => {
  it('sorts shuffled envelopes into ascending tier order', () => {
    const motorway = makeEnv('motorway');
    const track = makeEnv('track');
    const service = makeEnv('service');
    const residential = makeEnv('residential');
    const tertiary = makeEnv('tertiary');
    const secondary = makeEnv('secondary');
    const primary = makeEnv('primary');
    const trunk = makeEnv('trunk');
    const unknown = makeEnv(); // no type

    const shuffled = [
      motorway,
      primary,
      track,
      unknown,
      tertiary,
      secondary,
      trunk,
      service,
      residential,
    ];
    const sorted = sortEnvelopesByTier(shuffled);

    const types = sorted.map((e) => e.skeleton.highwayType);
    expect(types).toEqual([
      undefined, // unknown/0
      'track',
      'service',
      'residential',
      'tertiary',
      'secondary',
      'primary',
      'trunk',
      'motorway',
    ]);
  });

  it('is stable: equal-tier envelopes keep input order', () => {
    const res1 = makeEnv('residential');
    const res2 = makeEnv('residential');
    const res3 = makeEnv('residential');
    const input = [res1, res2, res3];
    const sorted = sortEnvelopesByTier(input);
    expect(sorted[0]).toBe(res1);
    expect(sorted[1]).toBe(res2);
    expect(sorted[2]).toBe(res3);
  });

  it('does not mutate the input array', () => {
    const motorway = makeEnv('motorway');
    const track = makeEnv('track');
    const input = [motorway, track];
    const original = [...input];
    sortEnvelopesByTier(input);
    expect(input).toEqual(original);
  });
});
