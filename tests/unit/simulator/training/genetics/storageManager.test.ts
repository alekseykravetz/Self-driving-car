import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadPoolFromStorage,
  savePoolToStorage,
  discardStoredPool,
  loadRaceCars,
  saveRaceCars,
  downloadCarFiles,
} from '../../../../../ts/simulator/training/genetics/storageManager.js';
import { DEFAULT_CAR_CONFIG } from '../../../../../ts/car/config.js';
import type { CarInfo } from '../../../../../ts/car/car.js';
import type { Car } from '../../../../../ts/car/car.js';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k in store) delete store[k];
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
});

const makeCarInfo = (overrides: Partial<CarInfo> = {}): CarInfo => ({
  maxSpeed: 3.24,
  acceleration: 0.01,
  friction: 0.002,
  width: 25,
  height: 63,
  sensor: {
    rayCount: 5,
    raySpread: 1.5707963267948966,
    rayLength: 150,
    rayOffset: 0,
  },
  ...overrides,
});

describe('loadPoolFromStorage', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  it('returns parsed pool when bestPool exists', () => {
    const pool: CarInfo[] = [
      makeCarInfo({ brain: { levels: [] }, maxSpeed: 5 }),
    ];
    store['bestPool'] = JSON.stringify(pool);
    const result = loadPoolFromStorage();
    expect(result).toHaveLength(1);
    expect(result[0].maxSpeed).toBe(5);
    expect(result[0].brain).toEqual({ levels: [] });
  });

  it('returns [] when nothing in storage', () => {
    const result = loadPoolFromStorage();
    expect(result).toEqual([]);
  });

  it('migrates legacy bestBrain to unified pool', () => {
    const legacyBrain = { weights: [0.1, 0.2] };
    store['bestBrain'] = JSON.stringify(legacyBrain);

    const infoLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = loadPoolFromStorage();
    expect(result).toHaveLength(1);
    expect(result[0].brain).toEqual(legacyBrain);
    expect(result[0].maxSpeed).toBe(DEFAULT_CAR_CONFIG.maxSpeed);
    expect(result[0].sensor.rayCount).toBe(DEFAULT_CAR_CONFIG.sensor.rayCount);
    // Should have migrated to new key
    expect(JSON.parse(store['bestPool'])).toHaveLength(1);
    // Legacy keys removed
    expect(store['bestBrain']).toBeUndefined();

    infoLog.mockRestore();
  });

  it('migrates legacy bestBrains to unified pool', () => {
    const legacyBrains = [{ weights: [0.1, 0.2] }, { weights: [0.3, 0.4] }];
    store['bestBrains'] = JSON.stringify(legacyBrains);
    store['bestCarInfo'] = JSON.stringify({
      maxSpeed: 5,
      acceleration: 0.02,
      friction: 0.003,
      width: 30,
      height: 50,
      sensor: { rayCount: 3, raySpread: 1.0, rayLength: 100, rayOffset: 0 },
    });

    const infoLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = loadPoolFromStorage();
    expect(result).toHaveLength(2);
    expect(result[0].brain).toEqual(legacyBrains[0]);
    expect(result[1].brain).toEqual(legacyBrains[1]);
    expect(result[0].maxSpeed).toBe(5);
    expect(result[0].sensor.rayCount).toBe(3);
    // Legacy keys removed
    expect(store['bestBrains']).toBeUndefined();
    expect(store['bestCarInfo']).toBeUndefined();

    infoLog.mockRestore();
  });

  it('uses fallbackConfig when no legacy config present', () => {
    const legacyBrain = { weights: [0.5] };
    store['bestBrain'] = JSON.stringify(legacyBrain);

    const fallbackConfig: CarInfo = makeCarInfo({
      maxSpeed: 10,
      acceleration: 0.05,
    });

    const infoLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = loadPoolFromStorage(fallbackConfig);
    expect(result).toHaveLength(1);
    expect(result[0].maxSpeed).toBe(10);
    expect(result[0].acceleration).toBe(0.05);

    infoLog.mockRestore();
  });

  it('fallbackConfig defaults to DEFAULT_CAR_CONFIG when not provided', () => {
    const legacyBrain = { weights: [0.5] };
    store['bestBrain'] = JSON.stringify(legacyBrain);

    const infoLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = loadPoolFromStorage();
    expect(result).toHaveLength(1);
    expect(result[0].maxSpeed).toBe(DEFAULT_CAR_CONFIG.maxSpeed);
    expect(result[0].acceleration).toBe(DEFAULT_CAR_CONFIG.acceleration);
    expect(result[0].friction).toBe(DEFAULT_CAR_CONFIG.friction);
    expect(result[0].width).toBe(DEFAULT_CAR_CONFIG.width);
    expect(result[0].height).toBe(DEFAULT_CAR_CONFIG.height);
    expect(result[0].sensor.rayCount).toBe(DEFAULT_CAR_CONFIG.sensor.rayCount);
    expect(result[0].sensor.rayLength).toBe(
      DEFAULT_CAR_CONFIG.sensor.rayLength,
    );
    expect(result[0].sensor.raySpread).toBe(
      DEFAULT_CAR_CONFIG.sensor.raySpread,
    );
    expect(result[0].sensor.rayOffset).toBe(
      DEFAULT_CAR_CONFIG.sensor.rayOffset,
    );

    infoLog.mockRestore();
  });

  it('handles bestBrain with null/undefined brain data', () => {
    store['bestBrain'] = 'null';
    const infoLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = loadPoolFromStorage();
    expect(result).toEqual([]);
    infoLog.mockRestore();
  });

  it('handles bestBrains with null/undefined brain data', () => {
    store['bestBrains'] = 'null';
    const infoLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = loadPoolFromStorage();
    expect(result).toEqual([]);
    infoLog.mockRestore();
  });
});

