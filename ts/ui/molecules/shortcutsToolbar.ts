import type { ShortcutDef, ToolbarUpdater } from '../../input/types.js';
import { SHORTCUTS_TOOLBAR_TEMPLATE } from './shortcutsToolbarTemplate.js';

/**
 * <shortcuts-toolbar> — a reusable, floating toolbar that visualizes the
 * keyboard shortcuts available on the current page. It sits inside the shared
 * `#simulatorToolbar` flex container alongside the other toolbar panels.
 *
 * The toolbar itself is purely presentational. It does NOT register any
 * keyboard listeners — the {@link KeyboardManager} owns all key routing and
 * calls `flash()` / `setActive()` on this element to reflect key state.
 *
 * Two kinds of indicators:
 * - `momentary` — a one-shot action key (e.g. S / E / C in the graph editor).
 *   Purely visual: the owner calls `flash(id)` when the key fires.
 * - `toggle` — a sticky mode key (e.g. O one-way, R reverse heading). The
 *   indicator is clickable to latch the mode permanently. The owner reflects
 *   the effective state (latched OR key-held) via `setActive(id, active)`.
 *
 * Indicators flagged `display: true` are lit by the KeyboardManager from
 * the physical keys in `keys` (e.g. Ctrl for zoom, the driving keys). These
 * are informational only and never change page behavior.
 */
export class ShortcutsToolbarElement
  extends HTMLElement
  implements ToolbarUpdater
{
  #onToggle: ((id: string) => void) | null = null;

  constructor() {
    super();
    this.id = 'shortcutsToolbar';
  }

  connectedCallback(): void {
    this.innerHTML = ShortcutsToolbarElement.template;
  }

  /**
   * Render the indicators for this page. Definitions are grouped by `group`
   * (separated by a vertical rule) and laid out in declaration order.
   */
  setShortcuts(defs: ShortcutDef[]): void {
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

    this.querySelectorAll<HTMLElement>('.key-indicator.clickable').forEach(
      (el) => {
        el.addEventListener('click', () => {
          this.#onToggle?.(el.id);
        });
      },
    );
  }

  #indicatorHtml(def: ShortcutDef): string {
    const clickable = def.kind === 'toggle' ? ' clickable' : '';
    return `<span class="key-indicator${clickable}" id="${def.id}" data-tooltip="${def.title}">${def.label}</span>`;
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

  /**
   * Register a handler called with the indicator id when a toggle indicator
   * is clicked. Used by {@link KeyboardManager} to implement click-to-latch.
   */
  setToggleHandler(handler: (id: string) => void): void {
    this.#onToggle = handler;
  }

  static readonly template = SHORTCUTS_TOOLBAR_TEMPLATE;
}

customElements.define('shortcuts-toolbar', ShortcutsToolbarElement);
