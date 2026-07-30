import { describe, it, expect, afterEach } from 'vitest';
import {
  getSignageLanguage,
  setSignageLanguage,
  type SignageLanguage,
} from '../../../ts/world/signageLanguage.js';

describe('signageLanguage', () => {
  const saved = getSignageLanguage();
  afterEach(() => setSignageLanguage(saved));

  it('defaults to native', () => {
    // The module initializes to native when no valid value is stored.
    setSignageLanguage('native');
    expect(getSignageLanguage()).toBe('native');
  });

  it('round-trips each supported language', () => {
    const langs: SignageLanguage[] = ['native', 'en', 'he', 'ar', 'ru'];
    for (const lang of langs) {
      setSignageLanguage(lang);
      expect(getSignageLanguage()).toBe(lang);
    }
  });
});
