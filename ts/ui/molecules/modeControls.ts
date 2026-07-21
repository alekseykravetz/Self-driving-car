import type { BorderMode } from '../../simulator/types.js';

export type TrackingMode = 'none' | 'best' | 'keys';
export type ToolbarViewportMode = 'mouse' | 'touchpad';

export class ToolbarModeControls {
  #_borderMode: BorderMode = 'damage';
  #_trackingMode: TrackingMode = 'best';
  #_viewportMode: ToolbarViewportMode = 'mouse';

  #onBorderModeChange: ((mode: BorderMode) => void) | null = null;
  #onTrackingModeChange: ((mode: TrackingMode) => void) | null = null;
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

  get viewportMode(): ToolbarViewportMode {
    return this.#_viewportMode;
  }

  setBorderModeListener(listener: (mode: BorderMode) => void): void {
    this.#onBorderModeChange = listener;
  }

  setTrackingModeListener(listener: (mode: TrackingMode) => void): void {
    this.#onTrackingModeChange = listener;
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
    if (this.#onTrackingModeChange) this.#onTrackingModeChange(mode);
  }

  init(): void {
    this.#initBorderModeButtons();
    this.#initTrackingModeButtons();
    this.#initViewportModeButtons();
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

    const setActive = (mode: ToolbarViewportMode) => {
      this.#_viewportMode = mode;
      Object.entries(buttons).forEach(([key, btn]) => {
        if (btn) btn.classList.toggle('active', key === mode);
      });
      if (this.#onViewportModeChange) this.#onViewportModeChange(mode);
    };

    buttons.mouse?.addEventListener('click', () => setActive('mouse'));
    buttons.touchpad?.addEventListener('click', () => setActive('touchpad'));
  }
}
