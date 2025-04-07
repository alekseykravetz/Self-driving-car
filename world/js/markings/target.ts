class Target extends Marking {
  override type: string = 'target';

  constructor(
    center: Point,
    directionVector: Point,
    width: number,
    height: number,
  ) {
    super(center, directionVector, width, height);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.center.draw(ctx, { size: 30, color: 'red' });
    this.center.draw(ctx, { size: 20, color: 'white' });
    this.center.draw(ctx, { size: 10, color: 'red' });
  }
}
