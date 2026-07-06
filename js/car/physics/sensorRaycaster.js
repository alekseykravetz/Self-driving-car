import { lerp, getIntersectionOffset } from '../../math/utils.js';
export class SensorRaycaster {
    static castRays(carX, carY, carAngle, rayCount, rayLength, raySpread, rayOffset) {
        const rays = [];
        for (let i = 0; i < rayCount; i++) {
            const rayAngle = lerp(raySpread / 2, -raySpread / 2, rayCount === 1 ? 0.5 : i / (rayCount - 1)) +
                carAngle +
                rayOffset;
            const start = { x: carX, y: carY };
            const end = {
                x: carX - Math.sin(rayAngle) * rayLength,
                y: carY - Math.cos(rayAngle) * rayLength,
            };
            rays.push([start, end]);
        }
        return rays;
    }
    static getReadings(rays, polygons) {
        const readings = [];
        for (let i = 0; i < rays.length; i++) {
            readings.push(this.getReading(rays[i], polygons));
        }
        return readings;
    }
    static getReading(ray, polygons) {
        let minOffset = Infinity;
        for (let i = 0; i < polygons.length; i++) {
            const poly = polygons[i];
            if (poly.length < 2) {
                console.warn(`The polygon at index ${i} has less than 2 points.`);
                continue;
            }
            const edgeCount = poly.length === 2 ? 1 : poly.length;
            for (let j = 0; j < edgeCount; j++) {
                const offset = getIntersectionOffset(ray[0], ray[1], poly[j], poly[(j + 1) % poly.length]);
                if (offset >= 0 && offset < minOffset) {
                    minOffset = offset;
                }
            }
        }
        if (minOffset === Infinity) {
            return null;
        }
        return {
            x: lerp(ray[0].x, ray[1].x, minOffset),
            y: lerp(ray[0].y, ray[1].y, minOffset),
            offset: minOffset,
        };
    }
}
