import { SensorRaycaster, } from '../physics/sensorRaycaster.js';
import { DEFAULT_CAR_CONFIG } from '../config.js';
import { getIntersectionOffset, lerp } from '../../math/utils.js';
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
    sophistication;
    rays;
    readings;
    trafficReadings;
    classifiedReadings;
    constructor(config) {
        this.rayCount = config?.rayCount ?? DEFAULT_CAR_CONFIG.sensor.rayCount;
        this.rayLength = config?.rayLength ?? DEFAULT_CAR_CONFIG.sensor.rayLength;
        this.raySpread = config?.raySpread ?? DEFAULT_CAR_CONFIG.sensor.raySpread;
        this.rayOffset = config?.rayOffset ?? DEFAULT_CAR_CONFIG.sensor.rayOffset;
        if (config?.sophistication) {
            this.sophistication = config.sophistication;
        }
        else if (config?.trafficAwareness) {
            this.sophistication = 'traffic';
        }
        else {
            this.sophistication = 'basic';
        }
        this.rays = [];
        this.readings = [];
        this.trafficReadings = [];
        this.classifiedReadings = [];
    }
    update(x, y, angle, borders = [], trafficControls, otherCars, selfSpeed, selfMaxSpeed) {
        this.rays = SensorRaycaster.castRays(x, y, angle, this.rayCount, this.rayLength, this.raySpread, this.rayOffset);
        if (this.sophistication === 'classified') {
            this.classifiedReadings = this.#getClassifiedReadings(this.rays, borders, trafficControls ?? [], otherCars ?? [], selfSpeed ?? 0, selfMaxSpeed ?? 1);
            this.readings = new Array(this.rays.length).fill(null);
            this.trafficReadings = new Array(this.rays.length).fill(null);
        }
        else {
            this.readings = SensorRaycaster.getReadings(this.rays, borders);
            if (this.sophistication === 'traffic' &&
                trafficControls &&
                trafficControls.length) {
                this.trafficReadings = this.#getTrafficReadings(this.rays, this.readings, trafficControls);
            }
            else {
                this.trafficReadings = new Array(this.rays.length).fill(null);
            }
            this.classifiedReadings = new Array(this.rays.length).fill(null);
        }
    }
    #getClassifiedReadings(rays, borders, trafficControls, otherCars, selfSpeed, selfMaxSpeed) {
        const taggedHits = SensorRaycaster.getTaggedReadings(rays, borders, otherCars, trafficControls.map((tc) => ({
            polygon: tc.polygon,
            state: tc.state,
        })));
        return taggedHits.map((hit) => {
            if (!hit) {
                return {
                    distance: 1,
                    type: 'none',
                    relativeSpeed: 0,
                    controlState: 0,
                    x: rays[0][1].x,
                    y: rays[0][1].y,
                };
            }
            let relativeSpeed = 0;
            if (hit.type === 'car' && hit.carSpeed !== undefined) {
                relativeSpeed = this.#relativeSpeed(hit.carSpeed, selfSpeed, selfMaxSpeed);
            }
            let controlState = 0;
            if (hit.type === 'trafficControl' && hit.controlState !== undefined) {
                controlState = encodeTrafficState(hit.controlState);
            }
            return {
                distance: hit.offset,
                type: hit.type,
                relativeSpeed,
                controlState,
                x: hit.x,
                y: hit.y,
            };
        });
    }
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
                result[i] = {
                    state: minState,
                    offset: minOffset,
                    x: lerp(ray[0].x, ray[1].x, minOffset),
                    y: lerp(ray[0].y, ray[1].y, minOffset),
                };
            }
        }
        return result;
    }
    #relativeSpeed(other, self, max) {
        return Math.max(-1, Math.min(1, (other - self) / max));
    }
    draw(ctx) {
        if (this.sophistication === 'classified') {
            this.#drawClassified(ctx);
        }
        else if (this.sophistication === 'traffic') {
            this.#drawTraffic(ctx);
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
                ctx.arc(reading.x, reading.y, 3, 0, Math.PI * 2);
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
    #drawTraffic(ctx) {
        for (let i = 0; i < this.rays.length; i++) {
            const reading = this.readings[i];
            const traffic = this.trafficReadings[i];
            if (traffic) {
                const color = traffic.state === 'green'
                    ? '#0F0'
                    : traffic.state === 'yellow'
                        ? '#FF0'
                        : '#F00';
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = color;
                ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
                ctx.lineTo(traffic.x, traffic.y);
                ctx.stroke();
                if (reading) {
                    ctx.beginPath();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'yellow';
                    ctx.moveTo(traffic.x, traffic.y);
                    ctx.lineTo(reading.x, reading.y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.fillStyle = 'yellow';
                    ctx.arc(reading.x, reading.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(traffic.x, traffic.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            else if (reading) {
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
    #drawClassified(ctx) {
        for (let i = 0; i < this.rays.length; i++) {
            const reading = this.classifiedReadings[i];
            if (!reading || reading.type === 'none') {
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
            switch (reading.type) {
                case 'border':
                    rayColor = 'yellow';
                    dotRadius = 3;
                    break;
                case 'car':
                    rayColor = 'red';
                    dotRadius = 3;
                    break;
                case 'trafficControl':
                    rayColor =
                        reading.controlState >= 0.9
                            ? '#F00'
                            : reading.controlState >= 0.4
                                ? '#FF0'
                                : '#0F0';
                    dotRadius = 4;
                    break;
                default:
                    rayColor = 'yellow';
                    dotRadius = 3;
            }
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = rayColor;
            ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
            ctx.lineTo(reading.x, reading.y);
            ctx.stroke();
            if (reading.type === 'trafficControl') {
                ctx.beginPath();
                ctx.arc(reading.x, reading.y, dotRadius, 0, Math.PI * 2);
                ctx.fillStyle = rayColor;
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            else {
                ctx.beginPath();
                ctx.fillStyle = rayColor;
                ctx.arc(reading.x, reading.y, dotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
