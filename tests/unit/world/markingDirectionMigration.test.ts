import { describe, it, expect } from 'vitest';
import { Graph } from '../../../ts/math/graph/graph.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { World } from '../../../ts/world/world.js';
import { Stop } from '../../../ts/world/markings/stop.js';
import { setupImageMock } from '../../helpers/setupImageMock.js';

setupImageMock();

function makeGraphWorld(): { world: World; p1: Point; p2: Point } {
  const graph = new Graph();
  const p1 = new Point(0, 0);
  const p2 = new Point(100, 0);
  graph.addPoint(p1);
  graph.addPoint(p2);
  graph.addSegment(new Segment(p1, p2));
  const world = new World(graph);
  return { world, p1, p2 };
}

describe('marking direction migration (v2 -> v3)', () => {
  it('negates directionVector and recomputes anchor.flipped for a legacy (v2) world', () => {
    const { world, p1, p2 } = makeGraphWorld();
    // Legacy marking faced opposite to travel (pre-migration convention).
    const legacyDirection = new Point(-1, 0);
    const stop = new Stop(new Point(50, 0), legacyDirection, 50, 30);
    stop.setAnchor(world.graph);
    world.markings.push(stop);

    const json = world.toJSON() as Record<string, unknown>;
    json.version = 2; // simulate a legacy save
    const loaded = World.load(json as unknown as World);

    expect(loaded.markings.length).toBe(1);
    const migrated = loaded.markings[0];
    // Direction is negated to the canonical travel direction.
    expect(migrated.directionVector.x).toBeCloseTo(1);
    expect(migrated.directionVector.y).toBeCloseTo(0);
    // Anchor's flipped flag matches the new direction vs. the segment p1->p2.
    expect(migrated.anchor).toBeDefined();
    expect(migrated.anchor!.flipped).toBe(false);
    void p1;
    void p2;
  });

  it('does not re-flip a world already at version 3', () => {
    const { world } = makeGraphWorld();
    const direction = new Point(1, 0);
    const stop = new Stop(new Point(50, 0), direction, 50, 30);
    stop.setAnchor(world.graph);
    world.markings.push(stop);

    const json = world.toJSON() as unknown as World;
    const loaded = World.load(json);

    expect(loaded.markings.length).toBe(1);
    expect(loaded.markings[0].directionVector.x).toBeCloseTo(1);
    expect(loaded.markings[0].directionVector.y).toBeCloseTo(0);

    // Round-tripping again (still v3) must not flip it further.
    const json2 = loaded.toJSON() as unknown as World;
    const loaded2 = World.load(json2);
    expect(loaded2.markings[0].directionVector.x).toBeCloseTo(1);
    expect(loaded2.markings[0].directionVector.y).toBeCloseTo(0);
  });
});
