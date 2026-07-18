import { describe, it, expect } from 'vitest';
import {
  safeJsonParse,
  stripFileExtension,
} from '../../../ts/store/serialization.js';

describe('safeJsonParse', () => {
  it('valid JSON -> parsed object', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
    expect(safeJsonParse('"hello"')).toBe('hello');
    expect(safeJsonParse('42')).toBe(42);
  });

  it('invalid JSON -> returns null (no throw)', () => {
    expect(safeJsonParse('not json')).toBeNull();
    expect(safeJsonParse('{bad}')).toBeNull();
    expect(safeJsonParse('')).toBeNull();
  });

  it('null/undefined input -> null', () => {
    expect(safeJsonParse(null)).toBeNull();
    expect(safeJsonParse(undefined)).toBeNull();
  });
});

describe('stripFileExtension', () => {
  it('removes last dot extension', () => {
    expect(stripFileExtension('file.json')).toBe('file');
    expect(stripFileExtension('file.name.json')).toBe('file.name');
  });

  it('returns same string when no dot', () => {
    expect(stripFileExtension('file')).toBe('file');
  });

  it('handles paths with directories', () => {
    expect(stripFileExtension('path/to/file.json')).toBe('path/to/file');
  });

  it('handles hidden files', () => {
    expect(stripFileExtension('.hidden')).toBe('.hidden');
  });
});
