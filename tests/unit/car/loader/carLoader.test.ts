import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// --- Instance (DOM + FileReader) tests ---

interface FakeFile {
  name: string;
  __content?: string;
  __error?: boolean;
}

/** Minimal fake input element capturing listeners so tests can dispatch. */
class FakeInput {
  type = '';
  id = '';
  accept = '';
  multiple = false;
  style: Record<string, string> = {};
  value = '';
  files: FakeFile[] | null = null;
  listeners: Record<string, ((e: unknown) => void)[]> = {};

  addEventListener(event: string, fn: (e: unknown) => void): void {
    (this.listeners[event] ??= []).push(fn);
  }

  dispatch(event: string, e: unknown): void {
    for (const fn of this.listeners[event] ?? []) fn(e);
  }
}

/** Synchronous FileReader mock driven by FakeFile metadata. */
class FakeFileReader {
  onload: ((e: { target: { result: string } }) => void) | null = null;
  onerror: (() => void) | null = null;
  error: unknown = null;
  result: string | null = null;

  readAsText(file: FakeFile): void {
    if (file.__error) {
      this.error = new Error('read failed');
      this.onerror?.();
      return;
    }
    this.result = file.__content ?? '';
    this.onload?.({ target: { result: this.result } });
  }
}

describe('CarLoader instance', () => {
  let created: FakeInput[] = [];
  let existing: Record<string, FakeInput> = {};
  const alertMock = vi.fn();

  beforeEach(() => {
    created = [];
    existing = {};
    alertMock.mockClear();
    vi.stubGlobal('document', {
      getElementById: (id: string) => existing[id] ?? null,
      createElement: () => {
        const el = new FakeInput();
        created.push(el);
        return el;
      },
      body: { appendChild: () => {} },
    });
    vi.stubGlobal('FileReader', FakeFileReader);
    vi.stubGlobal('alert', alertMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function carJson(overrides: Partial<CarInfo> = {}): string {
    return JSON.stringify(makeCarInfo(overrides));
  }

  it('creates a hidden file input when none exists', () => {
    new CarLoader(() => {});
    expect(created).toHaveLength(1);
    const input = created[0];
    expect(input.type).toBe('file');
    expect(input.id).toBe('loadCarInput');
    expect(input.accept).toBe('.car,.json');
    expect(input.multiple).toBe(true);
    expect(input.style.display).toBe('none');
  });

  it('reuses an existing input element by id', () => {
    const preexisting = new FakeInput();
    existing['loadCarInput'] = preexisting;
    new CarLoader(() => {});
    expect(created).toHaveLength(0);
    expect(preexisting.multiple).toBe(true);
  });

  it('parses multiple valid files and invokes onLoad with all cars', () => {
    const onLoad = vi.fn();
    new CarLoader(onLoad);
    const input = created[0];
    input.files = [
      { name: 'a.car', __content: carJson({ maxSpeed: 3 }) },
      { name: 'b.car', __content: carJson({ maxSpeed: 5 }) },
    ];
    input.dispatch('change', { target: input });
    expect(onLoad).toHaveBeenCalledTimes(1);
    const cars = onLoad.mock.calls[0][0] as CarInfo[];
    expect(cars).toHaveLength(2);
    expect(cars.map((c) => c.maxSpeed).sort()).toEqual([3, 5]);
    // input value reset after processing
    expect(input.value).toBe('');
  });

  it('skips unparseable files but still loads the valid ones', () => {
    const onLoad = vi.fn();
    new CarLoader(onLoad);
    const input = created[0];
    input.files = [
      { name: 'good.car', __content: carJson() },
      { name: 'bad.car', __content: 'not json' },
    ];
    input.dispatch('change', { target: input });
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect((onLoad.mock.calls[0][0] as CarInfo[]).length).toBe(1);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('alerts and does not call onLoad when no files parse', () => {
    const onLoad = vi.fn();
    new CarLoader(onLoad);
    const input = created[0];
    input.files = [{ name: 'bad.car', __content: 'garbage' }];
    input.dispatch('change', { target: input });
    expect(onLoad).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith(
      'No valid car files could be parsed.',
    );
  });

  it('resets value and returns early when no files selected', () => {
    const onLoad = vi.fn();
    new CarLoader(onLoad);
    const input = created[0];
    input.files = [];
    input.value = 'stale';
    input.dispatch('change', { target: input });
    expect(onLoad).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('still loads valid results when another file errors while reading', () => {
    const onLoad = vi.fn();
    new CarLoader(onLoad);
    const input = created[0];
    input.files = [
      { name: 'good.car', __content: carJson() },
      { name: 'broken.car', __error: true },
    ];
    input.dispatch('change', { target: input });
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect((onLoad.mock.calls[0][0] as CarInfo[]).length).toBe(1);
  });
});
