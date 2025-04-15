function getNearestPoint(
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

function getNearestSegment(
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

function distance(p1: Point, p2: Point): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function average(p1: Point, p2: Point): Point {
  return new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
}

function dot(p1: Point, p2: Point): number {
  return p1.x * p2.x + p1.y * p2.y;
}

function cross(p1: Point, p2: Point): number {
  return p1.x * p2.y - p1.y * p2.x;
}

function add(p1: Point, p2: Point): Point {
  return new Point(p1.x + p2.x, p1.y + p2.y);
}

function subtract(p1: Point, p2: Point): Point {
  return new Point(p1.x - p2.x, p1.y - p2.y);
}

function scale(p: Point, scaler: number): Point {
  return new Point(p.x * scaler, p.y * scaler);
}

function normalize(p: Point): Point {
  return scale(p, 1 / magnitude(p));
}

function magnitude(p: Point): number {
  return Math.hypot(p.x, p.y);
}

function perpendicular(p: Point): Point {
  return new Point(-p.y, p.x);
}

function translate(location: Point, angle: number, offset: number): Point {
  return new Point(
    location.x + Math.cos(angle) * offset,
    location.y + Math.sin(angle) * offset,
  );
}

function angle(p: Point): number {
  return Math.atan2(p.y, p.x);
}

function getIntersection(
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerp2D(a: Point, b: Point, t: number): Point {
  return new Point(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
}

function invLerp(a: number, b: number, v: number): number {
  return (v - a) / (b - a);
}

function degToRad(degree: number): number {
  return (degree * Math.PI) / 180;
}

function getFake3dPoint(point: Point, viewPoint: Point, height: number): Point {
  const dir = normalize(subtract(point, viewPoint));
  const dist = distance(point, viewPoint);
  const scaler = Math.atan(dist / 300) / (Math.PI / 2);
  return add(point, scale(dir, height * scaler));
}
