import { describe, it, expect } from 'vitest';
import {
  ICON_REGISTRY,
  isIconName,
  type IconName,
} from '../../../ts/ui/atoms/iconRegistry.js';

describe('iconRegistry', () => {
  const names = Object.keys(ICON_REGISTRY) as IconName[];

  it('has a non-empty set of icons', () => {
    expect(names.length).toBeGreaterThan(40);
  });

  it('every icon has non-empty SVG markup with an <svg>-free inner body', () => {
    for (const name of names) {
      const markup = ICON_REGISTRY[name];
      expect(markup.trim().length, `${name} markup`).toBeGreaterThan(0);
      // The registry stores INNER markup only; the wrapping <svg> is added by
      // the element. Guard against accidentally nesting a full <svg>.
      expect(markup.includes('<svg'), `${name} nested svg`).toBe(false);
    }
  });

  it('isIconName recognises registered names', () => {
    for (const name of names) {
      expect(isIconName(name)).toBe(true);
    }
  });

  it('isIconName rejects unknown names', () => {
    expect(isIconName('not-a-real-icon')).toBe(false);
    expect(isIconName('')).toBe(false);
  });
});
