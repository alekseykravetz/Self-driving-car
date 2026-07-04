interface BrainControlOutput {
  forward: boolean;
  left: boolean;
  right: boolean;
  reverse: boolean;
}

class CarBrainAdapter {
  static computeControls(
    readings: (IntersectionPoint | null)[],
    speed: number,
    maxSpeed: number,
    brain: NeuralNetwork,
  ): BrainControlOutput {
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
