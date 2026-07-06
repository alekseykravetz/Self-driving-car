import { NeuralNetwork } from '../../neural-network/network.js';
export class CarBrainAdapter {
  static computeControls(readings, speed, maxSpeed, brain) {
    const offsets = readings
      .map((s) => (s === null ? 0 : 1 - s.offset))
      .concat([speed / maxSpeed]);
    const outputs = NeuralNetwork.feedForward(offsets, brain);
    return {
      forward: !!outputs[0],
      left: !!outputs[1],
      right: !!outputs[2],
      reverse: !!outputs[3],
    };
  }
}
