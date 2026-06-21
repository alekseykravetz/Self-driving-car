/**
 * <animation-loop-toolbar> — floating toolbar that manages the simulator
 * animation loop. It owns the play/pause toggle (shared across every
 * SimulatorShell page) and the render-interval throttle read each frame by
 * `SimulatorShell.animate()`.
 */
class AnimationLoopToolbarElement extends HTMLElement {
  private _paused: boolean = false;

  private pauseBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.id = 'animationLoopToolbar';
  }

  connectedCallback(): void {
    this.innerHTML = AnimationLoopToolbarElement.template;
    this.pauseBtn = this.querySelector('#loopPauseBtn');
    this.pauseBtn?.addEventListener('click', () => this.togglePause());
  }

  /** Whether the simulation step is currently paused. */
  get paused(): boolean {
    return this._paused;
  }

  /**
   * How many animation frames pass per rendered frame. Physics always runs at
   * full rate; only the (heavier) draw pass is throttled by this value.
   * Clamped to [1, 10]; 1 = draw every frame.
   */
  get renderInterval(): number {
    const el = this.querySelector('#renderInterval') as HTMLInputElement | null;
    const value = el ? Math.round(Number(el.value)) : 1;
    if (!Number.isFinite(value)) return 1;
    return Math.min(10, Math.max(1, value));
  }

  /** Toggle (or force) the paused state, syncing the button glyph. */
  togglePause(forceState?: boolean): void {
    this._paused = forceState !== undefined ? forceState : !this._paused;
    if (this.pauseBtn) {
      this.pauseBtn.textContent = this._paused ? '▶️' : '⏸️';
      this.pauseBtn.classList.toggle('active', !this._paused);
    }
  }

  /** Programmatically set the paused state. */
  setPaused(paused: boolean): void {
    this.togglePause(paused);
  }

  static readonly template = ANIMATION_LOOP_TOOLBAR_TEMPLATE;
}

customElements.define('animation-loop-toolbar', AnimationLoopToolbarElement);
