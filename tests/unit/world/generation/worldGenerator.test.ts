import { describe, it, expect } from 'vitest';
import { Graph } from '../../../../ts/math/graph/graph.js';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../ts/math/primitives/segment.js';
import { WorldGenerator } from '../../../../ts/world/generation/worldGenerator.js';
import { laneGuidesForSegment } from '../../../../ts/world/generation/worldGenerator.js';
import type { WorldGeneratable } from '../../../../ts/world/generation/worldGenerator.js';
import { carAngleFromDirection } from '../../../../ts/math/direction.js';
import { normalize } from '../../../../ts/math/utils.js';

function createEmptyWorld(): WorldGeneratable {
  return {
    graph: new Graph(),
    roadWidth: 30,
    roadRoundness: 3,
    buildingWidth: 20,
    buildingMinLength: 30,
    spacing: 10,
    treeSize: 5,
    treeSeed: 42,
    treePrototypeCount: 5,
    treePrototypes: [],
    envelopes: [],
    roadBorders: [],
    separatorBorders: [],
    laneGuides: [],
    buildings: [],
    trees: [],
    markings: [],
    corridors: [],
  };
}

function createWorldWithRoad(): WorldGeneratable {
  const world = createEmptyWorld();
  const p1 = new Point(0, 0);
  const p2 = new Point(200, 0);
  world.graph.addPoint(p1);
  world.graph.addPoint(p2);
  world.graph.tryAddSegment(new Segment(p1, p2));
  return world;
}

/** Horizontal 2-lane road (0,0)->(200,0) with optional parking metadata. */
function createWorldWithParking(meta: {
  parkingLeft?: boolean;
  parkingRight?: boolean;
}): WorldGeneratable {
  const world = createEmptyWorld();
  const p1 = new Point(0, 0);
  const p2 = new Point(200, 0);
  world.graph.addPoint(p1);
  world.graph.addPoint(p2);
  world.graph.tryAddSegment(
    new Segment(p1, p2, false, false, { lanes: 2, ...meta }),
  );
  return world;
}

