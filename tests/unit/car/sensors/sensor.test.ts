import { describe, it, expect } from 'vitest';
import {
  Sensor,
  encodeTrafficState,
} from '../../../../ts/car/sensors/sensor.js';
import type { Point } from '../../../../ts/math/primitives/point.js';
import type { SensorTrafficControl } from '../../../../ts/car/sensors/sensor.js';
import { DEFAULT_CAR_CONFIG } from '../../../../ts/car/config.js';

function makeSquare(cx: number, cy: number, size: number = 20): Point[] {
  return [
    { x: cx - size / 2, y: cy - size / 2 } as Point,
    { x: cx + size / 2, y: cy - size / 2 } as Point,
    { x: cx + size / 2, y: cy + size / 2 } as Point,
    { x: cx - size / 2, y: cy + size / 2 } as Point,
  ];
}

describe('Sensor', () => {
  it('constructor uses defaults', () => {
    const sensor = new Sensor();
    expect(sensor.rayCount).toBe(DEFAULT_CAR_CONFIG.sensor.rayCount);
    expect(sensor.rayLength).toBe(DEFAULT_CAR_CONFIG.sensor.rayLength);
    expect(sensor.raySpread).toBe(DEFAULT_CAR_CONFIG.sensor.raySpread);
    expect(sensor.rayOffset).toBe(DEFAULT_CAR_CONFIG.sensor.rayOffset);
    expect(sensor.stateAware).toBe(false);
  });

  it('constructor with custom config', () => {
    const sensor = new Sensor({
      rayCount: 7,
      rayLength: 200,
      raySpread: Math.PI,
      rayOffset: 0.1,
      stateAware: true,
    });
    expect(sensor.rayCount).toBe(7);
    expect(sensor.rayLength).toBe(200);
    expect(sensor.raySpread).toBe(Math.PI);
    expect(sensor.rayOffset).toBe(0.1);
    expect(sensor.stateAware).toBe(true);
  });

  it('update populates rays at rayCount length', () => {
    const sensor = new Sensor({ rayCount: 3 });
    sensor.update(0, 0, 0, []);
    expect(sensor.rays.length).toBe(3);
  });

  it('update populates readings at rayCount length', () => {
    const sensor = new Sensor({ rayCount: 3 });
    sensor.update(0, 0, 0, []);
    expect(sensor.readings.length).toBe(3);
  });

  it('update with borders finds closest hit', () => {
    const sensor = new Sensor({
      rayCount: 1,
      rayLength: 200,
      raySpread: 0,
    });
    const border = makeSquare(0, -100, 20);
    sensor.update(0, 0, 0, [border]);
    expect(sensor.readings[0]).not.toBeNull();
    if (sensor.readings[0]) {
      expect(sensor.readings[0].offset).toBeGreaterThan(0);
      expect(sensor.readings[0].offset).toBeLessThan(1);
    }
  });

  it('update with no borders returns all null readings', () => {
    const sensor = new Sensor({ rayCount: 3 });
    sensor.update(0, 0, 0, []);
    expect(sensor.readings).toEqual([null, null, null]);
  });

  it('update stateAware=false sensorReadings all null', () => {
    const sensor = new Sensor({ rayCount: 3, stateAware: false });
    sensor.update(0, 0, 0, [makeSquare(0, -100, 20)]);
    expect(sensor.sensorReadings.length).toBe(3);
    expect(sensor.sensorReadings).toEqual([null, null, null]);
  });

  it('update stateAware=true with traffic controls populates sensorReadings', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      stateAware: true,
      rayLength: 200,
    });
    const tc: SensorTrafficControl = {
      polygon: makeSquare(0, -100, 30),
      state: 'red',
    };
    sensor.update(0, 0, 0, [], [tc]);
    expect(sensor.sensorReadings.length).toBe(1);
    const sr = sensor.sensorReadings[0];
    expect(sr).not.toBeNull();
    if (sr) {
      expect(sr.type).toBe('trafficControl');
      expect(sr.state).toBe(1);
    }
  });

  it('update stateAware=true with yellow traffic control', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      stateAware: true,
      rayLength: 200,
    });
    const tc: SensorTrafficControl = {
      polygon: makeSquare(0, -100, 30),
      state: 'yellow',
    };
    sensor.update(0, 0, 0, [], [tc]);
    const sr = sensor.sensorReadings[0];
    expect(sr).not.toBeNull();
    if (sr) {
      expect(sr.type).toBe('trafficControl');
      expect(sr.state).toBe(0.5);
    }
  });

  it('update stateAware=true with other cars picks nearest', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      stateAware: true,
      rayLength: 200,
    });
    const border = makeSquare(0, -150, 10);
    const carPoly = makeSquare(0, -50, 10);
    sensor.update(0, 0, 0, [border], [], [carPoly]);
    const sr = sensor.sensorReadings[0];
    expect(sr).not.toBeNull();
    if (sr) {
      expect(sr.type).toBe('car');
      expect(sr.state).toBe(1);
      expect(sr.distance).toBeLessThan(1);
    }
  });

  it('update multiple calls refreshes readings', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      rayLength: 200,
    });
    const border = makeSquare(0, -100, 20);
    sensor.update(0, 0, 0, [border]);
    expect(sensor.readings[0]).not.toBeNull();

    sensor.update(0, 0, 0, []);
    expect(sensor.readings[0]).toBeNull();
  });

  it('constructor initializes empty arrays', () => {
    const sensor = new Sensor();
    expect(sensor.rays).toEqual([]);
    expect(sensor.readings).toEqual([]);
    expect(sensor.sensorReadings).toEqual([]);
  });

  it('stateAware=false with borders returns null sensorReadings even when readings exist', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      stateAware: false,
      rayLength: 200,
    });
    const border = makeSquare(0, -100, 20);
    sensor.update(0, 0, 0, [border]);
    expect(sensor.readings[0]).not.toBeNull();
    expect(sensor.sensorReadings[0]).toBeNull();
  });

  it('stateAware=true with no obstacles returns type none distance=1', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      rayLength: 200,
      stateAware: true,
    });
    sensor.update(0, 0, 0, [], [], []);
    const sr = sensor.sensorReadings[0];
    expect(sr).not.toBeNull();
    if (sr) {
      expect(sr.type).toBe('none');
      expect(sr.state).toBe(0);
      expect(sr.distance).toBe(1);
    }
  });

  it('stateAware=true with only border returns type border state=1', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      rayLength: 200,
      stateAware: true,
    });
    const border = makeSquare(0, -100, 20);
    sensor.update(0, 0, 0, [border], [], []);
    const sr = sensor.sensorReadings[0];
    expect(sr).not.toBeNull();
    if (sr) {
      expect(sr.type).toBe('border');
      expect(sr.state).toBe(1);
    }
  });

  it('stateAware=true with border closer than car picks border', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      rayLength: 200,
      stateAware: true,
    });
    const border = makeSquare(0, -50, 10);
    const carPoly = makeSquare(0, -100, 10);
    sensor.update(0, 0, 0, [border], [], [carPoly]);
    const sr = sensor.sensorReadings[0];
    expect(sr).not.toBeNull();
    if (sr) {
      expect(sr.type).toBe('border');
      expect(sr.state).toBe(1);
    }
  });

  it('stateAware=true with traffic control closer than car', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      rayLength: 200,
      stateAware: true,
    });
    const tc: SensorTrafficControl = {
      polygon: makeSquare(0, -50, 10),
      state: 'red',
    };
    const carPoly = makeSquare(0, -100, 10);
    sensor.update(0, 0, 0, [], [tc], [carPoly]);
    const sr = sensor.sensorReadings[0];
    expect(sr).not.toBeNull();
    if (sr) {
      expect(sr.type).toBe('trafficControl');
      expect(sr.state).toBe(1);
    }
  });
});

