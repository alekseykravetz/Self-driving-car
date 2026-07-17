import { HUMAN_TRAINING_PANEL_TEMPLATE } from './templates/humanTrainingPanelTemplate.js';
export class HumanTrainingPanelElement extends HTMLElement {
    #htMode = null;
    #htAutopilot = null;
    #htAutopilotBanner = null;
    #htAccuracyPct = null;
    #htKeyEls = [];
    #htLearningRate = null;
    #htLearningRateVal = null;
    #htStatus = null;
    #htSpeed = null;
    #htLearningState = null;
    #htWeightIndicator = null;
    #htTrainingFrames = null;
    #htBrainInspector = null;
    #htKeyForwardPct = null;
    #htKeyLeftPct = null;
    #htKeyRightPct = null;
    #htKeyReversePct = null;
    #learningActive = true;
    #onAutopilotChange = null;
    #onLearningRateChange = null;
    #onConfig = null;
    #onDownload = null;
    #onResetBrain = null;
    #onResetCar = null;
    connectedCallback() {
        this.innerHTML = HUMAN_TRAINING_PANEL_TEMPLATE;
        this.#htMode = this.querySelector('#htMode');
        this.#htAutopilot = this.querySelector('#htAutopilot');
        this.#htAutopilotBanner = this.querySelector('#htAutopilotBanner');
        this.#htAccuracyPct = this.querySelector('#htAccuracyPct');
        document
            .querySelectorAll('.ht-key')
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
        this.#htAutopilot?.addEventListener('change', () => {
            this.#onAutopilotChange?.(this.#htAutopilot.checked);
        });
        this.#htLearningRate?.addEventListener('input', () => {
            const v = parseFloat(this.#htLearningRate.value);
            if (this.#htLearningRateVal)
                this.#htLearningRateVal.textContent = v.toFixed(2);
            this.#onLearningRateChange?.(v);
        });
        this.querySelector('#htConfig')?.addEventListener('click', () => this.#onConfig?.());
        this.querySelector('#htDownload')?.addEventListener('click', () => this.#onDownload?.());
        this.querySelector('#htResetBrain')?.addEventListener('click', () => this.#onResetBrain?.());
        this.querySelector('#htResetCar')?.addEventListener('click', () => this.#onResetCar?.());
    }
    setMode(mode) {
        if (this.#htMode)
            this.#htMode.textContent = mode === 'simple' ? 'Simple Road' : 'World';
    }
    setAutopilot(enabled) {
        if (this.#htAutopilot)
            this.#htAutopilot.checked = enabled;
    }
    get autopilotEnabled() {
        return this.#htAutopilot?.checked ?? false;
    }
    get learningRate() {
        return parseFloat(this.#htLearningRate?.value ?? '0.1');
    }
    setAccuracy(match, pct) {
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
            }
            else if (m) {
                el.classList.add('match');
            }
            else {
                el.classList.add('mismatch');
            }
        }
    }
    setStatus(text) {
        if (this.#htStatus)
            this.#htStatus.textContent = text;
    }
    set onAutopilotChange(cb) {
        this.#onAutopilotChange = cb;
    }
    set onLearningRateChange(cb) {
        this.#onLearningRateChange = cb;
    }
    set onConfig(cb) {
        this.#onConfig = cb;
    }
    set onDownload(cb) {
        this.#onDownload = cb;
    }
    set onResetBrain(cb) {
        this.#onResetBrain = cb;
    }
    set onResetCar(cb) {
        this.#onResetCar = cb;
    }
    setSpeed(kmh) {
        if (this.#htSpeed) {
            this.#htSpeed.textContent = `${kmh.toFixed(1)} km/h`;
        }
    }
    setLearningState(active) {
        this.#learningActive = active;
        if (this.#htLearningState) {
            this.#htLearningState.textContent = active ? 'LEARNING' : 'PAUSED';
            this.#htLearningState.className =
                'ht-learning-state ' + (active ? 'learning' : 'paused');
        }
    }
    setAutopilotActive(active) {
        if (this.#htAutopilotBanner) {
            this.#htAutopilotBanner.style.display = active ? 'block' : 'none';
        }
        if (active) {
            this.setLearningState(false);
        }
        else {
            this.setLearningState(this.#learningActive);
        }
    }
    setWeightChangePulse(active) {
        if (this.#htWeightIndicator) {
            this.#htWeightIndicator.classList.toggle('pulse', active);
        }
    }
    setTrainingFrames(count) {
        if (this.#htTrainingFrames) {
            this.#htTrainingFrames.textContent = count.toLocaleString();
        }
    }
    setBrainInfo(html) {
        if (this.#htBrainInspector) {
            this.#htBrainInspector.innerHTML = html;
        }
    }
    setPerChannelAccuracy(pcts) {
        const els = [
            this.#htKeyForwardPct,
            this.#htKeyLeftPct,
            this.#htKeyRightPct,
            this.#htKeyReversePct,
        ];
        for (let i = 0; i < els.length && i < pcts.length; i++) {
            if (els[i]) {
                els[i].textContent = pcts[i] !== null ? `${pcts[i]}%` : '\u2014';
            }
        }
    }
}
customElements.define('human-training-panel', HumanTrainingPanelElement);
