class MiniMap {
  constructor(canvas, graph, size, scaler = 0.05) {
    this.canvas = canvas;
    this.graph = graph;
    this.size = size;

    this.scaler = scaler;

    canvas.width = size;
    canvas.height = size;

    this.ctx = canvas.getContext('2d');
  }

  update(viewPoint) {
    this.ctx.clearRect(0, 0, this.size, this.size);

    const scaledViewPoint = scale(viewPoint, -this.scaler);

    this.ctx.save();
    this.ctx.translate(
      scaledViewPoint.x + this.size / 2,
      scaledViewPoint.y + this.size / 2,
    );
    this.ctx.scale(this.scaler, this.scaler);

    for (const segment of this.graph.segments) {
      segment.draw(this.ctx, { width: 3 / this.scaler, color: '#BBB' });
    }

    this.ctx.restore();

    new Point(this.size / 2, this.size / 2).draw(this.ctx, {
      size: 12,
      color: 'red',
      outline: true,
    });
  }
}
