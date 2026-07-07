import { SensorRaycaster, } from '../physics/sensorRaycaster.js';
import { DEFAULT_CAR_CONFIG } from '../config.js';
import { getIntersectionOffset } from '../../math/utils.js';
/**
 * Encodes a traffic light state into the numeric input the neural network
 * consumes: `1` for green (go), `0.5` for yellow (caution), `0` for red/off
 * or "no light seen along this ray".
 */
export function encodeTrafficState(state) {
    switch (state) {
        case 'green':
            return 1;
        case 'yellow':
            return 0.5;
        default:
            return 0;
    }
}
export class Sensor {
    rayCount;
    rayLength;
    raySpread;
    rayOffset;
    trafficAwareness;
    rays;
    readings;
    /**
     * Per-ray traffic-light state. `null` means no traffic control was seen
     * along that ray (or the sensor is not traffic-aware). Populated only when
     * `trafficAwareness` is true and traffic controls were supplied to
     * {@link update}.
     */
    trafficReadings;
    constructor(config) {
        this.rayCount = config?.rayCount ?? DEFAULT_CAR_CONFIG.sensor.rayCount;
        this.rayLength = config?.rayLength ?? DEFAULT_CAR_CONFIG.sensor.rayLength;
        this.raySpread = config?.raySpread ?? DEFAULT_CAR_CONFIG.sensor.raySpread;
        this.rayOffset = config?.rayOffset ?? DEFAULT_CAR_CONFIG.sensor.rayOffset;
        this.trafficAwareness = config?.trafficAwareness ?? false;
        this.rays = [];
        this.readings = [];
        this.trafficReadings = [];
    }
    update(x, y, angle, polygons = [], trafficControls) {
        this.rays = SensorRaycaster.castRays(x, y, angle, this.rayCount, this.rayLength, this.raySpread, this.rayOffset);
        this.readings = SensorRaycaster.getReadings(this.rays, polygons);
        if (this.trafficAwareness && trafficControls && trafficControls.length) {
            this.trafficReadings = this.#getTrafficReadings(this.rays, this.readings, trafficControls);
        }
        else {
            this.trafficReadings = new Array(this.rays.length).fill(null);
        }
    }
    /**
     * Per-ray traffic-state detection. For each ray we find the closest traffic
     * control polygon it intersects; if that hit is closer than the road-border
     * hit (i.e. the light is in front of the wall, not behind it) the car "sees"
     * that light's state. Otherwise the ray sees no light.
     */
    #getTrafficReadings(rays, borderReadings, trafficControls) {
        const result = new Array(rays.length).fill(null);
        if (trafficControls.length === 0)
            return result;
        for (let i = 0; i < rays.length; i++) {
            const ray = rays[i];
            const borderOffset = borderReadings[i]?.offset ?? Infinity;
            let minOffset = Infinity;
            let minState = null;
            for (let c = 0; c < trafficControls.length; c++) {
                const poly = trafficControls[c].polygon;
                if (poly.length < 2)
                    continue;
                const edgeCount = poly.length === 2 ? 1 : poly.length;
                for (let j = 0; j < edgeCount; j++) {
                    const offset = getIntersectionOffset(ray[0], ray[1], poly[j], poly[(j + 1) % poly.length]);
                    if (offset >= 0 && offset < minOffset && offset < borderOffset) {
                        minOffset = offset;
                        minState = trafficControls[c].state;
                    }
                }
            }
            if (minState !== null) {
                result[i] = minState;
            }
        }
        return result;
    }
    draw(ctx) {
        for (let i = 0; i < this.rays.length; i++) {
            const reading = this.readings[i];
            if (!reading) {
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'yellow';
                ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
                ctx.lineTo(this.rays[i][1].x, this.rays[i][1].y);
                ctx.stroke();
                ctx.restore();
                continue;
            }
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'yellow';
            ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
            ctx.lineTo(reading.x, reading.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.fillStyle = 'yellow';
            ctx.arc(reading.x, reading.y, 3, 0, Math.PI * 2);
            ctx.fill();
            // Traffic-light indicator on the best car's sensor display.
            const traffic = this.trafficReadings[i];
            if (traffic) {
                ctx.beginPath();
                ctx.fillStyle =
                    traffic === 'green' ? '#0F0' : traffic === 'yellow' ? '#FF0' : '#F00';
                ctx.arc(reading.x, reading.y - 8, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
