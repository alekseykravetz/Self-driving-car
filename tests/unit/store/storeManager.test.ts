import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  smGenId,
  smWorldMarkers,
  smPersist,
  smNormalizeWorldId,
  smReadActiveCarIds,
  smCountItems,
  StoreManager,
} from '../../../ts/store/storeManager.js';
import type { CarInfo } from '../../../ts/car/car.js';

// Shared localStorage mock for tests that need it
const store: Record<string, string> = {};
function installLocalStorageMock(): void {
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
}
installLocalStorageMock();

describe('smGenId', () => {
  it('returns a non-empty string', () => {
    const id = smGenId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('consecutive calls return different values', () => {
    const id1 = smGenId();
    const id2 = smGenId();
    expect(id1).not.toBe(id2);
  });
});

describe('smWorldMarkers', () => {
  it('data with start marking returns hasStartMarker: true', () => {
    const data = { markings: [{ type: 'start' }] };
    const result = smWorldMarkers(data);
    expect(result.hasStartMarker).toBe(true);
    expect(result.hasEndMarker).toBe(false);
  });

  it('data with target marking returns hasEndMarker: true', () => {
    const data = { markings: [{ type: 'target' }] };
    const result = smWorldMarkers(data);
    expect(result.hasStartMarker).toBe(false);
    expect(result.hasEndMarker).toBe(true);
  });

  it('data with both markings returns both true', () => {
    const data = { markings: [{ type: 'start' }, { type: 'target' }] };
    const result = smWorldMarkers(data);
    expect(result.hasStartMarker).toBe(true);
    expect(result.hasEndMarker).toBe(true);
  });

  it('data with no markings returns both false', () => {
    const data = {};
    const result = smWorldMarkers(data);
    expect(result.hasStartMarker).toBe(false);
    expect(result.hasEndMarker).toBe(false);
  });

  it('data with empty markings array returns both false', () => {
    const data = { markings: [] };
    const result = smWorldMarkers(data);
    expect(result.hasStartMarker).toBe(false);
    expect(result.hasEndMarker).toBe(false);
  });
});

describe('smPersist', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  it('stores JSON-stringified value to localStorage', () => {
    smPersist('testKey', { a: 1 }, 'test');
    expect(store['testKey']).toBe(JSON.stringify({ a: 1 }));
  });

  it('on QuotaExceededError logs warning and does not throw', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Temporarily replace global localStorage setItem to throw
    const origSetItem = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = vi.fn(() => {
      const err = new Error('QuotaExceeded');
      (err as Error & { code?: string }).code = 'QuotaExceededError';
      (err as Error & { name: string }).name = 'QuotaExceededError';
      throw err;
    });

    expect(() => smPersist('bigKey', { big: true }, 'bigFile')).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    globalThis.localStorage.setItem = origSetItem;
    warnSpy.mockRestore();
  });
});

describe('smNormalizeWorldId', () => {
  it('returns editor unchanged', () => {
    expect(smNormalizeWorldId('editor')).toBe('editor');
  });

  it('returns store:foo unchanged', () => {
    expect(smNormalizeWorldId('store:foo')).toBe('store:foo');
  });

  it('returns loaded:x unchanged', () => {
    expect(smNormalizeWorldId('loaded:x')).toBe('loaded:x');
  });

  it('prepends store: to legacy bare filename', () => {
    expect(smNormalizeWorldId('circle.world')).toBe('store:circle.world');
  });
});

describe('smReadActiveCarIds', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  it('returns parsed array when stored as JSON array', () => {
    store['store:activeCar'] = JSON.stringify(['store:car1', 'loaded:car2']);
    const ids = smReadActiveCarIds();
    expect(ids).toEqual(['store:car1', 'loaded:car2']);
  });

  it('wraps legacy plain string in array', () => {
    store['store:activeCar'] = 'circle.txt';
    const ids = smReadActiveCarIds();
    expect(ids).toEqual(['store:circle.txt']);
  });

  it('returns empty array when nothing is stored', () => {
    const ids = smReadActiveCarIds();
    expect(ids).toEqual([]);
  });
});

