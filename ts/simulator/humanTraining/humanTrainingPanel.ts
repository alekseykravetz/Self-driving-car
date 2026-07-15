import { HUMAN_TRAINING_PANEL_TEMPLATE } from './templates/humanTrainingPanelTemplate.js';

export class HumanTrainingPanelElement extends HTMLElement {
  #htMode: HTMLElement | null = null;
  #htAutopilot: HTMLInputElement | null = null;
  #htAccuracyPct: HTMLElement | null = null;
  #htKeyEls: HTMLElement[] = [];
  #htLearningRate: HTMLInputElement | null = null;
  #htLearningRateVal: HTMLElement | null = null;
  #htStatus: HTMLElement | null = null;

  #onAutopilotChange: ((enabled: boolean) => void) | null = null;
  #onLearningRateChange: ((v: number) => void) | null = null;
  #onConfig: (() => void) | null = null;
  #onDownload: (() => void) | null = null;
  #onResetBrain: (() => void) | null = null;
  #onResetCar: (() => void) | null = null;

  connectedCallback(): void {
    this.innerHTML = HUMAN_TRAINING_PANEL_TEMPLATE;
    this.#htMode = this.querySelector('#htMode');
    this.#htAutopilot = this.querySelector('#htAutopilot');
    this.#htAccuracyPct = this.querySelector('#htAccuracyPct');
    document
      .querySelectorAll<HTMLElement>('.ht-key')
      .forEach((el) => this.#htKeyEls.push(el));
    this.#htLearningRate = this.querySelector('#htLearningRate');
    this.#htLearningRateVal = this.querySelector('#htLearningRateVal');
    this.#htStatus = this.querySelector('#htStatus');

    this.#htAutopilot?.addEventListener('change', () => {
      this.#onAutopilotChange?.(this.#htAutopilot!.checked);
    });
    this.#htLearningRate?.addEventListener('input', () => {
      const v = parseFloat(this.#htLearningRate!.value);
      if (this.#htLearningRateVal)
        this.#htLearningRateVal.textContent = v.toFixed(2);
      this.#onLearningRateChange?.(v);
    });
    this.querySelector('#htConfig')?.addEventListener('click', () =>
      this.#onConfig?.(),
    );
    this.querySelector('#htDownload')?.addEventListener('click', () =>
      this.#onDownload?.(),
    );
    this.querySelector('#htResetBrain')?.addEventListener('click', () =>
      this.#onResetBrain?.(),
    );
    this.querySelector('#htResetCar')?.addEventListener('click', () =>
      this.#onResetCar?.(),
    );
  }

  setMode(mode: 'simple' | 'world'): void {
    if (this.#htMode)
      this.#htMode.textContent = mode === 'simple' ? 'Simple Road' : 'World';
  }

  setAutopilot(enabled: boolean): void {
    if (this.#htAutopilot) this.#htAutopilot.checked = enabled;
  }

  get autopilotEnabled(): boolean {
    return this.#htAutopilot?.checked ?? false;
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

  set onAutopilotChange(cb: ((enabled: boolean) => void) | null) {
    this.#onAutopilotChange = cb;
  }
  set onLearningRateChange(cb: ((v: number) => void) | null) {
    this.#onLearningRateChange = cb;
  }
  set onConfig(cb: (() => void) | null) {
    this.#onConfig = cb;
  }
  set onDownload(cb: (() => void) | null) {
    this.#onDownload = cb;
  }
  set onResetBrain(cb: (() => void) | null) {
    this.#onResetBrain = cb;
  }
  set onResetCar(cb: (() => void) | null) {
    this.#onResetCar = cb;
  }
}

customElements.define('human-training-panel', HumanTrainingPanelElement);
