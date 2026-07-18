import { describe, it, expect, beforeAll } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Corridor } from '../../../ts/world/corridor.js';
import {
  buildTreePrototypes,
  TreeInstance,
} from '../../../ts/world/items/tree.js';
import {
  World,
  loadWorldCorridors,
  loadTreeInstance,
} from '../../../ts/world/world.js';
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