describe('savePoolToStorage', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  it('writes non-empty pool to bestPool', () => {
    const pool: CarInfo[] = [makeCarInfo()];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    savePoolToStorage(pool);
    expect(store['bestPool']).toBe(JSON.stringify(pool));
    expect(logSpy).toHaveBeenCalledWith('Saved top 1 car(s) to localStorage.');
    logSpy.mockRestore();
  });

  it('logs warning when pool is empty', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    savePoolToStorage([]);
    expect(warnSpy).toHaveBeenCalledWith(
      'Could not save: no cars with brains found.',
    );
    warnSpy.mockRestore();
  });

  it('does not throw when pool is empty', () => {
    expect(() => savePoolToStorage([])).not.toThrow();
  });
});

describe('discardStoredPool', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  it('removes bestPool key', () => {
    store['bestPool'] = 'some data';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    discardStoredPool();
    expect(store['bestPool']).toBeUndefined();
    logSpy.mockRestore();
  });

  it('also removes legacy keys (bestBrain, bestBrains, bestCarInfo)', () => {
    store['bestPool'] = 'pool';
    store['bestBrain'] = 'brain';
    store['bestBrains'] = 'brains';
    store['bestCarInfo'] = 'config';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    discardStoredPool();
    expect(store['bestPool']).toBeUndefined();
    expect(store['bestBrain']).toBeUndefined();
    expect(store['bestBrains']).toBeUndefined();
    expect(store['bestCarInfo']).toBeUndefined();
    logSpy.mockRestore();
  });
});

describe('loadRaceCars / saveRaceCars', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  it('saves and loads race cars round-trip', () => {
    const cars: CarInfo[] = [
      makeCarInfo({ maxSpeed: 8, brain: { levels: [1] } }),
      makeCarInfo({ maxSpeed: 10, brain: { levels: [2] } }),
    ];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    saveRaceCars(cars);
    expect(logSpy).toHaveBeenCalledWith('Saved 2 race car(s) to localStorage.');
    logSpy.mockRestore();

    const loaded = loadRaceCars();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].maxSpeed).toBe(8);
    expect(loaded[1].maxSpeed).toBe(10);
  });

  it('returns [] when no race cars saved', () => {
    const result = loadRaceCars();
    expect(result).toEqual([]);
  });

  it('removes raceCars key when saving empty list', () => {
    store['raceCars'] = 'some old data';
    saveRaceCars([]);
    expect(store['raceCars']).toBeUndefined();
  });
});

describe('downloadCarFiles', () => {
  let mockAnchor: {
    href: string;
    download: string;
    click: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    for (const k in store) delete store[k];

    vi.stubGlobal(
      'Blob',
      vi.fn(function BlobMock() {
        return {};
      }),
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });

    mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockAnchor),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no-op when selectedCars empty', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const blobSpy = vi.spyOn(globalThis, 'Blob');
    downloadCarFiles([]);
    expect(blobSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    blobSpy.mockRestore();
  });

  it('creates Blob for each car', () => {
    const carInfo1: CarInfo = makeCarInfo({
      maxSpeed: 5,
      width: 30,
      height: 50,
      sensor: {
        rayCount: 3,
        rayLength: 100,
        raySpread: 1.5707963267948966,
        rayOffset: 0,
      },
      brain: { levels: [] },
    });
    const carInfo2: CarInfo = makeCarInfo({
      maxSpeed: 8,
      width: 25,
      height: 60,
      sensor: {
        rayCount: 5,
        rayLength: 150,
        raySpread: 1.5707963267948966,
        rayOffset: 0,
      },
      brain: { levels: [] },
    });

    const mockCar1 = { toInfo: () => carInfo1 } as Car;
    const mockCar2 = { toInfo: () => carInfo2 } as Car;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    downloadCarFiles([
      { car: mockCar1, poolPosition: 0 },
      { car: mockCar2, poolPosition: 1 },
    ]);

    expect(globalThis.Blob).toHaveBeenCalledTimes(2);
    expect(globalThis.Blob).toHaveBeenCalledWith(
      [JSON.stringify(carInfo1, null, 2)],
      { type: 'application/json' },
    );
    expect(globalThis.Blob).toHaveBeenCalledWith(
      [JSON.stringify(carInfo2, null, 2)],
      { type: 'application/json' },
    );
    logSpy.mockRestore();
  });

  it('triggers download for each car', () => {
    const carInfo: CarInfo = makeCarInfo({
      maxSpeed: 5,
      width: 30,
      height: 50,
      sensor: {
        rayCount: 3,
        rayLength: 100,
        raySpread: 1.5707963267948966,
        rayOffset: 0,
      },
      brain: { levels: [] },
    });
    const mockCar = { toInfo: () => carInfo } as Car;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    downloadCarFiles([{ car: mockCar, poolPosition: 0 }]);

    expect(globalThis.document.createElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('blob:test');
    expect(mockAnchor.download).toMatch(/^\d{12}_p1_30x50_s5_rc3_rl100\.car$/);
    expect(mockAnchor.click).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Downloaded 1 car file(s).');
    logSpy.mockRestore();
  });
});
