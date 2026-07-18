import { Graph } from '../../ts/math/graph/graph.js';
import { Point } from '../../ts/math/primitives/point.js';
import { Segment } from '../../ts/math/primitives/segment.js';

export function makeEmptyGraph(): Graph {
  return new Graph();
}

export function makeSimpleGraph(): Graph {
  const p1 = new Point(0, 0);
  const p2 = new Point(100, 0);
  const p3 = new Point(100, 100);
  const p4 = new Point(0, 100);
  const g = new Graph(
    [p1, p2, p3, p4],
    [
      new Segment(p1, p2),
      new Segment(p2, p3),
      new Segment(p3, p4),
      new Segment(p4, p1),
    ],
  );
  return g;
}

export function makeGraphFromSegments(
  segData: { p1: Point; p2: Point }[],
): Graph {
  const points: Point[] = [];
  const hasPoint = (p: Point): boolean =>
    points.some((existing) => existing.x === p.x && existing.y === p.y);
  const segments = segData.map(({ p1, p2 }) => {
    if (!hasPoint(p1)) points.push(p1);
    if (!hasPoint(p2)) points.push(p2);
    return new Segment(p1, p2);
  });
  return new Graph(points, segments);
}
