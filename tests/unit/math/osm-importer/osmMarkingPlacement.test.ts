import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import {
  placeApproachMarking,
  approachFacingDir,
  throughAxis,
} from '../../../../ts/math/osm-importer/osmMarkingPlacement.js';
import type { MarkAccumulator } from '../../../../ts/math/osm-importer/osmMarkingPlacement.js';

function makeEntry(overrides: Partial<MarkAccumulator> = {}): MarkAccumulator {
  return {
    center: new Point(0, 0),
    kind: 'light',
    neighbors: [],
    lanes: 2,
    directedInterior: false,
    ...overrides,
  };
}

function expectPointClose(p: Point, x: number, y: number): void {
  expect(p.x).toBeCloseTo(x);
  expect(p.y).toBeCloseTo(y);
}

describe('throughAxis', () => {
  it('returns undefined for no neighbors', () => {
    expect(throughAxis(new Point(0, 0), [])).toBeUndefined();
  });

  it('returns undefined when every neighbor is degenerate (coincides with center)', () => {
    expect(throughAxis(new Point(5, 5), [new Point(5, 5)])).toBeUndefined();
  });

  it('returns the direction to the single neighbor for a dead-end', () => {
    const axis = throughAxis(new Point(0, 0), [new Point(5, 5)]);
    expectPointClose(axis!, 5, 5);
  });

  it('picks the most-opposite pair among several neighbors', () => {
    const axis = throughAxis(new Point(0, 0), [
      new Point(10, 0),
      new Point(0, 10),
      new Point(-10, 0),
    ]);
    // The most opposite pair is (10,0) and (-10,0) -> a - b = (20, 0)
    expectPointClose(axis!, 20, 0);
  });
});

describe('approachFacingDir', () => {
  it('uses directedApproach when present', () => {
    const entry = makeEntry({ directedApproach: new Point(0, -10) });
    const dir = approachFacingDir(entry);
    expectPointClose(dir!, 0, -1);
  });

  it('faces the single approach neighbor on a one-way road', () => {
    const entry = makeEntry({
      neighbors: [
        { point: new Point(0, 10), approach: true, degree: 1 },
        { point: new Point(0, -10), approach: false, degree: 2 },
      ],
    });
    const dir = approachFacingDir(entry);
    expectPointClose(dir!, 0, 1);
  });

  it('faces away from the higher-degree (junction) neighbor on a two-way road', () => {
    const entry = makeEntry({
      neighbors: [
        { point: new Point(10, 0), approach: false, degree: 3 },
        { point: new Point(-10, 0), approach: false, degree: 1 },
      ],
    });
    const dir = approachFacingDir(entry);
    expectPointClose(dir!, -1, 0);
  });

  it('falls back to the through axis when neighbors have equal degree', () => {
    const entry = makeEntry({
      neighbors: [
        { point: new Point(10, 0), approach: false, degree: 1 },
        { point: new Point(-10, 0), approach: false, degree: 1 },
      ],
    });
    const dir = approachFacingDir(entry);
    expectPointClose(dir!, 1, 0);
  });

  it('returns undefined with no neighbors and no directedApproach', () => {
    expect(approachFacingDir(makeEntry())).toBeUndefined();
  });
});

describe('placeApproachMarking', () => {
  it('slides upstream along the directedApproach direction', () => {
    const entry = makeEntry({ directedApproach: new Point(0, -20) });
    const placement = placeApproachMarking(entry, [entry], 10);
    expectPointClose(placement!.center, 0, -10);
    expectPointClose(placement!.directionVector, 0, 1);
    expect(placement!.width).toBe(10);
  });

  it('clamps the upstream slide to half the span when width exceeds it', () => {
    const entry = makeEntry({ directedApproach: new Point(0, -6) });
    const placement = placeApproachMarking(entry, [entry], 10);
    // span = 6, half-span = 3 < width(10) -> slides only 3
    expectPointClose(placement!.center, 0, -3);
  });

  it('picks the approach neighbor most outward from a nearby signal cluster', () => {
    const entry = makeEntry({
      neighbors: [
        { point: new Point(0, -10), approach: true, degree: 1 },
        { point: new Point(0, 10), approach: false, degree: 2 },
      ],
    });
    const other = makeEntry({ center: new Point(50, 0) });
    const placement = placeApproachMarking(entry, [entry, other], 10);
    expectPointClose(placement!.center, 0, -5);
    expectPointClose(placement!.directionVector, 0, 1);
  });

  it('falls back to the through axis for an isolated signal (no cluster)', () => {
    const entry = makeEntry({
      neighbors: [
        { point: new Point(10, 0), approach: false, degree: 1 },
        { point: new Point(-10, 0), approach: false, degree: 1 },
      ],
    });
    const placement = placeApproachMarking(entry, [entry], 10);
    expectPointClose(placement!.center, 0, 0);
    expectPointClose(placement!.directionVector, 1, 0);
  });

  it('returns undefined when no direction can be resolved', () => {
    const entry = makeEntry();
    expect(placeApproachMarking(entry, [entry], 10)).toBeUndefined();
  });
});
