type CarControls = Controls | PhoneControls | CameraControls;

interface CarInfo {
  brain?: NeuralNetwork;
  maxSpeed: number;
  friction: number;
  acceleration: number;
  width: number;
  height: number;
  hiddenLayers?: number[];
  sensor: {
    rayCount: number;
    raySpread: number;
    rayLength: number;
    rayOffset: number;
  };
}

interface CarOptions {
  x: number;
  y: number;
  controlType: string;
  width?: number;
  height?: number;
  angle?: number;
  maxSpeed?: number;
  acceleration?: number;
  friction?: number;
  color?: string;
  hiddenLayers?: number[];
  sensor?: {
    rayCount?: number;
    raySpread?: number;
    rayLength?: number;
    rayOffset?: number;
  };
}

class Car {
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: string; // controlType
  speed: number;
  acceleration: number;
  maxSpeed: number;
  friction: number;
  angle: number;
  damaged: boolean;
  fitness: number;
  useBrain: boolean;
  hiddenLayers: number[];
  sensor?: Sensor;
  brain?: NeuralNetwork;
  controls: CarControls;
  image: HTMLImageElement;
  polygon: Point[];
  engine?: SoundEngine;

  /**
   * Shared car sprite image, loaded once for all cars instead of per instance.
   */
  static #sharedImage: HTMLImageElement | null = null;

  /**
   * Cache of pre-composited (color-tinted) sprites keyed by
   * `${color}|${width}|${height}`. The expensive fill + destination-atop +
   * multiply compositing is done once per unique key and reused every frame by
   * every car of that color/size — critical for rendering thousands of cars.
   */
  static #spriteCache: Map<string, HTMLCanvasElement> = new Map();

