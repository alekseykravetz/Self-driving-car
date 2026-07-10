import { Car } from '../../../car/car.js';
import { NeuralNetwork } from '../../../neural-network/network.js';
export function createCarsForTraining(count, type, config, startInfo) {
    const cars = [];
    const color = type === 'AI' ? 'blue' : 'red';
    for (let i = 1; i <= count; i++) {
        const car = new Car({
            x: startInfo.x,
            y: startInfo.y,
            width: config.width,
            height: config.height,
            controlType: type,
            angle: startInfo.angle,
            maxSpeed: config.maxSpeed,
            acceleration: config.acceleration,
            friction: config.friction,
            color,
            hiddenLayers: config.hiddenLayers,
            sensor: config.sensor,
        });
        car.name = type === 'KEYS' ? 'K' : String(i);
        cars.push(car);
    }
    return cars;
}
/**
 * Check two brains for structural compatibility (same layer counts and
 * input/output sizes). Since different sensor stateAware modes produce
 * different input-layer sizes (stateAware=false → rayCount+1,
 * stateAware=true → rayCount*2+1), cross-mode swaps are automatically
 * rejected — the input layer dimensions won't match.
 */
export function brainsCompatible(a, b) {
    const na = a;
    const nb = b;
    if (!na || !nb)
        return false;
    if (na.levels.length !== nb.levels.length)
        return false;
    for (let i = 0; i < na.levels.length; i++) {
        if (na.levels[i].inputs.length !== nb.levels[i].inputs.length ||
            na.levels[i].outputs.length !== nb.levels[i].outputs.length) {
            return false;
        }
    }
    return true;
}
export function inferHiddenLayers(brain) {
    const nn = brain;
    if (!nn || nn.levels.length < 2)
        return null;
    return nn.levels.slice(0, -1).map((l) => l.outputs.length);
}
export function applyPoolToCars(cars, pool, mutationRate) {
    if (pool.length === 0)
        return;
    const brains = pool.filter((c) => c.brain).map((c) => c.brain);
    let aiIndex = 0;
    for (let i = 0; i < cars.length; i++) {
        if (cars[i].type === 'KEYS')
            continue;
        if (brains.length > 0 && cars[i].brain) {
            if (aiIndex < brains.length) {
                if (brainsCompatible(brains[aiIndex], cars[i].brain)) {
                    cars[i].brain = NeuralNetwork.clone(brains[aiIndex]);
                }
            }
            else {
                const mutated = NeuralNetwork.mutateFromPool(brains, mutationRate);
                if (brainsCompatible(mutated, cars[i].brain)) {
                    cars[i].brain = mutated;
                }
            }
        }
        aiIndex++;
    }
}
export function getSortedAICars(cars, evaluateFitness) {
    return cars
        .filter((c) => c.brain && c.type !== 'KEYS')
        .sort((a, b) => evaluateFitness(b) - evaluateFitness(a));
}
export function getTopAICars(cars, evaluateFitness, k) {
    if (k <= 0)
        return [];
    const top = [];
    const topFit = [];
    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        if (!car.brain || car.type === 'KEYS')
            continue;
        const fit = evaluateFitness(car);
        if (top.length === k && fit <= topFit[top.length - 1])
            continue;
        let pos = top.length < k ? top.length : k - 1;
        while (pos > 0 && topFit[pos - 1] < fit) {
            top[pos] = top[pos - 1];
            topFit[pos] = topFit[pos - 1];
            pos--;
        }
        top[pos] = car;
        topFit[pos] = fit;
    }
    return top;
}
export function getTopCarInfoPool(cars, evaluateFitness, poolSize) {
    return getSortedAICars(cars, evaluateFitness)
        .slice(0, poolSize)
        .map((c) => c.toInfo());
}
