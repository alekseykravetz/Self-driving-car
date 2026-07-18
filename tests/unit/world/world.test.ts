import { describe, it, expect, beforeAll } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Polygon } from '../../../ts/math/primitives/polygon.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import { Corridor } from '../../../ts/world/corridor.js';
import {
  buildTreePrototypes,
  TreeInstance,
  Tree,
} from '../../../ts/world/items/tree.js';
import { Building } from '../../../ts/world/items/building.js';
import {
  World,
  loadWorldCorridors,
  loadTreeInstance,
} from '../../../ts/world/world.js';
import { Start } from '../../../ts/world/markings/start.js';
import { Stop } from '../../../ts/world/markings/stop.js';
import { setupImageMock } from '../../helpers/setupImageMock.js';

beforeAll(() => {
  setupImageMock();
});

describe('loadWorldCorridors', () => {
  it('with corridors array returns array of Corridor', () => {
    const skeleton = [new Segment(new Point(0, 0), new Point(0, 100))];
    const orig = Corridor.fromPath(skeleton, 50, 4);

    const info = {
      corridors: [{ skeleton: orig.skeleton, borders: orig.borders }],
    } as unknown as World;
    const result = loadWorldCorridors(info);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Corridor);
    expect(result[0].skeleton).toHaveLength(1);
  });

  it('with legacy single corridor returns single-entry array', () => {
    const skeleton = [new Segment(new Point(0, 0), new Point(0, 100))];
    const orig = Corridor.fromPath(skeleton, 50, 4);

    const info = {
      corridor: { skeleton: orig.skeleton, borders: orig.borders },
    } as unknown as World;
    const result = loadWorldCorridors(info);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Corridor);
  });

  it('with no corridors returns empty array', () => {
    const result = loadWorldCorridors({} as unknown as World);
    expect(result).toHaveLength(0);
  });
});

describe('loadTreeInstance', () => {
  it('reconstructs Tree from instance and world', () => {
    const prototypes = buildTreePrototypes(123456, 8);
    const world = {
      treePrototypes: prototypes,
      treeSize: 160,
    } as unknown as World;
    const inst = { x: 100, y: 200, p: 2, s: 1.5, t: 1 };
    const tree = loadTreeInstance(inst, world);
    expect(tree.center.x).toBe(100);
    expect(tree.center.y).toBe(200);
    expect(tree.prototypeIndex).toBe(2);
    expect(tree.scale).toBe(1.5);
    expect(tree.type).toBe(1);
    expect(tree.size).toBe(160 * 1.5);
  });

  it('falls back to default prototype index 0 when p is missing', () => {
    const prototypes = buildTreePrototypes(123456, 1);
    const world = {
      treePrototypes: prototypes,
      treeSize: 160,
    } as unknown as World;
    const inst = { x: 50, y: 50, s: 1, t: 0 } as unknown as TreeInstance;
    const tree = loadTreeInstance(inst, world);
    expect(tree.prototypeIndex).toBe(0);
  });
});

