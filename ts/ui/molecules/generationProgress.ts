/**
 * <generation-progress> — a full-screen modal overlay shown while the world
 * editor generates geometry for a large OSM import or a "Regenerate items"
 * action. It blocks interaction and displays a stage label plus a determinate
 * progress bar, driven by {@link GenerationProgress} updates emitted from the
 * cooperative time-sliced generator.
 *
 * The element owns no generation logic — it only reflects progress state.
 */
import type { GenerationProgress } from '../../world/generation/generationProgress.js';

export class GenerationProgressElement extends HTMLElement {
  #bar: HTMLElement | null = null;
  #label: HTMLElement | null = null;
  #pct: HTMLElement | null = null;
  #title: HTMLElement | null = null;

  connectedCallback(): void {
    this.innerHTML = `
      <div class="gen-progress-overlay" role="status" aria-live="polite">
        <div class="gen-progress-dialog">
          <div class="gen-progress-title">Generating world…</div>
          <div class="gen-progress-label"></div>
          <div class="gen-progress-track">
            <div class="gen-progress-bar"></div>
          </div>
          <div class="gen-progress-pct">0%</div>
        </div>
      </div>`;
    this.#title = this.querySelector('.gen-progress-title');
    this.#label = this.querySelector('.gen-progress-label');
    this.#bar = this.querySelector('.gen-progress-bar');
    this.#pct = this.querySelector('.gen-progress-pct');
    this.hidden = true;
  }

  /** Reveal the overlay and reset it to 0%. */
  start(title = 'Generating world…'): void {
    if (this.#title) this.#title.textContent = title;
    this.update({ stage: 'roads', label: 'Preparing…', fraction: 0 });
    this.hidden = false;
  }

  /** Reflect a progress update on the bar and labels. */
  update(progress: GenerationProgress): void {
    const pct = Math.round(Math.max(0, Math.min(1, progress.fraction)) * 100);
    if (this.#bar) this.#bar.style.width = `${pct}%`;
    if (this.#pct) this.#pct.textContent = `${pct}%`;
    if (this.#label) this.#label.textContent = progress.label;
  }

  /** Hide the overlay. */
  finish(): void {
    this.hidden = true;
  }
}

customElements.define('generation-progress', GenerationProgressElement);
