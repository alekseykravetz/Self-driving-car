import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseWorldFileContent,
  WorldLoader,
} from '../../../../ts/world/loader/worldLoader.js';

describe('WorldLoader', () => {
  describe('parseWorldFileContent', () => {
    it('parses valid JSON content into an object', () => {
      const result = parseWorldFileContent('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('trims whitespace before parsing', () => {
      const result = parseWorldFileContent('  {"a": 1}  ');
      expect(result).toEqual({ a: 1 });
    });

    it('returns null for invalid JSON', () => {
      const result = parseWorldFileContent('not json');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = parseWorldFileContent('');
      expect(result).toBeNull();
    });

    it('returns null for null input string', () => {
      const result = parseWorldFileContent('null');
      expect(result).toBeNull();
    });
  });

  describe('WorldLoader.parseWorldFile static', () => {
    it('delegates to parseWorldFileContent and returns parsed object', () => {
      const result = WorldLoader.parseWorldFile('{"valid": true}');
      expect(result).toEqual({ valid: true });
    });

    it('returns null for invalid content via static method', () => {
      const result = WorldLoader.parseWorldFile('corrupt');
      expect(result).toBeNull();
    });
  });
});

// --- Instance (DOM + FileReader) tests ---

interface FakeFile {
  name: string;
  __content?: string;
  __error?: boolean;
}

class FakeInput {
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

class FakeFileReader {
  onload: ((e: { target: { result: string } }) => void) | null = null;
  onerror: (() => void) | null = null;
  error: unknown = null;
  result: string | null = null;

  // WorldLoader assigns onload/onerror AFTER calling readAsText, so fire on a
  // microtask to let the handlers be registered first.
  readAsText(file: FakeFile): void {
    queueMicrotask(() => {
      if (file.__error) {
        this.error = new Error('read failed');
        this.onerror?.();
        return;
      }
      this.result = file.__content ?? '';
      this.onload?.({ target: { result: this.result } });
    });
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('WorldLoader instance', () => {
  let existing: Record<string, FakeInput> = {};
  const alertMock = vi.fn();

  beforeEach(() => {
    existing = {};
    alertMock.mockClear();
    vi.stubGlobal('document', {
      getElementById: (id: string) => existing[id] ?? null,
    });
    vi.stubGlobal('FileReader', FakeFileReader);
    vi.stubGlobal('alert', alertMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws when the expected input element is missing', () => {
    expect(() => new WorldLoader(() => {})).toThrow(/no element with id/);
  });

  it('binds a change listener to the existing input', () => {
    const input = new FakeInput();
    existing['loadWorldInput'] = input;
    new WorldLoader(() => {});
    expect(input.listeners['change']).toHaveLength(1);
  });

  it('parses a valid world file and invokes onLoad', async () => {
    const input = new FakeInput();
    existing['loadWorldInput'] = input;
    const onLoad = vi.fn();
    new WorldLoader(onLoad);
    input.files = [{ name: 'a.world', __content: '{"roads": 3}' }];
    input.value = 'a.world';
    input.dispatch('change', { target: input });
    await flush();
    expect(onLoad).toHaveBeenCalledWith({ roads: 3 });
    expect(input.value).toBe('');
  });

  it('alerts and resets when no file is selected', () => {
    const input = new FakeInput();
    existing['loadWorldInput'] = input;
    const onLoad = vi.fn();
    new WorldLoader(onLoad);
    input.files = [];
    input.value = 'stale';
    input.dispatch('change', { target: input });
    expect(onLoad).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith('No file selected');
    expect(input.value).toBe('');
  });

  it('alerts and does not call onLoad when content is unparseable', async () => {
    const input = new FakeInput();
    existing['loadWorldInput'] = input;
    const onLoad = vi.fn();
    new WorldLoader(onLoad);
    input.files = [{ name: 'bad.world', __content: 'not json' }];
    input.dispatch('change', { target: input });
    await flush();
    expect(onLoad).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
  });

  it('alerts when the reader errors', async () => {
    const input = new FakeInput();
    existing['loadWorldInput'] = input;
    const onLoad = vi.fn();
    new WorldLoader(onLoad);
    input.files = [{ name: 'broken.world', __error: true }];
    input.dispatch('change', { target: input });
    await flush();
    expect(onLoad).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
  });
});
