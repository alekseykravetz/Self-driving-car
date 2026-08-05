import type { Car } from '../../car/car.js';
import type { CarInfo } from '../../car/car.js';
import { CarLoader } from '../../car/loader/carLoader.js';
import { safeJsonParse } from '../../store/serialization.js';
import {
  formatMetersFromWorldPixels,
  formatKmhFromPxPerFrame,
} from '../../math/worldUnits.js';

/** Pool results table + storage/pool/car-config status dots. */
export class PoolTable {
  #poolTableBody: HTMLElement | null = null;
  #dotPool: HTMLElement | null = null;
  #dotStorage: HTMLElement | null = null;
  #dotCarConfig: HTMLElement | null = null;

  #selectedPoolIndices: Set<number> = new Set();

  // Cache for localStorage pool read (invalidated on save/discard).
  #cachedStoredPool: CarInfo[] | null = null;
  #cachedStoredPoolValid: boolean = false;

  constructor(host: HTMLElement) {
    this.#poolTableBody = host.querySelector('#poolTableBody');
    this.#dotPool = host.querySelector('#dot-pool');
    this.#dotStorage = host.querySelector('#dot-storage');
    this.#dotCarConfig = host.querySelector('#dot-car-config');
    this.#addEventListeners();
  }

  get selectedIndices(): ReadonlySet<number> {
    return this.#selectedPoolIndices;
  }

  clearSelection(): void {
    this.#selectedPoolIndices.clear();
  }

  invalidateStoredPoolCache(): void {
    this.#cachedStoredPoolValid = false;
  }

