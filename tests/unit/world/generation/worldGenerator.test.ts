import { describe, it, expect } from 'vitest';
import { Graph } from '../../../../ts/math/graph/graph.js';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../ts/math/primitives/segment.js';
import { WorldGenerator } from '../../../../ts/world/generation/worldGenerator.js';
import type { WorldGeneratable } from '../../../../ts/world/generation/worldGenerator.js';

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

  it('fixes lane guide direction for one-way roads', () => {
    const world = createEmptyWorld();
    const p1 = new Point(0, 0);
    const p2 = new Point(200, 0);
    world.graph.addPoint(p1);
    world.graph.addPoint(p2);
    world.graph.tryAddSegment(new Segment(p1, p2, true));

    WorldGenerator.generateRoads(world);

    expect(world.laneGuides.length).toBeGreaterThan(0);
    const sdx = p2.x - p1.x;
    const sdy = p2.y - p1.y;
    for (const guide of world.laneGuides) {
      const gdx = guide.p2.x - guide.p1.x;
      const gdy = guide.p2.y - guide.p1.y;
      const dot = gdx * sdx + gdy * sdy;
      // Guide segments parallel to the skeleton must have matching direction
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

    expect(world.laneGuides.length).toBeGreaterThan(0);
  });

  it('fixes lane guide direction for one-way multi-lane roads', () => {
    const world = createEmptyWorld();
    const p1 = new Point(0, 0);
    const p2 = new Point(200, 0);
    world.graph.addPoint(p1);
    world.graph.addPoint(p2);
    world.graph.tryAddSegment(new Segment(p1, p2, true, false, { lanes: 3 }));

    WorldGenerator.generateRoads(world);

    expect(world.laneGuides.length).toBeGreaterThan(0);
    const sdx = p2.x - p1.x;
    const sdy = p2.y - p1.y;
    for (const guide of world.laneGuides) {
      const gdx = guide.p2.x - guide.p1.x;
      const gdy = guide.p2.y - guide.p1.y;
      const dot = gdx * sdx + gdy * sdy;
      if (Math.abs(dot) > 0.1) {
        expect(dot).toBeGreaterThan(0);
      }
    }
  });
});
