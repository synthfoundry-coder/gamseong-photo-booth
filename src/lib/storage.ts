import type { CustomizerSelection } from './types';

export type ThemeId = 'yellow' | 'pink' | 'blue';

const THEME_KEY = 'gamseong.theme';
const FAVORITES_KEY = 'gamseong.favorites';
const PICKS_PREFIX = 'gamseong.picks.';

export const FAVORITES_EVENT = 'gamseong:favorites-changed';
export const THEME_EVENT = 'gamseong:theme-changed';

export function getSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return 'yellow';
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (raw === 'yellow' || raw === 'pink' || raw === 'blue') return raw;
  } catch {
    // Ignore storage access restrictions
  }
  return 'yellow';
}

export function setSavedTheme(theme: ThemeId): void {
  if (typeof window === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage access restrictions
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(slug: string): string[] {
  const current = new Set(getFavorites());
  if (current.has(slug)) {
    current.delete(slug);
  } else {
    current.add(slug);
  }
  const next = Array.from(current);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage access restrictions
    }
    window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: next }));
  }
  return next;
}

export function getSavedPicks(slug: string): Partial<CustomizerSelection> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${PICKS_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function savePicks(slug: string, selection: CustomizerSelection): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${PICKS_PREFIX}${slug}`, JSON.stringify(selection));
  } catch {
    // Ignore storage access restrictions
  }
}
