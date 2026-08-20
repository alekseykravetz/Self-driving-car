import type { BorderMode, TrackingMode } from '../../simulator/types.js';

export type ToolbarViewportMode = 'mouse' | 'touchpad';

export class ToolbarModeControls {
  #_borderMode: BorderMode = 'damage';
  #_trackingMode: TrackingMode = 'best';
  #trackingCarIndex = 0;
  #trackingCarCount = 0;
  #trackingCarName = '';
  #_viewportMode: ToolbarViewportMode = 'mouse';

  #onBorderModeChange: ((mode: BorderMode) => void) | null = null;
  #onTrackingModeChange: ((mode: TrackingMode) => void) | null = null;
  #onTrackingCarChange: ((index: number) => void) | null = null;
  #onViewportModeChange: ((mode: ToolbarViewportMode) => void) | null = null;

  #host: HTMLElement;

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  get borderMode(): BorderMode {
    return this.#_borderMode;
  }

  get trackingMode(): TrackingMode {
    return this.#_trackingMode;
  }

  get trackingCarIndex(): number {
    return this.#trackingCarIndex;
  }

  get viewportMode(): ToolbarViewportMode {
    return this.#_viewportMode;
  }

  setBorderModeListener(listener: (mode: BorderMode) => void): void {
    this.#onBorderModeChange = listener;
  }

  setTrackingModeListener(listener: (mode: TrackingMode) => void): void {
    this.#onTrackingModeChange = listener;
  }

  setTrackingCarListener(listener: (index: number) => void): void {
    this.#onTrackingCarChange = listener;
  }

  setViewportModeListener(listener: (mode: ToolbarViewportMode) => void): void {
    this.#onViewportModeChange = listener;
  }

  setTrackingMode(mode: TrackingMode): void {
    this.#_trackingMode = mode;
    const buttons: Record<TrackingMode, HTMLButtonElement | null> = {
      none: this.#host.querySelector('#trackModeNone'),
      best: this.#host.querySelector('#trackModeBest'),
      keys: this.#host.querySelector('#trackModeKeys'),
    };
    Object.entries(buttons).forEach(([key, btn]) => {
      if (btn) btn.classList.toggle('active', key === mode);
    });
    this.#updateTrackingCarPicker();
    if (this.#onTrackingModeChange) this.#onTrackingModeChange(mode);
  }

  setTrackingCarDisplay(index: number, count: number, name?: string): void {
    const nextCount = Math.max(0, count);
    const nextIndex = nextCount
      ? Math.min(Math.max(0, index), nextCount - 1)
      : 0;
    const changed = nextIndex !== this.#trackingCarIndex;
    const nextName = nextCount ? name || `Car ${nextIndex + 1}` : '';
    const displayChanged =
      changed ||
      nextCount !== this.#trackingCarCount ||
      nextName !== this.#trackingCarName;
    this.#trackingCarIndex = nextIndex;
    this.#trackingCarCount = nextCount;
    this.#trackingCarName = nextName;

    if (displayChanged) {
      const label = this.#host.querySelector<HTMLElement>(
        '#bestTrackingCarLabel',
      );
      if (label) {
        label.textContent = nextCount
          ? `${nextName} · ${nextIndex + 1}/${nextCount}`
          : '—';
      }
    }
    this.#updateTrackingCarPicker();
    if (changed) this.#onTrackingCarChange?.(nextIndex);
  }

  init(): void {
    this.#initBorderModeButtons();
    this.#initTrackingModeButtons();
    this.#initViewportModeButtons();

    // On phone-sized screens default to touchpad wheel behavior (two-finger
    // scroll pans). Kept in sync with the 768px CSS breakpoint.
    if (window.matchMedia?.('(max-width: 768px)').matches) {
      this.setViewportMode('touchpad');
    }
  }

