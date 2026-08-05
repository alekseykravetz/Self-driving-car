/**
 * Uniform spatial index mapping grid cells to owner ids (polygon or placed-tree
 * indices). Tree placement previously tested every candidate point against
 * *every* illegal polygon (buildings + road envelopes) with `distanceToPoint`,
 * which is O(candidates × polygons × edges) — on large imported OSM maps this
 * froze the browser for minutes. This index lets each candidate inspect only
 * the owners whose bounding box lands in nearby cells.
 */
export class OwnerGrid {
  #cellSize: number;
  #cells = new Map<string, number[]>();
  #stamps: Int32Array = new Int32Array(0);
  #queryId = 0;
  #maxId = -1;

  constructor(cellSize: number) {
    this.#cellSize = cellSize > 0 ? cellSize : 1;
  }

  #coord(v: number): number {
    return Math.floor(v / this.#cellSize);
  }

  #key(cx: number, cy: number): string {
    return cx + ',' + cy;
  }

  /** Register an owner id in every cell its bounding box overlaps. */
  insertBounds(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    id: number,
  ): void {
    if (id > this.#maxId) this.#maxId = id;
    const minCx = this.#coord(minX);
    const maxCx = this.#coord(maxX);
    const minCy = this.#coord(minY);
    const maxCy = this.#coord(maxY);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.#key(cx, cy);
        const bucket = this.#cells.get(key);
        if (bucket) {
          // Same owner's consecutive edges often land in one cell; cheap dedup.
          if (bucket[bucket.length - 1] !== id) bucket.push(id);
        } else {
          this.#cells.set(key, [id]);
        }
      }
    }
  }

  insertPoint(x: number, y: number, id: number): void {
    this.insertBounds(x, y, x, y, id);
  }

  /** Unique owner ids in any cell within the square of half-width `radius`. */
  query(x: number, y: number, radius: number): number[] {
    if (this.#stamps.length <= this.#maxId) {
      // Doubling growth keeps stamp reallocation amortized O(1) as the tree
      // index accumulates owners one insert at a time.
      const cap = Math.max(this.#maxId + 1, this.#stamps.length * 2, 16);
      this.#stamps = new Int32Array(cap);
      this.#queryId = 0;
    }
    const minCx = this.#coord(x - radius);
    const maxCx = this.#coord(x + radius);
    const minCy = this.#coord(y - radius);
    const maxCy = this.#coord(y + radius);
    const result: number[] = [];
    const queryId = ++this.#queryId;
    const stamps = this.#stamps;
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.#cells.get(this.#key(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const id = bucket[i];
          if (stamps[id] !== queryId) {
            stamps[id] = queryId;
            result.push(id);
          }
        }
      }
    }
    return result;
  }
}
