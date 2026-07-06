'use strict';
class ToolbarModeControls {
  #_borderMode = 'damage';
  #_trackingMode = 'best';
  #_viewportMode = 'mouse';
  #onBorderModeChange = null;
  #onTrackingModeChange = null;
  #onViewportModeChange = null;
  #host;
  constructor(host) {
    this.#host = host;
  }

  get borderMode() {
    return this.#_borderMode;
  }

  get trackingMode() {
    return this.#_trackingMode;
  }

  get viewportMode() {
    return this.#_viewportMode;
  }

  setBorderModeListener(listener) {
    this.#onBorderModeChange = listener;
  }

  setTrackingModeListener(listener) {
    this.#onTrackingModeChange = listener;
  }

  setViewportModeListener(listener) {
    this.#onViewportModeChange = listener;
  }

  setTrackingMode(mode) {
    this.#_trackingMode = mode;
    const buttons = {
      none: this.#host.querySelector('#trackModeNone'),
      best: this.#host.querySelector('#trackModeBest'),
      keys: this.#host.querySelector('#trackModeKeys'),
    };
    Object.entries(buttons).forEach(([key, btn]) => {
      if (btn) btn.classList.toggle('active', key === mode);
    });
    if (this.#onTrackingModeChange) this.#onTrackingModeChange(mode);
  }

  init() {
    this.#initBorderModeButtons();
    this.#initTrackingModeButtons();
    this.#initViewportModeButtons();
  }

  #initBorderModeButtons() {
    const buttons = {
      none: this.#host.querySelector('#borderModeNone'),
      damage: this.#host.querySelector('#borderModeDamage'),
      collision: this.#host.querySelector('#borderModeCollision'),
    };
    const setActive = (mode) => {
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

  #initTrackingModeButtons() {
    const buttons = {
      none: this.#host.querySelector('#trackModeNone'),
      best: this.#host.querySelector('#trackModeBest'),
      keys: this.#host.querySelector('#trackModeKeys'),
    };
    buttons.none?.addEventListener('click', () => this.setTrackingMode('none'));
    buttons.best?.addEventListener('click', () => this.setTrackingMode('best'));
    buttons.keys?.addEventListener('click', () => this.setTrackingMode('keys'));
  }

  #initViewportModeButtons() {
    const buttons = {
      mouse: this.#host.querySelector('#viewportModeMouse'),
      touchpad: this.#host.querySelector('#viewportModeTouchpad'),
    };
    const setActive = (mode) => {
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
