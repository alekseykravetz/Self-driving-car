import type { Sensor } from '../car/sensors/sensor.js';

const TRAFFIC_STATE_RED_THRESHOLD = 0.9;
const TRAFFIC_STATE_YELLOW_THRESHOLD = 0.4;
const BASIC_RAY_DOT_RADIUS = 3;
const TRAFFIC_RAY_DOT_RADIUS = 4;

export class SensorRenderer {
  static draw(ctx: CanvasRenderingContext2D, sensor: Sensor): void {
    if (sensor.stateAware) {
      this.#drawStateAware(ctx, sensor);
    } else {
      this.#drawBasic(ctx, sensor);
    }
  }

  static #drawBasic(ctx: CanvasRenderingContext2D, sensor: Sensor): void {
    for (let i = 0; i < sensor.rays.length; i++) {
      const reading = sensor.readings[i];

      if (reading) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'yellow';
        ctx.moveTo(sensor.rays[i][0].x, sensor.rays[i][0].y);
        ctx.lineTo(reading.x, reading.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = 'yellow';
        ctx.arc(reading.x, reading.y, BASIC_RAY_DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'yellow';
        ctx.moveTo(sensor.rays[i][0].x, sensor.rays[i][0].y);
        ctx.lineTo(sensor.rays[i][1].x, sensor.rays[i][1].y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  static #drawStateAware(ctx: CanvasRenderingContext2D, sensor: Sensor): void {
    for (let i = 0; i < sensor.rays.length; i++) {
      const sr = sensor.sensorReadings[i];

      if (!sr || sr.type === 'none') {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'yellow';
        ctx.moveTo(sensor.rays[i][0].x, sensor.rays[i][0].y);
        ctx.lineTo(sensor.rays[i][1].x, sensor.rays[i][1].y);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      let rayColor: string;
      let dotRadius: number;

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
      ctx.moveTo(sensor.rays[i][0].x, sensor.rays[i][0].y);
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
      } else {
        ctx.beginPath();
        ctx.fillStyle = rayColor;
        ctx.arc(sr.x, sr.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
