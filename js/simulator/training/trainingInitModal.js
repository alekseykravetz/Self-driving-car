'use strict';
/**
 * <training-init-modal> — A blocking dialog shown on the training page (on entry
 * and when "New Training" is pressed) that lets the user pick the brain source
 * (fresh / saved pool / selected car(s)) and review the training + car settings
 * before training starts. Replaces the previous implicit auto-seeding behavior
 * and the surprise alert()s it produced.
 */
class TrainingInitModalElement extends HTMLElement {
  #options = null;
  #storedPool = [];
  #selectedCars = [];
  constructor() {
    super();
    this.id = 'trainingInitModal';
  }

  connectedCallback() {
    this.innerHTML = TRAINING_INIT_MODAL_TEMPLATE;
    this.#bindEvents();
  }

  /** Show the modal, prefilled from `defaults`, and report the choice. */
  open(options) {
    this.#options = options;
    const titleEl = this.querySelector('#tiTitle');
    const subtitleEl = this.querySelector('#tiSubtitle');
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

  #bindEvents() {
    this.querySelector('#tiStartBtn')?.addEventListener('click', () =>
      this.#start(),
    );
    this.querySelector('#tiCancelBtn')?.addEventListener('click', () =>
      this.#cancel(),
    );
    // Click on the dimmed backdrop (but not the dialog) cancels.
    this.querySelector('.ti-overlay')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('ti-overlay')) {
        this.#cancel();
      }
    });
    // Esc cancels while the modal is open.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('open')) {
        this.#cancel();
      }
    });
    this.querySelectorAll('input[name="tiBrainSource"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) this.#applySourceLock(radio.value);
      });
    });
  }

  // ── Prefill ──────────────────────────────────────────
  #fillTrainingParams(d) {
    this.#setValue('#tiCarCount', d.carCount);
    this.#setValue('#tiMutation', d.mutationRate);
    this.#setValue('#tiPoolCount', d.poolSize);
    this.#setValue('#tiIdleRange', d.idleRange);
  }

  #fillCarConfig(c) {
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
  #refreshSources() {
    this.#storedPool = safeJsonParse(localStorage.getItem('bestPool')) ?? [];
    this.#selectedCars = StoreManager.getActiveCars();
    const poolAvailable = this.#storedPool.length > 0;
    const selectedAvailable = this.#selectedCars.length > 0;
    this.#setSourceAvailability('pool', poolAvailable);
    this.#setSourceAvailability('selected', selectedAvailable);
    const poolCountLabel = this.querySelector('#tiPoolCountLabel');
    if (poolCountLabel) {
      poolCountLabel.textContent = poolAvailable
        ? `(${this.#storedPool.length})`
        : '';
    }
    const poolDesc = this.querySelector('#tiPoolDesc');
    if (poolDesc && !poolAvailable) {
      poolDesc.textContent = 'No saved pool in local storage.';
    }
    const selCountLabel = this.querySelector('#tiSelectedCountLabel');
    if (selCountLabel) {
      selCountLabel.textContent = selectedAvailable
        ? `(${this.#selectedCars.length})`
        : '';
    }
    const selDesc = this.querySelector('#tiSelectedDesc');
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
    const radio = this.querySelector(
      `input[name="tiBrainSource"][value="${initial}"]`,
    );
    if (radio) radio.checked = true;
    this.#applySourceLock(initial);
  }

  #setSourceAvailability(source, available) {
    const label = this.querySelector(`.ti-source[data-source="${source}"]`);
    const radio = this.querySelector(
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
  #applySourceLock(source) {
    const note = this.querySelector('#tiConfigNote');
    let sourceConfig = null;
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

  #setConfigLocked(locked) {
    this.querySelectorAll('#tiCarConfigGrid input').forEach((input) => {
      input.disabled = locked;
    });
  }

  // ── Result ───────────────────────────────────────────
  #start() {
    const options = this.#options;
    if (!options) return;
    const source =
      this.querySelector('input[name="tiBrainSource"]:checked')?.value ??
      'fresh';
    const result = {
      carCount: this.#num('#tiCarCount', options.defaults.carCount, true),
      poolSize: this.#num('#tiPoolCount', options.defaults.poolSize, true),
      mutationRate: this.#num('#tiMutation', options.defaults.mutationRate),
      idleRange: this.#num('#tiIdleRange', options.defaults.idleRange, true),
      carConfig: this.#readCarConfig(),
      brainSource: source,
    };
    this.classList.remove('open');
    this.#options = null;
    options.onStart(result);
  }

  #cancel() {
    const options = this.#options;
    if (!options) return;
    this.classList.remove('open');
    this.#options = null;
    options.onCancel();
  }

  #readCarConfig() {
    const hidden = this.#parseHiddenLayers(
      this.querySelector('#tiCarHiddenLayers')?.value ?? '6',
    );
    return {
      maxSpeed: this.#num('#tiCarMaxSpeed', 3),
      acceleration: this.#num('#tiCarAcceleration', 0.2),
      friction: this.#num('#tiCarFriction', 0.05),
      width: this.#num('#tiCarWidth', 30, true),
      height: this.#num('#tiCarHeight', 50, true),
      hiddenLayers: hidden,
      sensor: {
        rayCount: this.#num('#tiCarRayCount', 5, true),
        rayLength: this.#num('#tiCarRayLength', 150, true),
        raySpread: this.#num('#tiCarRaySpread', Math.PI / 2),
        rayOffset: this.#num('#tiCarRayOffset', 0),
      },
    };
  }

  #parseHiddenLayers(value) {
    const parts = value
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    return parts.length > 0 ? parts : [6];
  }

  // ── Small DOM helpers ────────────────────────────────
  #setValue(selector, value) {
    const el = this.querySelector(selector);
    if (el) el.value = String(value);
  }

  #num(selector, fallback, isInt = false) {
    const el = this.querySelector(selector);
    if (!el) return fallback;
    const parsed = isInt ? parseInt(el.value) : parseFloat(el.value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
}
customElements.define('training-init-modal', TrainingInitModalElement);
