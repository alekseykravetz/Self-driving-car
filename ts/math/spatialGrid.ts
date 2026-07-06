/**
 * Uniform spatial hash grid for fast range queries over line segments.
 *
 * Segments are stored as `[Point, Point]` pairs (matching the road-border
 * representation used by the simulator). Each segment is rasterized into every
 * grid cell its bounding box overlaps, so a circular range query only needs to
 * inspect the cells covering the query radius instead of scanning all segments.
 *
 * Built for the city-scale traffic simulation: with thousands of border
 * segments and cars, the per-car border lookup drops from O(n) to roughly O(1)
 * (proportional to the segments near the car, not the whole map).
 */
import { Point } from './primitives/point.js';

export type GridSegment = [Point, Point];

export class SpatialHashGrid {
  readonly cellSize: number;
  #cells: Map<string, number[]>;
  #segments: GridSegment[];
  #stamps: Int32Array;
  #queryId: number;

  constructor(cellSize: number = 150) {
    this.cellSize = cellSize > 0 ? cellSize : 150;
    this.#cells = new Map();
    this.#segments = [];
    this.#stamps = new Int32Array(0);
    this.#queryId = 0;
  }

  #key(cx: number, cy: number): string {
    return cx + ',' + cy;
  }

  #cellCoord(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  /** Removes all segments from the grid. */
  clear(): void {
    this.#cells.clear();
    this.#segments = [];
  }

  /** Clears the grid and inserts every segment. */
  build(segments: GridSegment[]): void {
    this.clear();
    // Re-allocate the per-segment stamp scratch only when capacity grows; the
    // dedup pass reads/writes a monotonic query id per index. Zero the used
    // range and restart the counter so stale stamps from a previous build can
    // never be mistaken for a current-query hit (which would falsely dedup).
    if (this.#stamps.length < segments.length) {
      this.#stamps = new Int32Array(segments.length);
    } else {
      this.#stamps.fill(0, 0, segments.length);
    }
    this.#queryId = 0;
    for (let i = 0; i < segments.length; i++) {
      this.insert(segments[i]);
    }
  }

  /** Inserts a single segment into every cell its bounding box overlaps. */
  insert(segment: GridSegment): void {
    const index = this.#segments.length;
    this.#segments.push(segment);
    if (this.#stamps.length <= index) {
      // Standalone insert beyond the built capacity: grow the stamp buffer.
      const grown = new Int32Array(
        Math.max(index + 1, this.#stamps.length * 2),
      );
      grown.set(this.#stamps);
      this.#stamps = grown;
    }

    const [p1, p2] = segment;
    const minCx = this.#cellCoord(Math.min(p1.x, p2.x));
    const maxCx = this.#cellCoord(Math.max(p1.x, p2.x));
    const minCy = this.#cellCoord(Math.min(p1.y, p2.y));
    const maxCy = this.#cellCoord(Math.max(p1.y, p2.y));

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.#key(cx, cy);
        const bucket = this.#cells.get(key);
        if (bucket) {
          bucket.push(index);
        } else {
          this.#cells.set(key, [index]);
        }
      }
    }
  }

  /**
   * Returns all unique segments stored in any cell overlapping the
   * axis-aligned square of half-width `radius` centered on (x, y).
   *
   * The square (rather than a circle) is intentional: it is a cheap superset
   * of the circular range, so callers that need exact distances still filter,
   * but no segment within `radius` is ever missed.
   *
   * Dedup uses a monotonically increasing query id stamped per segment index,
   * so it avoids allocating a `Set` per call and never hashes — at city scale
   * with thousands of cars this query runs once per car per frame.
   */
  query(x: number, y: number, radius: number): GridSegment[] {
    const minCx = this.#cellCoord(x - radius);
    const maxCx = this.#cellCoord(x + radius);
    const minCy = this.#cellCoord(y - radius);
    const maxCy = this.#cellCoord(y + radius);

    const result: GridSegment[] = [];
    const queryId = ++this.#queryId;
    const stamps = this.#stamps;
    const segments = this.#segments;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.#cells.get(this.#key(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const idx = bucket[i];
          if (stamps[idx] !== queryId) {
            stamps[idx] = queryId;
            result.push(segments[idx]);
          }
        }
      }
    }
    return result;
  }
}
