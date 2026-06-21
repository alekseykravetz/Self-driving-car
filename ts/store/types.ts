interface StoreManifest {
  worlds: string[];
  cars: string[];
}

interface StoreWorldEntry {
  filename: string;
  data: object;
  hasStartMarker: boolean;
  hasEndMarker: boolean;
}

interface StoreCarEntry {
  filename: string;
  data: CarInfo;
}

interface LocalStorageEntry {
  key: string;
  size: number;
  count: number | null;
}

/** Origin of a world/car asset shown in the selectors. */
type AssetSource = 'store' | 'loaded' | 'editor';

/** A world file loaded by the user (persisted to localStorage when it fits). */
interface LoadedWorldEntry {
  /** Full asset id, e.g. `loaded:abc123`. */
  id: string;
  name: string;
  data: object;
}

/** A car file loaded by the user (persisted to localStorage when it fits). */
interface LoadedCarEntry {
  /** Full asset id, e.g. `loaded:abc123`. */
  id: string;
  name: string;
  data: CarInfo;
}

/** A world entry from any source, ready for the selector list. */
interface UnifiedWorldEntry {
  /** Full asset id: `store:<file>` | `loaded:<id>` | `editor`. */
  id: string;
  name: string;
  source: AssetSource;
  data: object;
  hasStartMarker: boolean;
  hasEndMarker: boolean;
}

/** A car entry from any source, ready for the selector list. */
interface UnifiedCarEntry {
  /** Full asset id: `store:<file>` | `loaded:<id>`. */
  id: string;
  name: string;
  source: AssetSource;
  data: CarInfo;
}
