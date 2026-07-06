import { IntersectionPoint } from '../physics/sensorRaycaster.js';
import { NeuralNetwork } from '../../neural-network/network.js';

export type Brain = unknown;

export interface BrainControlOutput {
  forward: boolean;
  left: boolean;
  right: boolean;
  reverse: boolean;
}

export class CarBrainAdapter {
  static createBrain(layerCounts: number[]): Brain {
    return new NeuralNetwork(layerCounts);
  }

  static serialize(brain: Brain): unknown {
    return NeuralNetwork.clone(brain as NeuralNetwork);
  }

  static deserialize(data: unknown): Brain | undefined {
    if (!data) return undefined;
    return NeuralNetwork.deserialize(data);
  }

  static computeControls(
    readings: (IntersectionPoint | null)[],
    speed: number,
    maxSpeed: number,
    brain: Brain,
  ): BrainControlOutput {
    const offsets = readings
      .map((s) => (s === null ? 0 : 1 - s.offset))
      .concat([speed / maxSpeed]);
    const outputs = NeuralNetwork.feedForward(offsets, brain as NeuralNetwork);

    return {
      forward: !!outputs[0],
      left: !!outputs[1],
      right: !!outputs[2],
      reverse: !!outputs[3],
    };
  }
}