  static #getSharedImage(): HTMLImageElement {
    if (!Car.#sharedImage) {
      const img = new Image();
      img.src = '/assets/car.png';
      Car.#sharedImage = img;
    }
    return Car.#sharedImage;
  }

  /**
   * Returns the pre-composited sprite for the given color/size, building and
   * caching it on first use. Returns null until the shared image has loaded.
   */
  static #getSprite(
    color: string,
    width: number,
    height: number,
  ): HTMLCanvasElement | null {
    const img = Car.#getSharedImage();
    if (!img.complete || img.naturalWidth === 0) return null;

    const key = color + '|' + width + '|' + height;
    let sprite = Car.#spriteCache.get(key);
    if (!sprite) {
      sprite = document.createElement('canvas');
      sprite.width = width;
      sprite.height = height;
      const ctx = sprite.getContext('2d')!;
      // Color silhouette: fill the body color, then clip to the car shape.
      ctx.fillStyle = color;
      ctx.rect(0, 0, width, height);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-atop';
      ctx.drawImage(img, 0, 0, width, height);
      // Bake the detail shading (multiply) into the sprite once.
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(img, 0, 0, width, height);
      Car.#spriteCache.set(key, sprite);
    }
    return sprite;
  }

  //todo: fix this
  finishTime?: number;
  progress?: number;

  constructor(opts: CarOptions) {
    this.x = opts.x;
    this.y = opts.y;
    this.width = opts.width ?? DEFAULT_CAR_CONFIG.width;
    this.height = opts.height ?? DEFAULT_CAR_CONFIG.height;

    this.color = opts.color ?? 'blue';
    this.type = opts.controlType;

    this.speed = 0;
    this.acceleration = opts.acceleration ?? DEFAULT_CAR_CONFIG.acceleration;
    this.maxSpeed = opts.maxSpeed ?? DEFAULT_CAR_CONFIG.maxSpeed;
    this.friction = opts.friction ?? DEFAULT_CAR_CONFIG.friction;
    this.angle = opts.angle ?? 0;
    this.damaged = false;

    this.fitness = 0;
    this.hiddenLayers = opts.hiddenLayers ?? [6];

    this.useBrain = opts.controlType === 'AI';

    if (opts.controlType !== 'DUMMY') {
      this.sensor = new Sensor(this, opts.sensor);
      this.brain = new NeuralNetwork([
        this.sensor.rayCount + 1,
        ...this.hiddenLayers,
        4,
      ]);
    }
    this.controls = new Controls(opts.controlType);

    this.image = Car.#getSharedImage();

    this.polygon = this.#createPolygon();
    this.update();
  }

  load(info: CarInfo): void {
    if (info.brain) {
      this.brain = NeuralNetwork.deserialize(info.brain);
    }
    if (info.hiddenLayers) {
      this.hiddenLayers = [...info.hiddenLayers];
    }
    this.maxSpeed = info.maxSpeed;
    this.friction = info.friction;
    this.acceleration = info.acceleration;
    if (info.width) this.width = info.width;
    if (info.height) this.height = info.height;
    if (this.sensor) {
      this.sensor.rayCount = info.sensor.rayCount;
      this.sensor.raySpread = info.sensor.raySpread;
      this.sensor.rayLength = info.sensor.rayLength;
      this.sensor.rayOffset = info.sensor.rayOffset;
    }
  }

  toInfo(): CarInfo {
    return {
      brain: this.brain ? NeuralNetwork.clone(this.brain) : undefined,
      maxSpeed: this.maxSpeed,
      friction: this.friction,
      acceleration: this.acceleration,
      width: this.width,
      height: this.height,
      hiddenLayers: [...this.hiddenLayers],
      sensor: {
        rayCount: this.sensor?.rayCount ?? DEFAULT_CAR_CONFIG.sensor.rayCount,
        raySpread:
          this.sensor?.raySpread ?? DEFAULT_CAR_CONFIG.sensor.raySpread,
        rayLength:
          this.sensor?.rayLength ?? DEFAULT_CAR_CONFIG.sensor.rayLength,
        rayOffset:
          this.sensor?.rayOffset ?? DEFAULT_CAR_CONFIG.sensor.rayOffset,
      },
    };
  }

  update(polygons: Point[][] = []): void {
    if (!this.damaged) {
      this.#move();
      this.fitness += this.speed;
      this.polygon = this.#createPolygon();
      this.damaged = this.#assessDamage(polygons);
      if (this.damaged) {
        this.speed = 0;
        if (this.type === 'KEYS') {
          explode();
        }
      }
    }
    if (this.sensor && this.brain) {
      this.sensor.update(polygons);
      const offsets = this.sensor.readings
        .map((s) => (s === null ? 0 : 1 - s.offset))
        .concat([this.speed / this.maxSpeed]);
      const outputs = NeuralNetwork.feedForward(offsets, this.brain);

      if (this.useBrain && this.controls instanceof Controls) {
        this.controls.forward = !!outputs[0];
        this.controls.left = !!outputs[1];
        this.controls.right = !!outputs[2];
        this.controls.reverse = !!outputs[3];
      }
    } else if (this.sensor) {
      // Keep the rays following the car (and reacting to borders) even when
      // there is no brain — e.g. the player's manually-driven car.
      this.sensor.update(polygons);
    }
    if (this.engine) {
      const percent = Math.abs(this.speed / this.maxSpeed);
      this.engine.setVolume(percent);
      this.engine.setPitch(percent);
    }
  }

  #assessDamage(polygons: Point[][]): boolean {
    if (polygons.length === 0) return false;

    // Car bounding box (axis-aligned) — cheap broad-phase reject. The shared
    // narrow phase feeds every segment within sensor range (far larger than the
    // car body), so most candidates here cannot possibly touch the car. An AABB
    // test skips the full edge-edge check for those without changing behaviour:
    // if the boxes do not overlap the polygons cannot intersect.
    let carMinX = this.polygon[0].x;
    let carMaxX = this.polygon[0].x;
    let carMinY = this.polygon[0].y;
    let carMaxY = this.polygon[0].y;
    for (let i = 1; i < this.polygon.length; i++) {
      const p = this.polygon[i];
      if (p.x < carMinX) carMinX = p.x;
      else if (p.x > carMaxX) carMaxX = p.x;
      if (p.y < carMinY) carMinY = p.y;
      else if (p.y > carMaxY) carMaxY = p.y;
    }

    for (let i = 0; i < polygons.length; i++) {
      const poly = polygons[i];

      // Obstacle AABB.
      let oMinX = poly[0].x;
      let oMaxX = poly[0].x;
      let oMinY = poly[0].y;
      let oMaxY = poly[0].y;
      for (let j = 1; j < poly.length; j++) {
        const p = poly[j];
        if (p.x < oMinX) oMinX = p.x;
        else if (p.x > oMaxX) oMaxX = p.x;
        if (p.y < oMinY) oMinY = p.y;
        else if (p.y > oMaxY) oMaxY = p.y;
      }

      // Skip when the bounding boxes are disjoint.
      if (
        oMinX > carMaxX ||
        oMaxX < carMinX ||
        oMinY > carMaxY ||
        oMaxY < carMinY
      ) {
        continue;
      }

      if (polysIntersect(this.polygon, poly)) {
        return true;
      }
    }
    return false;
  }

  #createPolygon(): Point[] {
    const points: Point[] = [];
    const rad = Math.hypot(this.width, this.height) / 2;
    const alpha = Math.atan2(this.width, this.height);
    points.push({
      x: this.x - Math.sin(this.angle - alpha) * rad,
      y: this.y - Math.cos(this.angle - alpha) * rad,
    } as Point);
    points.push({
      x: this.x - Math.sin(this.angle + alpha) * rad,
      y: this.y - Math.cos(this.angle + alpha) * rad,
    } as Point);
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad,
    } as Point);
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad,
    } as Point);
    return points;
  }

  #move(): void {
    if (this.controls.forward) {
      this.speed += this.acceleration;
    }
    if (this.controls.reverse) {
      this.speed -= this.acceleration;
    }

    if (this.speed > this.maxSpeed) {
      this.speed = this.maxSpeed;
    }
    // Ensure maxSpeed/2 comparison is intended
    if (this.speed < -this.maxSpeed / 2) {
      this.speed = -this.maxSpeed / 2;
    }

    if (this.speed > 0) {
      this.speed -= this.friction;
    }
    if (this.speed < 0) {
      this.speed += this.friction;
    }
    if (Math.abs(this.speed) < this.friction) {
      this.speed = 0;
    }

    if (this.speed !== 0) {
      // Check for tilt control specifically if it exists
      if (
        (typeof CameraControls !== 'undefined' &&
          this.controls instanceof CameraControls) ||
        (typeof PhoneControls !== 'undefined' &&
          this.controls instanceof PhoneControls &&
          this.controls.tilt !== 0)
      ) {
        this.angle -= this.controls.tilt * 0.03;
      } else {
        const flip = this.speed > 0 ? 1 : -1;
        if ((this.controls as Controls).left) {
          this.angle += 0.03 * flip;
        }
        if ((this.controls as Controls).right) {
          this.angle -= 0.03 * flip;
        }
      }
    }

    this.x -= Math.sin(this.angle) * this.speed;
    this.y -= Math.cos(this.angle) * this.speed;
  }

  draw(ctx: CanvasRenderingContext2D, options: CarDrawOptions = {}): void {
    const {
      showSensor = false,
      showMask = true,
      colorOverride,
      alpha,
      showName = false,
    } = options;

    // Only the sensor and name paths mutate persistent context state
    // (stroke/fill/shadow/font), so a save/restore pair is only needed when one
    // of them runs. The common case — a masked regular car whose alpha is set
    // in a batch by the caller — needs neither, which removes ~2 save+restore
    // calls per car at large populations (the dominant cost in the profile).
    const needsRestore = showSensor || showName;
    if (needsRestore) ctx.save();

    const prevAlpha = ctx.globalAlpha;
    if (alpha !== undefined) {
      ctx.globalAlpha = alpha;
    }

    if (this.sensor && showSensor) {
      this.sensor.draw(ctx);
    }

    const effectiveColor = colorOverride ?? this.color;

    if (showMask) {
      const sprite = this.damaged
        ? null
        : Car.#getSprite(effectiveColor, this.width, this.height);
      // Undamaged: draw the pre-composited color sprite (single drawImage).
      // Damaged (or sprite not ready yet): fall back to the plain car image.
      ctx.translate(this.x, this.y);
      ctx.rotate(-this.angle);
      ctx.drawImage(
        sprite ?? this.image,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
      );
      // Undo the transform manually instead of paying for a save/restore pair.
      // The viewport re-establishes its transform every frame via reset(), so
      // any sub-pixel drift cannot accumulate across frames.
      ctx.rotate(this.angle);
      ctx.translate(-this.x, -this.y);
    } else {
      if (this.damaged) {
        ctx.fillStyle = 'gray';
      } else {
        ctx.fillStyle = effectiveColor;
      }
      ctx.beginPath();
      ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
      for (let i = 1; i < this.polygon.length; i++) {
        ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
      }
      ctx.fill();
    }

    if (showName && this.name) {
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 5;
      ctx.fillStyle = 'white';
      ctx.fillText(this.name, this.x, this.y);
    }

    if (alpha !== undefined) {
      ctx.globalAlpha = prevAlpha;
    }
    if (needsRestore) ctx.restore();
  }
}
