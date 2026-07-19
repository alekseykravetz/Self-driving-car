import { SHORTCUTS_TOOLBAR_TEMPLATE } from './shortcutsToolbarTemplate.js';
export class ShortcutsToolbarElement extends HTMLElement {
    #onToggle = null;
    constructor() {
        super();
        this.id = 'shortcutsToolbar';
    }
    connectedCallback() {
        this.innerHTML = ShortcutsToolbarElement.template;
    }
    /**
     * Render the indicators for this page. Definitions are grouped by `group`
     * (separated by a vertical rule) and laid out in declaration order.
     */
    setShortcuts(defs) {
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
            .map((g) => `
        <div class="controls-group">
          <span class="controls-group-label">${g.name}</span>
          <div class="shortcuts-keys">
            ${g.defs.map((d) => this.#indicatorHtml(d)).join('')}
          </div>
        </div>`)
            .join('<div class="controls-separator"></div>');
        const container = this.querySelector('.shortcuts-groups');
        if (container)
            container.innerHTML = html;
        this.querySelectorAll('.key-indicator.clickable').forEach((el) => {
            el.addEventListener('click', () => {
                this.#onToggle?.(el.id);
            });
        });
    }
    #indicatorHtml(def) {
        const clickable = def.kind === 'toggle' ? ' clickable' : '';
        return `<span class="key-indicator${clickable}" id="${def.id}" data-tooltip="${def.title}">${def.label}</span>`;
    }
    /** Briefly highlight an indicator to acknowledge a one-shot action. */
    flash(id) {
        const el = document.getElementById(id);
        if (!el)
            return;
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 300);
    }
    /** Set the lit (active) state of an indicator. */
    setActive(id, active) {
        const el = document.getElementById(id);
        if (el)
            el.classList.toggle('active', active);
    }
    /**
     * Register a handler called with the indicator id when a toggle indicator
     * is clicked. Used by {@link KeyboardManager} to implement click-to-latch.
     */
    setToggleHandler(handler) {
        this.#onToggle = handler;
    }
    static template = SHORTCUTS_TOOLBAR_TEMPLATE;
}
customElements.define('shortcuts-toolbar', ShortcutsToolbarElement);
