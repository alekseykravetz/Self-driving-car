import { Car } from '../car.js';

export interface CarDrawOptions {
  showSensor?: boolean;
  showMask?: boolean;
  colorOverride?: string;
  alpha?: number;
  showName?: boolean;
}

export class CarRenderer {
  car: Car;
  image: HTMLImageElement;

  static #sharedImage: HTMLImageElement | null = null;

  static #spriteCache: Map<string, HTMLCanvasElement> = new Map();

  constructor(car: Car) {
    this.car = car;
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

  draw(ctx: CanvasRenderingContext2D, options: CarDrawOptions = {}): void {
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

    if (this.car.sensor && showSensor) {
      this.car.sensor.draw(ctx);
    }

    const effectiveColor = colorOverride ?? this.car.color;

    if (showMask) {
      const sprite = this.car.damaged
        ? null
        : CarRenderer.#getSprite(
            effectiveColor,
            this.car.width,
            this.car.height,
          );

      ctx.translate(this.car.x, this.car.y);
      ctx.rotate(-this.car.angle);
      ctx.drawImage(
        sprite ?? this.image,
        -this.car.width / 2,
        -this.car.height / 2,
        this.car.width,
        this.car.height,
      );
      ctx.rotate(this.car.angle);
      ctx.translate(-this.car.x, -this.car.y);
    } else {
      if (this.car.damaged) {
        ctx.fillStyle = 'gray';
      } else {
        ctx.fillStyle = effectiveColor;
      }
      ctx.beginPath();
      ctx.moveTo(this.car.polygon[0].x, this.car.polygon[0].y);
      for (let i = 1; i < this.car.polygon.length; i++) {
        ctx.lineTo(this.car.polygon[i].x, this.car.polygon[i].y);
      }
      ctx.fill();
    }

    if (showName && this.car.name) {
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 5;
      ctx.fillStyle = 'white';
      ctx.fillText(this.car.name, this.car.x, this.car.y);
    }

    if (alpha !== undefined) {
      ctx.globalAlpha = prevAlpha;
    }
    if (needsRestore) ctx.restore();
  }
}
