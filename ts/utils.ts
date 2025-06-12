function polysIntersect(poly1: Point[], poly2: Point[]): boolean {
  for (let i = 0; i < poly1.length; i++) {
    for (let j = 0; j < poly2.length; j++) {
      const touch = getIntersection(
        poly1[i],
        poly1[(i + 1) % poly1.length],
        poly2[j],
        poly2[(j + 1) % poly2.length],
      );

      if (touch) {
        return true;
      }
    }
  }

  return false;
}

function getRGBA(value: number): string {
  const alpha = Math.abs(value);
  const R = value < 0 ? 0 : 255;
  const G = R;
  const B = value > 0 ? 0 : 255;
  return `rgba(${R}, ${G}, ${B}, ${alpha})`;
}

function getRandomColor(): string {
  const hue = 290 + Math.random() * 260; //not blue
  return `hsl(${hue}, 100%, 60%)`;
}
