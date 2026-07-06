import { Point } from '../../../math/primitives/point.js';
import { getNearestSegment, subtract, magnitude, normalize, } from '../../../math/utils.js';
import { COLLISION_ANGLE_CORRECTION } from '../../../car/config.js';
/**
 * Handles collision with road borders by pushing the car back onto the road.
 * Finds the nearest skeleton/border segment and corrects the car's position and angle.
 */
export function handleCollisionWithRoadBorders(car, bordersToCheck) {
    if (bordersToCheck.length === 0)
        return;
    const segment = getNearestSegment(new Point(car.x, car.y), bordersToCheck);
    if (!segment)
        return;
    const correctors = car.polygon.map((p) => {
        const proj = segment.projectPoint(p);
        const projPoint = proj.offset > 1 ? segment.p2 : proj.point;
        return subtract(projPoint, p);
    });
    if (correctors.length === 0)
        return;
    const magnitudes = correctors.map((p) => magnitude(p));
    const maxMagnitude = Math.max(...magnitudes);
    const correctorIndex = magnitudes.findIndex((mag) => mag === maxMagnitude);
    if (correctorIndex === -1)
        return;
    const corrector = correctors[correctorIndex];
    const normalizedCorrector = normalize(corrector);
    if (correctorIndex === 0 || correctorIndex === 3) {
        car.angle += COLLISION_ANGLE_CORRECTION;
    }
    else {
        car.angle -= COLLISION_ANGLE_CORRECTION;
    }
    car.x += normalizedCorrector.x;
    car.y += normalizedCorrector.y;
    car.damaged = false;
}