describe('smCountItems', () => {
  it('bestPool with valid JSON array returns count', () => {
    expect(smCountItems('bestPool', '[1,2,3]')).toBe(3);
  });

  it('bestPool with non-parseable value returns null', () => {
    expect(smCountItems('bestPool', 'not-array')).toBe(null);
  });

  it('non-array key returns null', () => {
    expect(smCountItems('editorWorld', '{}')).toBe(null);
  });
});

describe('StoreManager class', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  it('getActiveWorldId returns null when unset', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getActiveWorldId()).toBeNull();
  });

  it('getActiveWorldId returns normalized id', () => {
    store['store:activeWorld'] = 'circle.world';
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getActiveWorldId()).toBe('store:circle.world');
  });

  it('setActiveWorldId stores to localStorage', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.setActiveWorldId('store:test');
    expect(store['store:activeWorld']).toBe('store:test');
  });

  it('getActiveCarIds returns empty array when unset', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getActiveCarIds()).toEqual([]);
  });

  it('toggleActiveCarId adds new id', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.toggleActiveCarId('store:car1');
    expect(mgr.getActiveCarIds()).toContain('store:car1');
  });

  it('toggleActiveCarId removes existing id', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.toggleActiveCarId('store:car1');
    mgr.toggleActiveCarId('store:car1');
    expect(mgr.getActiveCarIds()).toEqual([]);
  });

  it('getLocalStorageStates returns tracked keys', () => {
    store['bestPool'] = JSON.stringify([1, 2, 3]);
    store['editorWorld'] = '{}';
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    const states = mgr.getLocalStorageStates();
    expect(states.length).toBe(2);
    const bestPoolEntry = states.find((s) => s.key === 'bestPool');
    expect(bestPoolEntry).toBeDefined();
    expect(bestPoolEntry!.count).toBe(3);
  });

  it('getTrackedKeyCount static', () => {
    expect(StoreManager.getTrackedKeyCount()).toBe(12);
  });

  it('getAllWorlds returns ordered sources', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.addLoadedWorld('test', { markings: ['start'] });
    const worlds = mgr.getAllWorlds();
    const loadedEntries = worlds.filter((w) => w.source === 'loaded');
    expect(loadedEntries.length).toBeGreaterThanOrEqual(1);
    expect(loadedEntries[0].name).toBe('test');
  });

  it('getAllWorlds includes editor world when set', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.setEditorWorld({ markings: ['target'] });
    const worlds = mgr.getAllWorlds();
    const editorEntry = worlds.find((w) => w.source === 'editor');
    expect(editorEntry).toBeDefined();
    expect(editorEntry!.name).toBe('Editor World');
  });

  it('getWorlds returns empty when no store assets loaded', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getWorlds()).toEqual([]);
  });

  it('getCars returns empty when no store assets loaded', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getCars()).toEqual([]);
  });

  it('getLoadedWorlds returns empty initially', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getLoadedWorlds()).toEqual([]);
  });

  it('getLoadedCars returns empty initially', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getLoadedCars()).toEqual([]);
  });

  it('getEditorWorld returns null when not set', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getEditorWorld()).toBeNull();
  });

  it('setEditorWorld stores data and returns true', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    const data = { foo: 'bar' };
    const result = mgr.setEditorWorld(data);
    expect(result).toBe(true);
    expect(mgr.getEditorWorld()).toEqual(data);
    // Should also be persisted to localStorage
    expect(JSON.parse(store['editorWorld'])).toEqual(data);
  });

  it('getActiveWorld returns the currently active world data', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.addLoadedWorld('test', { markings: ['start'] });
    // The loaded world gets an id like 'loaded:xxxxx'
    const worlds = mgr.getAllWorlds();
    const loadedWorld = worlds.find((w) => w.source === 'loaded')!;
    mgr.setActiveWorldId(loadedWorld.id);
    const active = mgr.getActiveWorld();
    expect(active).toEqual({ markings: ['start'] });
  });

  it('getActiveWorldName returns the active world display name', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.addLoadedWorld('test-name', { markings: ['start'] });
    const worlds = mgr.getAllWorlds();
    const loadedWorld = worlds.find((w) => w.source === 'loaded')!;
    mgr.setActiveWorldId(loadedWorld.id);
    expect(mgr.getActiveWorldName()).toBe('test-name');
  });

  it('getActiveWorld returns null when no active world', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getActiveWorld()).toBeNull();
  });

  it('getActiveWorldName returns null when no active world', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getActiveWorldName()).toBeNull();
  });

  it('setActiveCarIds persists ids to localStorage', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.setActiveCarIds(['store:car1', 'loaded:car2']);
    expect(mgr.getActiveCarIds()).toEqual(['store:car1', 'loaded:car2']);
  });

  it('getActiveCars returns active car data objects', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    const carData = { brain: [], controls: [] };
    mgr.addLoadedCar('test-car', carData as CarInfo);
    const cars = mgr.getAllCars();
    const loadedCar = cars.find((c) => c.source === 'loaded')!;
    mgr.setActiveCarIds([loadedCar.id]);
    const activeCars = mgr.getActiveCars();
    expect(activeCars).toHaveLength(1);
    expect(activeCars[0]).toEqual(carData);
  });

  it('getActiveCar returns first active car', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    const carData = { brain: [], controls: [] };
    mgr.addLoadedCar('test-car', carData as CarInfo);
    const cars = mgr.getAllCars();
    const loadedCar = cars.find((c) => c.source === 'loaded')!;
    mgr.setActiveCarIds([loadedCar.id]);
    expect(mgr.getActiveCar()).toEqual(carData);
  });

  it('getActiveCar returns null when no active car', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getActiveCar()).toBeNull();
  });

  it('getActiveCarNames returns display names in order', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.addLoadedCar('car-a', { brain: [], controls: [] } as CarInfo);
    mgr.addLoadedCar('car-b', { brain: [], controls: [] } as CarInfo);
    const cars = mgr.getAllCars();
    const loadedCars = cars.filter((c) => c.source === 'loaded');
    mgr.setActiveCarIds([loadedCars[0].id, loadedCars[1].id]);
    const names = mgr.getActiveCarNames();
    expect(names).toHaveLength(2);
    expect(names[0]).toBe('car-a');
    expect(names[1]).toBe('car-b');
  });

  it('getAllCars returns loaded and store cars', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    const carData = { brain: [], controls: [] };
    mgr.addLoadedCar('test-car', carData as CarInfo);
    const allCars = mgr.getAllCars();
    const loadedEntry = allCars.find((c) => c.source === 'loaded')!;
    expect(loadedEntry.name).toBe('test-car');
    expect(loadedEntry.data).toEqual(carData);
  });

  it('getAllCars returns empty when no cars', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    expect(mgr.getAllCars()).toEqual([]);
  });

  it('addLoadedCar adds and returns UnifiedCarEntry', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    const carData = { brain: [], controls: [] } as CarInfo;
    const entry = mgr.addLoadedCar('my-car', carData);
    expect(entry.name).toBe('my-car');
    expect(entry.source).toBe('loaded');
    expect(entry.data).toEqual(carData);
    expect(entry.id).toMatch(/^loaded:/);
    // Should appear in getLoadedCars
    expect(mgr.getLoadedCars()).toHaveLength(1);
    expect(mgr.getLoadedCars()[0].name).toBe('my-car');
  });

  it('setEditorWorld returns false on localStorage quota error', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    const origSetItem = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = vi.fn(() => {
      const err = new Error('QuotaExceeded');
      (err as Error & { code?: string }).code = 'QuotaExceededError';
      (err as Error & { name: string }).name = 'QuotaExceededError';
      throw err;
    });

    const result = mgr.setEditorWorld({ some: 'data' });
    expect(result).toBe(false);
    // In-memory copy should still be updated
    expect(mgr.getEditorWorld()).toEqual({ some: 'data' });

    globalThis.localStorage.setItem = origSetItem;
  });

  it('deleteLocalStorageKey removes tracked key from localStorage', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    store['bestPool'] = JSON.stringify([1, 2, 3]);
    mgr.deleteLocalStorageKey('bestPool');
    expect('bestPool' in store).toBe(false);
  });

  it('deleteLocalStorageKey ignores untracked keys', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    store['someRandomKey'] = 'value';
    mgr.deleteLocalStorageKey('someRandomKey');
    // Should still exist because it's not tracked
    expect(store['someRandomKey']).toBe('value');
  });
});