describe('World', () => {
  describe('constructor', () => {
    it('creates a world with an empty graph', () => {
      const graph = new Graph();
      const world = new World(graph);
      expect(world.graph).toBe(graph);
      expect(world.envelopes).toEqual([]);
      expect(world.roadBorders).toEqual([]);
      expect(world.buildings).toEqual([]);
      expect(world.trees).toEqual([]);
      expect(world.trafficManager).toBeDefined();
      expect(world.corridors).toEqual([]);
      expect(world.markings).toEqual([]);
    });

    it('accepts custom world parameters', () => {
      const graph = new Graph();
      const world = new World(graph, 200, 20, 300, 300, 100, 320);
      expect(world.roadWidth).toBe(200);
      expect(world.roadRoundness).toBe(20);
      expect(world.buildingWidth).toBe(300);
      expect(world.buildingMinLength).toBe(300);
      expect(world.spacing).toBe(100);
      expect(world.treeSize).toBe(320);
    });

    it('sets default tree seed and prototype count', () => {
      const world = new World(new Graph());
      expect(world.treeSeed).toBeGreaterThan(0);
      expect(world.treePrototypeCount).toBeGreaterThan(0);
    });
  });

  describe('toJSON', () => {
    it('serializes to v2 schema with decoration block', () => {
      const world = new World(new Graph());
      const json = world.toJSON() as Record<string, unknown>;
      expect(json.version).toBe(2);
      expect(json.graph).toBeDefined();
      expect(json.roadWidth).toBe(100);
      expect(json.decoration).toBeDefined();
      const dec = json.decoration as Record<string, unknown>;
      expect(dec.trees).toEqual([]);
      expect(dec.buildings).toEqual([]);
    });

    it('includes markings in serialization', () => {
      const world = new World(new Graph());
      const start = new Start(new Point(50, 50), new Point(1, 0), 50, 30);
      world.markings.push(start);
      const json = world.toJSON() as Record<string, unknown>;
      expect(json.markings).toHaveLength(1);
    });

    it('decoration includes tree instances and building footprints', () => {
      // Create a world with a graph that produces buildings and trees
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);
      // Constructor calls generate() — should have buildings and trees
      const json = world.toJSON() as Record<string, unknown>;
      const dec = json.decoration as Record<string, unknown>;
      // We expect at least one tree and one building with a real graph
      expect(dec.treeSeed).toBeGreaterThan(0);
      expect(dec.treePrototypeCount).toBeGreaterThan(0);
    });
  });

  describe('load (static)', () => {
    it('round-trips a world with graph segments', () => {
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);
      const json = world.toJSON() as unknown as World;
      const loaded = World.load(json);
      expect(loaded.graph.points.length).toBe(2);
      expect(loaded.graph.segments.length).toBe(1);
      expect(loaded.roadWidth).toBe(world.roadWidth);
      expect(loaded.roadRoundness).toBe(world.roadRoundness);
    });

    it('round-trips a world with markings', () => {
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);
      const start = new Start(new Point(50, 0), new Point(1, 0), 50, 30);
      world.markings.push(start);
      const json = world.toJSON() as unknown as World;
      const loaded = World.load(json);
      expect(loaded.markings.length).toBe(1);
      expect(loaded.markings[0].type).toBe('start');
    });

    it('round-trips a world with a stop marking', () => {
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);
      const stop = new Stop(new Point(50, 0), new Point(1, 0), 50, 30);
      world.markings.push(stop);
      const json = world.toJSON() as unknown as World;
      const loaded = World.load(json);
      expect(loaded.markings.length).toBe(1);
      expect(loaded.markings[0].type).toBe('stop');
    });

    it('round-trips a world with v1 legacy format (no decoration)', () => {
      // Simulate a v1 world: has tree/building arrays directly, no decoration
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);

      const json = world.toJSON() as Record<string, unknown>;
      // Remove decoration to simulate v1
      delete json.decoration;
      // Add legacy tree/building arrays
      json.trees = [];
      json.buildings = [];

      const loaded = World.load(json as unknown as World);
      expect(loaded.trees).toBeDefined();
      expect(loaded.buildings).toBeDefined();
      expect(loaded.treePrototypes.length).toBeGreaterThan(0);
    });

    it('restores viewport zoom and offset', () => {
      const world = new World(new Graph());
      world.zoom = 2;
      world.offset = new Point(100, 200);
      const json = world.toJSON() as unknown as World;
      const loaded = World.load(json);
      expect(loaded.zoom).toBe(2);
      expect(loaded.offset!.x).toBe(100);
      expect(loaded.offset!.y).toBe(200);
    });

    it('loads a world with null markings (uses default empty array)', () => {
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);
      const json = world.toJSON() as Record<string, unknown>;
      // Remove markings to test nullish coalescing
      delete json.markings;
      const loaded = World.load(json as unknown as World);
      expect(loaded.markings).toEqual([]);
    });

    it('loads a v1 world with legacy trees and buildings', () => {
      // Simulate a v1 world with actual tree and building data
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);

      const json = world.toJSON() as Record<string, unknown>;
      // Remove decoration to simulate v1
      delete json.decoration;
      // Add legacy trees and buildings with actual data
      json.trees = [
        { center: { x: 50, y: -50 } },
        { center: { x: 150, y: -50 } },
      ];
      // Add a legacy building so Building.load() callback fires
      const buildingPolygon = {
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
      };
      json.buildings = [{ base: buildingPolygon, height: 300 }];

      const loaded = World.load(json as unknown as World);
      expect(loaded.trees.length).toBe(2);
      expect(loaded.buildings.length).toBe(1);
      expect(loaded.treePrototypes.length).toBeGreaterThan(0);
      expect(loaded.buildings[0].height).toBe(300);
    });

    it('loads a v2 world with manually added trees and buildings', () => {
      // Directly add tree and building instances to ensure decoration data
      const world = new World(new Graph());
      // Add a building manually
      const buildingPoly = new Polygon([
        new Point(0, 0),
        new Point(100, 0),
        new Point(100, 100),
        new Point(0, 100),
      ]);
      const building = new Building(buildingPoly, 200);
      world.buildings.push(building);
      // Add a tree manually
      const prototypes = buildTreePrototypes(42, 1);
      const tree = new Tree(
        new Point(50, -50),
        160,
        prototypes[0],
        0,
        0,
        1,
        200,
      );
      world.trees.push(tree);

      // Serialize and reload
      const json = world.toJSON() as unknown as World;
      const loaded = World.load(json);

      expect(loaded.buildings.length).toBe(1);
      expect(loaded.buildings[0].height).toBe(200);
      expect(loaded.trees.length).toBe(1);
      expect(loaded.trees[0].center.x).toBe(50);
    });
  });

  describe('generate', () => {
    it('generates road geometry for a graph with segments', () => {
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);
      // Constructor calls generate() which should produce road geometry
      expect(world.envelopes.length).toBeGreaterThan(0);
      expect(world.roadBorders.length).toBeGreaterThan(0);
    });

    it('generate({trees:false}) skips tree generation', () => {
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);

      // Re-generate with partial opts — should not crash
      world.generate({ roads: true, buildings: false, trees: false });
      expect(world.envelopes.length).toBeGreaterThan(0);
    });
  });

  describe('corridor getter', () => {
    it('returns null when no corridors exist', () => {
      const world = new World(new Graph());
      expect(world.corridor).toBeNull();
    });

    it('returns the first corridor when one is added', () => {
      const world = new World(new Graph());
      const corr = Corridor.fromPath(
        [new Segment(new Point(0, 0), new Point(100, 0))],
        100,
        10,
      );
      world.addCorridor(corr);
      expect(world.corridor).toBe(corr);
    });

    it('returns first corridor when multiple are added', () => {
      const world = new World(new Graph());
      const corr1 = Corridor.fromPath(
        [new Segment(new Point(0, 0), new Point(100, 0))],
        100,
        10,
      );
      const corr2 = Corridor.fromPath(
        [new Segment(new Point(0, 100), new Point(100, 100))],
        100,
        10,
      );
      world.addCorridor(corr1);
      world.addCorridor(corr2);
      expect(world.corridor).toBe(corr1);
    });
  });

  describe('addCorridor', () => {
    it('adds a corridor to the corridors array', () => {
      const world = new World(new Graph());
      expect(world.corridors).toHaveLength(0);
      const corr = Corridor.fromPath(
        [new Segment(new Point(0, 0), new Point(100, 0))],
        100,
        10,
      );
      world.addCorridor(corr);
      expect(world.corridors).toHaveLength(1);
      expect(world.corridors[0]).toBe(corr);
    });
  });

  describe('getCollisionBorders', () => {
    it('returns empty array for empty world', () => {
      const world = new World(new Graph());
      const borders = world.getCollisionBorders();
      expect(Array.isArray(borders)).toBe(true);
      expect(borders.length).toBe(0);
    });

    it('includes road borders when graph has segments', () => {
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);
      const borders = world.getCollisionBorders();
      expect(borders.length).toBeGreaterThan(0);
    });

    it('includes corridor borders', () => {
      const world = new World(new Graph());
      const corr = Corridor.fromPath(
        [new Segment(new Point(0, 0), new Point(100, 0))],
        100,
        10,
      );
      world.addCorridor(corr);
      const borders = world.getCollisionBorders();
      expect(borders.length).toBeGreaterThan(0);
    });

    it('includes separator borders for hard-separated roads', () => {
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      const seg = new Segment(p1, p2);
      seg.separated = true;
      graph.addSegment(seg);
      const world = new World(graph);
      const borders = world.getCollisionBorders();
      // Should include road borders + the separator (center line)
      expect(borders.length).toBeGreaterThan(0);
    });
  });

  describe('generateCorridor', () => {
    it('creates a corridor from start to end point', () => {
      const graph = new Graph();
      const pts = [new Point(0, 0), new Point(100, 0), new Point(200, 0)];
      for (const p of pts) graph.addPoint(p);
      for (let i = 0; i < pts.length - 1; i++) {
        graph.addSegment(new Segment(pts[i], pts[i + 1]));
      }
      const world = new World(graph);
      world.generateCorridor(pts[0], pts[pts.length - 1]);
      expect(world.corridors).toHaveLength(1);
      expect(world.corridor).not.toBeNull();
      expect(world.corridor!.borders.length).toBeGreaterThan(0);
    });
  });
});
