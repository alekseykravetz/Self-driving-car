import { CarInfo } from '../car/car.js';
import type {
  StoreManifest,
  StoreWorldEntry,
  StoreCarEntry,
  LocalStorageEntry,
  LoadedWorldEntry,
  LoadedCarEntry,
  UnifiedWorldEntry,
  UnifiedCarEntry,
} from './types.js';
import { safeJsonParse } from './serialization.js';
import { parseWorldFileContent } from '../world/loader/worldLoader.js';
import { CarLoader } from '../car/loader/carLoader.js';

/**
 * StoreManager — Singleton that loads preloaded assets from /store/ via manifest.json.
 * Provides active world/car selection persisted to localStorage.
 * Used by all pages (main landing, simulator, race, world editor) to get the
 * currently active world and car without relying on global script variables.
 */
// File-scope constants + pure helpers. Kept out of the class body so neither
// static nor instance methods reference the class name for them — referencing
// `StoreManager.X` inside the class makes tsc emit a global `var _a = StoreManager`
// alias, which collides with the same alias other globally-loaded classes emit
// (e.g. StorePanelElement, TrafficPanelElement) and breaks at runtime.
const SM_ACTIVE_WORLD_KEY = 'store:activeWorld';
const SM_ACTIVE_CAR_KEY = 'store:activeCar';
const SM_LOADED_WORLDS_KEY = 'loadedWorlds';
const SM_LOADED_CARS_KEY = 'loadedCars';
const SM_EDITOR_WORLD_KEY = 'editorWorld';
const SM_LEGACY_WORLD_KEY = 'world';
const SM_EDITOR_WORLD_ID = 'editor';
const SM_TRACKED_LS_KEYS = [
  'bestPool',
  'raceCars',
  'editorWorld',
  'loadedWorlds',
  'loadedCars',
];
const SM_ARRAY_LS_KEYS = ['bestPool', 'raceCars', 'loadedWorlds', 'loadedCars'];

/** Generate a short, unique id for a user-loaded asset. */
function smGenId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Detect start/target markers in a world data object. */
function smWorldMarkers(data: object): {
  hasStartMarker: boolean;
  hasEndMarker: boolean;
} {
  const markings: { type?: string }[] =
    (data as { markings?: { type?: string }[] }).markings || [];
  return {
    hasStartMarker: markings.some((m) => m.type === 'start'),
    hasEndMarker: markings.some((m) => m.type === 'target'),
  };
}

/**
 * Persist a value to localStorage. On QuotaExceededError, warn and keep the
 * in-memory copy so oversized files still work for the current session.
 */
function smPersist(key: string, value: unknown, name: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(
      `StoreManager: "${name}" too large for localStorage; kept in memory ` +
        'only (will be lost on refresh).',
      e,
    );
  }
}

/** Normalize a stored world id, mapping legacy bare filenames to `store:`. */
function smNormalizeWorldId(raw: string): string {
  if (
    raw === SM_EDITOR_WORLD_ID ||
    raw.startsWith('store:') ||
    raw.startsWith('loaded:')
  ) {
    return raw;
  }
  return `store:${raw}`; // legacy bare filename
}

/** Read & normalize the active-car ids from localStorage. */
function smReadActiveCarIds(): string[] {
  const raw = localStorage.getItem(SM_ACTIVE_CAR_KEY);
  if (!raw) return [];
  const parsed = safeJsonParse<string[]>(raw);
  const list = Array.isArray(parsed)
    ? parsed.filter((f): f is string => typeof f === 'string')
    : [raw]; // legacy single plain-string filename
  return list.map((id) =>
    id.startsWith('store:') || id.startsWith('loaded:') ? id : `store:${id}`,
  );
}

/**
 * Item count for array-backed tracked keys (bestPool, raceCars, loadedWorlds,
 * loadedCars). Returns null for non-array keys (e.g. 'editorWorld') or
 * unparseable values.
 */
function smCountItems(key: string, value: string): number | null {
  if (!SM_ARRAY_LS_KEYS.includes(key)) return null;
  const parsed = safeJsonParse<unknown[]>(value);
  return Array.isArray(parsed) ? parsed.length : null;
}

export class StoreManager {
  private static instance: StoreManager | null = null;
  private static initPromise: Promise<StoreManager> | null = null;

  #worlds: StoreWorldEntry[] = [];
  #cars: StoreCarEntry[] = [];

