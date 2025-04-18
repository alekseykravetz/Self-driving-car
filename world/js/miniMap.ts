interface IMiniMapCar {
  x: number;
  y: number;
  damaged: boolean;
  color: string;
}

interface IMiniMapDrawOptions {
  roadColor?: string;
  carColor?: string;
}

class MiniMap {
  private canvas: HTMLCanvasElement;
  private graph: Graph;
  private size: number;
  private scaler: number;
  private ctx: CanvasRenderingContext2D;
  public cars: IMiniMapCar[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    graph: Graph,
    size: number,
    scaler: number = 0.05,
  ) {
    this.canvas = canvas;
    this.graph = graph;
    this.size = size;
    this.scaler = scaler;

    this.canvas.width = size;
    this.canvas.height = size;

    this.ctx = canvas.getContext('2d')!;
  }

  update(
    viewPoint: Point,
    { roadColor = 'white', carColor = 'blue' }: IMiniMapDrawOptions = {},
  ): void {
    this.ctx.clearRect(0, 0, this.size, this.size);

    const scaledViewPoint: Point = scale(viewPoint, -this.scaler);

    this.ctx.save();
    this.ctx.translate(
      scaledViewPoint.x + this.size / 2,
      scaledViewPoint.y + this.size / 2,
    );
    this.ctx.scale(this.scaler, this.scaler);

    for (const segment of this.graph.segments) {
      segment.draw(this.ctx, {
        width: 3 / this.scaler,
        color: roadColor,
        cap: 'round',
      });
    }

    for (const car of this.cars) {
      this.ctx.beginPath();
      this.ctx.fillStyle = car.damaged ? 'gray' : car.color || 'red';
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = (car.damaged ? 1 : 2) / this.scaler;
      this.ctx.arc(
        car.x,
        car.y,
        (car.damaged ? 2 : 3) / this.scaler,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
      this.ctx.stroke();

      // new Point(car.x, car.y).draw(this.ctx, {
      //   color: car.damaged ? 'gray' : 'red',
      //   size: 5 / this.scaler,
      // });
    }

    this.ctx.restore();

    new Point(this.size / 2, this.size / 2).draw(this.ctx, {
      size: 12,
      color: carColor,
      outline: true,
    });
  }
}
