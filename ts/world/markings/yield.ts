class Yield extends Marking {
  override type: string = 'yield';
  border: Segment;
  constructor(
    center: Point,
    directionVector: Point,
    width: number,
    height: number,
  ) {
    super(center, directionVector, width, height);

    this.border = this.polygon.segments[2];
  }

  protected override rebuildGeometry(): void {
    super.rebuildGeometry();
    this.border = this.polygon.segments[2];
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawSegment(ctx, this.border, { width: 5, color: 'white' });
    ctx.save();
    ctx.translate(this.center.x, this.center.y);
    ctx.rotate(angle(this.directionVector) - Math.PI / 2);
    ctx.scale(1, 3);

    ctx.beginPath();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = 'bold ' + this.height * 0.3 + 'px Arial';
    ctx.fillText('YIELD', 0, 1);

    ctx.restore();
  }
}