  // User-loaded assets. Persisted to localStorage when they fit; otherwise kept
  // only in memory for the session (lost on refresh).
  #loadedWorlds: LoadedWorldEntry[] = [];
  #loadedCars: LoadedCarEntry[] = [];

  // World saved by the world editor (renamed from the legacy `world` key).
  #editorWorld: object | null = null;

  private constructor() {}

  /** Initialize the StoreManager singleton — fetches manifest and all assets. */
  static async init(): Promise<StoreManager> {
    if (this.instance) return this.instance;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.load();
    return this.initPromise;
  }

  private static async load(): Promise<StoreManager> {
    const mgr = new StoreManager();

    // Migrate legacy keys and load user assets before touching the network so
    // local state is consistent even if the manifest fetch fails.
    mgr.#initLocalState();

    try {
      const resp = await fetch('/store/manifest.json');
      if (!resp.ok) throw new Error(`manifest fetch failed: ${resp.status}`);
      const manifest: StoreManifest = await resp.json();

      // Load worlds
      const worldPromises = manifest.worlds.map(async (filename) => {
        try {
          const r = await fetch(`/store/world/${filename}`);
          if (!r.ok) return null;
          const text = await r.text();
          const data = parseWorldFileContent(text);
          if (!data) return null;
          const markings: { type?: string }[] =
            (data as { markings?: { type?: string }[] }).markings || [];
          return {
            filename,
            data,
            hasStartMarker: markings.some((m) => m.type === 'start'),
            hasEndMarker: markings.some((m) => m.type === 'target'),
          } as StoreWorldEntry;
        } catch (e) {
          console.warn(`Failed to load store world: ${filename}`, e);
          return null;
        }
      });

      // Load cars
      const carPromises = manifest.cars.map(async (filename) => {
        try {
          const r = await fetch(`/store/car/${filename}`);
          if (!r.ok) return null;
          const text = await r.text();
          const data = CarLoader.parseCarFile(text);
          if (!data) return null;
          return { filename, data } as StoreCarEntry;
        } catch (e) {
          console.warn(`Failed to load store car: ${filename}`, e);
          return null;
        }
      });

      const worldResults = await Promise.all(worldPromises);
      const carResults = await Promise.all(carPromises);

      mgr.#worlds = worldResults.filter(Boolean) as StoreWorldEntry[];
      mgr.#cars = carResults.filter(Boolean) as StoreCarEntry[];

      // Auto-select first store world if nothing is active and no editor world
      // exists to fall back to.
      if (
        !localStorage.getItem(SM_ACTIVE_WORLD_KEY) &&
        !mgr.#editorWorld &&
        mgr.#worlds.length > 0
      ) {
        localStorage.setItem(
          SM_ACTIVE_WORLD_KEY,
          `store:${mgr.#worlds[0].filename}`,
        );
      }
    } catch (e) {
      console.warn(
        'StoreManager: failed to load manifest, continuing without store assets',
        e,
      );
    }

    this.instance = mgr;
    return mgr;
  }

  /**
   * Migrate legacy localStorage keys and hydrate user-loaded assets + editor
   * world into memory. Runs once during init().
   */
  #initLocalState(): void {
    // Rename legacy `world` → `editorWorld` (one-time).
    const legacy = localStorage.getItem(SM_LEGACY_WORLD_KEY);
    if (legacy !== null) {
      if (localStorage.getItem(SM_EDITOR_WORLD_KEY) === null) {
        localStorage.setItem(SM_EDITOR_WORLD_KEY, legacy);
      }
      localStorage.removeItem(SM_LEGACY_WORLD_KEY);
    }

