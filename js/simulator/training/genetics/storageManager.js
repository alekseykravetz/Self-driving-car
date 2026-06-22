'use strict';
/**
 * Manages localStorage persistence for the training pool.
 * Provides load/save/discard operations and legacy migration.
 */
function loadPoolFromStorage(fallbackConfig) {
  // Try unified key first
  const stored = localStorage.getItem('bestPool');
  const storedPool = safeJsonParse(stored);
  if (storedPool) {
    return storedPool;
  }
  // Legacy migration: combine old separate keys into unified pool
  const legacyBrains = localStorage.getItem('bestBrains');
  const legacyBrain = localStorage.getItem('bestBrain');
  const legacyConfig = localStorage.getItem('bestCarInfo');
  if (legacyBrains || legacyBrain) {
    let brains = [];
    if (legacyBrains) {
      brains = safeJsonParse(legacyBrains) ?? [];
    } else if (legacyBrain) {
      const brain = safeJsonParse(legacyBrain);
      brains = brain ? [brain] : [];
    }
    const baseConfig = safeJsonParse(legacyConfig) ??
      fallbackConfig ?? {
        ...DEFAULT_CAR_CONFIG,
        sensor: { ...DEFAULT_CAR_CONFIG.sensor },
      };
    const pool = brains.map((brain) => ({
      ...baseConfig,
      sensor: { ...baseConfig.sensor },
      brain,
    }));
    // Migrate: write unified key and remove legacy keys
    localStorage.setItem('bestPool', JSON.stringify(pool));
    localStorage.removeItem('bestBrain');
    localStorage.removeItem('bestBrains');
    localStorage.removeItem('bestCarInfo');
    console.log('Migrated legacy storage to unified bestPool.');
    return pool;
  }
  return [];
}

function savePoolToStorage(pool) {
  if (pool.length > 0) {
    localStorage.setItem('bestPool', JSON.stringify(pool));
    console.log(`Saved top ${pool.length} car(s) to localStorage.`);
  } else {
    console.warn('Could not save: no cars with brains found.');
  }
}

function discardStoredPool() {
  localStorage.removeItem('bestPool');
  // Remove legacy keys if they exist
  localStorage.removeItem('bestBrain');
  localStorage.removeItem('bestBrains');
  localStorage.removeItem('bestCarInfo');
  console.log('Stored pool discarded from localStorage.');
}

/**
 * Race-only car list persistence ('raceCars' localStorage key).
 * Separate from the training pool ('bestPool'): cars loaded via the race's
 * "Load car(s)" button are stored here and never overwrite the training pool.
 */
function loadRaceCars() {
  const stored = localStorage.getItem('raceCars');
  return safeJsonParse(stored) ?? [];
}

function saveRaceCars(cars) {
  if (cars.length > 0) {
    localStorage.setItem('raceCars', JSON.stringify(cars));
    console.log(`Saved ${cars.length} race car(s) to localStorage.`);
  } else {
    localStorage.removeItem('raceCars');
  }
}

function downloadCarFiles(selectedCars) {
  if (selectedCars.length === 0) return;
  const now = new Date();
  const dateStr =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0');
  for (const { car, poolPosition } of selectedCars) {
    const carInfo = car.toInfo();
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
