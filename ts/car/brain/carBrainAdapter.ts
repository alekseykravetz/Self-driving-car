import { IntersectionPoint } from '../physics/sensorRaycaster.js';
import { NeuralNetwork } from '../../neural-network/network.js';
import { encodeTrafficState, type TrafficReading } from '../sensors/sensor.js';

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

  /**
   * Size of the neural-network input layer for a given sensor configuration.
   * Traffic-aware cars interleave a traffic-state reading next to each ray's
   * distance reading, so the input layer doubles the ray count (plus the
   * self-speed reading). Legacy cars keep the `rayCount + 1` layout.
   */
  static inputLayerSize(rayCount: number, trafficAwareness: boolean): number {
    return trafficAwareness ? rayCount * 2 + 1 : rayCount + 1;
  }

  static computeControls(
    readings: (IntersectionPoint | null)[],
    speed: number,
    maxSpeed: number,
    brain: Brain,
    trafficReadings?: (TrafficReading | null)[],
  ): BrainControlOutput {
    let offsets: number[];
    if (trafficReadings && trafficReadings.length) {
      offsets = new Array(readings.length * 2 + 1);
      for (let i = 0; i < readings.length; i++) {
        offsets[i * 2] = readings[i] === null ? 0 : 1 - readings[i]!.offset;
        offsets[i * 2 + 1] = encodeTrafficState(
          trafficReadings[i]?.state ?? null,
        );
      }
      offsets[offsets.length - 1] = speed / maxSpeed;
    } else {
      offsets = readings
        .map((s) => (s === null ? 0 : 1 - s.offset))
        .concat([speed / maxSpeed]);
    }

    const outputs = NeuralNetwork.feedForward(offsets, brain as NeuralNetwork);

    return {
      forward: !!outputs[0],
      left: !!outputs[1],
      right: !!outputs[2],
      reverse: !!outputs[3],
    };
  }
}
