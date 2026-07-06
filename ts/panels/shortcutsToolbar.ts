import { SHORTCUTS_TOOLBAR_TEMPLATE } from './templates/shortcutsToolbarTemplate.js';

/**
 * <shortcuts-toolbar> — a reusable, floating toolbar that visualizes the
 * keyboard shortcuts available on the current page. It sits inside the shared
 * `#simulatorToolbar` flex container alongside the other toolbar panels.
 *
 * Two kinds of indicators:
 * - `momentary` — a one-shot action key (e.g. S / E / C in the graph editor).
 *   Purely visual: the owner calls `flash(id)` when the key fires.
 * - `toggle` — a sticky mode key (e.g. O one-way, R reverse heading). The
 *   indicator is clickable to latch the mode permanently; the owner reflects
 *   the effective state (latched OR key-held) via `setActive(id, active)` and
 *   reacts to clicks via `setClickListener`.
 *
 * Indicators flagged `display: true` are lit by the toolbar itself from the
 * physical keys in `keys` (e.g. Ctrl for zoom, the driving keys). These are
 * informational only and never change page behavior.
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
  /** Whether the shortcut is a one-shot action or a sticky mode toggle. */
  kind: 'momentary' | 'toggle';
  /**
   * When true, the toolbar lights this indicator itself from `keys` while the
   * matching physical key is held. Used for informational keys (Ctrl, driving)
   * whose behavior lives elsewhere.
   */
  display?: boolean;
  /** Physical KeyboardEvent.key values (case-insensitive) for display keys. */
  keys?: string[];
}

export class ShortcutsToolbarElement extends HTMLElement {
  #onClick: ((id: string) => void) | null = null;
  #displayDefs: ShortcutDef[] = [];
  #boundKeyDown: (e: KeyboardEvent) => void;
  #boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    super();
    this.id = 'shortcutsToolbar';
    this.#boundKeyDown = (e) => this.#handleDisplayKey(e, true);
    this.#boundKeyUp = (e) => this.#handleDisplayKey(e, false);
  }

  connectedCallback(): void {
    this.innerHTML = ShortcutsToolbarElement.template;
    window.addEventListener('keydown', this.#boundKeyDown);
    window.addEventListener('keyup', this.#boundKeyUp);
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', this.#boundKeyDown);
    window.removeEventListener('keyup', this.#boundKeyUp);
  }

  /**
   * Render the indicators for this page. Definitions are grouped by `group`
   * (separated by a vertical rule) and laid out in declaration order.
   */
  setShortcuts(defs: ShortcutDef[]): void {
    this.#displayDefs = defs.filter((d) => d.display && d.keys?.length);

    const groups: { name: string; defs: ShortcutDef[] }[] = [];
    for (const def of defs) {
      let group = groups.find((g) => g.name === def.group);
      if (!group) {
        group = { name: def.group, defs: [] };
        groups.push(group);
      }
      group.defs.push(def);
    }

    const html = groups
      .map(
        (g) => `
        <div class="controls-group">
          <span class="controls-group-label">${g.name}</span>
          <div class="shortcuts-keys">
            ${g.defs.map((d) => this.#indicatorHtml(d)).join('')}
          </div>
        </div>`,
      )
      .join('<div class="controls-separator"></div>');

    const container = this.querySelector('.shortcuts-groups');
    if (container) container.innerHTML = html;

    // Wire click-to-latch on the toggle indicators.
    this.querySelectorAll<HTMLElement>('.key-indicator.clickable').forEach(
      (el) => {
        el.addEventListener('click', () => {
          if (this.#onClick) this.#onClick(el.id);
        });
      },
    );
  }

  #indicatorHtml(def: ShortcutDef): string {
    const clickable = def.kind === 'toggle' ? ' clickable' : '';
    return `<span class="key-indicator${clickable}" id="${def.id}" title="${def.title}">${def.label}</span>`;
  }

  /** Briefly highlight an indicator to acknowledge a one-shot action. */
  flash(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 300);
  }

  /** Set the lit (active) state of an indicator. */
  setActive(id: string, active: boolean): void {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', active);
  }

  /** Register a handler called with the indicator id when a toggle is clicked. */
  setClickListener(listener: (id: string) => void): void {
    this.#onClick = listener;
  }

  #handleDisplayKey(e: KeyboardEvent, down: boolean): void {
    const key = e.key.toLowerCase();
    for (const def of this.#displayDefs) {
      if (def.keys!.some((k) => k.toLowerCase() === key)) {
        this.setActive(def.id, down);
      }
    }
  }

  static readonly template = SHORTCUTS_TOOLBAR_TEMPLATE;
}

customElements.define('shortcuts-toolbar', ShortcutsToolbarElement);
