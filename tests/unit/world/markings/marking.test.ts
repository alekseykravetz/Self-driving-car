import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../ts/math/primitives/segment.js';
import { Graph } from '../../../../ts/math/graph/graph.js';
import { Marking } from '../../../../ts/world/markings/marking.js';

function makeCenter(): Point {
  return new Point(100, 100);
}
function makeDirection(): Point {
  return new Point(1, 0);
}
function makeMarking(): Marking {
  return new Marking(makeCenter(), makeDirection(), 50, 30);
}

describe('Marking', () => {
  it('constructor creates support segment', () => {
    const m = makeMarking();
    expect(m.support).toBeDefined();
    expect(m.support.p1.x).toBeDefined();
    expect(m.support.p2.x).toBeDefined();
  });

  it('constructor creates polygon', () => {
    const m = makeMarking();
    expect(m.polygon).toBeDefined();
    expect(m.polygon.points.length).toBeGreaterThanOrEqual(4);
  });

  it('type defaults to "marking"', () => {
    const m = makeMarking();
    expect(m.type).toBe('marking');
  });

  it('setAnchor() creates anchor with p1/p2/offset/lateral', () => {
    const center = new Point(100, 100);
    const dir = new Point(1, 0);
    const m = new Marking(center, dir, 50, 30);
    const p1 = new Point(0, 100);
    const p2 = new Point(200, 100);
    const graph = new Graph([p1, p2], [new Segment(p1, p2)]);

    m.setAnchor(graph);
    expect(m.anchor).toBeDefined();
    expect(m.anchor!.p1.x).toBe(0);
    expect(m.anchor!.p2.x).toBe(200);
    expect(m.anchor!.offset).toBeGreaterThanOrEqual(0);
    expect(m.anchor!.offset).toBeLessThanOrEqual(1);
    expect(typeof m.anchor!.lateral).toBe('number');
  });

  it('setAnchor() on graph with no segments creates no anchor', () => {
    const m = makeMarking();
    const graph = new Graph();
    m.setAnchor(graph);
    expect(m.anchor).toBeUndefined();
  });

  it('reanchor() reconstructs position', () => {
    const center = new Point(100, 100);
    const dir = new Point(1, 0);
    const m = new Marking(center, dir, 50, 30);

    const p1 = new Point(0, 100);
    const p2 = new Point(200, 100);
    const graph = new Graph([p1, p2], [new Segment(p1, p2)]);
    m.setAnchor(graph);

    const origCenter = { x: m.center.x, y: m.center.y };

    m.center = new Point(0, 0);
    m.reanchor(graph);
    expect(m.center.x).toBeCloseTo(origCenter.x);
    expect(m.center.y).toBeCloseTo(origCenter.y);
  });

  it('reanchor() with no anchor is no-op', () => {
    const m = makeMarking();
    const graph = new Graph();
    const origCenter = { x: m.center.x, y: m.center.y };
    m.reanchor(graph);
    expect(m.center.x).toBe(origCenter.x);
    expect(m.center.y).toBe(origCenter.y);
  });

  it('reanchor() with deleted segment is no-op', () => {
    const center = new Point(100, 100);
    const dir = new Point(1, 0);
    const m = new Marking(center, dir, 50, 30);

    const p1 = new Point(0, 100);
    const p2 = new Point(200, 100);
    const graph = new Graph([p1, p2], [new Segment(p1, p2)]);
    m.setAnchor(graph);
    const origCenter = { x: m.center.x, y: m.center.y };

    graph.segments.splice(0, 1);
    m.reanchor(graph);
    expect(m.center.x).toBe(origCenter.x);
    expect(m.center.y).toBe(origCenter.y);
  });

  it('rebuildGeometry() updates support and polygon', () => {
    const m = makeMarking();
    const origSupport = m.support;
    const origPolygon = m.polygon;

    m.center = new Point(200, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m as any).rebuildGeometry();

    expect(m.support).not.toBe(origSupport);
    expect(m.polygon).not.toBe(origPolygon);
    expect(m.polygon.points.length).toBeGreaterThanOrEqual(4);
  });
});
