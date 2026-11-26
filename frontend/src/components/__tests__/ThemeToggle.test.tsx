import { act, fireEvent, render, screen } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../context/ThemeProvider';
import { useTheme } from '../../hooks/useTheme';
import { THEME_STORAGE_KEY } from '../../utils/theme';

type ChangeListener = (event: MediaQueryListEvent) => void;

/** Fakes prefers-color-scheme; returns a function that simulates the OS switching theme. */
const mockSystemTheme = (dark: boolean) => {
  const listeners: ChangeListener[] = [];
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: dark && query.includes('dark'),
    media: query,
    addEventListener: (_: string, listener: ChangeListener) => listeners.push(listener),
    removeEventListener: jest.fn(),
  }));
  return (nowDark: boolean) =>
    act(() => listeners.forEach((listener) => listener({ matches: nowDark } as MediaQueryListEvent)));
};

const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );

const currentTheme = () => document.documentElement.getAttribute('data-bs-theme');

describe('ThemeToggle', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.restoreAllMocks();
  });

  it('follows prefers-color-scheme on the first visit', () => {
    mockSystemTheme(true);
    renderToggle();

    expect(currentTheme()).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('uses the light theme when the system prefers light', () => {
    mockSystemTheme(false);
    renderToggle();

    expect(currentTheme()).toBe('light');
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });

  it('toggles the theme and saves the choice in localStorage', () => {
    mockSystemTheme(false);
    renderToggle();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(currentTheme()).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(currentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('restores the saved choice on the next visit, over the system preference', () => {
    mockSystemTheme(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    renderToggle();

    expect(currentTheme()).toBe('light');
  });

  it('ignores an invalid stored value', () => {
    mockSystemTheme(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    renderToggle();

    expect(currentTheme()).toBe('dark');
  });

  it('follows system changes until the user chooses, then keeps the choice', () => {
    const switchSystem = mockSystemTheme(false);
    renderToggle();

    switchSystem(true);
    expect(currentTheme()).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    switchSystem(true);
    expect(currentTheme()).toBe('light');
  });

  it('still works when localStorage is blocked', () => {
    mockSystemTheme(false);
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderToggle();

    expect(currentTheme()).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(currentTheme()).toBe('dark');
  });

  it('defaults to light when matchMedia is not available', () => {
    // @ts-expect-error simulating an old browser
    window.matchMedia = undefined;
    renderToggle();

    expect(currentTheme()).toBe('light');
  });

  it('lets components set the theme directly', () => {
    mockSystemTheme(false);
    const SetDark = () => {
      const { setTheme } = useTheme();
      return (
        <button type="button" onClick={() => setTheme('dark')}>
          Dark please
        </button>
      );
    };
    render(
      <ThemeProvider>
        <SetDark />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dark please' }));
    expect(currentTheme()).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('throws a clear error when used outside the ThemeProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeToggle />)).toThrow('useTheme must be used within a ThemeProvider');
  });
});
