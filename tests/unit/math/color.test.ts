import { describe, it, expect } from 'vitest';
import { getRGBA, getRandomColor } from '../../../ts/math/color.js';

describe('getRGBA', () => {
  it('returns red for positive value', () => {
    const result = getRGBA(0.5);
    expect(result).toBe('rgba(255, 255, 0, 0.5)');
  });

  it('returns blue for negative value', () => {
    const result = getRGBA(-0.3);
    expect(result).toBe('rgba(0, 0, 255, 0.3)');
  });

  it('handles value of 0', () => {
    const result = getRGBA(0);
    expect(result).toBe('rgba(255, 255, 255, 0)');
  });

  it('handles value of 1', () => {
    const result = getRGBA(1);
    expect(result).toBe('rgba(255, 255, 0, 1)');
  });

  it('handles value of -1', () => {
    const result = getRGBA(-1);
    expect(result).toBe('rgba(0, 0, 255, 1)');
  });

  it('handles large positive values', () => {
    const result = getRGBA(2);
    expect(result).toBe('rgba(255, 255, 0, 2)');
  });
});

describe('getRandomColor', () => {
  it('returns an hsl string', () => {
    const color = getRandomColor();
    expect(color).toMatch(/^hsl\(\d+(\.\d+)?, 100%, 60%\)$/);
  });

  it('returns different values on successive calls', () => {
    const colors = new Set<string>();
    for (let i = 0; i < 10; i++) {
      colors.add(getRandomColor());
    }
    expect(colors.size).toBeGreaterThan(1);
  });
});
