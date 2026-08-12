import { HUMAN_TRAINING_PANEL_TEMPLATE } from '../../simulator/humanTraining/templates/humanTrainingPanelTemplate.js';
import type { CarInfo } from '../../car/car.js';
import { CarConfigPanel } from '../molecules/carConfigPanel.js';

export class HumanTrainingPanelElement extends HTMLElement {
  #htMode: HTMLElement | null = null;
  #htAutopilotBanner: HTMLElement | null = null;
  #htAccuracyPct: HTMLElement | null = null;
  #htKeyEls: HTMLElement[] = [];
  #htLearningRate: HTMLInputElement | null = null;
  #htLearningRateVal: HTMLElement | null = null;
  #htStatus: HTMLElement | null = null;
  #htStorageDot: HTMLElement | null = null;
  #htSpeed: HTMLElement | null = null;
  #htLearningState: HTMLElement | null = null;
  #htWeightIndicator: HTMLElement | null = null;
  #htTrainingFrames: HTMLElement | null = null;
  #htBrainInspector: HTMLElement | null = null;
  #htKeyForwardPct: HTMLElement | null = null;
  #htKeyLeftPct: HTMLElement | null = null;
  #htKeyRightPct: HTMLElement | null = null;
  #htKeyReversePct: HTMLElement | null = null;
  #carConfigPanel: CarConfigPanel | null = null;

  #onLearningRateChange: ((v: number) => void) | null = null;
  #onSave: (() => void) | null = null;
  #onClear: (() => void) | null = null;
  #onDownload: (() => void) | null = null;
  #onNewBrain: (() => void) | null = null;
  #onRestartDrive: (() => void) | null = null;
  #onCarParamsChanged: (() => void) | null = null;

  connectedCallback(): void {
    this.innerHTML = HUMAN_TRAINING_PANEL_TEMPLATE;
    this.#htMode = this.querySelector('#htMode');
    this.#htStorageDot = this.querySelector('#htStorageDot');
    this.#carConfigPanel = new CarConfigPanel(this, () =>
      this.#onCarParamsChanged?.(),
    );
    this.#htAutopilotBanner = this.querySelector('#htAutopilotBanner');
    this.#htAccuracyPct = this.querySelector('#htAccuracyPct');
    document
      .querySelectorAll<HTMLElement>('.ht-key')
      .forEach((el) => this.#htKeyEls.push(el));
    this.#htLearningRate = this.querySelector('#htLearningRate');
    this.#htLearningRateVal = this.querySelector('#htLearningRateVal');
    this.#htStatus = this.querySelector('#htStatus');
    this.#htSpeed = this.querySelector('#htSpeed');
    this.#htLearningState = this.querySelector('#htLearningState');
    this.#htWeightIndicator = this.querySelector('#htWeightIndicator');
    this.#htTrainingFrames = this.querySelector('#htTrainingFrames');
    this.#htBrainInspector = this.querySelector('#htBrainInspector');
    this.#htKeyForwardPct = this.querySelector('#htKeyForwardPct');
    this.#htKeyLeftPct = this.querySelector('#htKeyLeftPct');
    this.#htKeyRightPct = this.querySelector('#htKeyRightPct');
    this.#htKeyReversePct = this.querySelector('#htKeyReversePct');

    this.#htLearningRate?.addEventListener('input', () => {
      const v = parseFloat(this.#htLearningRate!.value);
      if (this.#htLearningRateVal)
        this.#htLearningRateVal.textContent = v.toFixed(2);
      this.#onLearningRateChange?.(v);
    });
    this.querySelector('#htSave')?.addEventListener('click', () =>
      this.#onSave?.(),
    );
    this.querySelector('#htClear')?.addEventListener('click', () =>
      this.#onClear?.(),
    );
    this.querySelector('#htDownload')?.addEventListener('click', () =>
      this.#onDownload?.(),
    );
    this.querySelector('#htNewBrain')?.addEventListener('click', () =>
      this.#onNewBrain?.(),
    );
    this.querySelector('#htRestartDrive')?.addEventListener('click', () =>
      this.#onRestartDrive?.(),
    );
  }

