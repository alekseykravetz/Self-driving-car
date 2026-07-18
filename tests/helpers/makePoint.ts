export type Point = { x: number; y: number };

export function p(x: number, y: number): Point {
  return { x, y };
}

export function points(...coords: [number, number][]): Point[] {
  return coords.map(([x, y]) => ({ x, y }));
}
