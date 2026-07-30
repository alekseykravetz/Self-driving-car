/**
 * Display-language preference for street-name signage.
 *
 * OSM ways carry names in several languages (`name`, `name:en`, `name:he`,
 * `name:ar`, `name:ru`). This module holds the user's chosen display language
 * as a module-level singleton, persisted to `localStorage`. `roadSignage.ts`
 * reads it when resolving each street's display name; the signage cache key in
 * `worldSignageRenderer.ts` folds it so a language change invalidates the cache.
 */

export type SignageLanguage = 'native' | 'en' | 'he' | 'ar' | 'ru';

const SIGNAGE_LANGUAGE_KEY = 'sim:signageLanguage';

const VALID: readonly SignageLanguage[] = ['native', 'en', 'he', 'ar', 'ru'];

function isValid(v: string | null): v is SignageLanguage {
  return v !== null && (VALID as readonly string[]).includes(v);
}

let current: SignageLanguage = load();

function load(): SignageLanguage {
  try {
    const stored = localStorage.getItem(SIGNAGE_LANGUAGE_KEY);
    if (isValid(stored)) return stored;
  } catch {
    // localStorage unavailable (e.g. tests / private mode) — use default.
  }
  return 'native';
}

/** The current signage display language (default `native`). */
export function getSignageLanguage(): SignageLanguage {
  return current;
}

/** Set and persist the signage display language. */
export function setSignageLanguage(lang: SignageLanguage): void {
  current = lang;
  try {
    localStorage.setItem(SIGNAGE_LANGUAGE_KEY, lang);
  } catch {
    // Ignore persistence failures (quota / unavailable).
  }
}
