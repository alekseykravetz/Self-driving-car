import { Light } from '../world/markings/light.js';
import { BODY_MARGIN_RATIO } from '../car/config.js';
/**
 * Shared traffic-control grid utilities, mirroring {@link spatialGridUtils}.
 *
 * Lights live on the world's `markings` list. Their polygons are static
 * (they only move when the world is edited) so the grid is rebuilt on world
 * load / edit, never per frame. Each grid entry stores a `getState` closure
 * over the live `Light` so the grid stays valid as lights cycle
 * green/yellow/red — query time reads the current state.
 */
/**
 * Extracts every traffic light from a world's markings as grid entries.
 * Returns an empty array when the world has no lights.
 */
export function buildTrafficControls(world) {
    const entries = [];
    for (let i = 0; i < world.markings.length; i++) {
        const marking = world.markings[i];
        if (marking instanceof Light) {
            const light = marking;
            entries.push({
                polygon: light.polygon.points,
                getState: () => light.state,
            });
        }
    }
    return entries;
}
/**
 * Queries the traffic-control grid for lights within the car's sensor reach
 * plus body margin, returning them in the {@link SensorTrafficControl} shape
 * the sensor consumes. Mirrors {@link queryBordersNearCar}'s broad+narrow
 * filter so a car only senses lights it could physically see.
 */
export function queryTrafficControlsNearCar(grid, car) {
    const MIN_RANGE = 100;
    const rayLength = car.sensor?.rayLength ?? MIN_RANGE;
    const reach = Math.max(rayLength, MIN_RANGE);
    const bodyMargin = Math.hypot(car.width, car.height) * BODY_MARGIN_RATIO;
    const broadRadius = reach + bodyMargin + grid.cellSize;
    return grid.query(car.x, car.y, broadRadius);
}
