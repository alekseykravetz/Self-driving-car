// interface DrawOptions {
//   size?: number;
//   color?: string;
//   outline?: boolean;
//   fill?: boolean;
// }

interface PointDrawOptions {
  size?: number;
  color?: string;
  outline?: boolean;
  fill?: boolean;
}

interface SegmentDrawOptions {
  width?: number;
  color?: string;
  dash?: number[];
  cap?: CanvasLineCap;
}

interface PolygonDrawOptions {
  stroke?: string;
  lineWidth?: number;
  fill?: string;
  join?: CanvasLineJoin;
}

interface IWorld {
  graph: Graph;
  cars: Car[];
  bestCar: Car | null;
  markings: Marking[];
  roadBorders: Segment[];
  corridor: Corridor | null;
  buildings: Building[];
  trees: Tree[];
  zoom?: number;
  offset?: Point;
  generateCorridor(start: Point, end: Point): void;
  draw(
    ctx: CanvasRenderingContext2D,
    viewPoint: Point,
    showStartMarkings?: boolean,
  ): void;
}
