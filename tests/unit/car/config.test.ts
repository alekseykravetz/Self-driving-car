import { describe, it, expect } from 'vitest';
import {
  NN_OUTPUT_COUNT,
  DEFAULT_HIDDEN_LAYERS,
  DEFAULT_CAR_CONFIG,
} from '../../../ts/car/config.js';

describe('config', () => {
  it('NN_OUTPUT_COUNT === 4', () => {
    expect(NN_OUTPUT_COUNT).toBe(4);
  });

  it('DEFAULT_HIDDEN_LAYERS === [6]', () => {
    expect(DEFAULT_HIDDEN_LAYERS).toEqual([6]);
  });

  it('DEFAULT_CAR_CONFIG has expected keys', () => {
    expect(DEFAULT_CAR_CONFIG.maxSpeed).toBe(3.24);
    expect(DEFAULT_CAR_CONFIG.acceleration).toBe(0.01);
    expect(DEFAULT_CAR_CONFIG.friction).toBe(0.002);
    expect(DEFAULT_CAR_CONFIG.width).toBe(25);
    expect(DEFAULT_CAR_CONFIG.height).toBe(63);
    expect(DEFAULT_CAR_CONFIG.sensor.rayCount).toBe(5);
    expect(DEFAULT_CAR_CONFIG.sensor.rayLength).toBe(150);
    expect(DEFAULT_CAR_CONFIG.sensor.raySpread).toBe(Math.PI / 2);
    expect(DEFAULT_CAR_CONFIG.sensor.rayOffset).toBe(0);
  });
});