describe('StoreManager static methods', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  it('getInstance returns null before init', () => {
    expect(StoreManager.getInstance()).toBeNull();
  });

  it('static getActiveWorld returns null before init', () => {
    expect(StoreManager.getActiveWorld()).toBeNull();
  });

  it('static getEditorWorld returns null before init', () => {
    expect(StoreManager.getEditorWorld()).toBeNull();
  });

  it('static getActiveWorldName returns null before init', () => {
    expect(StoreManager.getActiveWorldName()).toBeNull();
  });

  it('static getActiveCarNames returns [] before init', () => {
    expect(StoreManager.getActiveCarNames()).toEqual([]);
  });

  it('static getCars returns [] before init', () => {
    expect(StoreManager.getCars()).toEqual([]);
  });

  it('static getActiveCar returns null before init', () => {
    expect(StoreManager.getActiveCar()).toBeNull();
  });

  it('static getActiveCars returns [] before init', () => {
    expect(StoreManager.getActiveCars()).toEqual([]);
  });

  it('static getAllWorlds returns [] before init', () => {
    expect(StoreManager.getAllWorlds()).toEqual([]);
  });

  it('static getAllCars returns [] before init', () => {
    expect(StoreManager.getAllCars()).toEqual([]);
  });

  it('static getActiveWorldId returns null before init', () => {
    expect(StoreManager.getActiveWorldId()).toBeNull();
  });

  it('static getActiveCarIds returns [] before init', () => {
    expect(StoreManager.getActiveCarIds()).toEqual([]);
  });
});

