import { World } from '../../ts/world/world.js';
import { Graph } from '../../ts/math/graph/graph.js';
import { Point } from '../../ts/math/primitives/point.js';
import { Segment } from '../../ts/math/primitives/segment.js';

export function makeMinimalWorld(): World {
  return new World(new Graph());
}

export function makeSimpleWorld(): World {
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
  return new World(g);
}
