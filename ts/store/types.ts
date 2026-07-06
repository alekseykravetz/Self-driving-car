import { CarInfo } from '../car/car.js';

export interface StoreManifest {
  worlds: string[];
  cars: string[];
}

export interface StoreWorldEntry {
  filename: string;
  data: object;
  hasStartMarker: boolean;
  hasEndMarker: boolean;
}

export interface StoreCarEntry {
  filename: string;
  data: CarInfo;
}

export interface LocalStorageEntry {
  key: string;
  size: number;
  count: number | null;
}

/** Origin of a world/car asset shown in the selectors. */
export type AssetSource = 'store' | 'loaded' | 'editor';

/** A world file loaded by the user (persisted to localStorage when it fits). */
export interface LoadedWorldEntry {
  /** Full asset id, e.g. `loaded:abc123`. */
  id: string;
  name: string;
  data: object;
}

/** A car file loaded by the user (persisted to localStorage when it fits). */
export interface LoadedCarEntry {
  /** Full asset id, e.g. `loaded:abc123`. */
  id: string;
  name: string;
  data: CarInfo;
}

/** A world entry from any source, ready for the selector list. */
export interface UnifiedWorldEntry {
  /** Full asset id: `store:<file>` | `loaded:<id>` | `editor`. */
  id: string;
  name: string;
  source: AssetSource;
  data: object;
  hasStartMarker: boolean;
  hasEndMarker: boolean;
}

/** A car entry from any source, ready for the selector list. */
export interface UnifiedCarEntry {
  /** Full asset id: `store:<file>` | `loaded:<id>`. */
  id: string;
  name: string;
  source: AssetSource;
  data: CarInfo;
}
