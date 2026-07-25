import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import { WorldSignageRenderer } from '../../../ts/world/worldSignageRenderer.js';
import { MIN_SIGNAGE_ZOOM } from '../../../ts/world/roadSignage.js';
import * as roadSignage from '../../../ts/world/roadSignage.js';
import * as oneWayArrows from '../../../ts/world/oneWayArrows.js';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';

/** A long, named, speed-limited street so signage placements are produced. */
function makeNamedGraph(): Graph {
  const p1 = new Point(0, 0);
  const p2 = new Point(2000, 0);
  const p3 = new Point(4000, 0);
  const seg1 = new Segment(p1, p2, false, false, {
    name: 'Main Street',
    maxSpeed: 50,
    ref: 'A1',
    highwayType: 'primary',
  });
  const seg2 = new Segment(p2, p3, false, false, {
    name: 'Main Street',
    maxSpeed: 80,
    ref: 'A1',
    highwayType: 'primary',
  });
  return new Graph([p1, p2, p3], [seg1, seg2]);
}

/** A one-way segment so drawOneWayArrows produces arrow placements. */
function makeOneWayGraph(): Graph {
  const p1 = new Point(0, 0);
  const p2 = new Point(2000, 0);
  const seg = new Segment(p1, p2, true, false, { highwayType: 'residential' });
  return new Graph([p1, p2], [seg]);
}

describe('WorldSignageRenderer — zoom guards', () => {
  let renderer: WorldSignageRenderer;
  let mock: ReturnType<typeof mockCanvas2D>;

  beforeEach(() => {
    renderer = new WorldSignageRenderer();
    mock = mockCanvas2D();
  });

  it('drawRoadNames draws nothing below MIN_SIGNAGE_ZOOM', () => {
    const graph = makeNamedGraph();
    renderer.drawRoadNames(mock.ctx, graph, MIN_SIGNAGE_ZOOM - 0.01);
    expect(mock.calls).toHaveLength(0);
  });

  it('drawRoadNames draws nothing when zoom is undefined', () => {
    const graph = makeNamedGraph();
    renderer.drawRoadNames(mock.ctx, graph, undefined);
    expect(mock.calls).toHaveLength(0);
  });

  it('drawRoadNames draws when zoom is at or above MIN_SIGNAGE_ZOOM', () => {
    const graph = makeNamedGraph();
    renderer.drawRoadNames(mock.ctx, graph, MIN_SIGNAGE_ZOOM);
    expect(mock.calls.some((c) => c.method === 'fillText')).toBe(true);
  });

  it('drawSpeedLimits draws nothing below MIN_SIGNAGE_ZOOM', () => {
    const graph = makeNamedGraph();
    renderer.drawSpeedLimits(mock.ctx, graph, MIN_SIGNAGE_ZOOM - 0.01);
    expect(mock.calls).toHaveLength(0);
  });

  it('drawSpeedLimits draws when zoom is above MIN_SIGNAGE_ZOOM', () => {
    const graph = makeNamedGraph();
    renderer.drawSpeedLimits(mock.ctx, graph, 1);
    expect(mock.calls.some((c) => c.method === 'arc')).toBe(true);
  });

  it('drawRoadShields draws nothing below MIN_SIGNAGE_ZOOM', () => {
    const graph = makeNamedGraph();
    renderer.drawRoadShields(mock.ctx, graph, MIN_SIGNAGE_ZOOM - 0.01);
    expect(mock.calls).toHaveLength(0);
  });

  it('drawExitSigns draws nothing below MIN_SIGNAGE_ZOOM', () => {
    const graph = makeNamedGraph();
    renderer.drawExitSigns(mock.ctx, graph, MIN_SIGNAGE_ZOOM - 0.01);
    expect(mock.calls).toHaveLength(0);
  });

  it('drawOneWayArrows has no zoom guard (draws regardless of zoom)', () => {
    const graph = makeOneWayGraph();
    renderer.drawOneWayArrows(mock.ctx, graph);
    expect(mock.calls.some((c) => c.method === 'stroke')).toBe(true);
  });
});

describe('WorldSignageRenderer — cache hash invalidation', () => {
  let renderer: WorldSignageRenderer;
  let mock: ReturnType<typeof mockCanvas2D>;

  beforeEach(() => {
    renderer = new WorldSignageRenderer();
    mock = mockCanvas2D();
    vi.restoreAllMocks();
  });

  it('reuses cached signage placements when the graph hash is unchanged', () => {
    const graph = makeNamedGraph();
    const labelSpy = vi.spyOn(roadSignage, 'computeStreetLabelPlacements');
    const signSpy = vi.spyOn(roadSignage, 'computeSpeedSignPlacements');

    renderer.drawRoadNames(mock.ctx, graph, 1);
    renderer.drawSpeedLimits(mock.ctx, graph, 1);
    renderer.drawRoadNames(mock.ctx, graph, 1);

    // Placements computed once, then served from cache on repeat draws.
    expect(labelSpy).toHaveBeenCalledTimes(1);
    expect(signSpy).toHaveBeenCalledTimes(1);
  });

  it('recomputes signage placements after the graph metadata changes', () => {
    const graph = makeNamedGraph();
    const signSpy = vi.spyOn(roadSignage, 'computeSpeedSignPlacements');

    renderer.drawSpeedLimits(mock.ctx, graph, 1);
    expect(signSpy).toHaveBeenCalledTimes(1);

    // Mutate metadata so Graph.hash() changes, invalidating the cache.
    graph.segments[0].maxSpeed = 30;
    renderer.drawSpeedLimits(mock.ctx, graph, 1);
    expect(signSpy).toHaveBeenCalledTimes(2);
  });

  it('reuses cached one-way arrows when the graph hash is unchanged', () => {
    const graph = makeOneWayGraph();
    const arrowSpy = vi.spyOn(oneWayArrows, 'computeOneWayArrowPlacements');

    renderer.drawOneWayArrows(mock.ctx, graph);
    renderer.drawOneWayArrows(mock.ctx, graph);

    expect(arrowSpy).toHaveBeenCalledTimes(1);
  });

  it('recomputes one-way arrows after the graph changes', () => {
    const graph = makeOneWayGraph();
    const arrowSpy = vi.spyOn(oneWayArrows, 'computeOneWayArrowPlacements');

    renderer.drawOneWayArrows(mock.ctx, graph);
    expect(arrowSpy).toHaveBeenCalledTimes(1);

    // Move an endpoint so the graph geometry (and hash) changes.
    graph.points[1].x = 2500;
    renderer.drawOneWayArrows(mock.ctx, graph);
    expect(arrowSpy).toHaveBeenCalledTimes(2);
  });

  it('reuses cached road shields when the graph hash is unchanged', () => {
    const graph = makeNamedGraph();
    const shieldSpy = vi.spyOn(roadSignage, 'computeRoadShieldPlacements');

    renderer.drawRoadShields(mock.ctx, graph, 1);
    renderer.drawRoadShields(mock.ctx, graph, 1);

    expect(shieldSpy).toHaveBeenCalledTimes(1);
  });

  it('reuses cached exit signs when the graph hash is unchanged', () => {
    const graph = makeNamedGraph();
    const exitSpy = vi.spyOn(roadSignage, 'computeExitSignPlacements');

    renderer.drawExitSigns(mock.ctx, graph, 1);
    renderer.drawExitSigns(mock.ctx, graph, 1);

    expect(exitSpy).toHaveBeenCalledTimes(1);
  });
});
