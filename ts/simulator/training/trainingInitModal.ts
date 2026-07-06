import { TRAINING_INIT_MODAL_TEMPLATE } from './templates/trainingInitModalTemplate.js';
import { DEFAULT_CAR_CONFIG } from '../../car/config.js';
import type { CarInfo } from '../../car/car.js';
import { StoreManager } from '../../store/storeManager.js';
import { CarLoader } from '../../car/loader/carLoader.js';
import { safeJsonParse } from '../../store/serialization.js';
import { inferHiddenLayers } from './genetics/poolManager.js';

export interface TrainingInitDefaults {
  carCount: number;
  poolSize: number;
  mutationRate: number;
  idleRange: number;
  carConfig: CarInfo;
}

export interface TrainingInitResult {
  carCount: number;
  poolSize: number;
  mutationRate: number;
  idleRange: number;
  carConfig: CarInfo;
  brainSource: 'fresh' | 'pool' | 'selected';
}

export interface TrainingInitOpenOptions {
  context: 'entry' | 'new';
  defaults: TrainingInitDefaults;
  onStart: (result: TrainingInitResult) => void;
  onCancel: () => void;
}

/**
 * <training-init-modal> — A blocking dialog shown on the training page (on entry
 * and when "New Training" is pressed) that lets the user pick the brain source
 * (fresh / saved pool / selected car(s)) and review the training + car settings
 * before training starts. Replaces the previous implicit auto-seeding behavior
 * and the surprise alert()s it produced.
 */
export class TrainingInitModalElement extends HTMLElement {
  #options: TrainingInitOpenOptions | null = null;
  #storedPool: CarInfo[] = [];
  #selectedCars: CarInfo[] = [];

  constructor() {
    super();
    this.id = 'trainingInitModal';
  }

  connectedCallback(): void {
    this.innerHTML = TRAINING_INIT_MODAL_TEMPLATE;
    this.#bindEvents();
  }

  /** Show the modal, prefilled from `defaults`, and report the choice. */
  open(options: TrainingInitOpenOptions): void {
    this.#options = options;

    const titleEl = this.querySelector<HTMLElement>('#tiTitle');
    const subtitleEl = this.querySelector<HTMLElement>('#tiSubtitle');
    if (titleEl) {
      titleEl.textContent =
        options.context === 'new' ? 'New Training' : 'Start Training';
    }
    if (subtitleEl) {
      subtitleEl.textContent =
        options.context === 'new'
          ? 'This restarts training. Choose the brain source and review settings.'
          : 'Choose where the brains come from and review the car settings.';
    }

    this.#fillTrainingParams(options.defaults);
    this.#fillCarConfig(options.defaults.carConfig);
    this.#refreshSources();

    this.classList.add('open');
  }

  #bindEvents(): void {
    this.querySelector<HTMLButtonElement>('#tiStartBtn')?.addEventListener(
      'click',
      () => this.#start(),
    );
    this.querySelector<HTMLButtonElement>('#tiCancelBtn')?.addEventListener(
      'click',
      () => this.#cancel(),
    );

    // Click on the dimmed backdrop (but not the dialog) cancels.
    this.querySelector<HTMLElement>('.ti-overlay')?.addEventListener(
      'click',
      (e) => {
        if ((e.target as HTMLElement).classList.contains('ti-overlay')) {
          this.#cancel();
        }
      },
    );

