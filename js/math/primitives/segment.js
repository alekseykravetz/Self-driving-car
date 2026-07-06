import { distance, normalize, subtract, dot, add, scale, magnitude, } from '../utils.js';
export class Segment {
    p1;
    p2;
    oneWay;
    separated;
    constructor(p1, p2, oneWay = false, separated = false) {
        this.p1 = p1;
        this.p2 = p2;
        this.oneWay = oneWay;
        this.separated = separated;
    }
    length() {
        return distance(this.p1, this.p2);
    }
    directionVector() {
        return normalize(subtract(this.p2, this.p1));
    }
    equals(segment) {
        return this.includes(segment.p1) && this.includes(segment.p2);
    }
    includes(point) {
        return this.p1.equals(point) || this.p2.equals(point);
    }
    distanceToPoint(point) {
        const proj = this.projectPoint(point);
        if (proj.offset > 0 && proj.offset < 1) {
            return distance(point, proj.point);
        }
        const distToP1 = distance(point, this.p1);
        const distToP2 = distance(point, this.p2);
        return Math.min(distToP1, distToP2);
    }
    projectPoint(point) {
        const a = subtract(point, this.p1);
        const b = subtract(this.p2, this.p1);
        const normB = normalize(b);
        const scaler = dot(a, normB);
        return {
            point: add(this.p1, scale(normB, scaler)),
            offset: scaler / magnitude(b),
        };
    }
}
