import { DEFAULT_CAR_CONFIG } from '../../car/config.js';
import type { CarInfo } from '../../car/car.js';
import { inferHiddenLayers } from '../../simulator/training/genetics/poolManager.js';

/** Collapsible car-config fieldset: reads/writes car physics + sensor params. */
export class CarConfigPanel {
  #onCarParamsChanged: () => void;

  #carMaxSpeedInput: HTMLInputElement | null = null;
  #carAccelerationInput: HTMLInputElement | null = null;
  #carFrictionInput: HTMLInputElement | null = null;
  #carWidthInput: HTMLInputElement | null = null;
  #carHeightInput: HTMLInputElement | null = null;
  #carRayCountInput: HTMLInputElement | null = null;
  #carRayLengthInput: HTMLInputElement | null = null;
  #carRaySpreadInput: HTMLInputElement | null = null;
  #carRayOffsetInput: HTMLInputElement | null = null;
  #carStateAwareCheck: HTMLInputElement | null = null;
  #carRealisticPhysicsCheck: HTMLInputElement | null = null;
  #carHiddenLayersInput: HTMLInputElement | null = null;
  #carConfigSection: HTMLElement | null = null;
  #carConfigToggle: HTMLElement | null = null;
  #carConfigSummary: HTMLElement | null = null;

  #hiddenLayers: number[] = [6];

  constructor(host: HTMLElement, onCarParamsChanged: () => void) {
    this.#onCarParamsChanged = onCarParamsChanged;
    this.#initDOMElements(host);
    this.#addEventListeners();
    this.#updateCarConfigSummary();
  }

  get hiddenLayers(): number[] {
    return [...this.#hiddenLayers];
  }

  #initDOMElements(host: HTMLElement): void {
    this.#carMaxSpeedInput = host.querySelector('#carMaxSpeed');
    this.#carAccelerationInput = host.querySelector('#carAcceleration');
    this.#carFrictionInput = host.querySelector('#carFriction');
    this.#carWidthInput = host.querySelector('#carWidth');
    this.#carHeightInput = host.querySelector('#carHeight');
    this.#carRayCountInput = host.querySelector('#carRayCount');
    this.#carRayLengthInput = host.querySelector('#carRayLength');
    this.#carRaySpreadInput = host.querySelector('#carRaySpread');
    this.#carRayOffsetInput = host.querySelector('#carRayOffset');
    this.#carStateAwareCheck = host.querySelector('#carStateAware');
    this.#carRealisticPhysicsCheck = host.querySelector('#carRealisticPhysics');
    this.#carHiddenLayersInput = host.querySelector('#carHiddenLayers');
    this.#carConfigSection = host.querySelector('#carConfigSection');
    this.#carConfigToggle = host.querySelector('#carConfigToggle');
    this.#carConfigSummary = host.querySelector('#carConfigSummary');
  }

