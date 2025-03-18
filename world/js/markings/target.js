class Target extends Marking {
  constructor(center, directionVector, width, height) {
    super(center, directionVector, width, height);

    this.border = this.polygon.segments[2];
  }

  draw(ctx) {
    this.center.draw(ctx, { size: 30, color: 'red' });
    this.center.draw(ctx, { size: 20, color: 'white' });
    this.center.draw(ctx, { size: 10, color: 'red' });
  }
}
