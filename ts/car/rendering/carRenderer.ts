import type { Point } from '../../math/primitives/point.js';
import type { Sensor } from '../sensors/sensor.js';

export interface CarDrawData {
  polygon: Point[];
  damaged: boolean;
  color: string;
  name?: string;
  sensor?: Sensor;
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
}

export interface CarDrawOptions {
  showSensor?: boolean;
  showMask?: boolean;
  colorOverride?: string;
  alpha?: number;
  showName?: boolean;
}

export class CarRenderer {
  image: HTMLImageElement;

  static #sharedImage: HTMLImageElement | null = null;

  static #spriteCache: Map<string, HTMLCanvasElement> = new Map();

  constructor() {
    this.image = CarRenderer.#getSharedImage();
  }

  static #getSharedImage(): HTMLImageElement {
    if (!CarRenderer.#sharedImage) {
      const img = new Image();
      img.src = '/assets/car.png';
      CarRenderer.#sharedImage = img;
    }
    return CarRenderer.#sharedImage;
  }

  static #getSprite(
    color: string,
    width: number,
    height: number,
  ): HTMLCanvasElement | null {
    const img = CarRenderer.#getSharedImage();
    if (!img.complete || img.naturalWidth === 0) return null;

    const key = color + '|' + width + '|' + height;
    let sprite = CarRenderer.#spriteCache.get(key);
    if (!sprite) {
      sprite = document.createElement('canvas');
      sprite.width = width;
      sprite.height = height;
      const ctx = sprite.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.rect(0, 0, width, height);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-atop';
      ctx.drawImage(img, 0, 0, width, height);
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(img, 0, 0, width, height);
      CarRenderer.#spriteCache.set(key, sprite);
    }
    return sprite;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    data: CarDrawData,
    options: CarDrawOptions = {},
  ): void {
    const {
      showSensor = false,
      showMask = true,
      colorOverride,
      alpha,
      showName = false,
    } = options;

    const needsRestore = showSensor || showName;
    if (needsRestore) ctx.save();

    const prevAlpha = ctx.globalAlpha;
    if (alpha !== undefined) {
      ctx.globalAlpha = alpha;
    }

    if (data.sensor && showSensor) {
      data.sensor.draw(ctx);
    }

    const effectiveColor = colorOverride ?? data.color;

    if (showMask) {
      const sprite = data.damaged
        ? null
        : CarRenderer.#getSprite(effectiveColor, data.width, data.height);

      ctx.translate(data.x, data.y);
      ctx.rotate(-data.angle);
      ctx.drawImage(
        sprite ?? this.image,
        -data.width / 2,
        -data.height / 2,
        data.width,
        data.height,
      );
      ctx.rotate(data.angle);
      ctx.translate(-data.x, -data.y);
    } else {
      if (data.damaged) {
        ctx.fillStyle = 'gray';
      } else {
        ctx.fillStyle = effectiveColor;
      }
      ctx.beginPath();
      ctx.moveTo(data.polygon[0].x, data.polygon[0].y);
      for (let i = 1; i < data.polygon.length; i++) {
        ctx.lineTo(data.polygon[i].x, data.polygon[i].y);
      }
      ctx.fill();
    }

    if (showName && data.name) {
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 5;
      ctx.fillStyle = 'white';
      ctx.fillText(data.name, data.x, data.y);
    }

    if (alpha !== undefined) {
      ctx.globalAlpha = prevAlpha;
    }
    if (needsRestore) ctx.restore();
  }
}
