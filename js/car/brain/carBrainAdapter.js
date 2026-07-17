import { NeuralNetwork } from '../../neural-network/network.js';
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
     * State-aware sensors interleave a state reading next to each ray's distance
     * reading, so the input layer doubles the ray count (plus self-speed).
     * Legacy sensors keep the `rayCount + 1` layout.
     */
    static inputLayerSize(rayCount, stateAware) {
        return stateAware ? rayCount * 2 + 1 : rayCount + 1;
    }
    static brainsCompatible(brain, rayCount, stateAware) {
        const nn = brain;
        if (!nn.levels || nn.levels.length === 0)
            return false;
        const expectedInput = CarBrainAdapter.inputLayerSize(rayCount, stateAware);
        return nn.levels[0].inputs.length === expectedInput;
    }
    /**
     * Build the input vector for the neural network from sensor readings.
     * Exposed separately so callers (e.g., replay buffer) can store the input
     * without also running inference.
     */
    static buildInput(readings, speed, maxSpeed, sensorReadings, stateAware) {
        if (stateAware && sensorReadings) {
            const offsets = new Array(sensorReadings.length * 2 + 1);
            for (let i = 0; i < sensorReadings.length; i++) {
                const sr = sensorReadings[i];
                offsets[i * 2] = sr === null ? 0 : 1 - sr.distance;
                offsets[i * 2 + 1] = sr?.state ?? 0;
            }
            offsets[offsets.length - 1] = speed / maxSpeed;
            return offsets;
        }
        else {
            return readings
                .map((s) => (s === null ? 0 : 1 - s.offset))
                .concat([speed / maxSpeed]);
        }
    }
    static trainStep(brain, inputs, targets, lr) {
        return NeuralNetwork.trainStep(brain, inputs, targets, lr);
    }
    static computeControls(readings, speed, maxSpeed, brain, sensorReadings, stateAware) {
        const offsets = CarBrainAdapter.buildInput(readings, speed, maxSpeed, sensorReadings, stateAware);
        const outputs = NeuralNetwork.feedForward(offsets, brain);
        return {
            forward: !!outputs[0],
            left: !!outputs[1],
            right: !!outputs[2],
            reverse: !!outputs[3],
        };
    }
}
