import { HUMAN_TRAINING_CONFIG_MODAL_TEMPLATE } from '../../simulator/humanTraining/templates/humanTrainingConfigModalTemplate.js';
import { DEFAULT_CAR_CONFIG } from '../../car/config.js';
import { inferHiddenLayers } from '../../simulator/training/genetics/poolManager.js';
export class HumanTrainingConfigModalElement extends HTMLElement {
    #options = null;
    #keyboardManager = null;
    constructor() {
        super();
        this.id = 'humanTrainingConfigModal';
    }
    connectedCallback() {
        this.innerHTML = HUMAN_TRAINING_CONFIG_MODAL_TEMPLATE;
        this.#bindEvents();
    }
    open(options) {
        this.#options = options;
        this.#fillCarConfig(options.defaults);
        const note = this.querySelector('#htcConfigNote');
        if (options.lockedToSavedBrain) {
            this.#setConfigLocked(true);
            if (note)
                note.textContent = '(locked to saved brain)';
        }
        else {
            this.#setConfigLocked(false);
            if (note)
                note.textContent = '';
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
    setKeyboardManager(km) {
        this.#keyboardManager = km;
    }
    #bindEvents() {
        this.querySelector('#htcStartBtn')?.addEventListener('click', () => this.#start());
        this.querySelector('#htcCancelBtn')?.addEventListener('click', () => this.#cancel());
        this.querySelector('.ti-overlay')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('ti-overlay')) {
                this.#cancel();
            }
        });
    }
    #fillCarConfig(c) {
        this.#setValue('#htcCarHeight', c.height);
        this.#setValue('#htcCarWidth', c.width);
        this.#setValue('#htcCarHiddenLayers', (c.hiddenLayers ?? inferHiddenLayers(c.brain) ?? [6]).join(', '));
        this.#setValue('#htcCarMaxSpeed', c.maxSpeed);
        this.#setValue('#htcCarAcceleration', c.acceleration);
        this.#setValue('#htcCarFriction', c.friction);
        this.#setValue('#htcCarRayCount', c.sensor.rayCount);
        this.#setValue('#htcCarRayLength', c.sensor.rayLength);
        this.#setValue('#htcCarRaySpread', c.sensor.raySpread);
        this.#setValue('#htcCarRayOffset', c.sensor.rayOffset);
        const saCheck = this.querySelector('#htcCarStateAware');
        if (saCheck) {
            saCheck.checked = c.sensor.stateAware ?? false;
        }
    }
    #readCarConfig() {
        const hidden = this.#parseHiddenLayers(this.querySelector('#htcCarHiddenLayers')?.value ?? '6');
        return {
            maxSpeed: this.#num('#htcCarMaxSpeed', DEFAULT_CAR_CONFIG.maxSpeed),
            acceleration: this.#num('#htcCarAcceleration', DEFAULT_CAR_CONFIG.acceleration),
            friction: this.#num('#htcCarFriction', DEFAULT_CAR_CONFIG.friction),
            width: this.#num('#htcCarWidth', DEFAULT_CAR_CONFIG.width, true),
            height: this.#num('#htcCarHeight', DEFAULT_CAR_CONFIG.height, true),
            hiddenLayers: hidden,
            sensor: {
                rayCount: this.#num('#htcCarRayCount', 5, true),
                rayLength: this.#num('#htcCarRayLength', 150, true),
                raySpread: this.#num('#htcCarRaySpread', Math.PI / 2),
                rayOffset: this.#num('#htcCarRayOffset', 0),
                stateAware: this.querySelector('#htcCarStateAware')?.checked ??
                    false,
            },
        };
    }
    #setConfigLocked(locked) {
        this.querySelectorAll('#htcCarConfigGrid input').forEach((input) => {
            input.disabled = locked;
        });
        const saCheck = this.querySelector('#htcCarStateAware');
        if (saCheck)
            saCheck.disabled = locked;
    }
    #parseHiddenLayers(value) {
        const parts = value
            .split(',')
            .map((s) => parseInt(s.trim()))
            .filter((n) => !isNaN(n) && n > 0);
        return parts.length > 0 ? parts : [6];
    }
    #setValue(selector, value) {
        const el = this.querySelector(selector);
        if (el)
            el.value = String(value);
    }
    #num(selector, fallback, isInt = false) {
        const el = this.querySelector(selector);
        if (!el)
            return fallback;
        const parsed = isInt ? parseInt(el.value) : parseFloat(el.value);
        return Number.isNaN(parsed) ? fallback : parsed;
    }
    #start() {
        const options = this.#options;
        if (!options)
            return;
        const carConfig = this.#readCarConfig();
        this.classList.remove('open');
        this.#keyboardManager?.popBindings();
        this.#options = null;
        options.onStart({ carConfig });
    }
    #cancel() {
        const options = this.#options;
        if (!options)
            return;
        this.classList.remove('open');
        this.#keyboardManager?.popBindings();
        this.#options = null;
        options.onCancel();
    }
}
customElements.define('human-training-config-modal', HumanTrainingConfigModalElement);
