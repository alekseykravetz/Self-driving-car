import { ANIMATION_LOOP_TOOLBAR_TEMPLATE } from './animationLoopToolbarTemplate.js';
import { formatElapsedTime } from '../../math/worldUnits.js';

/**
 * <animation-loop-toolbar> — floating toolbar that manages the simulator
 * animation loop. It owns the play/pause toggle (shared across every
 * SimulatorShell page) and the render-interval throttle read each frame by
 * `SimulatorShell.animate()`.
 */
export class AnimationLoopToolbarElement extends HTMLElement {
  #_paused: boolean = false;

  #pauseBtn: HTMLButtonElement | null = null;
  #timeDisplay: HTMLElement | null = null;
  #resetTimeBtn: HTMLButtonElement | null = null;
  #fpsDisplay: HTMLElement | null = null;

  #elapsedFrames: number = 0;
  #renderedFrames: number = 0;
  #lastFpsUpdate: number = 0;
  #currentFps: number = 0;

  #cachedRenderInterval: number = 1;

  constructor() {
    super();
    this.id = 'animationLoopToolbar';
  }

  connectedCallback(): void {
    this.innerHTML = AnimationLoopToolbarElement.template;
    this.#pauseBtn = this.querySelector('#loopPauseBtn');
    this.#pauseBtn?.addEventListener('click', () => this.togglePause());

    this.#timeDisplay = this.querySelector('#elapsedTimeDisplay');
    this.#resetTimeBtn = this.querySelector('#resetTimeBtn');
    this.#resetTimeBtn?.addEventListener('click', () => this.resetTime());

    this.#fpsDisplay = this.querySelector('#fpsDisplay');
    this.#lastFpsUpdate = performance.now();

    this.#updateTimeDisplay();
    this.#updateFpsDisplay();

    const intervalInput = this.querySelector(
      '#renderInterval',
    ) as HTMLInputElement | null;
    if (intervalInput) {
      this.#cachedRenderInterval = this.#clampInterval(intervalInput.value);
      intervalInput.addEventListener('change', () => {
        this.#cachedRenderInterval = this.#clampInterval(intervalInput.value);
      });
    }
  }

  /** Whether the simulation step is currently paused. */
  get paused(): boolean {
    return this.#_paused;
  }

  /**
   * How many animation frames pass per rendered frame. Physics always runs at
   * full rate; only the (heavier) draw pass is throttled by this value.
   * Clamped to [1, 10]; 1 = draw every frame.
   */
  get renderInterval(): number {
    return this.#cachedRenderInterval;
  }

  #clampInterval(value: string): number {
    const v = Math.round(Number(value));
    return Number.isFinite(v) ? Math.min(10, Math.max(1, v)) : 1;
  }

  /** Record one animation frame. Called by SimulatorShell.animate(). */
  recordFrame(isRenderFrame: boolean = false): void {
    if (!this.#_paused) {
      this.#elapsedFrames++;
      this.#updateTimeDisplay();
    }
    if (isRenderFrame) {
      this.#renderedFrames++;
      this.#updateFpsCounter();
    }
  }

  /** Get the total elapsed simulation frames. */
  get elapsedTime(): number {
    return this.#elapsedFrames;
  }

  /** Reset the elapsed time counter to zero. */
  resetTime(): void {
    this.#elapsedFrames = 0;
    this.#updateTimeDisplay();
  }

  /** Update the time display element with the current elapsed time. */
  #updateTimeDisplay(): void {
    if (this.#timeDisplay) {
      this.#timeDisplay.textContent = formatElapsedTime(this.#elapsedFrames);
    }
  }

  /** Update FPS counter once per second. */
  #updateFpsCounter(): void {
    const now = performance.now();
    const elapsed = now - this.#lastFpsUpdate;

    if (elapsed >= 1000) {
      this.#currentFps = Math.round((this.#renderedFrames * 1000) / elapsed);
      this.#renderedFrames = 0;
      this.#lastFpsUpdate = now;
      this.#updateFpsDisplay();
    }
  }

  /** Update the FPS display element. */
  #updateFpsDisplay(): void {
    if (this.#fpsDisplay) {
      this.#fpsDisplay.textContent = `${this.#currentFps} fps`;
    }
  }

  /** Toggle (or force) the paused state, syncing the button glyph. */
  togglePause(forceState?: boolean): void {
    this.#_paused = forceState !== undefined ? forceState : !this.#_paused;
    if (this.#pauseBtn) {
      this.#pauseBtn.textContent = this.#_paused ? '▶️' : '⏸️';
      this.#pauseBtn.classList.toggle('active', !this.#_paused);
    }
  }

  /** Programmatically set the paused state. */
  setPaused(paused: boolean): void {
    this.togglePause(paused);
  }

  static readonly template = ANIMATION_LOOP_TOOLBAR_TEMPLATE;
}

customElements.define('animation-loop-toolbar', AnimationLoopToolbarElement);
