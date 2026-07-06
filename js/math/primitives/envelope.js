import { Segment } from './segment.js';
import { Polygon } from './polygon.js';
import { angle, subtract, translate } from '../utils.js';
export class Envelope {
  #skeleton;
  polygon;
  constructor(skeleton, width = 10, roundness = 1, generatedPolygon) {
    this.#skeleton = skeleton;
    if (generatedPolygon) {
      this.polygon = generatedPolygon;
    } else {
      this.polygon = this.#generatePolygon(width, roundness);
    }
  }
  static load(info, width = 10, roundness = 1) {
    const d = info;
    const skeleton = new Segment(d.skeleton.p1, d.skeleton.p2);
    const polygon = Polygon.load(d.polygon);
    const env = new Envelope(skeleton, width, roundness, polygon);
    return env;
  }
  #generatePolygon(width, roundness) {
    const { p1, p2 } = this.#skeleton;
    const radius = width / 2;
    const alpha = angle(subtract(p1, p2));
    const alpha_cw = alpha + Math.PI / 2;
    const alpha_ccw = alpha - Math.PI / 2;
    const points = [];
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
