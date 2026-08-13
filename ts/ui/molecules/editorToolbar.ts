import type { EditorType } from '../../world/types.js';
import { makeToolbarCollapsible } from '../atoms/collapsibleToolbar.js';
import { EDITOR_TOOLBAR_TEMPLATE } from './editorToolbarTemplate.js';

export class EditorToolbarElement extends HTMLElement {
  #onModeChange: ((mode: EditorType) => void) | null = null;

  constructor() {
    super();
    this.id = 'editorToolbar';
  }

  connectedCallback(): void {
    this.innerHTML = EditorToolbarElement.template;
    this.querySelectorAll<HTMLButtonElement>('.editor-mode-btn').forEach(
      (btn) => {
        btn.addEventListener('click', () => {
          this.#setActiveMode(btn.dataset.mode as EditorType);
        });
      },
    );
    makeToolbarCollapsible(this, 'Editor');
  }

  #setActiveMode(mode: EditorType): void {
    this.querySelectorAll<HTMLButtonElement>('.editor-mode-btn').forEach(
      (btn) => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      },
    );
    this.#onModeChange?.(mode);
  }

  setMode(mode: EditorType): void {
    this.#setActiveMode(mode);
  }

  /**
   * Highlight the active-mode button WITHOUT firing the mode-change listener.
   * Used when the mode is switched from elsewhere (e.g. a keyboard shortcut)
   * so the toolbar reflects state without re-triggering the switch.
   */
  highlightMode(mode: EditorType): void {
    this.querySelectorAll<HTMLButtonElement>('.editor-mode-btn').forEach(
      (btn) => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      },
    );
  }

  setModeChangeListener(listener: (mode: EditorType) => void): void {
    this.#onModeChange = listener;
  }

  static readonly template = EDITOR_TOOLBAR_TEMPLATE;
}

customElements.define('editor-toolbar', EditorToolbarElement);
