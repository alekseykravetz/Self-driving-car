import { CarBrainAdapter, type Brain } from './carBrainAdapter.js';

export interface ControlSnapshot {
  forward: boolean;
  left: boolean;
  right: boolean;
  reverse: boolean;
}

export interface LearnArgs {
  brain: Brain;
  inputs: number[];
  controls: ControlSnapshot;
}

interface ReplayEntry {
  inputs: number[];
  targets: number[];
  isTurn: boolean;
}

/**
 * Owns the online human-imitation learning subsystem extracted from `Car`:
 * an experience-replay ring buffer, class-balanced batch sampling,
 * per-output learning rates, and decision-point detection. Trains exclusively
 * through `CarBrainAdapter` so it never depends on `NeuralNetwork` directly.
 *
 * Inert for all non-learning cars (AI/genetic/traffic/race) — `learn` is only
 * called when a car is learning from a human driver.
 */
export class CarLearningManager {
  #learningRate: number = 0.1;
  #lastBrainOutput: ControlSnapshot = {
    forward: false,
    left: false,
    right: false,
    reverse: false,
  };
  #brainChangedThisFrame: boolean = false;

  #replayBuffer: ReplayEntry[] = [];
  #replayBufferMaxSize: number = 4096;
  #batchSize: number = 16;
  #prevControlState: ControlSnapshot | null = null;

  set learningRate(v: number) {
    this.#learningRate = v;
  }

  get learningRate(): number {
    return this.#learningRate;
  }

  setLearningRate(v: number): void {
    this.#learningRate = v;
  }

  get lastBrainOutput(): ControlSnapshot {
    return this.#lastBrainOutput;
  }

  setLastBrainOutput(output: ControlSnapshot): void {
    this.#lastBrainOutput = output;
  }

  get brainChangedThisFrame(): boolean {
    return this.#brainChangedThisFrame;
  }

  /** Reset the per-frame brain-change flag. Called at the start of each frame. */
  resetFrame(): void {
    this.#brainChangedThisFrame = false;
  }

  /**
   * Record the current human control state as a replay sample and train the
   * brain from a class-balanced batch. Returns whether any weight/bias changed.
   * The result is also stored in `brainChangedThisFrame`.
   */
  learn(args: LearnArgs): boolean {
    const { brain, inputs, controls } = args;
    const targets: [number, number, number, number] = [
      controls.forward ? 1 : 0,
      controls.left ? 1 : 0,
      controls.right ? 1 : 0,
      controls.reverse ? 1 : 0,
    ];

    const prev = this.#prevControlState;
    const isDecisionPoint =
      prev !== null &&
      (targets[0] !== (prev.forward ? 1 : 0) ||
        targets[1] !== (prev.left ? 1 : 0) ||
        targets[2] !== (prev.right ? 1 : 0) ||
        targets[3] !== (prev.reverse ? 1 : 0));
    this.#prevControlState = {
      forward: controls.forward,
      left: controls.left,
      right: controls.right,
      reverse: controls.reverse,
    };

    const isTurn = targets[1] === 1 || targets[2] === 1;
    this.#replayBuffer.push({ inputs, targets, isTurn });
    if (this.#replayBuffer.length > this.#replayBufferMaxSize) {
      this.#replayBuffer.shift();
    }

    // Per-output learning rates. Turn channels (left/right) are rare relative
    // to forward, so give them a boost even though the replay batch is
    // class-balanced. No division by batch size — each replay sample is a full
    // SGD step.
    const lr = this.#learningRate;
    const perOutputLR: [number, number, number, number] = [
      lr,
      lr * 1.5,
      lr * 1.5,
      lr,
    ];

    let changed = this.#trainBatch(brain, perOutputLR);

    if (isDecisionPoint) {
      for (let i = 0; i < 3; i++) {
        if (CarBrainAdapter.trainStep(brain, inputs, targets, perOutputLR)) {
          changed = true;
        }
      }
    }

    this.#brainChangedThisFrame = changed;
    return changed;
  }

  #trainBatch(brain: Brain, lr: [number, number, number, number]): boolean {
    const buffer = this.#replayBuffer;
    const bufferLen = buffer.length;
    let changed = false;

    if (bufferLen < this.#batchSize) {
      for (let i = 0; i < bufferLen; i++) {
        if (
          CarBrainAdapter.trainStep(
            brain,
            buffer[i].inputs,
            buffer[i].targets,
            lr,
          )
        ) {
          changed = true;
        }
      }
      return changed;
    }

    const turnIdx: number[] = [];
    const straightIdx: number[] = [];
    for (let i = 0; i < bufferLen; i++) {
      if (buffer[i].isTurn) turnIdx.push(i);
      else straightIdx.push(i);
    }

    const halfBatch = this.#batchSize >> 1;
    const selected: number[] = [];

    for (let i = 0; i < halfBatch && turnIdx.length > 0; i++) {
      selected.push(
        turnIdx.splice(Math.floor(Math.random() * turnIdx.length), 1)[0],
      );
    }
    for (
      let i = selected.length;
      i < this.#batchSize && straightIdx.length > 0;
      i++
    ) {
      selected.push(
        straightIdx.splice(
          Math.floor(Math.random() * straightIdx.length),
          1,
        )[0],
      );
    }
    while (selected.length < this.#batchSize) {
      const idx = Math.floor(Math.random() * bufferLen);
      if (!selected.includes(idx)) selected.push(idx);
    }

    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = selected[i];
      selected[i] = selected[j];
      selected[j] = tmp;
    }

    for (const idx of selected) {
      if (
        CarBrainAdapter.trainStep(
          brain,
          buffer[idx].inputs,
          buffer[idx].targets,
          lr,
        )
      ) {
        changed = true;
      }
    }

    return changed;
  }
}
