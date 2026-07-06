import { SensorRaycaster, } from '../physics/sensorRaycaster.js';
export class Sensor {
    rayCount;
    rayLength;
    raySpread;
    rayOffset;
    rays;
    readings;
    constructor(config) {
        this.rayCount = config?.rayCount ?? 5;
        this.rayLength = config?.rayLength ?? 150;
        this.raySpread = config?.raySpread ?? Math.PI / 2;
        this.rayOffset = config?.rayOffset ?? 0;
        this.rays = [];
        this.readings = [];
    }
    update(x, y, angle, polygons = []) {
        this.rays = SensorRaycaster.castRays(x, y, angle, this.rayCount, this.rayLength, this.raySpread, this.rayOffset);
        this.readings = SensorRaycaster.getReadings(this.rays, polygons);
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
        }
    }
}
