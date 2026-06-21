'use strict';
class Sensor {
  car;
  rayCount;
  rayLength;
  raySpread;
  rayOffset; // Added for potential adjustment of sensor origin relative to car center
  rays; // Array of [startPoint, endPoint] for each ray
  readings; // Array of intersection results or null
  constructor(car, config) {
    this.car = car;
    this.rayCount = config?.rayCount ?? 5;
    this.rayLength = config?.rayLength ?? 150;
    this.raySpread = config?.raySpread ?? Math.PI / 2; // 90 degrees spread
    this.rayOffset = config?.rayOffset ?? 0; // Offset along the car's angle
    this.rays = [];
    this.readings = [];
  }

  update(polygons = []) {
    this.#castRays();
    this.readings = []; // Reset readings for the new update cycle
    for (let i = 0; i < this.rays.length; i++) {
      this.readings.push(this.#getReading(this.rays[i], polygons));
    }
  }

  #getReading(ray, polygons) {
    // Single allocation-free pass: track the closest intersection's offset
    // directly, then build the point once for the winner. This avoids a
    // per-segment object allocation and runs for every ray of every car.
    let minOffset = Infinity;
    // Check intersections with polygons (road borders, traffic cars)
    for (let i = 0; i < polygons.length; i++) {
      const poly = polygons[i];
      if (poly.length < 2) {
        console.warn(`The polygon at index ${i} has less than 2 points.`);
        continue;
      }
      // Iterate over every edge of the polygon and keep the closest hit.
      // A road border is a 2-point segment (a single edge), while a traffic
      // car is a closed polygon (4 corners). Previously only the first edge
      // (poly[0]->poly[1]) was tested, so a ray would lock onto the traffic
      // car's front edge and miss the nearer back/side edges. Treating a
      // 2-point entry as one open edge keeps border behaviour unchanged while
      // closing the polygon for cars (including the final poly[n-1]->poly[0]).
      const edgeCount = poly.length === 2 ? 1 : poly.length;
      for (let j = 0; j < edgeCount; j++) {
        const offset = getIntersectionOffset(
          ray[0], // Ray start
          ray[1], // Ray end (max length)
          poly[j], // Edge start
          poly[(j + 1) % poly.length],
        );
        if (offset >= 0 && offset < minOffset) {
          minOffset = offset;
        }
      }
    }
    if (minOffset === Infinity) {
      return null;
    }
    // Build the intersection point for the closest hit only.
    return {
      x: lerp(ray[0].x, ray[1].x, minOffset),
      y: lerp(ray[0].y, ray[1].y, minOffset),
      offset: minOffset,
    };
  }

  #castRays() {
    this.rays = [];
    for (let i = 0; i < this.rayCount; i++) {
      // Calculate the angle for each ray using linear interpolation (lerp)
      const rayAngle =
        lerp(
          this.raySpread / 2, // Start angle
          -this.raySpread / 2, // End angle
          // Handle division by zero if rayCount is 1
          this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1),
        ) +
        this.car.angle +
        this.rayOffset; // Add car's current angle and any offset
      // Define the start point of the ray (car's position)
      const start = { x: this.car.x, y: this.car.y };
      // Define the end point of the ray (based on angle and length)
      const end = {
        x: this.car.x - Math.sin(rayAngle) * this.rayLength,
        y: this.car.y - Math.cos(rayAngle) * this.rayLength,
      };
      // Store the ray as a pair of start and end points
      this.rays.push([start, end]);
    }
  }

  // Draw the sensor rays and readings (for debugging/visualization)
  draw(ctx) {
    // Iterate over the rays that were actually cast, not rayCount. The two can
    // diverge when rayCount is changed (e.g. via load()) without the sensor
    // being updated again — as happens for the brainless player car in race,
    // whose sensor is never re-cast. Using rayCount there indexes past the end
    // of `rays` and throws "Cannot read properties of undefined".
    for (let i = 0; i < this.rays.length; i++) {
      const reading = this.readings[i];
      // No hit: draw the full-length ray at half opacity.
      if (!reading) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'yellow';
        ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y); // Start at car position
        ctx.lineTo(this.rays[i][1].x, this.rays[i][1].y); // To full ray length
        ctx.stroke();
        ctx.restore();
        continue;
      }
      // Draw only the part of the ray from the car up to the intersection.
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'yellow';
      ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y); // Start at car position
      ctx.lineTo(reading.x, reading.y); // Line to the intersection point
      ctx.stroke();
      // Mark the intersection point with a small filled yellow circle.
      ctx.beginPath();
      ctx.fillStyle = 'yellow';
      ctx.arc(reading.x, reading.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