  #addEventListeners(): void {
    // Pool selection via a single delegated listener attached once. The pool
    // table rows are reconciled in place (never re-created), so this handler
    // stays valid and clicks are not lost when the table refreshes.
    if (this.#poolTableBody) {
      this.#poolTableBody.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const row = target.closest('tr');
        if (!row || !this.#poolTableBody!.contains(row)) return;
        const idx = parseInt(row.dataset.poolIdx ?? '', 10);
        if (Number.isNaN(idx)) return;
        if (this.#selectedPoolIndices.has(idx)) {
          this.#selectedPoolIndices.delete(idx);
          row.classList.remove('selected');
        } else {
          this.#selectedPoolIndices.add(idx);
          row.classList.add('selected');
        }
      });
    }
  }

  updateTable(pool: Car[], evaluateFitness: (car: Car) => number): void {
    const body = this.#poolTableBody;
    if (!body) return;

    // Reconcile rows in place instead of rebuilding innerHTML. Re-creating the
    // DOM every refresh dropped the CSS :hover state (blinking) and replaced
    // the node mid-click, so clicks were lost. Reusing the existing <tr>/<td>
    // nodes keeps hover and click interactions stable; clicks are handled by
    // the single delegated listener attached above.
    for (let i = 0; i < pool.length; i++) {
      const car = pool[i];
      const fitness = evaluateFitness(car);
      const name = car.name || '-';

      let row = body.children[i] as HTMLTableRowElement | undefined;
      if (!row) {
        row = document.createElement('tr');
        row.appendChild(document.createElement('td'));
        row.appendChild(document.createElement('td'));
        row.appendChild(document.createElement('td'));
        row.appendChild(document.createElement('td'));
        body.appendChild(row);
      }

      if (row.dataset.poolIdx !== String(i)) row.dataset.poolIdx = String(i);

      const rankCell = row.children[0];
      const nameCell = row.children[1];
      const speedCell = row.children[2];
      const fitnessCell = row.children[3];
      const rankText = String(i + 1);
      const speedText = formatKmhFromPxPerFrame(Math.abs(car.speed));
      const fitnessText = formatMetersFromWorldPixels(fitness);
      if (rankCell.textContent !== rankText) rankCell.textContent = rankText;
      if (nameCell.textContent !== name) nameCell.textContent = name;
      if (speedCell.textContent !== speedText)
        speedCell.textContent = speedText;
      if (fitnessCell.textContent !== fitnessText)
        fitnessCell.textContent = fitnessText;

      const selected = this.#selectedPoolIndices.has(i);
      if (row.classList.contains('selected') !== selected)
        row.classList.toggle('selected', selected);
    }

    // Drop any rows left over from a previously larger pool.
    while (body.children.length > pool.length) {
      body.removeChild(body.lastChild!);
    }
  }

  updateStatusDots(settings: { poolSize: number }, carSettings: CarInfo): void {
    if (!this.#cachedStoredPoolValid) {
      const stored = localStorage.getItem('bestPool');
      this.#cachedStoredPool = safeJsonParse<CarInfo[]>(stored);
      this.#cachedStoredPoolValid = true;
    }
    const storedPool = this.#cachedStoredPool;

    if (this.#dotStorage) {
      const hasStorage = !!storedPool;
      this.#dotStorage.className =
        'status-dot ' + (hasStorage ? 'green' : 'red');
      this.#dotStorage.title = hasStorage
        ? `${storedPool!.length} car(s) in localStorage`
        : 'No saved cars';
    }

    if (this.#dotPool) {
      if (!storedPool) {
        this.#dotPool.className = 'status-dot red';
        this.#dotPool.title = 'No pool (no storage)';
      } else {
        const match = storedPool.length === settings.poolSize;
        this.#dotPool.className = 'status-dot ' + (match ? 'green' : 'orange');
        this.#dotPool.title = match
          ? `Pool: ${storedPool.length}/${settings.poolSize}`
          : `Pool size mismatch: stored ${storedPool.length}, expected ${settings.poolSize}`;
      }
    }

    if (this.#dotCarConfig) {
      if (!storedPool || storedPool.length === 0) {
        this.#dotCarConfig.className = 'status-dot red';
        this.#dotCarConfig.title = 'No stored config to compare';
      } else {
        const storedInfo = storedPool[0];
        const matches = CarLoader.compareCarParams(storedInfo, carSettings);
        this.#dotCarConfig.className =
          'status-dot ' + (matches ? 'green' : 'orange');
        if (matches) {
          this.#dotCarConfig.title = 'Config matches storage';
        } else {
          const diffs: string[] = [];
          if (storedInfo.maxSpeed !== carSettings.maxSpeed)
            diffs.push(`spd:${storedInfo.maxSpeed}→${carSettings.maxSpeed}`);
          if (storedInfo.acceleration !== carSettings.acceleration)
            diffs.push(
              `acc:${storedInfo.acceleration}→${carSettings.acceleration}`,
            );
          if (storedInfo.friction !== carSettings.friction)
            diffs.push(`fric:${storedInfo.friction}→${carSettings.friction}`);
          if (storedInfo.width !== carSettings.width)
            diffs.push(`w:${storedInfo.width}→${carSettings.width}`);
          if (storedInfo.height !== carSettings.height)
            diffs.push(`h:${storedInfo.height}→${carSettings.height}`);
          if (storedInfo.sensor.rayCount !== carSettings.sensor.rayCount)
            diffs.push(
              `rays:${storedInfo.sensor.rayCount}→${carSettings.sensor.rayCount}`,
            );
          if (storedInfo.sensor.rayLength !== carSettings.sensor.rayLength)
            diffs.push(
              `len:${storedInfo.sensor.rayLength}→${carSettings.sensor.rayLength}`,
            );
          if (
            Math.abs(
              storedInfo.sensor.raySpread - carSettings.sensor.raySpread,
            ) > 1e-2
          )
            diffs.push(
              `spread:${storedInfo.sensor.raySpread.toFixed(2)}→${carSettings.sensor.raySpread.toFixed(2)}`,
            );
          if (storedInfo.sensor.rayOffset !== carSettings.sensor.rayOffset)
            diffs.push(
              `off:${storedInfo.sensor.rayOffset}→${carSettings.sensor.rayOffset}`,
            );
          const sHL = (storedInfo.hiddenLayers ?? [6]).join(',');
          const cHL = (carSettings.hiddenLayers ?? [6]).join(',');
          if (sHL !== cHL) diffs.push(`hl:[${sHL}]→[${cHL}]`);
          this.#dotCarConfig.title = `Mismatch: ${diffs.join(', ')}`;
        }
      }
    }
  }
}
