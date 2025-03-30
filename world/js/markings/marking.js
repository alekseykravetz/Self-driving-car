class Marking {
  constructor(center, directionVector, width, height) {
    this.type = 'marking';
    this.center = center;
    this.directionVector = directionVector;
    this.width = width;
    this.height = height;

    this.support = new Segment(
      translate(center, angle(directionVector), height / 2),
      translate(center, angle(directionVector), -height / 2),
    );
    this.polygon = new Envelope(this.support, width, 0).polygon;
  }

  static load(info) {
    const point = new Point(info.center.x, info.center.y);
    const direction = new Point(info.directionVector.x, info.directionVector.y);
    switch (info.type) {
      case 'marking':
        return new Marking(point, direction, info.width, info.height);
      case 'crossing':
        return new Crossing(point, direction, info.width, info.height);
      case 'parking':
        return new Parking(point, direction, info.width, info.height);
      case 'light':
        return new Light(point, direction, info.width, info.height);
      case 'start':
        return new Start(point, direction, info.width, info.height);
      case 'stop':
        return new Stop(point, direction, info.width, info.height);
      case 'yield':
        return new Yield(point, direction, info.width, info.height);
      case 'target':
        return new Target(point, direction, info.width, info.height);
    }
  }

  draw(ctx) {
    this.polygon.draw(ctx);
  }
}
