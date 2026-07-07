/**
 * Spatial hash grid for traffic-control polygons (stop lines / light housings).
 *
 * Mirrors {@link SpatialHashGrid}'s cell layout (150 px default) so a car can
 * query only the traffic controls within sensor range instead of scanning
 * every light on the map. Rebuilt only when world markings change — never per
 * frame — while the per-light `state` is read live at query time through the
 * `getState` accessor so the grid stays valid as lights cycle green/yellow/red.
 */
import { Point } from './primitives/point.js';

/**
 * A traffic-control polygon plus a live state accessor. Stored in the grid;
 * the accessor is invoked at query time so callers always see the current
 * `LightState` without rebuilding the grid every frame.
 */
export interface TrafficControlEntry {
  polygon: Point[];
  getState: () => TrafficControlState;
}

/** Traffic state shared by the perception layer and the encoding helper. */
export type TrafficControlState = 'green' | 'yellow' | 'red' | 'off';

/** Query result: a polygon paired with the light's current state. */
export interface TrafficControlHit {
  polygon: Point[];
  state: TrafficControlState;
}

export class TrafficControlGrid {
  readonly cellSize: number;
  #cells: Map<string, number[]>;
  #entries: TrafficControlEntry[];
  #stamps: Int32Array;
  #queryId: number;

  constructor(cellSize: number = 150) {
    this.cellSize = cellSize > 0 ? cellSize : 150;
    this.#cells = new Map();
    this.#entries = [];
    this.#stamps = new Int32Array(0);
    this.#queryId = 0;
  }

  #key(cx: number, cy: number): string {
    return cx + ',' + cy;
  }

  #cellCoord(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  /** Removes all entries from the grid. */
  clear(): void {
    this.#cells.clear();
    this.#entries = [];
  }

  /** Clears the grid and inserts every entry. */
  rebuild(entries: TrafficControlEntry[]): void {
    this.clear();
    if (this.#stamps.length < entries.length) {
      this.#stamps = new Int32Array(entries.length);
    } else {
      this.#stamps.fill(0, 0, entries.length);
    }
    this.#queryId = 0;
    for (let i = 0; i < entries.length; i++) {
      this.insert(entries[i]);
    }
  }

  /** Inserts a single entry into every cell its polygon's AABB overlaps. */
  insert(entry: TrafficControlEntry): void {
    const index = this.#entries.length;
    this.#entries.push(entry);
    if (this.#stamps.length <= index) {
      const grown = new Int32Array(
        Math.max(index + 1, this.#stamps.length * 2),
      );
      grown.set(this.#stamps);
      this.#stamps = grown;
    }

    const poly = entry.polygon;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const minCx = this.#cellCoord(minX);
    const maxCx = this.#cellCoord(maxX);
    const minCy = this.#cellCoord(minY);
    const maxCy = this.#cellCoord(maxY);

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
   * Returns all unique traffic controls whose polygon overlaps the
   * axis-aligned square of half-width `radius` centered on (x, y), each paired
   * with its current light state. Dedup uses a monotonic query id stamp per
   * entry index, mirroring {@link SpatialHashGrid.query}.
   */
  query(x: number, y: number, radius: number): TrafficControlHit[] {
    const minCx = this.#cellCoord(x - radius);
    const maxCx = this.#cellCoord(x + radius);
    const minCy = this.#cellCoord(y - radius);
    const maxCy = this.#cellCoord(y + radius);

    const result: TrafficControlHit[] = [];
    const queryId = ++this.#queryId;
    const stamps = this.#stamps;
    const entries = this.#entries;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.#cells.get(this.#key(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const idx = bucket[i];
          if (stamps[idx] !== queryId) {
            stamps[idx] = queryId;
            const entry = entries[idx];
            result.push({
              polygon: entry.polygon,
              state: entry.getState(),
            });
          }
        }
      }
    }
    return result;
  }
}
