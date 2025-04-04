interface EnvelopeInfo {
  skeleton: { p1: Point; p2: Point };
  polygon: {
    points: { x: number; y: number }[];
    segments: {
      p1: { x: number; y: number };
      p2: { x: number; y: number };
      oneWay: boolean;
    }[];
  };
}

class Envelope {
  private skeleton?: Segment;
  private polygon?: Polygon;

  constructor(
    skeleton: Segment | undefined,
    width: number | undefined = 10,
    roundness: number = 1,
  ) {
    if (skeleton) {
      this.skeleton = skeleton;
      this.polygon = this.#generatePolygon(width, roundness);
    }
  }

  static load(info: EnvelopeInfo) {
    const env = new Envelope(undefined, undefined);
    env.skeleton = new Segment(info.skeleton.p1, info.skeleton.p2);
    env.polygon = Polygon.load(info.polygon);
    return env;
  }

  #generatePolygon(width: number, roundness: number): Polygon {
    const { p1, p2 } = this.skeleton!;
    const radius = width / 2;
    const alpha = angle(subtract(p1, p2));
    const alpha_cw = alpha + Math.PI / 2;
    const alpha_ccw = alpha - Math.PI / 2;

    const points: Point[] = [];
    const step = Math.PI / Math.max(1, roundness);
    const epsilon = step / 2;
    for (let i = alpha_ccw; i <= alpha_cw + epsilon; i += step) {
      points.push(translate(p1, i, radius));
    }
    for (let i = alpha_ccw; i <= alpha_cw + epsilon; i += step) {
      points.push(translate(p2, Math.PI + i, radius));
    }

    return new Polygon(points);
  }

  draw(ctx: CanvasRenderingContext2D, options?: PolygonDrawOptions): void {
    this.polygon?.draw(ctx, options);
  }
}
