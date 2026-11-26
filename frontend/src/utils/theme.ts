export type Theme = 'light' | 'dark';

/** localStorage key; index.html reads the same key before React starts to avoid a flash of the wrong theme. */
export const THEME_STORAGE_KEY = 'protube-theme';

/** The theme saved by the user, or null if they never chose one (or storage is blocked). */
export function getStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the choice simply lasts until the page is closed.
  }
}

/** The operating system preference (prefers-color-scheme). */
export function getSystemTheme(): Theme {
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

/** Bootstrap 5.3 colour modes: every component reads data-bs-theme from <html>. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-bs-theme', theme);
}
