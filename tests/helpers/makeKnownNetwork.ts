import { Level, NeuralNetwork } from '../../ts/neural-network/network.js';

export function makeKnownNetwork(
  layerCounts: number[],
  weights: number[][][],
  biases: number[][],
): NeuralNetwork {
  const net = new NeuralNetwork([]);
  net.levels = layerCounts.slice(0, -1).map((inputCount, levelIdx) => {
    const outputCount = layerCounts[levelIdx + 1];
    const level = new Level(inputCount, outputCount);
    level.biases = [...biases[levelIdx]];
    level.weights = weights[levelIdx].map((w) => [...w]);
    return level;
  });
  return net;
}
