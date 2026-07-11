import { Point } from './primitives/point.js';
export function getNearestPoint(location, points, threshold = Number.MAX_SAFE_INTEGER) {
    let minDistance = Number.MAX_SAFE_INTEGER;
    let nearestPoint = null;
    for (const point of points) {
        const dist = distance(location, point);
        if (dist < minDistance && dist < threshold) {
            minDistance = dist;
            nearestPoint = point;
        }
    }
    return nearestPoint;
}
export function getNearestSegment(location, segments, threshold = Number.MAX_SAFE_INTEGER) {
    let minDistance = Number.MAX_SAFE_INTEGER;
    let nearestSegment = null;
    for (const segment of segments) {
        const dist = segment.distanceToPoint(location);
        if (dist < minDistance && dist < threshold) {
            minDistance = dist;
            nearestSegment = segment;
        }
    }
    return nearestSegment;
}
export function distance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}
export function radiansToDegrees(radians) {
    return (radians * 180) / Math.PI;
}
export function formatDegrees(radians) {
    return `${radiansToDegrees(radians).toFixed(0)}°`;
}
export function average(p1, p2) {
    return new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
}
export function dot(p1, p2) {
    return p1.x * p2.x + p1.y * p2.y;
}
export function cross(p1, p2) {
    return p1.x * p2.y - p1.y * p2.x;
}
export function add(p1, p2) {
    return new Point(p1.x + p2.x, p1.y + p2.y);
}
export function subtract(p1, p2) {
    return new Point(p1.x - p2.x, p1.y - p2.y);
}
export function scale(p, scaler) {
    return new Point(p.x * scaler, p.y * scaler);
}
export function normalize(p) {
    return scale(p, 1 / magnitude(p));
}
export function magnitude(p) {
    return Math.hypot(p.x, p.y);
}
export function perpendicular(p) {
    return new Point(-p.y, p.x);
}
export function translate(location, angle, offset) {
    return new Point(location.x + Math.cos(angle) * offset, location.y + Math.sin(angle) * offset);
}
export function angle(p) {
    return Math.atan2(p.y, p.x);
}
export function getIntersection(a, b, c, d) {
    const tTop = (d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x);
    const uTop = (c.y - a.y) * (a.x - b.x) - (c.x - a.x) * (a.y - b.y);
    const bottom = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
    const epsilon = 0.001;
    if (Math.abs(bottom) > epsilon) {
        const t = tTop / bottom;
        const u = uTop / bottom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: lerp(a.x, b.x, t),
                y: lerp(a.y, b.y, t),
                offset: t,
            };
        }
    }
    return null;
}
/**
 * Offset-only segment intersection: returns the parametric distance `t`
 * (0..1) from `a` to `b` where segment AB crosses segment CD, or -1 if they
 * do not intersect. Unlike {@link getIntersection} this allocates nothing,
 * so it is used in the sensor's per-ray/per-segment hot loop where only the
 * closest offset matters; the actual point is computed once for the winner.
 */
export function getIntersectionOffset(a, b, c, d) {
    const tTop = (d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x);
    const uTop = (c.y - a.y) * (a.x - b.x) - (c.x - a.x) * (a.y - b.y);
    const bottom = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
    const epsilon = 0.001;
    if (Math.abs(bottom) > epsilon) {
        const t = tTop / bottom;
        const u = uTop / bottom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return t;
        }
    }
    return -1;
}
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
/**
 * Deterministic seeded pseudo-random generator (mulberry32). Returns a function
 * that yields the next float in [0, 1) each call. Used to reproduce tree canopy
 * prototype shapes from a small integer seed so worlds can store a seed instead
 * of baking full geometry.
 */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function lerp2D(a, b, t) {
    return new Point(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
}
export function invLerp(a, b, v) {
    return (v - a) / (b - a);
}
export function rotate(p, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Point(p.x * cos - p.y * sin, p.x * sin + p.y * cos);
}
export function degToRad(degree) {
    return (degree * Math.PI) / 180;
}
export function getFake3dPoint(point, viewPoint, height) {
    const dir = normalize(subtract(point, viewPoint));
    const dist = distance(point, viewPoint);
    const scaler = Math.atan(dist / 300) / (Math.PI / 2);
    return add(point, scale(dir, height * scaler));
}
