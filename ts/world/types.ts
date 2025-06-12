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
