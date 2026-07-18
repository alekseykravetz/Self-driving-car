import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  smGenId,
  smWorldMarkers,
  smPersist,
  smNormalizeWorldId,
  smReadActiveCarIds,
  smCountItems,
  StoreManager,
} from '../../../ts/store/storeManager.js';

// Shared localStorage mock for tests that need it
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
    expect(StoreManager.getTrackedKeyCount()).toBe(5);
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
});
