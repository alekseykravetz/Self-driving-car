class Building {
  constructor(polygon, heightCoefficient = 0.4) {
    this.base = polygon;
    this.heightCoefficient = heightCoefficient;
  }

  draw(ctx, viewPort) {
    const topPoints = this.base.points.map((point) =>
      add(point, scale(subtract(point, viewPort), this.heightCoefficient))
    );
    const ceiling = new Polygon(topPoints);

    const sides = [];
    for (let i = 0; i < this.base.points.length; i++) {
      const nextI = (i + 1) % this.base.points.length;
      const poly = new Polygon([this.base.points[i], this.base.points[nextI], topPoints[nextI], topPoints[i]]);
      sides.push(poly);
    }
    sides.sort((a, b) => b.distanceToPoint(viewPort) - a.distanceToPoint(viewPort));

    this.base.draw(ctx, { fill: 'white', stroke: '#AAA' });
    for (const side of sides) {
      side.draw(ctx, { fill: 'white', stroke: '#AAA' });
    }
    ceiling.draw(ctx, { fill: 'white', stroke: '#AAA' });
  }
}