  #addEventListeners(): void {
    if (this.#carConfigToggle) {
      this.#carConfigToggle.addEventListener('click', () => {
        this.#carConfigSection?.classList.toggle('collapsed');
      });
    }

    // Numeric +/- buttons scoped to this section only — the training-param
    // buttons (carCount/poolCount/threshold/idleRange) live outside
    // #carConfigSection and are wired by TrainingPanelElement itself.
    this.#carConfigSection
      ?.querySelectorAll<HTMLButtonElement>('.num-btn')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetId = btn.dataset.target;
          if (!targetId) return;
          const input = this.#carConfigSection!.querySelector<HTMLInputElement>(
            `#${targetId}`,
          );
          if (!input) return;
          const step = parseFloat(input.step) || 1;
          const min = parseFloat(input.min);
          const max = parseFloat(input.max);
          let val = parseFloat(input.value) || 0;
          if (btn.classList.contains('num-btn-inc')) {
            val += step;
          } else {
            val -= step;
          }
          if (!isNaN(min)) val = Math.max(min, val);
          if (!isNaN(max)) val = Math.min(max, val);
          input.value = String(parseFloat(val.toFixed(4)));
          input.dispatchEvent(new Event('change'));
        });
      });

    // Auto-restart training when car params change
    const carParamInputs = [
      this.#carMaxSpeedInput,
      this.#carAccelerationInput,
      this.#carFrictionInput,
      this.#carWidthInput,
      this.#carHeightInput,
      this.#carRayCountInput,
      this.#carRayLengthInput,
      this.#carRaySpreadInput,
      this.#carRayOffsetInput,
      this.#carHiddenLayersInput,
      this.#carStateAwareCheck,
      this.#carRealisticPhysicsCheck,
    ];
    for (const input of carParamInputs) {
      if (input) {
        input.addEventListener('change', () => {
          this.#updateCarConfigSummary();
          this.#onCarParamsChanged();
        });
      }
    }
  }

  #readNumericInput(
    input: HTMLInputElement | null,
    defaultVal: number,
    isInt: boolean = false,
  ): number {
    if (!input) return defaultVal;
    const parsed = isInt ? parseInt(input.value) : parseFloat(input.value);
    return parsed || defaultVal;
  }

  #parseHiddenLayers(value: string): number[] {
    const parts = value
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    return parts.length > 0 ? parts : [6];
  }

  /** Rebuild the collapsed car-config summary (icon + readonly value). */
  #updateCarConfigSummary(): void {
    if (!this.#carConfigSummary) return;
    const v = (input: HTMLInputElement | null, fallback = ''): string => {
      const value = input ? input.value.trim() : '';
      return value !== '' ? value : fallback;
    };
    const items: Array<[string, string, string]> = [
      [
        'height',
        'Height',
        v(this.#carHeightInput, String(DEFAULT_CAR_CONFIG.height)),
      ],
      [
        'width',
        'Width',
        v(this.#carWidthInput, String(DEFAULT_CAR_CONFIG.width)),
      ],
      ['brain', 'Hidden Layers', v(this.#carHiddenLayersInput)],
      ['rocket', 'Max Speed', v(this.#carMaxSpeedInput)],
      ['bolt', 'Accel', v(this.#carAccelerationInput)],
      ['tire', 'Friction', v(this.#carFrictionInput)],
      ['antenna', 'Rays', v(this.#carRayCountInput)],
      ['ruler', 'Ray Len', v(this.#carRayLengthInput)],
      ['flashlight', 'Ray Spread', v(this.#carRaySpreadInput)],
      ['target', 'Ray Offset', v(this.#carRayOffsetInput)],
      [
        'brain',
        'State Aware',
        this.#carStateAwareCheck?.checked ? 'yes' : 'no',
      ],
      [
        'bolt',
        'Physics',
        this.#carRealisticPhysicsCheck?.checked ? 'realistic' : 'arcade',
      ],
    ];
    this.#carConfigSummary.innerHTML = items
      .map(
        ([icon, label, value]) =>
          `<span class="cfg-chip" title="${label}"><span class="cfg-chip-emoji"><app-icon name="${icon}"></app-icon></span><span class="cfg-chip-value">${value}</span></span>`,
      )
      .join('');
  }

  public getCarSettings(): CarInfo {
    const hiddenLayers = this.#carHiddenLayersInput
      ? this.#parseHiddenLayers(this.#carHiddenLayersInput.value)
      : [...this.#hiddenLayers];
    return {
      maxSpeed: this.#readNumericInput(
        this.#carMaxSpeedInput,
        DEFAULT_CAR_CONFIG.maxSpeed,
      ),
      acceleration: this.#readNumericInput(
        this.#carAccelerationInput,
        DEFAULT_CAR_CONFIG.acceleration,
      ),
      friction: this.#readNumericInput(
        this.#carFrictionInput,
        DEFAULT_CAR_CONFIG.friction,
      ),
      width: this.#readNumericInput(
        this.#carWidthInput,
        DEFAULT_CAR_CONFIG.width,
        true,
      ),
      height: this.#readNumericInput(
        this.#carHeightInput,
        DEFAULT_CAR_CONFIG.height,
        true,
      ),
      hiddenLayers,
      physicsModel: this.#carRealisticPhysicsCheck?.checked
        ? 'realistic'
        : 'arcade',
      sensor: {
        rayCount: this.#readNumericInput(this.#carRayCountInput, 5, true),
        rayLength: this.#readNumericInput(this.#carRayLengthInput, 150, true),
        raySpread: this.#readNumericInput(this.#carRaySpreadInput, Math.PI / 2),
        rayOffset: this.#readNumericInput(this.#carRayOffsetInput, 0),
        stateAware: this.#carStateAwareCheck?.checked ?? false,
      },
    };
  }

  public setCarSettings(info: CarInfo): void {
    if (this.#carMaxSpeedInput)
      this.#carMaxSpeedInput.value = String(info.maxSpeed);
    if (this.#carAccelerationInput)
      this.#carAccelerationInput.value = String(info.acceleration);
    if (this.#carFrictionInput)
      this.#carFrictionInput.value = String(info.friction);
    if (this.#carWidthInput) this.#carWidthInput.value = String(info.width);
    if (this.#carHeightInput) this.#carHeightInput.value = String(info.height);
    // Prefer the explicit hiddenLayers field; otherwise infer the topology from
    // the stored brain. Legacy .car files omit hiddenLayers, so without this the
    // hidden-layers config keeps a stale/default value and the freshly-created
    // car's brain topology no longer matches the stored brain — causing the
    // brainsCompatible() guard to silently drop the trained brain.
    const hiddenLayers = info.hiddenLayers ?? inferHiddenLayers(info.brain);
    if (hiddenLayers) {
      this.#hiddenLayers = [...hiddenLayers];
      if (this.#carHiddenLayersInput) {
        this.#carHiddenLayersInput.value = hiddenLayers.join(', ');
      }
    }
    if (this.#carRayCountInput)
      this.#carRayCountInput.value = String(info.sensor.rayCount);
    if (this.#carRayLengthInput)
      this.#carRayLengthInput.value = String(info.sensor.rayLength);
    if (this.#carRaySpreadInput)
      this.#carRaySpreadInput.value = String(info.sensor.raySpread);
    if (this.#carRayOffsetInput)
      this.#carRayOffsetInput.value = String(info.sensor.rayOffset);
    if (this.#carStateAwareCheck) {
      this.#carStateAwareCheck.checked = info.sensor.stateAware ?? false;
    }
    if (this.#carRealisticPhysicsCheck) {
      this.#carRealisticPhysicsCheck.checked =
        info.physicsModel === 'realistic';
    }
    this.#updateCarConfigSummary();
  }
}
