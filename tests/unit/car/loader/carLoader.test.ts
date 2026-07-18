import { describe, it, expect } from 'vitest';
import {
  parseCarFileContent,
  compareCarInfoParams,
  CarLoader,
} from '../../../../ts/car/loader/carLoader.js';
import type { CarInfo } from '../../../../ts/car/car.js';

function makeCarInfo(overrides: Partial<CarInfo> = {}): CarInfo {
  return {
    maxSpeed: 3.24,
    acceleration: 0.01,
    friction: 0.002,
    width: 25,
    height: 63,
    sensor: {
      rayCount: 5,
      raySpread: Math.PI / 2,
      rayLength: 200,
      rayOffset: 0,
      stateAware: false,
    },
    ...overrides,
  };
}

describe('parseCarFileContent', () => {
  it('parses valid JSON CarInfo', () => {
    const info = makeCarInfo();
    const json = JSON.stringify(info);
    const result = parseCarFileContent(json);
    expect(result).not.toBeNull();
    expect(result!.maxSpeed).toBe(3.24);
    expect(result!.sensor.rayCount).toBe(5);
  });

  it('parses valid JSON with missing optional fields', () => {
    const json = JSON.stringify({
      maxSpeed: 2,
      acceleration: 0.02,
      friction: 0.001,
      width: 30,
      height: 50,
      sensor: {
        rayCount: 3,
        raySpread: 1.57,
        rayLength: 150,
        rayOffset: 0,
      },
    });
    const result = parseCarFileContent(json);
    expect(result).not.toBeNull();
    expect(result!.maxSpeed).toBe(2);
    expect(result!.sensor.rayCount).toBe(3);
  });

  it('returns null for invalid JSON', () => {
    const result = parseCarFileContent('not valid json');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseCarFileContent('');
    expect(result).toBeNull();
  });
});

describe('compareCarInfoParams', () => {
  it('identical params returns true', () => {
    const a = makeCarInfo();
    const b = makeCarInfo();
    expect(compareCarInfoParams(a, b)).toBe(true);
  });

  it('different maxSpeed returns false', () => {
    const a = makeCarInfo({ maxSpeed: 3 });
    const b = makeCarInfo({ maxSpeed: 4 });
    expect(compareCarInfoParams(a, b)).toBe(false);
  });

  it('different sensor.rayCount returns false', () => {
    const a = makeCarInfo();
    const b = makeCarInfo({ sensor: { ...makeCarInfo().sensor, rayCount: 7 } });
    expect(compareCarInfoParams(a, b)).toBe(false);
  });

  it('raySpread within epsilon returns true', () => {
    const baseSensor = makeCarInfo().sensor;
    const a = makeCarInfo({ sensor: { ...baseSensor, raySpread: 1.57 } });
    const b = makeCarInfo({ sensor: { ...baseSensor, raySpread: 1.575 } });
    expect(compareCarInfoParams(a, b)).toBe(true);
  });

  it('raySpread outside epsilon returns false', () => {
    const baseSensor = makeCarInfo().sensor;
    const a = makeCarInfo({ sensor: { ...baseSensor, raySpread: 1.57 } });
    const b = makeCarInfo({ sensor: { ...baseSensor, raySpread: 1.59 } });
    expect(compareCarInfoParams(a, b)).toBe(false);
  });

  it('hiddenLayers defaults to [6] when omitted', () => {
    const a: CarInfo = {
      maxSpeed: 3.24,
      acceleration: 0.01,
      friction: 0.002,
      width: 25,
      height: 63,
      hiddenLayers: [6],
      sensor: { rayCount: 5, raySpread: 1.57, rayLength: 200, rayOffset: 0 },
    };
    const b: CarInfo = {
      maxSpeed: 3.24,
      acceleration: 0.01,
      friction: 0.002,
      width: 25,
      height: 63,
      sensor: { rayCount: 5, raySpread: 1.57, rayLength: 200, rayOffset: 0 },
    };
    expect(compareCarInfoParams(a, b)).toBe(true);
  });

  it('stateAware defaults to false when omitted', () => {
    const a: CarInfo = {
      maxSpeed: 3.24,
      acceleration: 0.01,
      friction: 0.002,
      width: 25,
      height: 63,
      sensor: {
        rayCount: 5,
        raySpread: 1.57,
        rayLength: 200,
        rayOffset: 0,
        stateAware: true,
      },
    };
    const b: CarInfo = {
      maxSpeed: 3.24,
      acceleration: 0.01,
      friction: 0.002,
      width: 25,
      height: 63,
      sensor: { rayCount: 5, raySpread: 1.57, rayLength: 200, rayOffset: 0 },
    };
    expect(compareCarInfoParams(a, b)).toBe(false);
  });

  it('different width returns false', () => {
    const a = makeCarInfo({ width: 25 });
    const b = makeCarInfo({ width: 30 });
    expect(compareCarInfoParams(a, b)).toBe(false);
  });

  it('different hiddenLayers returns false', () => {
    const a = makeCarInfo({ hiddenLayers: [6] });
    const b = makeCarInfo({ hiddenLayers: [8] });
    expect(compareCarInfoParams(a, b)).toBe(false);
  });
});

describe('CarLoader.allParamsMatch', () => {
  it('empty array returns true', () => {
    expect(CarLoader.allParamsMatch([])).toBe(true);
  });

  it('single car returns true', () => {
    expect(CarLoader.allParamsMatch([makeCarInfo()])).toBe(true);
  });

  it('all matching returns true', () => {
    const cars = [makeCarInfo(), makeCarInfo(), makeCarInfo()];
    expect(CarLoader.allParamsMatch(cars)).toBe(true);
  });

  it('one different returns false', () => {
    const cars = [makeCarInfo(), makeCarInfo({ maxSpeed: 5 }), makeCarInfo()];
    expect(CarLoader.allParamsMatch(cars)).toBe(false);
  });
});

describe('CarLoader static delegates', () => {
  it('parseCarFile delegates to parseCarFileContent', () => {
    const info = makeCarInfo();
    const json = JSON.stringify(info);
    expect(CarLoader.parseCarFile(json)).toEqual(parseCarFileContent(json));
  });

  it('compareCarParams delegates to compareCarInfoParams', () => {
    const a = makeCarInfo();
    const b = makeCarInfo();
    expect(CarLoader.compareCarParams(a, b)).toBe(compareCarInfoParams(a, b));
  });
});
