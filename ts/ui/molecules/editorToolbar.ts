import type { EditorType } from '../../simulator/types.js';
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

  setModeChangeListener(listener: (mode: EditorType) => void): void {
    this.#onModeChange = listener;
  }

  static readonly template = EDITOR_TOOLBAR_TEMPLATE;
}

customElements.define('editor-toolbar', EditorToolbarElement);
