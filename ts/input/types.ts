/**
 * Shared input/toolbar types.
 *
 * These interfaces are the neutral contract between the {@link KeyboardManager}
 * (which owns key routing) and the presentational `<shortcuts-toolbar>` element
 * (which visualizes shortcut state). They live here so neither module has to
 * import the other, breaking the input ↔ ui type-level cycle.
 */

/**
 * Visual definition of a single shortcut indicator rendered by the toolbar.
 */
export interface ShortcutDef {
  /** DOM id for the indicator element (e.g. 'keyO', 'keyCtrl'). */
  id: string;
  /** Short text drawn inside the key cap (e.g. 'O', 'Ctrl', '↑'). */
  label: string;
  /** Tooltip describing what the shortcut does. */
  title: string;
  /** Group label the indicator is filed under (e.g. 'Graph', 'View'). */
  group: string;
  /** Whether the shortcut is a one-shot action, a sticky mode toggle, or an informational display-only key. */
  kind: 'momentary' | 'toggle' | 'display';
  /**
   * When true, the toolbar lights this indicator from `keys` while the
   * matching physical key is held. Used for informational keys (Ctrl, driving)
   * whose behavior lives elsewhere.
   */
  display?: boolean;
  /** Physical KeyboardEvent.key values (case-insensitive) for display keys. */
  keys?: string[];
}

/**
 * Interface that {@link KeyboardManager} uses to update the toolbar's visual
 * state. Decouples the key router from the concrete `<shortcuts-toolbar>`
 * element implementation.
 */
export interface ToolbarUpdater {
  flash(key: string): void;
  setActive(key: string, active: boolean): void;
  setShortcuts(defs: ShortcutDef[]): void;
  setToggleHandler(handler: (id: string) => void): void;
}
