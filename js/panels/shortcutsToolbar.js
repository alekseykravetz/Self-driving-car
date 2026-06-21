'use strict';
class ShortcutsToolbarElement extends HTMLElement {
  #onClick = null;
  #displayDefs = [];
  #boundKeyDown;
  #boundKeyUp;
  constructor() {
    super();
    this.id = 'shortcutsToolbar';
    this.#boundKeyDown = (e) => this.#handleDisplayKey(e, true);
    this.#boundKeyUp = (e) => this.#handleDisplayKey(e, false);
  }

  connectedCallback() {
    this.innerHTML = ShortcutsToolbarElement.template;
    window.addEventListener('keydown', this.#boundKeyDown);
    window.addEventListener('keyup', this.#boundKeyUp);
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.#boundKeyDown);
    window.removeEventListener('keyup', this.#boundKeyUp);
  }

  /**
   * Render the indicators for this page. Definitions are grouped by `group`
   * (separated by a vertical rule) and laid out in declaration order.
   */
  setShortcuts(defs) {
    this.#displayDefs = defs.filter((d) => d.display && d.keys?.length);
    const groups = [];
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
    this.querySelectorAll('.key-indicator.clickable').forEach((el) => {
      el.addEventListener('click', () => {
        if (this.#onClick) this.#onClick(el.id);
      });
    });
  }

  #indicatorHtml(def) {
    const clickable = def.kind === 'toggle' ? ' clickable' : '';
    return `<span class="key-indicator${clickable}" id="${def.id}" title="${def.title}">${def.label}</span>`;
  }

  /** Briefly highlight an indicator to acknowledge a one-shot action. */
  flash(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 300);
  }

  /** Set the lit (active) state of an indicator. */
  setActive(id, active) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', active);
  }

  /** Register a handler called with the indicator id when a toggle is clicked. */
  setClickListener(listener) {
    this.#onClick = listener;
  }

  #handleDisplayKey(e, down) {
    const key = e.key.toLowerCase();
    for (const def of this.#displayDefs) {
      if (def.keys.some((k) => k.toLowerCase() === key)) {
        this.setActive(def.id, down);
      }
    }
  }

  static template = SHORTCUTS_TOOLBAR_TEMPLATE;
}
customElements.define('shortcuts-toolbar', ShortcutsToolbarElement);
