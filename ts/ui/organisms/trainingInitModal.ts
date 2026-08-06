import { TRAINING_INIT_MODAL_TEMPLATE } from './trainingInitModalTemplate.js';
import { DEFAULT_CAR_CONFIG, DEFAULT_HIDDEN_LAYERS } from '../../car/config.js';
import type { CarInfo } from '../../car/car.js';
import { StoreManager } from '../../store/storeManager.js';
import { CarLoader } from '../../car/loader/carLoader.js';
import {
  safeJsonParse,
  stripFileExtension,
} from '../../store/serialization.js';
import { inferHiddenLayers } from '../../simulator/training/genetics/poolManager.js';
import { wireNumInputRows } from '../molecules/numInputRow.js';
import type { KeyboardManager } from '../../input/keyboardManager.js';

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
  /** World-mode training (real OSM road scale) gets realistic-physics defaults on 'fresh'; simple mode keeps arcade defaults. */
  isWorldMode: boolean;
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
  #keyboardManager: KeyboardManager | null = null;
  #isWorldMode = true;

  constructor() {
    super();
    this.id = 'trainingInitModal';
  }

  connectedCallback(): void {
    this.innerHTML = TRAINING_INIT_MODAL_TEMPLATE;
    this.#bindEvents();
    wireNumInputRows(this);
  }

  /** Show the modal, prefilled from `defaults`, and report the choice. */
  open(options: TrainingInitOpenOptions): void {
    this.#options = options;
    this.#isWorldMode = options.isWorldMode;

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
    const saCheck = this.querySelector<HTMLInputElement>('#tiCarStateAware');
    if (saCheck) {
      saCheck.checked = c.sensor.stateAware ?? false;
    }
    const rpCheck = this.querySelector<HTMLInputElement>(
      '#tiCarRealisticPhysics',
    );
    if (rpCheck) {
      rpCheck.checked = c.physicsModel === 'realistic';
    }
  }

  /** Re-read the available brain sources and enable/disable the radios. */
  #refreshSources(): void {
    this.#storedPool =
      safeJsonParse<CarInfo[]>(localStorage.getItem('bestPool')) ?? [];
    this.#selectedCars = StoreManager.getActiveCars();

    const poolAvailable = this.#storedPool.length > 0;
    const carsExist = StoreManager.getAllCars().length > 0;

    this.#setSourceAvailability('pool', poolAvailable);
    // "Selected" is enabled whenever the store has any cars to pick from — the
    // user chooses which ones directly in this modal.
    this.#setSourceAvailability('selected', carsExist);

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

    this.#renderCarSelector();
    this.#updateSelectedInfo();

    // Default selection: continue a saved pool if present, else selected
    // car(s) when some are already active, else fresh.
    const initial = poolAvailable
      ? 'pool'
      : this.#selectedCars.length > 0
        ? 'selected'
        : 'fresh';
    const radio = this.querySelector<HTMLInputElement>(
      `input[name="tiBrainSource"][value="${initial}"]`,
    );
    if (radio) radio.checked = true;
    this.#applySourceLock(initial);
  }

  /** Render the in-modal car picker list (checkboxes bound to the store). */
  #renderCarSelector(): void {
    const list = this.querySelector<HTMLElement>('#tiCarList');
    if (!list) return;
    const cars = StoreManager.getAllCars();
    const activeIds = new Set(StoreManager.getActiveCarIds());

    if (cars.length === 0) {
      list.innerHTML =
        '<div class="asset-empty">No cars in store. Load car(s) from the toolbar first.</div>';
      return;
    }

    list.innerHTML = cars
      .map(
        (c) => `
        <label class="asset-item">
          <input type="checkbox" name="tiCarPick" value="${c.id}" ${
            activeIds.has(c.id) ? 'checked' : ''
          } />
          <span class="asset-item-name" title="${c.name}">${stripFileExtension(c.name)}</span>
          <span class="asset-item-src">${c.source}</span>
        </label>`,
      )
      .join('');

    list
      .querySelectorAll<HTMLInputElement>('input[name="tiCarPick"]')
      .forEach((input) => {
        input.addEventListener('change', () => {
          StoreManager.getInstance()?.toggleActiveCarId(input.value);
          this.#updateSelectedInfo();
        });
      });
  }

  /** Refresh the selected-source count label + description from live state. */
  #updateSelectedInfo(): void {
    this.#selectedCars = StoreManager.getActiveCars();
    const selectedAvailable = this.#selectedCars.length > 0;

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
        selDesc.textContent = 'No car selected — pick at least one below.';
      } else if (!CarLoader.allParamsMatch(this.#selectedCars)) {
        selDesc.textContent =
          'Selected cars differ — only the first will be used.';
      } else {
        selDesc.textContent = 'Seed from the car(s) selected below.';
      }
    }

    const source = this.querySelector<HTMLInputElement>(
      'input[name="tiBrainSource"]:checked',
    )?.value;
    if (source === 'selected') this.#applySourceLock('selected');
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

    // Reveal the in-modal car picker only for the "selected" source.
    const selector = this.querySelector<HTMLElement>('#tiCarSelector');
    if (selector) selector.hidden = source !== 'selected';

    if (sourceConfig) {
      this.#fillCarConfig(sourceConfig);
      if (note) note.textContent = '(locked to brain source)';
    } else {
      if (source === 'fresh' && this.#isWorldMode) {
        this.#fillCarConfig(this.#freshCarDefaults());
      }
      if (note) note.textContent = '';
    }

    // Sync pool size to the number of cars in the chosen source.
    if (source === 'pool') {
      this.#setValue('#tiPoolCount', this.#storedPool.length);
    } else if (source === 'selected') {
      this.#setValue('#tiPoolCount', this.#selectedCars.length);
    }

    this.#setConfigLocked(sourceConfig !== null);
  }

  /** Recommended config for a fresh brain in world mode: real OSM road scale calls for the realistic physics model. */
  #freshCarDefaults(): CarInfo {
    return {
      maxSpeed: DEFAULT_CAR_CONFIG.maxSpeed,
      acceleration: DEFAULT_CAR_CONFIG.acceleration,
      friction: DEFAULT_CAR_CONFIG.friction,
      width: DEFAULT_CAR_CONFIG.width,
      height: DEFAULT_CAR_CONFIG.height,
      hiddenLayers: DEFAULT_HIDDEN_LAYERS,
      physicsModel: 'realistic',
      sensor: {
        rayCount: DEFAULT_CAR_CONFIG.sensor.rayCount,
        rayLength: DEFAULT_CAR_CONFIG.sensor.rayLength,
        raySpread: DEFAULT_CAR_CONFIG.sensor.raySpread,
        rayOffset: DEFAULT_CAR_CONFIG.sensor.rayOffset,
        stateAware: false,
      },
    };
  }

  #setConfigLocked(locked: boolean): void {
    this.querySelectorAll<HTMLInputElement>('#tiCarConfigGrid input').forEach(
      (input) => {
        input.disabled = locked;
      },
    );
    this.querySelectorAll<HTMLButtonElement>(
      '#tiCarConfigGrid .num-btn',
    ).forEach((btn) => {
      btn.disabled = locked;
    });
    const saCheck = this.querySelector<HTMLInputElement>('#tiCarStateAware');
    if (saCheck) saCheck.disabled = locked;
    const rpCheck = this.querySelector<HTMLInputElement>(
      '#tiCarRealisticPhysics',
    );
    if (rpCheck) rpCheck.disabled = locked;
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
    this.#keyboardManager?.popBindings();
    this.#options = null;
    options.onStart(result);
  }

  #cancel(): void {
    const options = this.#options;
    if (!options) return;
    this.classList.remove('open');
    this.#keyboardManager?.popBindings();
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
      physicsModel: this.querySelector<HTMLInputElement>(
        '#tiCarRealisticPhysics',
      )?.checked
        ? 'realistic'
        : 'arcade',
      sensor: {
        rayCount: this.#num('#tiCarRayCount', 5, true),
        rayLength: this.#num('#tiCarRayLength', 150, true),
        raySpread: this.#num('#tiCarRaySpread', Math.PI / 2),
        rayOffset: this.#num('#tiCarRayOffset', 0),
        stateAware:
          this.querySelector<HTMLInputElement>('#tiCarStateAware')?.checked ??
          false,
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
