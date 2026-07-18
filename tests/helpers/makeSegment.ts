import { Segment } from '../../ts/math/primitives/segment.js';
import { Point } from '../../ts/math/primitives/point.js';

export function seg(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  oneWay?: boolean,
  separated?: boolean,
): Segment {
  return new Segment(new Point(x1, y1), new Point(x2, y2), oneWay, separated);
}

export function segFrom(
  p1: Point,
  p2: Point,
  oneWay?: boolean,
  separated?: boolean,
): Segment {
  return new Segment(p1, p2, oneWay, separated);
}
