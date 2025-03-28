class MiniMap {
  constructor(canvas, graph, size, cars, scaler = 0.05) {
    this.canvas = canvas;
    this.graph = graph;
    this.size = size;

    this.scaler = scaler;

    this.cars = cars;

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
      segment.draw(this.ctx, { width: 3 / this.scaler, color: 'white' });
    }

    for (const car of this.cars) {
      this.ctx.beginPath();
      this.ctx.fillStyle = car.damaged ? 'gray' : 'red';
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2 / this.scaler;
      this.ctx.arc(car.x, car.y, 3 / this.scaler, 0, Math.PI * 2);
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
      color: 'blue',
      outline: true,
    });
  }
}
