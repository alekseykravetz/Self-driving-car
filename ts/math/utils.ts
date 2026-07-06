import { Point } from './primitives/point.js';
import { Segment } from './primitives/segment.js';

export const WORLD_PIXELS_PER_METER = 14;
export const SIMULATION_FPS = 60;
export const METERS_PER_DEGREE_LATITUDE = 111000;

export function getNearestPoint(
  location: Point,
  points: Point[],
  threshold: number = Number.MAX_SAFE_INTEGER,
): Point | null {
  let minDistance = Number.MAX_SAFE_INTEGER;
  let nearestPoint: Point | null = null;
  for (const point of points) {
    const dist = distance(location, point);
    if (dist < minDistance && dist < threshold) {
      minDistance = dist;
      nearestPoint = point;
    }
  }
  return nearestPoint;
}

export function getNearestSegment(
  location: Point,
  segments: Segment[],
  threshold: number = Number.MAX_SAFE_INTEGER,
): Segment | null {
  let minDistance = Number.MAX_SAFE_INTEGER;
  let nearestSegment: Segment | null = null;
  for (const segment of segments) {
    const dist = segment.distanceToPoint(location);
    if (dist < minDistance && dist < threshold) {
      minDistance = dist;
      nearestSegment = segment;
    }
  }
  return nearestSegment;
}

export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

export function worldPixelsToMeters(px: number): number {
  return px / WORLD_PIXELS_PER_METER;
}

export function metersToWorldPixels(meters: number): number {
  return meters * WORLD_PIXELS_PER_METER;
}

export function pxPerFrameToKmh(pxPerFrame: number): number {
  return (pxPerFrame * SIMULATION_FPS * 3.6) / WORLD_PIXELS_PER_METER;
}

export function kmhToPxPerFrame(kmh: number): number {
  return ((kmh / 3.6) * WORLD_PIXELS_PER_METER) / SIMULATION_FPS;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function formatMetersFromWorldPixels(px: number): string {
  return `${worldPixelsToMeters(px).toFixed(1)} m`;
}

export function formatKmhFromPxPerFrame(pxPerFrame: number): string {
  return `${pxPerFrameToKmh(pxPerFrame).toFixed(1)} km/h`;
}

export function formatDegrees(radians: number): string {
  return `${radiansToDegrees(radians).toFixed(0)}°`;
}

/**
 * Convert simulation frames to real-world seconds based on SIMULATION_FPS.
 * At 60 FPS: 60 frames = 1 second
 */
export function framesToSeconds(frames: number): number {
  return frames / SIMULATION_FPS;
}

/**
 * Format elapsed simulation time as HH:MM:SS string.
 * @param frames Total elapsed simulation frames
 * @returns Formatted time string like "00:05:30" for 5 minutes 30 seconds
 */
export function formatElapsedTime(frames: number): string {
  const totalSeconds = Math.floor(framesToSeconds(frames));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function average(p1: Point, p2: Point): Point {
  return new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
}

export function dot(p1: Point, p2: Point): number {
  return p1.x * p2.x + p1.y * p2.y;
}

export function cross(p1: Point, p2: Point): number {
  return p1.x * p2.y - p1.y * p2.x;
}

export function add(p1: Point, p2: Point): Point {
  return new Point(p1.x + p2.x, p1.y + p2.y);
}

export function subtract(p1: Point, p2: Point): Point {
  return new Point(p1.x - p2.x, p1.y - p2.y);
}

export function scale(p: Point, scaler: number): Point {
  return new Point(p.x * scaler, p.y * scaler);
}

export function normalize(p: Point): Point {
  return scale(p, 1 / magnitude(p));
}

export function magnitude(p: Point): number {
  return Math.hypot(p.x, p.y);
}

export function perpendicular(p: Point): Point {
  return new Point(-p.y, p.x);
}

export function translate(
  location: Point,
  angle: number,
  offset: number,
): Point {
  return new Point(
    location.x + Math.cos(angle) * offset,
    location.y + Math.sin(angle) * offset,
  );
}

export function angle(p: Point): number {
  return Math.atan2(p.y, p.x);
}

export function getIntersection(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
): { x: number; y: number; offset: number } | null {
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
export function getIntersectionOffset(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
): number {
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

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Deterministic seeded pseudo-random generator (mulberry32). Returns a function
 * that yields the next float in [0, 1) each call. Used to reproduce tree canopy
 * prototype shapes from a small integer seed so worlds can store a seed instead
 * of baking full geometry.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerp2D(a: Point, b: Point, t: number): Point {
  return new Point(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
}

export function invLerp(a: number, b: number, v: number): number {
  return (v - a) / (b - a);
}

export function rotate(p: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Point(p.x * cos - p.y * sin, p.x * sin + p.y * cos);
}

export function degToRad(degree: number): number {
  return (degree * Math.PI) / 180;
}

export function getFake3dPoint(
  point: Point,
  viewPoint: Point,
  height: number,
): Point {
  const dir = normalize(subtract(point, viewPoint));
  const dist = distance(point, viewPoint);
  const scaler = Math.atan(dist / 300) / (Math.PI / 2);
  return add(point, scale(dir, height * scaler));
}
