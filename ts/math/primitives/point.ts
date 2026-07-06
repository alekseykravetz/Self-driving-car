export class Point {
  x: number = 0;
  y: number = 0;
  z: number = 0;

  intersection?: boolean;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  equals(point: Point): boolean {
    return this.x === point.x && this.y === point.y;
  }
}
