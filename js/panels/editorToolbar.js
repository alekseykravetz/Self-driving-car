import { EDITOR_TOOLBAR_TEMPLATE } from './templates/editorToolbarTemplate.js';
export class EditorToolbarElement extends HTMLElement {
    #onModeChange = null;
    constructor() {
        super();
        this.id = 'editorToolbar';
    }
    connectedCallback() {
        this.innerHTML = EditorToolbarElement.template;
        this.querySelectorAll('.editor-mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.#setActiveMode(btn.dataset.mode);
            });
        });
    }
    #setActiveMode(mode) {
        this.querySelectorAll('.editor-mode-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        this.#onModeChange?.(mode);
    }
    setMode(mode) {
        this.#setActiveMode(mode);
    }
    setModeChangeListener(listener) {
        this.#onModeChange = listener;
    }
    static template = EDITOR_TOOLBAR_TEMPLATE;
}
customElements.define('editor-toolbar', EditorToolbarElement);
