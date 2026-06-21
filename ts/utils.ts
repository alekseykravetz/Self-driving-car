function polysIntersect(poly1: Point[], poly2: Point[]): boolean {
  const n1 = poly1.length;
  const n2 = poly2.length;
  // A 2-point "polygon" is a single segment; its closing edge (p2→p1) is the
  // same segment as p1→p2, so iterate one fewer time to avoid testing it twice
  // (border collision passes thousands of these per frame). Real polygons
  // (>=3 points) still test every edge including the closing one.
  const edges1 = n1 === 2 ? 1 : n1;
  const edges2 = n2 === 2 ? 1 : n2;
  for (let i = 0; i < edges1; i++) {
    for (let j = 0; j < edges2; j++) {
      // Offset-only test: we only need to know whether the edges cross, not
      // where, so use the allocation-free helper (no per-test object → no GC).
      const offset = getIntersectionOffset(
        poly1[i],
        poly1[(i + 1) % n1],
        poly2[j],
        poly2[(j + 1) % n2],
      );

      if (offset >= 0) {
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

/**
 * Safely parses a JSON string, typically from localStorage.
 * Failure policy: returns null on a null/undefined input or on invalid JSON
 * instead of throwing, so callers can treat corrupt/missing values as "no data".
 */
function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
