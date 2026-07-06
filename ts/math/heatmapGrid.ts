import type { Car } from '../car/car.js';

/**
 * Per-cell counters for the spatial congestion heatmap.
 *
 * `occupancyFrames` counts every frame in which at least one car was inside
 * the cell; `idleFrames` counts frames where a car in the cell was moving
 * slower than the idle threshold. Both are reset by `HeatmapGrid.reset()`.
 */
export class HeatmapCell {
  col: number;
  row: number;
  occupancyFrames: number = 0;
  idleFrames: number = 0;

  constructor(col: number, row: number) {
    this.col = col;
    this.row = row;
  }
}

/** Car speed (px/frame) below which a car is considered stopped/idle. */
const IDLE_SPEED_THRESHOLD = 0.5;

/**
 * Grid-based congestion counter for the spatial heatmap overlay.
 *
 * Each frame `record(cars)` maps every car to a cell via
 * `floor(position / cellSize)` and increments that cell's occupancy counter
 * (and its idle counter when the car is nearly stationary). Cells are created
 * lazily on first write, so memory is proportional to the area of the world
 * that has ever seen traffic — not the full map size.
 *
 * `getHeatmapData()` returns the live cells (with their grid coordinates) so a
 * renderer can cull and paint them. `reset()` clears all counters and is
 * intended to be called on simulation restart / world change.
 */
export class HeatmapGrid {
  readonly cellSize: number;
  #cells: Map<string, HeatmapCell> = new Map();
  #totalFrames: number = 0;

  constructor(cellSize: number = 150) {
    this.cellSize = cellSize > 0 ? cellSize : 150;
  }

  #cellKey(col: number, row: number): string {
    return col + ',' + row;
  }

  /** Total number of frames recorded since construction / last `reset()`. */
  get totalFrames(): number {
    return this.#totalFrames;
  }

  /** Live cells (in no particular order). Safe to iterate while recording. */
  getHeatmapData(): HeatmapCell[] {
    return [...this.#cells.values()];
  }

  /**
   * Record one frame of vehicle occupancy.
   *
   * O(cars) per frame with O(1) cell lookup per car; no cross-car interaction.
   */
  record(cars: Car[]): void {
    this.#totalFrames++;
    const cellSize = this.cellSize;
    const threshold = IDLE_SPEED_THRESHOLD;
    const cells = this.#cells;
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      if (car.damaged) continue;
      const col = Math.floor(car.x / cellSize);
      const row = Math.floor(car.y / cellSize);
      const key = this.#cellKey(col, row);
      let cell = cells.get(key);
      if (!cell) {
        cell = new HeatmapCell(col, row);
        cells.set(key, cell);
      }
      cell.occupancyFrames++;
      if (Math.abs(car.speed) < threshold) {
        cell.idleFrames++;
      }
    }
  }

  /** Clear all counters (used on simulation restart or world change). */
  reset(): void {
    this.#cells.clear();
    this.#totalFrames = 0;
  }
}
