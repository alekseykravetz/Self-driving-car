import { describe, it, expect } from 'vitest';
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
