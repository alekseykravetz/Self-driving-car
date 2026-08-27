import { PreviewSimulatorEngine } from '../../landing/previewSimulatorEngine.js';

/** Canvas lifecycle shell for the landing-page preview simulation. */
export class PreviewSimulatorElement extends HTMLElement {
  #engine!: PreviewSimulatorEngine;
  #resizeObserver: ResizeObserver | null = null;

  connectedCallback(): void {
    const canvas = document.createElement('canvas');
    canvas.className = 'preview-sim-canvas';
    this.appendChild(canvas);
    this.#engine = new PreviewSimulatorEngine({
      canvas,
      paused: new URLSearchParams(window.location.search).has('paused'),
    });

    this.#resizeObserver = new ResizeObserver(() => this.#engine.resize());
    this.#resizeObserver.observe(this);
    this.#engine.resize();
  }

  disconnectedCallback(): void {
    this.#engine.deactivate();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  activate(): Promise<void> {
    return this.#engine.activate();
  }

  deactivate(): void {
    this.#engine.deactivate();
  }
}

customElements.define('preview-simulator', PreviewSimulatorElement);