  setViewportMode(mode: ToolbarViewportMode): void {
    this.#_viewportMode = mode;
    const buttons: Record<ToolbarViewportMode, HTMLButtonElement | null> = {
      mouse: this.#host.querySelector('#viewportModeMouse'),
      touchpad: this.#host.querySelector('#viewportModeTouchpad'),
    };
    Object.entries(buttons).forEach(([key, btn]) => {
      if (btn) btn.classList.toggle('active', key === mode);
    });
    if (this.#onViewportModeChange) this.#onViewportModeChange(mode);
  }

  #initBorderModeButtons(): void {
    const buttons = {
      none: this.#host.querySelector(
        '#borderModeNone',
      ) as HTMLButtonElement | null,
      damage: this.#host.querySelector(
        '#borderModeDamage',
      ) as HTMLButtonElement | null,
      collision: this.#host.querySelector(
        '#borderModeCollision',
      ) as HTMLButtonElement | null,
    };

    const setActive = (mode: BorderMode) => {
      this.#_borderMode = mode;
      Object.entries(buttons).forEach(([key, btn]) => {
        if (btn) btn.classList.toggle('active', key === mode);
      });
      if (this.#onBorderModeChange) this.#onBorderModeChange(mode);
    };

    buttons.none?.addEventListener('click', () => setActive('none'));
    buttons.damage?.addEventListener('click', () => setActive('damage'));
    buttons.collision?.addEventListener('click', () => setActive('collision'));
  }

  #initTrackingModeButtons(): void {
    const buttons = {
      none: this.#host.querySelector(
        '#trackModeNone',
      ) as HTMLButtonElement | null,
      best: this.#host.querySelector(
        '#trackModeBest',
      ) as HTMLButtonElement | null,
      keys: this.#host.querySelector(
        '#trackModeKeys',
      ) as HTMLButtonElement | null,
    };

    buttons.none?.addEventListener('click', () => this.setTrackingMode('none'));
    buttons.best?.addEventListener('click', () => this.setTrackingMode('best'));
    buttons.keys?.addEventListener('click', () => this.setTrackingMode('keys'));

    this.#host
      .querySelector<HTMLButtonElement>('#bestTrackingCarPrev')
      ?.addEventListener('click', () => this.#changeTrackingCar(-1));
    this.#host
      .querySelector<HTMLButtonElement>('#bestTrackingCarNext')
      ?.addEventListener('click', () => this.#changeTrackingCar(1));
    this.#updateTrackingCarPicker();
  }

  #changeTrackingCar(delta: number): void {
    if (!this.#trackingCarCount) return;
    const nextIndex = Math.min(
      Math.max(0, this.#trackingCarIndex + delta),
      this.#trackingCarCount - 1,
    );
    if (nextIndex === this.#trackingCarIndex) return;
    this.setTrackingCarDisplay(nextIndex, this.#trackingCarCount);
  }

  #updateTrackingCarPicker(): void {
    const picker = this.#host.querySelector<HTMLElement>(
      '#bestTrackingCarPicker',
    );
    const previous = this.#host.querySelector<HTMLButtonElement>(
      '#bestTrackingCarPrev',
    );
    const next = this.#host.querySelector<HTMLButtonElement>(
      '#bestTrackingCarNext',
    );
    if (picker) picker.hidden = this.#trackingCarCount === 0;
    if (previous) {
      previous.disabled =
        this.#_trackingMode !== 'best' || this.#trackingCarIndex === 0;
    }
    if (next) {
      next.disabled =
        this.#_trackingMode !== 'best' ||
        this.#trackingCarIndex >= this.#trackingCarCount - 1;
    }
  }

  #initViewportModeButtons(): void {
    const buttons = {
      mouse: this.#host.querySelector(
        '#viewportModeMouse',
      ) as HTMLButtonElement | null,
      touchpad: this.#host.querySelector(
        '#viewportModeTouchpad',
      ) as HTMLButtonElement | null,
    };

    buttons.mouse?.addEventListener('click', () =>
      this.setViewportMode('mouse'),
    );
    buttons.touchpad?.addEventListener('click', () =>
      this.setViewportMode('touchpad'),
    );
  }
}
