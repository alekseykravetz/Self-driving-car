interface ICameraPoint {
  x: number;
  y: number;
  angle: number;
}

interface IColoredPolygon extends Polygon {
  fill: string;
  stroke: string;
}

interface ICameraRenderOptions {
  /** The key car to always extrude as 3D (the car the camera follows). */
  keyCar?: Car;
  /** The best AI car to extrude (highlighted). */
  bestCar?: Car;
  /** Additional traffic cars to extrude as 3D boxes. */
  traffic?: Car[];
  /** Optional secondary 2D context for drawing the raw 3D polygons (debug). */
  debugCtx?: CanvasRenderingContext2D;
}
