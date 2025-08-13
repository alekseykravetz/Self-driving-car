'use strict';
class Marking {
  // Core properties defining the marking
  center;
  directionVector;
  width;
  height; // Height used for the support segment length
  // Generated geometry
  support; // The centerline segment
  polygon; // The bounding polygon
  // Type identifier - subclasses should override this
  type = 'marking'; // Allow known types or other strings
  /**
   * Base class for road markings.
   * @param center The center point of the marking.
   * @param directionVector A vector indicating the marking's orientation along the road.
   * @param width The width of the marking (usually related to road width).
   * @param height The length of the marking along the road direction.
   */
  constructor(center, directionVector, width, height) {
    this.center = center;
    this.directionVector = directionVector;
    this.width = width;
    this.height = height;
    this.support = new Segment(
      translate(this.center, angle(this.directionVector), this.height / 2),
      translate(this.center, angle(this.directionVector), -this.height / 2),
    );
    this.polygon = new Envelope(this.support, this.width, 0).polygon;
  }

  /**
   * Static factory method to load a Marking (or appropriate subclass) from saved data.
   * @param info Object containing the saved state of the marking.
   * @returns An instance of Marking or one of its subclasses, or null if type is unknown.
   */
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
        return new Light(point, direction, info.width);
      case 'start':
        return new Start(point, direction, info.width, info.height);
      case 'stop':
        return new Stop(point, direction, info.width, info.height);
      case 'yield':
        return new Yield(point, direction, info.width, info.height);
      case 'target':
        return new Target(point, direction, info.width, info.height);
      default:
        console.error(
          `Unknown marking type encountered during load: ${info.type}`,
        );
        return null;
    }
  }

  /**
   * Draws the base representation of the marking (its bounding polygon).
   * Subclasses should override this method to draw their specific visuals.
   * @param ctx The canvas rendering context.
   */
  draw(ctx) {
    this.polygon.draw(ctx);
  }
}
