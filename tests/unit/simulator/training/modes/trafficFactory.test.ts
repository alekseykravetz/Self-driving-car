import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupImageMock } from '../../../../helpers/setupImageMock.js';

setupImageMock();

import {
  generateInitialTraffic,
  generateTrafficRow,
} from '../../../../../ts/simulator/training/modes/trafficFactory.js';

function getLaneCenter(lane: number): number {
  const laneWidth = 60;
  return -90 + laneWidth / 2 + lane * laneWidth;
}

describe('generateInitialTraffic', () => {
  it('returns cars in the expected rows/lanes', () => {
    const cars = generateInitialTraffic(getLaneCenter, 0);
    expect(cars.length).toBe(7);
  });

  it('all cars are DUMMY type', () => {
    const cars = generateInitialTraffic(getLaneCenter, 0);
    for (const car of cars) {
      expect(car.type).toBe('DUMMY');
    }
  });

  it('all cars have traffic dimensions', () => {
    const cars = generateInitialTraffic(getLaneCenter, 0);
    for (const car of cars) {
      expect(car.width).toBe(30);
      expect(car.height).toBe(50);
      expect(car.maxSpeed).toBe(2);
    }
  });

  it('cars are placed at correct y positions', () => {
    const cars = generateInitialTraffic(getLaneCenter, 0);
    const yPositions = cars.map((c) => c.y);
    expect(yPositions).toContain(-100);
    expect(yPositions).toContain(-300);
    expect(yPositions).toContain(-500);
    expect(yPositions).toContain(-700);
  });

  it('uses the provided startAngle for car heading', () => {
    const cars = generateInitialTraffic(getLaneCenter, Math.PI / 4);
    for (const car of cars) {
      expect(car.angle).toBe(Math.PI / 4);
    }
  });

  it('cars have color assigned', () => {
    const cars = generateInitialTraffic(getLaneCenter, 0);
    for (const car of cars) {
      expect(car.color).toBeTruthy();
    }
  });
});

describe('generateTrafficRow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns at least 1 car when laneCount > 1', () => {
    const cars = generateTrafficRow(-500, getLaneCenter, 3, 0);
    expect(cars.length).toBeGreaterThanOrEqual(1);
    expect(cars.length).toBeLessThan(3);
  });

  it('always leaves at least one lane empty', () => {
    const cars = generateTrafficRow(-500, getLaneCenter, 2, 0);
    expect(cars.length).toBe(1);
  });

  it('all cars are at the given y position', () => {
    const cars = generateTrafficRow(-500, getLaneCenter, 3, 0);
    for (const car of cars) {
      expect(car.y).toBe(-500);
    }
  });

  it('all cars have DUMMY type and traffic dimensions', () => {
    const cars = generateTrafficRow(-500, getLaneCenter, 3, 0);
    for (const car of cars) {
      expect(car.type).toBe('DUMMY');
      expect(car.width).toBe(30);
      expect(car.height).toBe(50);
    }
  });

  it('works with single lane (filledCount clamped)', () => {
    const cars = generateTrafficRow(-500, getLaneCenter, 1, 0);
    expect(cars.length).toBeGreaterThanOrEqual(1);
    for (const car of cars) {
      expect(car.x).toBe(-60);
    }
  });
});
