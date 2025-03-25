class Tree {
  constructor(center, size, height = 200) {
    this.center = center;
    this.size = size; // size of the base
    this.height = height;
    this.base = this.#generateLevel(center, size);
  }

  #generateLevel(point, size) {
    const points = [];
    const radius = size / 2;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      const kindOfRandom = Math.cos(((angle + this.center.x) * size) % 17) ** 2;
      const noisyRadius = radius * lerp(0.5, 1, kindOfRandom); // can be absolutely random but need to be saved by first generation
      points.push(translate(point, angle, noisyRadius));
    }
    return new Polygon(points);
  }

  draw(ctx, viewPoint) {
    // const diff = subtract(this.center, viewPoint);
    // const heightCoefficient = 0.3;
    // const top = add(this.center, scale(diff, heightCoefficient));

    const top = getFake3dPoint(this.center, viewPoint, this.height);

    const levelCount = 7;
    for (let level = 0; level < levelCount; level++) {
      const t = level / (levelCount - 1);
      const point = lerp2D(this.center, top, t);
      const color = `rgb(30, ${lerp(50, 200, t)}, 70)`;
      const size = lerp(this.size, 40, t);
      const polygon = this.#generateLevel(point, size);
      polygon.draw(ctx, { fill: color, stroke: 'rgba(0,0,0,0)' });
    }
  }
}
