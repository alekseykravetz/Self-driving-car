export class Point {
    x = 0;
    y = 0;
    z = 0;
    intersection;
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    equals(point) {
        return this.x === point.x && this.y === point.y;
    }
}
