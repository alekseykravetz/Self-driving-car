import { Point } from '../../math/primitives/point.js';
import { distance } from '../../math/utils.js';

export interface PointWithBlueness extends Point {
  blueness: number;
}

export interface Marker {
  centroid: Point;
  points: PointWithBlueness[];
  radius: number;
}

export class MarkerDetector {
  threshold: HTMLInputElement;
  thresholdValue: number; // Store numeric value for easier use

  constructor() {
    this.threshold = document.createElement('input');
    this.threshold.type = 'range';
    this.threshold.min = '0';
    this.threshold.max = '255';
    this.threshold.value = localStorage.getItem('markerThreshold') || '50';
    this.thresholdValue = Number(this.threshold.value);

    // Add event listener to update numeric value when range changes
    this.threshold.addEventListener('input', () => {
      this.thresholdValue = Number(this.threshold.value);
      localStorage.setItem('markerThreshold', this.threshold.value);
    });
  }

  updateThreshold(delta: number): void {
    this.thresholdValue = Math.max(
      0,
      Math.min(255, this.thresholdValue + delta),
    );
    this.threshold.value = String(this.thresholdValue);
    localStorage.setItem('markerThreshold', this.threshold.value);
  }

  #averagePoints(points: Point[]): Point {
    const center: Point = new Point(0, 0);
    if (points.length === 0) return center;

    for (const point of points) {
      center.x += point.x;
      center.y += point.y;
    }
    center.x /= points.length;
    center.y /= points.length;
    return center;
  }

  detect(
    imgData: ImageData,
  ): { leftMarker: Marker; rightMarker: Marker } | undefined {
    const points: PointWithBlueness[] = [];
    const data = imgData.data;
    const width = imgData.width;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i + 0];
      const g = data[i + 1];
      const b = data[i + 2];
      // Ensure blueness calculation is correct based on expected color range
      const blueness = b - Math.max(r, g);

      if (blueness > this.thresholdValue) {
        const pIndex = i / 4;
        const y = Math.floor(pIndex / width);
        const x = pIndex % width;
        const point: PointWithBlueness = new Point(x, y) as PointWithBlueness;
        point.blueness = blueness;
        points.push(point);
      }
    }

    // Handle case where not enough points are detected
    if (points.length < 2) {
      return undefined;
    }

    // Initialize centroids more robustly if possible (e.g., furthest points)
    let centroid1: Point = points[0];
    let centroid2: Point = points[points.length - 1];

    // K-means clustering (simplified)
    let group1: PointWithBlueness[] = [];
    let group2: PointWithBlueness[] = [];

    // Use a fixed number of iterations
    for (let iter = 0; iter < 10; iter++) {
      group1 = points.filter(
        (p) =>
          distance(new Point(p.x, p.y), centroid1 as Point) <
          distance(new Point(p.x, p.y), centroid2 as Point),
      );
      group2 = points.filter(
        (p) =>
          distance(new Point(p.x, p.y), centroid1 as Point) >=
          distance(new Point(p.x, p.y), centroid2 as Point),
      );

      // Avoid issues if a group becomes empty
      if (group1.length === 0 || group2.length === 0) {
        // Handle empty group case - maybe reinitialize centroids or stop iteration
        console.warn('A marker group became empty during clustering.');
        break; // Stop iteration if a group is empty
      }

      centroid1 = this.#averagePoints(group1);
      centroid2 = this.#averagePoints(group2);
    }

    // Ensure groups are not empty before calculating size/radius
    if (group1.length === 0 || group2.length === 0) {
      return undefined; // Not enough data to form two markers
    }

    // Consider size calculation - sqrt(length) might not be the intended radius logic
    const radius1 = Math.sqrt(group1.length) / 2; // Re-evaluate if this is the correct radius calculation
    const radius2 = Math.sqrt(group2.length) / 2;

    const marker1: Marker = {
      centroid: centroid1,
      points: group1,
      radius: radius1,
    };
    const marker2: Marker = {
      centroid: centroid2,
      points: group2,
      radius: radius2,
    };

    // Determine left/right based on x-coordinate
    return {
      leftMarker: centroid1.x < centroid2.x ? marker1 : marker2,
      rightMarker: centroid1.x < centroid2.x ? marker2 : marker1,
    };
  }
}
