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

interface CarDrawOptions {
  showSensor?: boolean;
  showMask?: boolean;
  colorOverride?: string;
  alpha?: number;
  showName?: boolean;
}

interface BuildingDrawOptions {
  viewPoint: Point;
}

interface TreeDrawOptions {
  viewPoint: Point;
}

interface MiniMapDrawOptions {
  viewPoint: Point;
  cars: IMiniMapCar[];
  roadColor?: string;
  carColor?: string;
  backgroundColor?: string;
  viewport?: Viewport;
  compactScaleIndicator?: boolean;
}

interface IWorld {
  graph: Graph;
  markings: Marking[];
  roadBorders: Segment[];
  separatorBorders: Segment[];
  corridors: Corridor[];
  buildings: Building[];
  trees: Tree[];
  zoom?: number;
  offset?: Point;
  generateCorridor(start: Point, end: Point): void;
  draw(ctx: CanvasRenderingContext2D, options: WorldDrawOptions): void;
}

interface WorldDrawOptions {
  viewPoint: Point;
  /** Cars to render on top of the world (draw-time input, not world state). */
  cars?: Car[];
  /** Highlighted car drawn with its sensor rays. */
  bestCar?: Car | null;
  showStartMarkings?: boolean;
  renderRadius?: number;
  carAlpha?: number;
  showCarNames?: boolean;
}
