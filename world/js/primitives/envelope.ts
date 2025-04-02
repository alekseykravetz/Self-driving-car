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
  private skeleton: Segment;
  private polygon: Polygon;

  constructor(
    skeleton: Segment,
    width: number = 100,
    roundness: number = 10,
    generatedPolygon: Polygon | undefined = undefined,
  ) {
    this.skeleton = skeleton;

    if (!generatedPolygon) {
      this.polygon = this.#generatePolygon(width, roundness);
    } else {
      this.polygon = generatedPolygon;
    }
  }

  static load(info: EnvelopeInfo): Envelope {
    const skeleton = new Segment(info.skeleton.p1, info.skeleton.p2);
    const polygon = Polygon.load(info.polygon);
    return new Envelope(skeleton, undefined, undefined, polygon);
  }

  #generatePolygon(width: number, roundness: number): Polygon {
    const { p1, p2 } = this.skeleton;
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
    this.polygon.draw(ctx, options);
  }
}