    this.#editorWorld = safeJsonParse<object>(
      localStorage.getItem(SM_EDITOR_WORLD_KEY),
    );

    this.#loadedWorlds =
      safeJsonParse<LoadedWorldEntry[]>(
        localStorage.getItem(SM_LOADED_WORLDS_KEY),
      ) ?? [];
    this.#loadedCars =
      safeJsonParse<LoadedCarEntry[]>(
        localStorage.getItem(SM_LOADED_CARS_KEY),
      ) ?? [];
  }

  // --- Getters ---

  getWorlds(): StoreWorldEntry[] {
    return this.#worlds;
  }

  getCars(): StoreCarEntry[] {
    return this.#cars;
  }

  /** User-loaded worlds (insertion order). */
  getLoadedWorlds(): LoadedWorldEntry[] {
    return this.#loadedWorlds;
  }

  /** User-loaded cars (insertion order). */
  getLoadedCars(): LoadedCarEntry[] {
    return this.#loadedCars;
  }

  /** The world saved by the world editor, or null. */
  getEditorWorld(): object | null {
    return this.#editorWorld;
  }

  /**
   * Persist the world editor's current world (in memory + localStorage).
   * Returns false if it could not be persisted (e.g. quota exceeded); the
   * in-memory copy is still updated so the session stays consistent.
   */
  setEditorWorld(data: object): boolean {
    this.#editorWorld = data;
    try {
      localStorage.setItem(SM_EDITOR_WORLD_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(
        'StoreManager: could not save editor world to localStorage (too large).',
        e,
      );
      return false;
    }
  }

  /**
   * All selectable worlds across sources, ordered loaded → editor → store so the
   * user's own files surface first.
   */
  getAllWorlds(): UnifiedWorldEntry[] {
    const out: UnifiedWorldEntry[] = [];

    for (const w of this.#loadedWorlds) {
      out.push({
        id: w.id,
        name: w.name,
        source: 'loaded',
        data: w.data,
        ...smWorldMarkers(w.data),
      });
    }

    if (this.#editorWorld) {
      out.push({
        id: SM_EDITOR_WORLD_ID,
        name: 'Editor World',
        source: 'editor',
        data: this.#editorWorld,
        ...smWorldMarkers(this.#editorWorld),
      });
    }

    for (const w of this.#worlds) {
      out.push({
        id: `store:${w.filename}`,
        name: w.filename,
        source: 'store',
        data: w.data,
        hasStartMarker: w.hasStartMarker,
        hasEndMarker: w.hasEndMarker,
      });
    }

    return out;
  }

  /** All selectable cars across sources, ordered loaded → store. */
  getAllCars(): UnifiedCarEntry[] {
    const out: UnifiedCarEntry[] = [];
    for (const c of this.#loadedCars) {
      out.push({ id: c.id, name: c.name, source: 'loaded', data: c.data });
    }
    for (const c of this.#cars) {
      out.push({
        id: `store:${c.filename}`,
        name: c.filename,
        source: 'store',
        data: c.data,
      });
    }
    return out;
  }

  // --- Active world selection (id-based) ---

  /** Active world id, e.g. `store:circle.world` | `loaded:x` | `editor`. */
  getActiveWorldId(): string | null {
    const raw = localStorage.getItem(SM_ACTIVE_WORLD_KEY);
    return raw ? smNormalizeWorldId(raw) : null;
  }

  setActiveWorldId(id: string): void {
    localStorage.setItem(SM_ACTIVE_WORLD_KEY, id);
  }

  /** Get the currently active world data (parsed JSON object), or null. */
  getActiveWorld(): object | null {
    const id = this.getActiveWorldId();
    if (!id) return null;
    return this.getAllWorlds().find((w) => w.id === id)?.data ?? null;
  }

  /** Name of the active world for display, or null. */
  getActiveWorldName(): string | null {
    const id = this.getActiveWorldId();
    if (!id) return null;
    return this.getAllWorlds().find((w) => w.id === id)?.name ?? null;
  }

  // --- Active car selection (id-based, multi) ---

  /** Active car ids in selection order. */
  getActiveCarIds(): string[] {
    return smReadActiveCarIds();
  }

  setActiveCarIds(ids: string[]): void {
    localStorage.setItem(SM_ACTIVE_CAR_KEY, JSON.stringify(ids));
  }

  /** Toggle a car id in the active set (multi-select). */
  toggleActiveCarId(id: string): void {
    const current = this.getActiveCarIds();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    this.setActiveCarIds(next);
  }

  /** Get all active cars' data (in selection order). */
  getActiveCars(): CarInfo[] {
    const all = this.getAllCars();
    return this.getActiveCarIds()
      .map((id) => all.find((c) => c.id === id)?.data)
      .filter((d): d is CarInfo => Boolean(d));
  }

  /** Get the first active car's data, or null. */
  getActiveCar(): CarInfo | null {
    return this.getActiveCars()[0] ?? null;
  }

  /** Names of the active cars for display (in selection order). */
  getActiveCarNames(): string[] {
    const all = this.getAllCars();
    return this.getActiveCarIds()
      .map((id) => all.find((c) => c.id === id)?.name)
      .filter((n): n is string => Boolean(n));
  }

  // --- Loaded asset management ---

  /**
   * Add a user-loaded world. Persists to localStorage when it fits; on quota
   * overflow keeps it in memory only (lost on refresh). Returns the new entry.
   */
  addLoadedWorld(name: string, data: object): UnifiedWorldEntry {
    const entry: LoadedWorldEntry = {
      id: `loaded:${smGenId()}`,
      name,
      data,
    };
    this.#loadedWorlds.push(entry);
    smPersist(SM_LOADED_WORLDS_KEY, this.#loadedWorlds, name);
    return {
      id: entry.id,
      name: entry.name,
      source: 'loaded',
      data: entry.data,
      ...smWorldMarkers(entry.data),
    };
  }

  /**
   * Add a user-loaded car. Persists to localStorage when it fits; on quota
   * overflow keeps it in memory only (lost on refresh). Returns the new entry.
   */
  addLoadedCar(name: string, data: CarInfo): UnifiedCarEntry {
    const entry: LoadedCarEntry = {
      id: `loaded:${smGenId()}`,
      name,
      data,
    };
    this.#loadedCars.push(entry);
    smPersist(SM_LOADED_CARS_KEY, this.#loadedCars, name);
    return {
      id: entry.id,
      name: entry.name,
      source: 'loaded',
      data: entry.data,
    };
  }

  // --- localStorage state management ---

  getLocalStorageStates(): LocalStorageEntry[] {
    const entries: LocalStorageEntry[] = [];
    for (const key of SM_TRACKED_LS_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        entries.push({
          key,
          size: value.length,
          count: smCountItems(key, value),
        });
      }
    }
    return entries;
  }

  /** Number of tracked localStorage keys. */
  static getTrackedKeyCount(): number {
    return SM_TRACKED_LS_KEYS.length;
  }

  /**
   * Item count for array-backed tracked keys (bestPool, raceCars, loadedWorlds,
   * loadedCars). Returns null for non-array keys (e.g. 'editorWorld') or
   * unparseable values.
   */
  deleteLocalStorageKey(key: string): void {
    if (SM_TRACKED_LS_KEYS.includes(key)) {
      localStorage.removeItem(key);
    }
  }

  exportLocalStorageKey(key: string): void {
    const value = localStorage.getItem(key);
    if (value === null) return;

    const blob = new Blob([value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Static convenience methods (require init() to have been called) ---

  /** The initialized singleton instance, or null if init() has not run. */
  static getInstance(): StoreManager | null {
    return this.instance;
  }

  /** Get the active world (static convenience). Returns null if not initialized or no active world. */
  static getActiveWorld(): object | null {
    return this.instance?.getActiveWorld() ?? null;
  }

  /** Get the world saved by the world editor (static convenience). */
  static getEditorWorld(): object | null {
    return this.instance?.getEditorWorld() ?? null;
  }

  /** Get the active world's display name (static convenience). */
  static getActiveWorldName(): string | null {
    return this.instance?.getActiveWorldName() ?? null;
  }

  /** Get the active cars' display names (static convenience). */
  static getActiveCarNames(): string[] {
    return this.instance?.getActiveCarNames() ?? [];
  }

  /** Get all stored cars (static convenience). Returns [] if not initialized. */
  static getCars(): StoreCarEntry[] {
    return this.instance?.getCars() ?? [];
  }

  /** Get the active car (static convenience). Returns null if not initialized or no active car. */
  static getActiveCar(): CarInfo | null {
    return this.instance?.getActiveCar() ?? null;
  }

  /** Get all active cars (static convenience). Returns [] if not initialized. */
  static getActiveCars(): CarInfo[] {
    return this.instance?.getActiveCars() ?? [];
  }

  /** Get all selectable worlds across sources (static convenience). */
  static getAllWorlds(): UnifiedWorldEntry[] {
    return this.instance?.getAllWorlds() ?? [];
  }

  /** Get all selectable cars across sources (static convenience). */
  static getAllCars(): UnifiedCarEntry[] {
    return this.instance?.getAllCars() ?? [];
  }

  /** Get the active world id (static convenience). */
  static getActiveWorldId(): string | null {
    return this.instance?.getActiveWorldId() ?? null;
  }

  /** Get the active car ids (static convenience). */
  static getActiveCarIds(): string[] {
    return this.instance?.getActiveCarIds() ?? [];
  }
}
