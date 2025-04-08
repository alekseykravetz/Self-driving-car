interface IntersectionPoint extends Point {
  offset: number; // Distance from ray start to intersection
}

declare function lerp(a: number, b: number, t: number): number;

class Sensor {
  car: Car;
  rayCount: number;
  rayLength: number;
  raySpread: number;
  rayOffset: number; // Added for potential adjustment of sensor origin relative to car center

  rays: Point[][]; // Array of [startPoint, endPoint] for each ray
  readings: (IntersectionPoint | null)[]; // Array of intersection results or null

  constructor(car: Car) {
    this.car = car;
    this.rayCount = 5;
    this.rayLength = 150;
    this.raySpread = Math.PI / 2; // 90 degrees spread
    this.rayOffset = 0; // Offset along the car's angle

    this.rays = [];
    this.readings = [];
  }

  update(roadBorders: Point[][], traffic: Car[]): void {
    this.#castRays();
    this.readings = []; // Reset readings for the new update cycle
    for (let i = 0; i < this.rays.length; i++) {
      this.readings.push(this.#getReading(this.rays[i], roadBorders, traffic));
    }
  }

  #getReading(
    ray: Point[],
    roadBorders: Point[][],
    traffic: Car[],
  ): IntersectionPoint | null {
    let touches: IntersectionPoint[] = [];

    // Check intersections with road borders
    for (let i = 0; i < roadBorders.length; i++) {
      // Check if roadBorders[i] represents a line segment [P1, P2]
      if (roadBorders[i].length >= 2) {
        const touch = getIntersection(
          ray[0] as Point, // Ray start
          ray[1] as Point, // Ray end (max length)
          roadBorders[i][0] as Point, // Border segment start
          roadBorders[i][1] as Point, // Border segment end
        );
        if (touch) {
          touches.push(touch as IntersectionPoint);
        }
      } else {
        console.warn(`Road border segment ${i} has less than 2 points.`);
      }
    }

    // Check intersections with traffic cars
    for (let i = 0; i < traffic.length; i++) {
      const poly = traffic[i].polygon;
      // Check intersection with each segment of the traffic car's polygon
      for (let j = 0; j < poly.length; j++) {
        const touch = getIntersection(
          ray[0] as Point,
          ray[1] as Point,
          poly[j] as Point, // Polygon vertex j
          poly[(j + 1) % poly.length] as Point, // Polygon vertex j+1 (wrapping around)
        );
        if (touch) {
          touches.push(touch as IntersectionPoint);
        }
      }
    }

    if (touches.length === 0) {
      return null; // No intersection found for this ray
    } else {
      // Find the closest intersection point
      const offsets = touches.map((e) => e.offset);
      const minOffset = Math.min(...offsets);
      // Find the touch object corresponding to the minimum offset
      // Need to handle potential floating point inaccuracies if multiple touches have the exact same minOffset
      return touches.find((e) => e.offset === minOffset)!;
    }
  }

  #castRays(): void {
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
      const start: Point = { x: this.car.x, y: this.car.y } as Point;
      // Define the end point of the ray (based on angle and length)
      const end: Point = {
        x: this.car.x - Math.sin(rayAngle) * this.rayLength,
        y: this.car.y - Math.cos(rayAngle) * this.rayLength,
      } as Point;

      // Store the ray as a pair of start and end points
      this.rays.push([start, end]);
    }
  }

  // Draw the sensor rays and readings (for debugging/visualization)
  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.rayCount; i++) {
      // Determine the endpoint for drawing: either the intersection point or the full ray length
      let endPoint: Point = this.rays[i][1]; // Default to max ray length endpoint
      if (this.readings[i]) {
        endPoint = this.readings[i] as Point; // Use intersection point if available
      }

      // Draw the part of the ray up to the intersection (or potential intersection)
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'yellow'; // Color for the detected part of the ray
      ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y); // Start at car position
      ctx.lineTo(endPoint.x, endPoint.y); // Line to intersection/end point
      ctx.stroke();

      // Draw the remaining part of the ray (beyond the intersection)
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'black'; // Color for the part of the ray beyond intersection
      ctx.moveTo(this.rays[i][1].x, this.rays[i][1].y); // Start at max ray length endpoint
      ctx.lineTo(endPoint.x, endPoint.y); // Line back to intersection/end point
      ctx.stroke();
    }
  }
}