  /** Read the current car/sensor settings from the inline Car Config section. */
  getCarSettings(): CarInfo | null {
    return this.#carConfigPanel?.getCarSettings() ?? null;
  }

  /** Write car/sensor settings into the inline Car Config section. */
  setCarSettings(info: CarInfo): void {
    this.#carConfigPanel?.setCarSettings(info);
  }

  /** Green dot = brain matches localStorage; orange = unsaved changes. */
  setSaveState(saved: boolean): void {
    if (!this.#htStorageDot) return;
    this.#htStorageDot.classList.toggle('green', saved);
    this.#htStorageDot.classList.toggle('orange', !saved);
  }

  setMode(mode: 'simple' | 'world'): void {
    if (this.#htMode)
      this.#htMode.textContent = mode === 'simple' ? 'Simple Road' : 'World';
  }

  get learningRate(): number {
    return parseFloat(this.#htLearningRate?.value ?? '0.1');
  }

  setAccuracy(match: (boolean | null)[], pct: number | null): void {
    if (this.#htAccuracyPct) {
      this.#htAccuracyPct.textContent =
        pct !== null ? `Network accuracy: ${pct}%` : 'Network accuracy: —';
    }
    for (let i = 0; i < this.#htKeyEls.length && i < match.length; i++) {
      const el = this.#htKeyEls[i];
      const m = match[i];
      el.classList.remove('match', 'mismatch', 'idle');
      if (m === null) {
        el.classList.add('idle');
      } else if (m) {
        el.classList.add('match');
      } else {
        el.classList.add('mismatch');
      }
    }
  }

  setStatus(text: string): void {
    if (this.#htStatus) this.#htStatus.textContent = text;
  }

  set onLearningRateChange(cb: ((v: number) => void) | null) {
    this.#onLearningRateChange = cb;
  }
  set onSave(cb: (() => void) | null) {
    this.#onSave = cb;
  }
  set onClear(cb: (() => void) | null) {
    this.#onClear = cb;
  }
  set onDownload(cb: (() => void) | null) {
    this.#onDownload = cb;
  }
  set onNewBrain(cb: (() => void) | null) {
    this.#onNewBrain = cb;
  }
  set onRestartDrive(cb: (() => void) | null) {
    this.#onRestartDrive = cb;
  }
  set onCarParamsChanged(cb: (() => void) | null) {
    this.#onCarParamsChanged = cb;
  }

  setSpeed(kmh: number): void {
    if (this.#htSpeed) {
      this.#htSpeed.textContent = `${kmh.toFixed(1)} km/h`;
    }
  }

  setLearningState(active: boolean): void {
    if (this.#htLearningState) {
      this.#htLearningState.textContent = active ? 'LEARNING' : 'PAUSED';
      this.#htLearningState.className =
        'ht-learning-state ' + (active ? 'learning' : 'paused');
    }
  }

  setAutopilotActive(active: boolean): void {
    if (this.#htAutopilotBanner) {
      this.#htAutopilotBanner.style.display = active ? 'block' : 'none';
    }
  }

  setWeightChangePulse(active: boolean): void {
    if (this.#htWeightIndicator) {
      this.#htWeightIndicator.classList.toggle('pulse', active);
    }
  }

  setTrainingFrames(count: number): void {
    if (this.#htTrainingFrames) {
      this.#htTrainingFrames.textContent = count.toLocaleString();
    }
  }

  setBrainInfo(html: string): void {
    if (this.#htBrainInspector) {
      this.#htBrainInspector.innerHTML = html;
    }
  }

  setPerChannelAccuracy(pcts: (number | null)[]): void {
    const els = [
      this.#htKeyForwardPct,
      this.#htKeyLeftPct,
      this.#htKeyRightPct,
      this.#htKeyReversePct,
    ];
    for (let i = 0; i < els.length && i < pcts.length; i++) {
      if (els[i]) {
        els[i]!.textContent = pcts[i] !== null ? `${pcts[i]}%` : '\u2014';
      }
    }
  }
}

customElements.define('human-training-panel', HumanTrainingPanelElement);
