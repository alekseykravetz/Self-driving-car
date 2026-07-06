import type { CarInfo } from '../../../car/car.js';
import type { Car } from '../../../car/car.js';
import { safeJsonParse } from '../../../store/serialization.js';
import { DEFAULT_CAR_CONFIG } from '../../../car/config.js';

export function loadPoolFromStorage(fallbackConfig?: CarInfo): CarInfo[] {
  const stored = localStorage.getItem('bestPool');
  const storedPool = safeJsonParse<CarInfo[]>(stored);
  if (storedPool) {
    return storedPool;
  }

  const legacyBrains = localStorage.getItem('bestBrains');
  const legacyBrain = localStorage.getItem('bestBrain');
  const legacyConfig = localStorage.getItem('bestCarInfo');

  if (legacyBrains || legacyBrain) {
    let brains: unknown[] = [];
    if (legacyBrains) {
      brains = safeJsonParse<unknown[]>(legacyBrains) ?? [];
    } else if (legacyBrain) {
      const brain = safeJsonParse<unknown>(legacyBrain);
      brains = brain ? [brain] : [];
    }

    const baseConfig: CarInfo = safeJsonParse<CarInfo>(legacyConfig) ??
      fallbackConfig ?? {
        ...DEFAULT_CAR_CONFIG,
        sensor: { ...DEFAULT_CAR_CONFIG.sensor },
      };

    const pool: CarInfo[] = brains.map((brain) => ({
      ...baseConfig,
      sensor: { ...baseConfig.sensor },
      brain,
    }));

    localStorage.setItem('bestPool', JSON.stringify(pool));
    localStorage.removeItem('bestBrain');
    localStorage.removeItem('bestBrains');
    localStorage.removeItem('bestCarInfo');
    console.log('Migrated legacy storage to unified bestPool.');
    return pool;
  }

  return [];
}

export function savePoolToStorage(pool: CarInfo[]): void {
  if (pool.length > 0) {
    localStorage.setItem('bestPool', JSON.stringify(pool));
    console.log(`Saved top ${pool.length} car(s) to localStorage.`);
  } else {
    console.warn('Could not save: no cars with brains found.');
  }
}

export function discardStoredPool(): void {
  localStorage.removeItem('bestPool');
  localStorage.removeItem('bestBrain');
  localStorage.removeItem('bestBrains');
  localStorage.removeItem('bestCarInfo');
  console.log('Stored pool discarded from localStorage.');
}

export function loadRaceCars(): CarInfo[] {
  const stored = localStorage.getItem('raceCars');
  return safeJsonParse<CarInfo[]>(stored) ?? [];
}

export function saveRaceCars(cars: CarInfo[]): void {
  if (cars.length > 0) {
    localStorage.setItem('raceCars', JSON.stringify(cars));
    console.log(`Saved ${cars.length} race car(s) to localStorage.`);
  } else {
    localStorage.removeItem('raceCars');
  }
}

export function downloadCarFiles(
  selectedCars: { car: Car; poolPosition: number }[],
): void {
  if (selectedCars.length === 0) return;

  const now = new Date();
  const dateStr =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0');

  for (const { car, poolPosition } of selectedCars) {
    const carInfo: CarInfo = car.toInfo();

    const fileName =
      `${dateStr}_p${poolPosition + 1}` +
      `_${carInfo.width}x${carInfo.height}` +
      `_s${carInfo.maxSpeed}` +
      `_rc${carInfo.sensor.rayCount}` +
      `_rl${carInfo.sensor.rayLength}.car`;

    const json = JSON.stringify(carInfo, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
  console.log(`Downloaded ${selectedCars.length} car file(s).`);
}