describe('StoreManager.exportLocalStorageKey', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createdAnchor: { href: string; download: string; click: () => void };
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    for (const k in store) delete store[k];
    clickSpy = vi.fn();
    createdAnchor = { href: '', download: '', click: clickSpy };
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();

    vi.stubGlobal(
      'Blob',
      class {
        parts: unknown[];
        opts: unknown;
        constructor(parts: unknown[], opts: unknown) {
          this.parts = parts;
          this.opts = opts;
        }
      },
    );
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('document', {
      createElement: () => createdAnchor,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // unstubAllGlobals also removes the module-level localStorage mock, so
    // reinstall it for the tests that run afterwards.
    installLocalStorageMock();
  });

  it('triggers a download with the key-named file for an existing key', () => {
    store['bestPool'] = JSON.stringify([1, 2, 3]);
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.exportLocalStorageKey('bestPool');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createdAnchor.href).toBe('blob:mock-url');
    expect(createdAnchor.download).toBe('bestPool.json');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('does nothing when the key is absent from localStorage', () => {
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    mgr.exportLocalStorageKey('missingKey');

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe('StoreManager.getLocalStorageStates edge cases', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  it('reports size and null count for non-array keys', () => {
    store['editorWorld'] = '{"a":1}';
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    const states = mgr.getLocalStorageStates();
    const entry = states.find((s) => s.key === 'editorWorld');
    expect(entry).toBeDefined();
    expect(entry!.size).toBe(store['editorWorld'].length);
    expect(entry!.count).toBeNull();
  });

  it('ignores untracked keys entirely', () => {
    store['notTracked'] = 'x';
    // @ts-expect-error - TypeScript prevents calling private constructor
    const mgr = new StoreManager();
    const states = mgr.getLocalStorageStates();
    expect(states.some((s) => s.key === 'notTracked')).toBe(false);
  });
});

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('StoreManager.init', () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    installLocalStorageMock();
  });

  it('continues without store assets when the manifest fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockResponse(null, false, 500)),
    );
    vi.resetModules();
    const { StoreManager: Fresh } = await import(
      '../../../ts/store/storeManager.js'
    );
    const mgr = await Fresh.init();
    expect(mgr.getWorlds()).toEqual([]);
    expect(mgr.getCars()).toEqual([]);
  });

  it('loads worlds/cars from the manifest and skips failed fetches', async () => {
    const worldData = { markings: [{ type: 'start' }] };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/store/manifest.json') {
          return mockResponse({
            worlds: ['good.world', 'bad.world'],
            cars: ['good.car'],
          });
        }
        if (url === '/store/world/good.world') {
          return mockResponse(JSON.stringify(worldData));
        }
        if (url === '/store/world/bad.world') {
          return mockResponse(null, false, 404);
        }
        if (url === '/store/car/good.car') {
          return mockResponse(JSON.stringify({ brain: [], controls: [] }));
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    vi.resetModules();
    const { StoreManager: Fresh } = await import(
      '../../../ts/store/storeManager.js'
    );
    const mgr = await Fresh.init();
    expect(mgr.getWorlds()).toEqual([
      {
        filename: 'good.world',
        data: worldData,
        hasStartMarker: true,
        hasEndMarker: false,
      },
    ]);
    expect(mgr.getCars()).toEqual([
      { filename: 'good.car', data: { brain: [], controls: [] } },
    ]);
  });

  it('auto-selects the first store world when nothing is active and no editor world exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/store/manifest.json') {
          return mockResponse({ worlds: ['first.world'], cars: [] });
        }
        if (url === '/store/world/first.world') {
          return mockResponse(JSON.stringify({ markings: [] }));
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    vi.resetModules();
    const { StoreManager: Fresh } = await import(
      '../../../ts/store/storeManager.js'
    );
    await Fresh.init();
    expect(store['store:activeWorld']).toBe('store:first.world');
  });

  it('does not auto-select a store world when an editor world already exists', async () => {
    store['editorWorld'] = JSON.stringify({ markings: [] });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/store/manifest.json') {
          return mockResponse({ worlds: ['first.world'], cars: [] });
        }
        if (url === '/store/world/first.world') {
          return mockResponse(JSON.stringify({ markings: [] }));
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    vi.resetModules();
    const { StoreManager: Fresh } = await import(
      '../../../ts/store/storeManager.js'
    );
    await Fresh.init();
    expect(store['store:activeWorld']).toBeUndefined();
  });

  it('migrates the legacy `world` key to `editorWorld` when unset', async () => {
    store['world'] = JSON.stringify({ legacy: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockResponse(null, false, 500)),
    );
    vi.resetModules();
    const { StoreManager: Fresh } = await import(
      '../../../ts/store/storeManager.js'
    );
    const mgr = await Fresh.init();
    expect(store['world']).toBeUndefined();
    expect(JSON.parse(store['editorWorld'])).toEqual({ legacy: true });
    expect(mgr.getEditorWorld()).toEqual({ legacy: true });
  });

  it('discards the legacy `world` key without overwriting an existing editorWorld', async () => {
    store['world'] = JSON.stringify({ legacy: true });
    store['editorWorld'] = JSON.stringify({ current: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockResponse(null, false, 500)),
    );
    vi.resetModules();
    const { StoreManager: Fresh } = await import(
      '../../../ts/store/storeManager.js'
    );
    const mgr = await Fresh.init();
    expect(store['world']).toBeUndefined();
    expect(mgr.getEditorWorld()).toEqual({ current: true });
  });

  it('hydrates loadedWorlds and loadedCars from localStorage', async () => {
    store['loadedWorlds'] = JSON.stringify([
      { id: 'loaded:a', name: 'w1', data: {} },
    ]);
    store['loadedCars'] = JSON.stringify([
      { id: 'loaded:b', name: 'c1', data: { brain: [], controls: [] } },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockResponse(null, false, 500)),
    );
    vi.resetModules();
    const { StoreManager: Fresh } = await import(
      '../../../ts/store/storeManager.js'
    );
    const mgr = await Fresh.init();
    expect(mgr.getLoadedWorlds()).toEqual([
      { id: 'loaded:a', name: 'w1', data: {} },
    ]);
    expect(mgr.getLoadedCars()).toEqual([
      { id: 'loaded:b', name: 'c1', data: { brain: [], controls: [] } },
    ]);
  });

  it('returns the same instance on repeated init() calls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockResponse(null, false, 500)),
    );
    vi.resetModules();
    const { StoreManager: Fresh } = await import(
      '../../../ts/store/storeManager.js'
    );
    const mgr1 = await Fresh.init();
    const mgr2 = await Fresh.init();
    expect(mgr1).toBe(mgr2);
    expect(Fresh.getInstance()).toBe(mgr1);
  });
});
