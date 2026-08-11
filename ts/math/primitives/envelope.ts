import { Point } from './point.js';
import { Segment } from './segment.js';
import { Polygon } from './polygon.js';
import {
  angle,
  subtract,
  translate,
  perpendicular,
  normalize,
} from '../utils.js';

export class Envelope {
  #skeleton: Segment;
  public polygon: Polygon;

  get skeleton(): Segment {
    return this.#skeleton;
  }

  constructor(
    skeleton: Segment,
    width: number = 10,
    roundness: number = 1,
    generatedPolygon?: Polygon,
    lateralOffset: number = 0,
  ) {
    this.#skeleton = skeleton;
    if (generatedPolygon) {
      this.polygon = generatedPolygon;
    } else {
      this.polygon = this.#generatePolygon(width, roundness, lateralOffset);
    }
  }

  static load(info: Envelope, width: number = 10, roundness: number = 1) {
    const skeleton = new Segment(info.skeleton.p1, info.skeleton.p2);
    const polygon = Polygon.load(info.polygon);
    const env = new Envelope(skeleton, width, roundness, polygon);
    return env;
  }

  #generatePolygon(
    width: number,
    roundness: number,
    lateralOffset: number,
  ): Polygon {
    let { p1, p2 } = this.#skeleton!;
    // Shift the generated band perpendicular to the skeleton without moving the
    // skeleton itself (renderer reads metadata off env.skeleton). Used to bake a
    // one-sided parking lane into the road envelope.
    if (lateralOffset !== 0) {
      const dir = subtract(p2, p1);
      if (dir.x !== 0 || dir.y !== 0) {
        const perp = perpendicular(normalize(dir));
        p1 = new Point(
          p1.x + perp.x * lateralOffset,
          p1.y + perp.y * lateralOffset,
        );
        p2 = new Point(
          p2.x + perp.x * lateralOffset,
          p2.y + perp.y * lateralOffset,
        );
      }
    }
    const radius = width / 2;
    const alpha = angle(subtract(p1, p2));
    const alpha_cw = alpha + Math.PI / 2;
    const alpha_ccw = alpha - Math.PI / 2;

    const points: Point[] = [];
    const step = Math.PI / Math.max(1, roundness);
    const epsilon = step / 2;
    for (let i = alpha_ccw; i <= alpha_cw + epsilon; i += step) {
      points.push(translate(p1, i, radius));
    }
    for (let i = alpha_ccw; i <= alpha_cw + epsilon; i += step) {
      points.push(translate(p2, Math.PI + i, radius));
    }

    return new Polygon(points);
  }
}
