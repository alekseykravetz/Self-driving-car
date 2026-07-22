import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../ts/math/primitives/segment.js';
import { Graph } from '../../../../ts/math/graph/graph.js';

function makeSimpleGraph(): Graph {
  const p1 = new Point(0, 0);
  const p2 = new Point(100, 0);
  const p3 = new Point(100, 100);
  const p4 = new Point(0, 100);
  const graph = new Graph(
    [p1, p2, p3, p4],
    [
      new Segment(p1, p2),
      new Segment(p2, p3),
      new Segment(p3, p4),
      new Segment(p4, p1),
    ],
  );
  return graph;
}

describe('Graph', () => {
  it('creates an empty graph', () => {
    const graph = new Graph();
    expect(graph.points).toEqual([]);
    expect(graph.segments).toEqual([]);
  });

  it('creates a graph with points and segments', () => {
    const p = new Point(0, 0);
    const graph = new Graph([p], []);
    expect(graph.points).toHaveLength(1);
    expect(graph.segments).toHaveLength(0);
  });

  describe('static load', () => {
    it('reconstructs a graph from plain data', () => {
      const seg = new Segment(new Point(10, 0), new Point(20, 0));
      const info = new Graph([new Point(10, 0), new Point(20, 0)], [seg]);
      const loaded = Graph.load(info);
      expect(loaded.points).toHaveLength(2);
      expect(loaded.segments).toHaveLength(1);
      expect(loaded.points[0].x).toBe(10);
    });
  });

  describe('hash', () => {
    it('returns the same hash for identical graphs', () => {
      const a = makeSimpleGraph();
      const b = makeSimpleGraph();
      expect(a.hash()).toBe(b.hash());
    });

    it('returns different hashes for different graphs', () => {
      const a = makeSimpleGraph();
      const b = new Graph();
      expect(a.hash()).not.toBe(b.hash());
    });

    it('changes when a segment maxSpeed changes (geometry unchanged)', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      const a = new Graph(
        [p1, p2],
        [new Segment(p1, p2, false, false, { maxSpeed: 50 })],
      );
      const b = new Graph(
        [p1, p2],
        [new Segment(p1, p2, false, false, { maxSpeed: 30 })],
      );
      expect(a.hash()).not.toBe(b.hash());
    });

    it('changes when a segment name changes (geometry unchanged)', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      const a = new Graph(
        [p1, p2],
        [new Segment(p1, p2, false, false, { name: 'Main St' })],
      );
      const b = new Graph(
        [p1, p2],
        [new Segment(p1, p2, false, false, { name: 'Oak Ave' })],
      );
      expect(a.hash()).not.toBe(b.hash());
    });

    it('changes when a segment gains or loses metadata', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      const plain = new Graph([p1, p2], [new Segment(p1, p2)]);
      const named = new Graph(
        [p1, p2],
        [new Segment(p1, p2, false, false, { name: 'Main St' })],
      );
      const limited = new Graph(
        [p1, p2],
        [new Segment(p1, p2, false, false, { maxSpeed: 50 })],
      );
      expect(plain.hash()).not.toBe(named.hash());
      expect(plain.hash()).not.toBe(limited.hash());
    });
  });

  describe('point management', () => {
    const graph = new Graph();

    it('addPoint adds a point', () => {
      const p = new Point(5, 5);
      graph.addPoint(p);
      expect(graph.points).toContain(p);
    });

    it('containsPoint finds an existing point', () => {
      const p = new Point(5, 5);
      expect(graph.containsPoint(p)).toEqual(p);
    });

    it('containsPoint returns undefined for missing point', () => {
      expect(graph.containsPoint(new Point(99, 99))).toBeUndefined();
    });

    it('tryAddPoint adds a new point', () => {
      const p = new Point(10, 10);
      expect(graph.tryAddPoint(p)).toBe(true);
      expect(graph.points).toHaveLength(2);
    });

    it('tryAddPoint returns false for duplicate point', () => {
      const p = new Point(10, 10);
      expect(graph.tryAddPoint(p)).toBe(false);
      expect(graph.points).toHaveLength(2);
    });

    it('removePoint removes the point and its segments', () => {
      const g = makeSimpleGraph();
      const p = g.points[0];
      g.removePoint(p);
      expect(g.points).not.toContain(p);
    });
  });

  describe('segment management', () => {
    it('addSegment adds a segment', () => {
      const g = new Graph();
      const seg = new Segment(new Point(0, 0), new Point(10, 0));
      g.addSegment(seg);
      expect(g.segments).toContain(seg);
    });

    it('containsSegment finds an existing segment', () => {
      const g = makeSimpleGraph();
      const seg = g.segments[0];
      expect(g.containsSegment(seg)).toEqual(seg);
    });

    it('tryAddSegment adds a valid segment', () => {
      const g = new Graph([new Point(0, 0), new Point(10, 0)], []);
      const seg = new Segment(g.points[0], g.points[1]);
      expect(g.tryAddSegment(seg)).toBe(true);
      expect(g.segments).toHaveLength(1);
    });

    it('tryAddSegment rejects duplicate segment', () => {
      const g = makeSimpleGraph();
      const seg = g.segments[0];
      expect(g.tryAddSegment(seg)).toBe(false);
    });

    it('tryAddSegment rejects zero-length segment', () => {
      const p = new Point(5, 5);
      const g = new Graph([p], []);
      const seg = new Segment(p, p);
      expect(g.tryAddSegment(seg)).toBe(false);
    });

    it('removeSegment removes a segment', () => {
      const g = makeSimpleGraph();
      const seg = g.segments[0];
      g.removeSegment(seg);
      expect(g.segments).not.toContain(seg);
    });

    it('getSegmentsWithPoint returns incident segments', () => {
      const g = makeSimpleGraph();
      const corner = g.points[0];
      const segs = g.getSegmentsWithPoint(corner);
      expect(segs).toHaveLength(2);
    });
  });

  describe('getShortestPath', () => {
    it('finds a path between two points on the graph', () => {
      const g = makeSimpleGraph();
      const start = new Point(0, 0);
      const end = new Point(100, 100);
      const path = g.getShortestPath(start, end);
      expect(path.length).toBeGreaterThan(0);
    });

    it('returns a path with at least one segment', () => {
      const g = makeSimpleGraph();
      const path = g.getShortestPath(new Point(0, 0), new Point(50, 0));
      expect(path.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('dispose', () => {
    it('clears all points and segments', () => {
      const g = makeSimpleGraph();
      g.dispose();
      expect(g.points).toHaveLength(0);
      expect(g.segments).toHaveLength(0);
    });
  });
});

describe('Graph edge cases', () => {
  it('load with duplicate points preserves duplicates', () => {
    const info = new Graph(
      [new Point(0, 0), new Point(100, 0), new Point(0, 0)],
      [],
    );
    const loaded = Graph.load(info);
    expect(loaded.points.length).toBe(3);
  });

  it('tryAddSegment with matching coordinates returns false', () => {
    const g = makeSimpleGraph();
    const seg = new Segment(new Point(0, 0), new Point(100, 0));
    expect(g.tryAddSegment(seg)).toBe(false);
  });

  it('removeSegment that does not exist is no-op', () => {
    const g = makeSimpleGraph();
    const initialCount = g.segments.length;
    const nonExistent = new Segment(new Point(999, 999), new Point(1000, 1000));
    g.removeSegment(nonExistent);
    expect(g.segments.length).toBe(initialCount);
  });

  it('load null/undefined data throws', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => Graph.load(null as any)).toThrow();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => Graph.load(undefined as any)).toThrow();
  });
});
