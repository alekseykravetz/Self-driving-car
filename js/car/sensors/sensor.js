import { SensorRaycaster, } from '../physics/sensorRaycaster.js';
import { DEFAULT_CAR_CONFIG } from '../config.js';
import { lerp } from '../../math/utils.js';
import { nearestEdgeOffset } from '../../math/collision.js';
const TRAFFIC_STATE_RED_THRESHOLD = 0.9;
const TRAFFIC_STATE_YELLOW_THRESHOLD = 0.4;
const BASIC_RAY_DOT_RADIUS = 3;
const TRAFFIC_RAY_DOT_RADIUS = 4;
export function encodeTrafficState(state) {
    switch (state) {
        case 'red':
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
    stateAware;
    rays;
    readings;
    sensorReadings;
    constructor(config) {
        this.rayCount = config?.rayCount ?? DEFAULT_CAR_CONFIG.sensor.rayCount;
        this.rayLength = config?.rayLength ?? DEFAULT_CAR_CONFIG.sensor.rayLength;
        this.raySpread = config?.raySpread ?? DEFAULT_CAR_CONFIG.sensor.raySpread;
        this.rayOffset = config?.rayOffset ?? DEFAULT_CAR_CONFIG.sensor.rayOffset;
        this.stateAware = config?.stateAware ?? false;
        this.rays = [];
        this.readings = [];
        this.sensorReadings = [];
    }
    update(x, y, angle, borders = [], trafficControls, otherCars) {
        this.rays = SensorRaycaster.castRays(x, y, angle, this.rayCount, this.rayLength, this.raySpread, this.rayOffset);
        this.readings = SensorRaycaster.getReadings(this.rays, borders);
        if (this.stateAware) {
            this.sensorReadings = this.#getStateAwareReadings(this.rays, this.readings, trafficControls ?? [], otherCars ?? []);
        }
        else {
            this.sensorReadings = new Array(this.rays.length).fill(null);
        }
    }
    #getStateAwareReadings(rays, borderReadings, trafficControls, otherCars) {
        return rays.map((ray, i) => {
            const borderHit = borderReadings[i];
            let minOffset = borderHit?.offset ?? Infinity;
            let state = 0;
            let type = 'border';
            let hitX = borderHit?.x ?? ray[1].x;
            let hitY = borderHit?.y ?? ray[1].y;
            for (let c = 0; c < otherCars.length; c++) {
                const offset = nearestEdgeOffset(ray, otherCars[c]);
                if (offset !== null && offset < minOffset) {
                    minOffset = offset;
                    state = 1;
                    type = 'car';
                    hitX = lerp(ray[0].x, ray[1].x, offset);
                    hitY = lerp(ray[0].y, ray[1].y, offset);
                }
            }
            for (let c = 0; c < trafficControls.length; c++) {
                const tc = trafficControls[c];
                const offset = nearestEdgeOffset(ray, tc.polygon);
                if (offset !== null && offset < minOffset) {
                    minOffset = offset;
                    state = encodeTrafficState(tc.state);
                    type = 'trafficControl';
                    hitX = lerp(ray[0].x, ray[1].x, offset);
                    hitY = lerp(ray[0].y, ray[1].y, offset);
                }
            }
            if (minOffset === Infinity) {
                return {
                    distance: 1,
                    state: 0,
                    type: 'none',
                    x: ray[1].x,
                    y: ray[1].y,
                };
            }
            if (type === 'border') {
                state = 1;
            }
            return {
                distance: minOffset,
                state,
                type,
                x: hitX,
                y: hitY,
            };
        });
    }
    draw(ctx) {
        if (this.stateAware) {
            this.#drawStateAware(ctx);
        }
        else {
            this.#drawBasic(ctx);
        }
    }
    #drawBasic(ctx) {
        for (let i = 0; i < this.rays.length; i++) {
            const reading = this.readings[i];
            if (reading) {
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'yellow';
                ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
                ctx.lineTo(reading.x, reading.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.fillStyle = 'yellow';
                ctx.arc(reading.x, reading.y, BASIC_RAY_DOT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
            else {
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'yellow';
                ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
                ctx.lineTo(this.rays[i][1].x, this.rays[i][1].y);
                ctx.stroke();
                ctx.restore();
            }
        }
    }
    #drawStateAware(ctx) {
        for (let i = 0; i < this.rays.length; i++) {
            const sr = this.sensorReadings[i];
            if (!sr || sr.type === 'none') {
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
            let rayColor;
            let dotRadius;
            switch (sr.type) {
                case 'border':
                    rayColor = 'yellow';
                    dotRadius = BASIC_RAY_DOT_RADIUS;
                    break;
                case 'car':
                    rayColor = '#F00';
                    dotRadius = BASIC_RAY_DOT_RADIUS;
                    break;
                case 'trafficControl':
                    rayColor =
                        sr.state >= TRAFFIC_STATE_RED_THRESHOLD
                            ? '#F00'
                            : sr.state >= TRAFFIC_STATE_YELLOW_THRESHOLD
                                ? '#FF0'
                                : '#0F0';
                    dotRadius = TRAFFIC_RAY_DOT_RADIUS;
                    break;
                default:
                    rayColor = 'yellow';
                    dotRadius = BASIC_RAY_DOT_RADIUS;
            }
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = rayColor;
            ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
            ctx.lineTo(sr.x, sr.y);
            ctx.stroke();
            if (sr.type === 'trafficControl') {
                ctx.beginPath();
                ctx.arc(sr.x, sr.y, dotRadius, 0, Math.PI * 2);
                ctx.fillStyle = rayColor;
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            else {
                ctx.beginPath();
                ctx.fillStyle = rayColor;
                ctx.arc(sr.x, sr.y, dotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            // No continuation ray — the brain only sees the nearest obstacle.
        }
    }
}
