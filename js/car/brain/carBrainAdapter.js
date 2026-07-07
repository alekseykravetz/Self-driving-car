import { NeuralNetwork } from '../../neural-network/network.js';
import { encodeTrafficState } from '../sensors/sensor.js';
export class CarBrainAdapter {
    static createBrain(layerCounts) {
        return new NeuralNetwork(layerCounts);
    }
    static serialize(brain) {
        return NeuralNetwork.clone(brain);
    }
    static deserialize(data) {
        if (!data)
            return undefined;
        return NeuralNetwork.deserialize(data);
    }
    /**
     * Size of the neural-network input layer for a given sensor configuration.
     * Traffic-aware cars interleave a traffic-state reading next to each ray's
     * distance reading, so the input layer doubles the ray count (plus the
     * self-speed reading). Legacy cars keep the `rayCount + 1` layout.
     * Classified sensors produce rayCount * 5 + 1 inputs.
     */
    static inputLayerSize(rayCount, sophistication) {
        switch (sophistication) {
            case 'classified':
                return rayCount * 5 + 1;
            case 'traffic':
                return rayCount * 2 + 1;
            default:
                return rayCount + 1;
        }
    }
    static computeControls(readings, speed, maxSpeed, brain, trafficReadings, sophistication, classifiedReadings) {
        let offsets;
        if (sophistication === 'classified' && classifiedReadings) {
            offsets = new Array(classifiedReadings.length * 5 + 1);
            for (let i = 0; i < classifiedReadings.length; i++) {
                const r = classifiedReadings[i];
                const base = i * 5;
                offsets[base] = r === null ? 0 : 1 - r.distance;
                offsets[base + 1] = r?.type === 'border' ? 1 : 0;
                offsets[base + 2] = r?.type === 'car' ? 1 : 0;
                offsets[base + 3] = r?.type === 'trafficControl' ? 1 : 0;
                offsets[base + 4] = r?.controlState ?? 0;
            }
            offsets[offsets.length - 1] = speed / maxSpeed;
        }
        else if (trafficReadings && trafficReadings.length) {
            offsets = new Array(readings.length * 2 + 1);
            for (let i = 0; i < readings.length; i++) {
                offsets[i * 2] = readings[i] === null ? 0 : 1 - readings[i].offset;
                offsets[i * 2 + 1] = encodeTrafficState(trafficReadings[i]?.state ?? null);
            }
            offsets[offsets.length - 1] = speed / maxSpeed;
        }
        else {
            offsets = readings
                .map((s) => (s === null ? 0 : 1 - s.offset))
                .concat([speed / maxSpeed]);
        }
        const outputs = NeuralNetwork.feedForward(offsets, brain);
        return {
            forward: !!outputs[0],
            left: !!outputs[1],
            right: !!outputs[2],
            reverse: !!outputs[3],
        };
    }
}