    // Esc cancels while the modal is open.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('open')) {
        this.#cancel();
      }
    });

    this.querySelectorAll<HTMLInputElement>(
      'input[name="tiBrainSource"]',
    ).forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) this.#applySourceLock(radio.value);
      });
    });
  }

  // ── Prefill ──────────────────────────────────────────

  #fillTrainingParams(d: TrainingInitDefaults): void {
    this.#setValue('#tiCarCount', d.carCount);
    this.#setValue('#tiMutation', d.mutationRate);
    this.#setValue('#tiPoolCount', d.poolSize);
    this.#setValue('#tiIdleRange', d.idleRange);
  }

  #fillCarConfig(c: CarInfo): void {
    this.#setValue('#tiCarHeight', c.height);
    this.#setValue('#tiCarWidth', c.width);
    this.#setValue(
      '#tiCarHiddenLayers',
      (c.hiddenLayers ?? inferHiddenLayers(c.brain) ?? [6]).join(', '),
    );
    this.#setValue('#tiCarMaxSpeed', c.maxSpeed);
    this.#setValue('#tiCarAcceleration', c.acceleration);
    this.#setValue('#tiCarFriction', c.friction);
    this.#setValue('#tiCarRayCount', c.sensor.rayCount);
    this.#setValue('#tiCarRayLength', c.sensor.rayLength);
    this.#setValue('#tiCarRaySpread', c.sensor.raySpread);
    this.#setValue('#tiCarRayOffset', c.sensor.rayOffset);
  }

  /** Re-read the available brain sources and enable/disable the radios. */
  #refreshSources(): void {
    this.#storedPool =
      safeJsonParse<CarInfo[]>(localStorage.getItem('bestPool')) ?? [];
    this.#selectedCars = StoreManager.getActiveCars();

    const poolAvailable = this.#storedPool.length > 0;
    const selectedAvailable = this.#selectedCars.length > 0;

    this.#setSourceAvailability('pool', poolAvailable);
    this.#setSourceAvailability('selected', selectedAvailable);

    const poolCountLabel = this.querySelector<HTMLElement>('#tiPoolCountLabel');
    if (poolCountLabel) {
      poolCountLabel.textContent = poolAvailable
        ? `(${this.#storedPool.length})`
        : '';
    }
    const poolDesc = this.querySelector<HTMLElement>('#tiPoolDesc');
    if (poolDesc && !poolAvailable) {
      poolDesc.textContent = 'No saved pool in local storage.';
    }

    const selCountLabel = this.querySelector<HTMLElement>(
      '#tiSelectedCountLabel',
    );
    if (selCountLabel) {
      selCountLabel.textContent = selectedAvailable
        ? `(${this.#selectedCars.length})`
        : '';
    }
    const selDesc = this.querySelector<HTMLElement>('#tiSelectedDesc');
    if (selDesc) {
      if (!selectedAvailable) {
        selDesc.textContent = 'No car selected in the toolbar.';
      } else if (!CarLoader.allParamsMatch(this.#selectedCars)) {
        selDesc.textContent =
          'Selected cars differ — only the first will be used.';
      } else {
        selDesc.textContent = 'Seed from the car(s) selected in the toolbar.';
      }
    }

    // Default selection: continue a saved pool if present, else selected
    // car(s), else fresh.
    const initial = poolAvailable
      ? 'pool'
      : selectedAvailable
        ? 'selected'
        : 'fresh';
    const radio = this.querySelector<HTMLInputElement>(
      `input[name="tiBrainSource"][value="${initial}"]`,
    );
    if (radio) radio.checked = true;
    this.#applySourceLock(initial);
  }

  #setSourceAvailability(source: string, available: boolean): void {
    const label = this.querySelector<HTMLElement>(
      `.ti-source[data-source="${source}"]`,
    );
    const radio = this.querySelector<HTMLInputElement>(
      `input[name="tiBrainSource"][value="${source}"]`,
    );
    if (radio) radio.disabled = !available;
    if (label) label.classList.toggle('disabled', !available);
  }

  /**
   * When a stored/selected brain source is chosen, the car config must match
   * the source's parameters (the brain topology is fixed), so prefill from the
   * source and lock the inputs. "Fresh" leaves the config editable.
   */
  #applySourceLock(source: string): void {
    const note = this.querySelector<HTMLElement>('#tiConfigNote');
    let sourceConfig: CarInfo | null = null;

    if (source === 'pool' && this.#storedPool.length > 0) {
      sourceConfig = this.#storedPool[0];
    } else if (source === 'selected' && this.#selectedCars.length > 0) {
      sourceConfig = this.#selectedCars[0];
    }

    if (sourceConfig) {
      this.#fillCarConfig(sourceConfig);
      if (note) note.textContent = '(locked to brain source)';
    } else if (note) {
      note.textContent = '';
    }

    // Sync pool size to the number of cars in the chosen source.
    if (source === 'pool') {
      this.#setValue('#tiPoolCount', this.#storedPool.length);
    } else if (source === 'selected') {
      this.#setValue('#tiPoolCount', this.#selectedCars.length);
    }

    this.#setConfigLocked(sourceConfig !== null);
  }

  #setConfigLocked(locked: boolean): void {
    this.querySelectorAll<HTMLInputElement>('#tiCarConfigGrid input').forEach(
      (input) => {
        input.disabled = locked;
      },
    );
  }

  // ── Result ───────────────────────────────────────────

  #start(): void {
    const options = this.#options;
    if (!options) return;

    const source =
      this.querySelector<HTMLInputElement>(
        'input[name="tiBrainSource"]:checked',
      )?.value ?? 'fresh';

    const result: TrainingInitResult = {
      carCount: this.#num('#tiCarCount', options.defaults.carCount, true),
      poolSize: this.#num('#tiPoolCount', options.defaults.poolSize, true),
      mutationRate: this.#num('#tiMutation', options.defaults.mutationRate),
      idleRange: this.#num('#tiIdleRange', options.defaults.idleRange, true),
      carConfig: this.#readCarConfig(),
      brainSource: source as TrainingInitResult['brainSource'],
    };

    this.classList.remove('open');
    this.#options = null;
    options.onStart(result);
  }

  #cancel(): void {
    const options = this.#options;
    if (!options) return;
    this.classList.remove('open');
    this.#options = null;
    options.onCancel();
  }

  #readCarConfig(): CarInfo {
    const hidden = this.#parseHiddenLayers(
      this.querySelector<HTMLInputElement>('#tiCarHiddenLayers')?.value ?? '6',
    );
    return {
      maxSpeed: this.#num('#tiCarMaxSpeed', DEFAULT_CAR_CONFIG.maxSpeed),
      acceleration: this.#num(
        '#tiCarAcceleration',
        DEFAULT_CAR_CONFIG.acceleration,
      ),
      friction: this.#num('#tiCarFriction', DEFAULT_CAR_CONFIG.friction),
      width: this.#num('#tiCarWidth', DEFAULT_CAR_CONFIG.width, true),
      height: this.#num('#tiCarHeight', DEFAULT_CAR_CONFIG.height, true),
      hiddenLayers: hidden,
      sensor: {
        rayCount: this.#num('#tiCarRayCount', 5, true),
        rayLength: this.#num('#tiCarRayLength', 150, true),
        raySpread: this.#num('#tiCarRaySpread', Math.PI / 2),
        rayOffset: this.#num('#tiCarRayOffset', 0),
      },
    };
  }

  #parseHiddenLayers(value: string): number[] {
    const parts = value
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    return parts.length > 0 ? parts : [6];
  }

  // ── Small DOM helpers ────────────────────────────────

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
}

customElements.define('training-init-modal', TrainingInitModalElement);
