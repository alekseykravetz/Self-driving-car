import { describe, it, expect, afterEach, vi } from 'vitest';
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

describe('signageLanguage module initialization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('loads a valid persisted language on module init', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'he',
      setItem: () => {},
    });
    vi.resetModules();
    const fresh = await import('../../../ts/world/signageLanguage.js');
    expect(fresh.getSignageLanguage()).toBe('he');
  });

  it('falls back to native for an invalid persisted value', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'klingon',
      setItem: () => {},
    });
    vi.resetModules();
    const fresh = await import('../../../ts/world/signageLanguage.js');
    expect(fresh.getSignageLanguage()).toBe('native');
  });

  it('falls back to native when localStorage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('unavailable');
      },
      setItem: () => {
        throw new Error('unavailable');
      },
    });
    vi.resetModules();
    const fresh = await import('../../../ts/world/signageLanguage.js');
    expect(fresh.getSignageLanguage()).toBe('native');
    // setSignageLanguage swallows persistence failures too.
    expect(() => fresh.setSignageLanguage('en')).not.toThrow();
  });
});
