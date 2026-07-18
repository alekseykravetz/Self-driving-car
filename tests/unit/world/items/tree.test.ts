import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import {
  buildTreePrototypes,
  DEFAULT_TREE_PROTOTYPE,
  Tree,
} from '../../../../ts/world/items/tree.js';

describe('buildTreePrototypes', () => {
  it('returns correct count for given seed and count', () => {
    const prototypes = buildTreePrototypes(123456, 8);
    expect(prototypes).toHaveLength(8);
  });

  it('is deterministic (same seed yields same noise)', () => {
    const a = buildTreePrototypes(42, 3);
    const b = buildTreePrototypes(42, 3);
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(a[i].noise).toEqual(b[i].noise);
    }
  });

  it('different seed yields different noise', () => {
    const a = buildTreePrototypes(1, 1);
    const b = buildTreePrototypes(2, 1);
    expect(a[0].noise).not.toEqual(b[0].noise);
  });

  it('returns empty array for count 0', () => {
    const prototypes = buildTreePrototypes(123456, 0);
    expect(prototypes).toHaveLength(0);
  });
});

describe('DEFAULT_TREE_PROTOTYPE', () => {
  it('has 32 noise entries', () => {
    expect(DEFAULT_TREE_PROTOTYPE.noise).toHaveLength(32);
  });

  it('all noise values are between 0.5 and 1', () => {
    for (const n of DEFAULT_TREE_PROTOTYPE.noise) {
      expect(n).toBeGreaterThanOrEqual(0.5);
      expect(n).toBeLessThanOrEqual(1);
    }
  });
});

describe('Tree constructor', () => {
  it('creates tree with position and prototype', () => {
    const center = new Point(100, 200);
    const prototypes = buildTreePrototypes(123456, 8);
    const tree = new Tree(center, 160, prototypes[0], 0, 0, 1, 200);
    expect(tree.center.x).toBe(100);
    expect(tree.center.y).toBe(200);
    expect(tree.size).toBe(160);
    expect(tree.prototypeIndex).toBe(0);
    expect(tree.prototype).toBe(prototypes[0]);
    expect(tree.base).toBeDefined();
    expect(tree.base.points.length).toBeGreaterThan(0);
  });

  it('creates tree with defaults', () => {
    const center = new Point(100, 200);
    const tree = new Tree(center, 160);
    expect(tree.center.x).toBe(100);
    expect(tree.type).toBe(0);
    expect(tree.scale).toBe(1);
    expect(tree.height).toBe(200);
  });

  it('toInstance() serializes tree to compact form', () => {
    const center = new Point(100, 200);
    const prototypes = buildTreePrototypes(123456, 8);
    const tree = new Tree(center, 160, prototypes[0], 3, 2, 1.5, 200);
    const inst = tree.toInstance();
    expect(inst.x).toBe(100);
    expect(inst.y).toBe(200);
    expect(inst.p).toBe(3);
    expect(inst.s).toBe(1.5);
    expect(inst.t).toBe(2);
  });
});
