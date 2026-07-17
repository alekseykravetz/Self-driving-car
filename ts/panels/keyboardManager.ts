import { ShortcutsToolbarElement, ShortcutDef } from './shortcutsToolbar.js';
import { LatchedToggle } from './latchedToggle.js';

/**
 * A binding extends the visual {@link ShortcutDef} with the physical key
 * that triggers it and optional behavioural callbacks.
 */
export interface ShortcutBinding extends ShortcutDef {
  /**
   * The physical KeyboardEvent.key value (case-insensitive, store lower-case).
   * Required for `momentary` and `toggle` bindings; ignored for `display`.
   */
  key: string;
  /** Handler for a one-shot momentary action. */
  handler?: {
    onKeyDown: () => void;
  };
  /** Handlers for a toggle (held-or-latched) action. */
  toggle?: {
    onActivate: () => void;
    onDeactivate: () => void;
  };
  /**
   * When true, the toggle uses press-to-toggle (latch) behavior:
   * each keydown calls toggleLatch(), keyup is a no-op.
   * When false (default), uses held/latched behavior:
   * keydown sets physical hold, keyup releases it.
   */
  latchOnly?: boolean;
}

/**
 * KeyboardManager — central orchestrator for all keyboard shortcuts.
 *
 * Owns a single pair of `window` keydown/keyup listeners and routes events
 * to the matching bindings. Manages held/latched toggles via {@link LatchedToggle}
 * and automatically syncs the {@link ShortcutsToolbarElement} (flash for momentary,
 * setActive for toggles and display keys).
 *
 * Usage:
 * ```ts
 * const km = new KeyboardManager(toolbarElement);
 * km.setBindings([...rootBindings]);      // always-active shortcuts
 * km.pushBindings([...editorBindings]);   // context-specific (editor enabled)
 * km.popBindings();                       // context removed (editor disabled)
 * km.dispose();                           // teardown
 * ```
 */
export class KeyboardManager {
  #toolbar: ShortcutsToolbarElement;
  #rootBindings: ShortcutBinding[] = [];
  #pushedBindings: ShortcutBinding[] = [];
  #allBindings: ShortcutBinding[] = [];
  #toggleState: Map<string, LatchedToggle> = new Map();
  #boundKeyDown: (e: KeyboardEvent) => void;
  #boundKeyUp: (e: KeyboardEvent) => void;

  constructor(toolbar: ShortcutsToolbarElement) {
    this.#toolbar = toolbar;
    this.#boundKeyDown = this.#handleKeyDown.bind(this);
    this.#boundKeyUp = this.#handleKeyUp.bind(this);
    window.addEventListener('keydown', this.#boundKeyDown);
    window.addEventListener('keyup', this.#boundKeyUp);
  }

  /**
   * Set the root (always-active) bindings. Replaces any previous root set.
   * The toolbar is re-rendered from the combined root + pushed bindings.
   */
  setBindings(bindings: ShortcutBinding[]): void {
    this.#rootBindings = [...bindings];
    this.#rebuild();
  }

  /**
   * Push additional bindings (e.g. when an editor is enabled).
   * Replaces any previously pushed bindings — there is at most one pushed set.
   */
  pushBindings(bindings: ShortcutBinding[]): void {
    this.#pushedBindings = [...bindings];
    this.#rebuild();
  }

  /**
   * Pop the pushed bindings, restoring the root-only set.
   */
  popBindings(): void {
    this.#pushedBindings = [];
    this.#rebuild();
  }

  /**
   * Programmatically set a toggle binding's active state.
   * No-op if the toggle is already in the desired state.
   */
  setToggleActive(id: string, active: boolean): void {
    const toggle = this.#toggleState.get(id);
    if (!toggle) return;
    if (toggle.active !== active) {
      toggle.toggleLatch();
    }
  }

  /**
   * Tear down: remove all window listeners and clear state.
   */
  dispose(): void {
    window.removeEventListener('keydown', this.#boundKeyDown);
    window.removeEventListener('keyup', this.#boundKeyUp);
    this.#toggleState.clear();
    this.#rootBindings = [];
    this.#pushedBindings = [];
    this.#allBindings = [];
    this.#toolbar.setShortcuts([]);
  }

  // ── Internals ─────────────────────────────────────

  #rebuild(): void {
    this.#toggleState.clear();
    this.#allBindings = [...this.#rootBindings, ...this.#pushedBindings];

    // Render the visual toolbar from the ShortcutDef fields.
    const defs: ShortcutDef[] = this.#allBindings.map((b) => ({
      id: b.id,
      label: b.label,
      title: b.title,
      group: b.group,
      kind: b.kind ?? 'momentary',
      display: b.display ?? b.kind === 'display',
      keys: b.keys,
    }));
    this.#toolbar.setShortcuts(defs);

    // Initialise a LatchedToggle for every toggle binding.
    for (const b of this.#allBindings) {
      if (b.kind === 'toggle') {
        const toggle = new LatchedToggle();
        const id = b.id;
        toggle.setOnChange((active) => {
          this.#toolbar.setActive(id, active);
          if (active) b.toggle?.onActivate?.();
          else b.toggle?.onDeactivate?.();
        });
        this.#toggleState.set(id, toggle);
      }
    }

    // Wire click-to-latch on toggle indicators.
    this.#toolbar.setToggleHandler((id) => {
      this.#toggleState.get(id)?.toggleLatch();
    });
  }

  #handleKeyDown(e: KeyboardEvent): void {
    if (this.#shouldIgnore(e)) return;
    const key = e.key.toLowerCase();
    for (const b of this.#allBindings) {
      if (b.kind === 'display') {
        // Display keys light up while the physical key is held.
        if (b.keys?.some((k) => k.toLowerCase() === key)) {
          this.#toolbar.setActive(b.id, true);
        }
      } else if (b.key === key) {
        if (b.kind === 'momentary') {
          b.handler?.onKeyDown();
          this.#toolbar.flash(b.id);
        } else if (b.kind === 'toggle') {
          if (b.latchOnly) {
            this.#toggleState.get(b.id)?.toggleLatch();
          } else {
            this.#toggleState.get(b.id)?.setPhysicalHold(true);
          }
        }
      }
    }
  }

  #handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    for (const b of this.#allBindings) {
      if (b.kind === 'display') {
        if (b.keys?.some((k) => k.toLowerCase() === key)) {
          this.#toolbar.setActive(b.id, false);
        }
      } else if (b.kind === 'toggle' && b.key === key) {
        if (!b.latchOnly) {
          this.#toggleState.get(b.id)?.setPhysicalHold(false);
        }
      }
    }
  }

  /** Skip events when the user is typing into an input / textarea. */
  #shouldIgnore(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    return !!(
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable
    );
  }
}