describe('Sensor draw (mock canvas)', () => {
  function makeMockCtx() {
    return {
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      arc: () => {},
      fill: () => {},
      save: () => {},
      restore: () => {},
    };
  }

  it('draw basic (stateAware=false) with reading does not throw', () => {
    const sensor = new Sensor({ rayCount: 1, raySpread: 0, rayLength: 200 });
    const border = makeSquare(0, -100, 20);
    sensor.update(0, 0, 0, [border]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = makeMockCtx() as any;
    expect(() => sensor.draw(ctx)).not.toThrow();
  });

  it('draw basic (stateAware=false) with no reading does not throw', () => {
    const sensor = new Sensor({ rayCount: 1, raySpread: 0, rayLength: 200 });
    sensor.update(0, 0, 0, []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = makeMockCtx() as any;
    expect(() => sensor.draw(ctx)).not.toThrow();
  });

  it('draw stateAware (stateAware=true) does not throw', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      rayLength: 200,
      stateAware: true,
    });
    const border = makeSquare(0, -100, 20);
    sensor.update(0, 0, 0, [border]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = makeMockCtx() as any;
    expect(() => sensor.draw(ctx)).not.toThrow();
  });

  it('draw stateAware with traffic control does not throw', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      rayLength: 200,
      stateAware: true,
    });
    const tc: SensorTrafficControl = {
      polygon: makeSquare(0, -100, 30),
      state: 'red',
    };
    sensor.update(0, 0, 0, [], [tc]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = makeMockCtx() as any;
    expect(() => sensor.draw(ctx)).not.toThrow();
  });

  it('draw stateAware with none reading does not throw', () => {
    const sensor = new Sensor({
      rayCount: 1,
      raySpread: 0,
      rayLength: 200,
      stateAware: true,
    });
    sensor.update(0, 0, 0, []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = makeMockCtx() as any;
    expect(() => sensor.draw(ctx)).not.toThrow();
  });
});

describe('encodeTrafficState', () => {
  it('red returns 1', () => {
    expect(encodeTrafficState('red')).toBe(1);
  });

  it('yellow returns 0.5', () => {
    expect(encodeTrafficState('yellow')).toBe(0.5);
  });

  it('green returns 0', () => {
    expect(encodeTrafficState('green')).toBe(0);
  });

  it('null returns 0', () => {
    expect(encodeTrafficState(null)).toBe(0);
  });
});
