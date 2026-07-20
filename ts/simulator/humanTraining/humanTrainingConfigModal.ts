import { HUMAN_TRAINING_CONFIG_MODAL_TEMPLATE } from './templates/humanTrainingConfigModalTemplate.js';
import { DEFAULT_CAR_CONFIG } from '../../car/config.js';
import type { CarInfo } from '../../car/car.js';
import { inferHiddenLayers } from '../training/genetics/poolManager.js';
import type { KeyboardManager } from '../../ui/atoms/keyboardManager.js';

export interface HumanTrainingConfigResult {
  carConfig: CarInfo;
}

export interface HumanTrainingConfigOpenOptions {
  defaults: CarInfo;
  lockedToSavedBrain: boolean;
  onStart: (result: HumanTrainingConfigResult) => void;
  onCancel: () => void;
}

export class HumanTrainingConfigModalElement extends HTMLElement {
  #options: HumanTrainingConfigOpenOptions | null = null;
  #keyboardManager: KeyboardManager | null = null;

  constructor() {
    super();
    this.id = 'humanTrainingConfigModal';
  }

  connectedCallback(): void {
    this.innerHTML = HUMAN_TRAINING_CONFIG_MODAL_TEMPLATE;
    this.#bindEvents();
  }

  open(options: HumanTrainingConfigOpenOptions): void {
    this.#options = options;
    this.#fillCarConfig(options.defaults);
    const note = this.querySelector<HTMLElement>('#htcConfigNote');
    if (options.lockedToSavedBrain) {
      this.#setConfigLocked(true);
      if (note) note.textContent = '(locked to saved brain)';
    } else {
      this.#setConfigLocked(false);
      if (note) note.textContent = '';
    }
    this.#keyboardManager?.pushBindings([
      {
        id: 'modalCancel',
        key: 'Escape',
        label: 'Esc',
        title: 'Esc \u2014 Cancel',
        group: 'Modal',
        kind: 'momentary',
        handler: {
          onKeyDown: () => this.#cancel(),
        },
      },
    ]);
    this.classList.add('open');
  }

  /** Connect the KeyboardManager for Escape key routing. */
  setKeyboardManager(km: KeyboardManager | null): void {
    this.#keyboardManager = km;
  }

  #bindEvents(): void {
    this.querySelector<HTMLButtonElement>('#htcStartBtn')?.addEventListener(
      'click',
      () => this.#start(),
    );
    this.querySelector<HTMLButtonElement>('#htcCancelBtn')?.addEventListener(
      'click',
      () => this.#cancel(),
    );
    this.querySelector<HTMLElement>('.ti-overlay')?.addEventListener(
      'click',
      (e) => {
        if ((e.target as HTMLElement).classList.contains('ti-overlay')) {
          this.#cancel();
        }
      },
    );
  }

  #fillCarConfig(c: CarInfo): void {
    this.#setValue('#htcCarHeight', c.height);
    this.#setValue('#htcCarWidth', c.width);
    this.#setValue(
      '#htcCarHiddenLayers',
      (c.hiddenLayers ?? inferHiddenLayers(c.brain) ?? [6]).join(', '),
    );
    this.#setValue('#htcCarMaxSpeed', c.maxSpeed);
    this.#setValue('#htcCarAcceleration', c.acceleration);
    this.#setValue('#htcCarFriction', c.friction);
    this.#setValue('#htcCarRayCount', c.sensor.rayCount);
    this.#setValue('#htcCarRayLength', c.sensor.rayLength);
    this.#setValue('#htcCarRaySpread', c.sensor.raySpread);
    this.#setValue('#htcCarRayOffset', c.sensor.rayOffset);
    const saCheck = this.querySelector<HTMLInputElement>('#htcCarStateAware');
    if (saCheck) {
      saCheck.checked = c.sensor.stateAware ?? false;
    }
  }

  #readCarConfig(): CarInfo {
    const hidden = this.#parseHiddenLayers(
      this.querySelector<HTMLInputElement>('#htcCarHiddenLayers')?.value ?? '6',
    );
    return {
      maxSpeed: this.#num('#htcCarMaxSpeed', DEFAULT_CAR_CONFIG.maxSpeed),
      acceleration: this.#num(
        '#htcCarAcceleration',
        DEFAULT_CAR_CONFIG.acceleration,
      ),
      friction: this.#num('#htcCarFriction', DEFAULT_CAR_CONFIG.friction),
      width: this.#num('#htcCarWidth', DEFAULT_CAR_CONFIG.width, true),
      height: this.#num('#htcCarHeight', DEFAULT_CAR_CONFIG.height, true),
      hiddenLayers: hidden,
      sensor: {
        rayCount: this.#num('#htcCarRayCount', 5, true),
        rayLength: this.#num('#htcCarRayLength', 150, true),
        raySpread: this.#num('#htcCarRaySpread', Math.PI / 2),
        rayOffset: this.#num('#htcCarRayOffset', 0),
        stateAware:
          this.querySelector<HTMLInputElement>('#htcCarStateAware')?.checked ??
          false,
      },
    };
  }

  #setConfigLocked(locked: boolean): void {
    this.querySelectorAll<HTMLInputElement>('#htcCarConfigGrid input').forEach(
      (input) => {
        input.disabled = locked;
      },
    );
    const saCheck = this.querySelector<HTMLInputElement>('#htcCarStateAware');
    if (saCheck) saCheck.disabled = locked;
  }

  #parseHiddenLayers(value: string): number[] {
    const parts = value
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    return parts.length > 0 ? parts : [6];
  }

  #setValue(selector: string, value: string | number): void {
    const el = this.querySelector<HTMLInputElement>(selector);
    if (el) el.value = String(value);
  }

  #num(selector: string, fallback: number, isInt = false): number {
    const el = this.querySelector<HTMLInputElement>(selector);
    if (!el) return fallback;
    const parsed = isInt ? parseInt(el.value) : parseFloat(el.value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  #start(): void {
    const options = this.#options;
    if (!options) return;
    const carConfig = this.#readCarConfig();
    this.classList.remove('open');
    this.#keyboardManager?.popBindings();
    this.#options = null;
    options.onStart({ carConfig });
  }

  #cancel(): void {
    const options = this.#options;
    if (!options) return;
    this.classList.remove('open');
    this.#keyboardManager?.popBindings();
    this.#options = null;
    options.onCancel();
  }
}

customElements.define(
  'human-training-config-modal',
  HumanTrainingConfigModalElement,
);