/** Signed perpendicular (y) extent of the first envelope polygon. */
function envelopeYExtent(world: WorldGeneratable): {
  minY: number;
  maxY: number;
} {
  const ys = world.envelopes[0].polygon.points.map((p) => p.y);
  return { minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/**
 * A 3×3 grid of intersections wired into a street network — dense enough that
 * building placement produces many adjacent candidates and exercises the
 * footprint de-overlap filter.
 */
function createStreetGrid(): WorldGeneratable {
  const world = createEmptyWorld();
  const coords = [0, 200, 400];
  const pts: Point[] = [];
  for (const x of coords) {
    for (const y of coords) {
      const p = new Point(x, y);
      pts.push(p);
      world.graph.addPoint(p);
    }
  }
  const at = (ix: number, iy: number): Point => pts[ix * 3 + iy];
  for (let ix = 0; ix < 3; ix++) {
    for (let iy = 0; iy < 3; iy++) {
      if (ix < 2)
        world.graph.tryAddSegment(new Segment(at(ix, iy), at(ix + 1, iy)));
      if (iy < 2)
        world.graph.tryAddSegment(new Segment(at(ix, iy), at(ix, iy + 1)));
    }
  }
  return world;
}

describe('WorldGenerator', () => {
  it('generateRoads creates envelopes and road borders from graph', () => {
    const world = createWorldWithRoad();

    WorldGenerator.generateRoads(world);

    expect(world.envelopes.length).toBeGreaterThan(0);
    expect(world.roadBorders.length).toBeGreaterThan(0);
  });

  it('generateRoads creates lane guides', () => {
    const world = createWorldWithRoad();

    WorldGenerator.generateRoads(world);

    expect(world.laneGuides.length).toBeGreaterThan(0);
  });

  describe('parking lane widening', () => {
    // 2-lane road: driving half-width = 2*50/2 = 50; parking lane = 25.
    // perpendicular of (0,0)->(200,0) is (0,1) → +y is the RIGHT side.
    it('no parking → symmetric band [-50, 50]', () => {
      const world = createWorldWithParking({});
      WorldGenerator.generateRoads(world);
      const { minY, maxY } = envelopeYExtent(world);
      expect(minY).toBeCloseTo(-50, 5);
      expect(maxY).toBeCloseTo(50, 5);
    });

    it('parkingRight extends the right (+y) border by 25, left unchanged', () => {
      const world = createWorldWithParking({ parkingRight: true });
      WorldGenerator.generateRoads(world);
      const { minY, maxY } = envelopeYExtent(world);
      expect(minY).toBeCloseTo(-50, 5);
      expect(maxY).toBeCloseTo(75, 5);
    });

    it('parkingLeft extends the left (-y) border by 25, right unchanged', () => {
      const world = createWorldWithParking({ parkingLeft: true });
      WorldGenerator.generateRoads(world);
      const { minY, maxY } = envelopeYExtent(world);
      expect(minY).toBeCloseTo(-75, 5);
      expect(maxY).toBeCloseTo(50, 5);
    });

    it('parking on both sides widens symmetrically to [-75, 75]', () => {
      const world = createWorldWithParking({
        parkingLeft: true,
        parkingRight: true,
      });
      WorldGenerator.generateRoads(world);
      const { minY, maxY } = envelopeYExtent(world);
      expect(minY).toBeCloseTo(-75, 5);
      expect(maxY).toBeCloseTo(75, 5);
    });

    it('parking flags do not change the lane-guide count', () => {
      const plain = createWorldWithParking({});
      const parked = createWorldWithParking({ parkingRight: true });
      WorldGenerator.generateRoads(plain);
      WorldGenerator.generateRoads(parked);
      expect(parked.laneGuides.length).toBe(plain.laneGuides.length);
    });
  });

  it('generateRoads clears previous data before regenerating', () => {
    const world = createWorldWithRoad();

    // First call
    WorldGenerator.generateRoads(world);
    const firstCount = world.roadBorders.length;

    // Add another segment and regenerate
    const p3 = new Point(200, 200);
    world.graph.addPoint(p3);
    world.graph.tryAddSegment(new Segment(world.graph.points[1], p3));

    WorldGenerator.generateRoads(world);

    // Should have more road borders with the new segment
    expect(world.roadBorders.length).toBeGreaterThanOrEqual(firstCount);
    // Envelopes should reflect 2 segments instead of 1
    expect(world.envelopes.length).toBe(2);
  });

  it('generateBuildings places buildings around roads', () => {
    const world = createWorldWithRoad();

    // Need roads first
    WorldGenerator.generateRoads(world);
    WorldGenerator.generateBuildings(world);

    expect(world.buildings.length).toBeGreaterThan(0);
  });

  it('generateBuildings yields a non-overlapping, spacing-respecting set', () => {
    const world = createStreetGrid();
    WorldGenerator.generateRoads(world);
    WorldGenerator.generateBuildings(world);

    const buildings = world.buildings;
    expect(buildings.length).toBeGreaterThan(1);

    // Postcondition of the footprint de-overlap filter: no earlier building
    // overlaps or sits within `spacing` of a later one.
    const eps = 0.001;
    for (let i = 0; i < buildings.length; i++) {
      for (let j = i + 1; j < buildings.length; j++) {
        const a = buildings[i].base;
        const b = buildings[j].base;
        const collides =
          a.intersectsPolygon(b) ||
          a.distanceToPolygon(b) < world.spacing - eps;
        expect(collides).toBe(false);
      }
    }
  });

  it('generateBuildings is deterministic', () => {
    const centers = (): string => {
      const world = createStreetGrid();
      WorldGenerator.generateRoads(world);
      WorldGenerator.generateBuildings(world);
      return world.buildings
        .map((b) => b.base.points.map((p) => `${p.x},${p.y}`).join(';'))
        .join('|');
    };
    expect(centers()).toBe(centers());
  });

  it('generate trees creates tree instances', () => {
    const world = createWorldWithRoad();

    WorldGenerator.generateRoads(world);
    WorldGenerator.generateBuildings(world);
    WorldGenerator.generateTrees(world);

    // Trees may or may not be placed depending on randomness
    expect(world.trees).toBeDefined();
    expect(world.treePrototypes.length).toBe(world.treePrototypeCount);
  });

  it('generate runs all stages by default', () => {
    const world = createWorldWithRoad();

    WorldGenerator.generate(world);

    expect(world.envelopes.length).toBeGreaterThan(0);
    expect(world.roadBorders.length).toBeGreaterThan(0);
    expect(world.buildings).toBeDefined();
    expect(world.trees).toBeDefined();
  });

  it('generate with explicit stages runs only requested stages', () => {
    const world = createWorldWithRoad();

    WorldGenerator.generate(world, {
      roads: true,
      buildings: false,
      trees: false,
    });

    expect(world.envelopes.length).toBeGreaterThan(0);
    expect(world.buildings.length).toBe(0);
    expect(world.trees.length).toBe(0);
  });

  it('reanchorMarkings does not throw with empty markings', () => {
    const world = createWorldWithRoad();

    // Should not throw even with no markings
    expect(() => WorldGenerator.reanchorMarkings(world)).not.toThrow();
  });

  it('generateCorridor creates a corridor between two points', () => {
    const world = createWorldWithRoad();

    WorldGenerator.generateCorridor(world, new Point(0, 0), new Point(200, 0));

    expect(world.corridors.length).toBe(1);
  });

  it('one-way lane guides point along segment direction (travel-direction convention)', () => {
    // directionVector() is the canonical travel direction: cars face ALONG
    // dv (via carAngleFromDirection). For one-way roads, ALL lane guides
    // must point p1→p2 (with the traffic flow).
    const world = createEmptyWorld();
    const p1 = new Point(0, 0);
    const p2 = new Point(200, 0);
    world.graph.addPoint(p1);
    world.graph.addPoint(p2);
    world.graph.tryAddSegment(new Segment(p1, p2, true));

    WorldGenerator.generateRoads(world);

    expect(world.laneGuides.length).toBe(1);
    const sdx = p2.x - p1.x;
    const sdy = p2.y - p1.y;
    for (const guide of world.laneGuides) {
      const gdx = guide.p2.x - guide.p1.x;
      const gdy = guide.p2.y - guide.p1.y;
      const dot = gdx * sdx + gdy * sdy;
      // Guide direction must match segment (p1→p2)
      if (Math.abs(dot) > 0.1) {
        expect(dot).toBeGreaterThan(0);
      }
    }
  });

  it('does not alter lane guide direction for two-way roads (regression)', () => {
    const world = createEmptyWorld();
    const p1 = new Point(0, 0);
    const p2 = new Point(200, 0);
    world.graph.addPoint(p1);
    world.graph.addPoint(p2);
    world.graph.tryAddSegment(new Segment(p1, p2, false));

    WorldGenerator.generateRoads(world);

    // 2-lane road: lane 0 (left, even) = backward (p2→p1), dot < 0
    // lane 1 (right, odd) = forward (p1→p2), dot > 0
    expect(world.laneGuides.length).toBe(2);
    let hasForward = false;
    let hasBackward = false;
    const sdx = p2.x - p1.x;
    const sdy = p2.y - p1.y;
    for (const guide of world.laneGuides) {
      const gdx = guide.p2.x - guide.p1.x;
      const gdy = guide.p2.y - guide.p1.y;
      const dot = gdx * sdx + gdy * sdy;
      if (Math.abs(dot) > 0.1) {
        if (dot > 0) hasForward = true;
        else hasBackward = true;
      }
    }
    // Two-way: one lane goes forward, one goes backward
    expect(hasForward).toBe(true);
    expect(hasBackward).toBe(true);
  });

  it('one-way multi-lane roads have all lanes pointing along segment direction', () => {
    const world = createEmptyWorld();
    const p1 = new Point(0, 0);
    const p2 = new Point(200, 0);
    world.graph.addPoint(p1);
    world.graph.addPoint(p2);
    world.graph.tryAddSegment(new Segment(p1, p2, true, false, { lanes: 3 }));

    WorldGenerator.generateRoads(world);

    expect(world.laneGuides.length).toBe(3);
    const sdx = p2.x - p1.x;
    const sdy = p2.y - p1.y;
    for (const guide of world.laneGuides) {
      const gdx = guide.p2.x - guide.p1.x;
      const gdy = guide.p2.y - guide.p1.y;
      const dot = gdx * sdx + gdy * sdy;
      // All one-way lanes point along segment (p1→p2)
      if (Math.abs(dot) > 0.1) {
        expect(dot).toBeGreaterThan(0);
      }
    }
  });

  it('a car spawned via carAngleFromDirection moves from p1 toward p2 on a one-way lane', () => {
    const world = createEmptyWorld();
    const p1 = new Point(0, 0);
    const p2 = new Point(200, 0);
    world.graph.addPoint(p1);
    world.graph.addPoint(p2);
    world.graph.tryAddSegment(new Segment(p1, p2, true));

    WorldGenerator.generateRoads(world);

    expect(world.laneGuides.length).toBe(1);
    const guide = world.laneGuides[0];
    const dir = guide.directionVector();
    const heading = carAngleFromDirection(dir);
    // Car forward vector per carPhysics: (-sin θ, -cos θ)
    const forward = new Point(-Math.sin(heading), -Math.cos(heading));
    const travel = normalize(new Point(p2.x - p1.x, p2.y - p1.y));
    expect(forward.x).toBeCloseTo(travel.x, 9);
    expect(forward.y).toBeCloseTo(travel.y, 9);
  });
});

describe('laneGuidesForSegment', () => {
  it('returns one guide per lane pointing both ways on a 2-lane two-way road', () => {
    const seg = new Segment(new Point(0, 0), new Point(200, 0), false, false, {
      lanes: 2,
    });
    const guides = laneGuidesForSegment(seg);
    expect(guides.length).toBe(2);
    const dots = guides.map((g) => g.p2.x - g.p1.x); // horizontal road
    expect(dots.some((d) => d > 0)).toBe(true);
    expect(dots.some((d) => d < 0)).toBe(true);
  });

  it('returns lanes all the same way on a 3-lane one-way road', () => {
    const seg = new Segment(new Point(0, 0), new Point(200, 0), true, false, {
      lanes: 3,
    });
    const guides = laneGuidesForSegment(seg);
    expect(guides.length).toBe(3);
    // one-way: all guides point p1→p2 (along segment)
    for (const g of guides) {
      expect(g.p2.x - g.p1.x).toBeGreaterThan(0);
    }
  });

  it('guide count equals lane count', () => {
    const seg = new Segment(new Point(0, 0), new Point(200, 0), false, false, {
      lanes: 4,
    });
    expect(laneGuidesForSegment(seg).length).toBe(4);
  });
});
