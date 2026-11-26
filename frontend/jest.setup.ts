import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import fetchMock from 'jest-fetch-mock';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

jest.mock('./src/utils/Env', () => ({
  getEnv: () => ({
    API_DOMAIN: 'http://api.test',
    API_BASE_URL: 'other',
    MEDIA_BASE_URL: 'development',
  }),
}));

fetchMock.enableMocks();

// jsdom has no matchMedia: default to "light, no reduced motion"; tests can override window.matchMedia.
// (globalThis: this file is type-checked without the DOM lib.)
const jsdomWindow = globalThis as unknown as { matchMedia?: unknown };
if (typeof jsdomWindow.matchMedia !== 'function') {
  Object.defineProperty(jsdomWindow, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom does not implement scrolling: a no-op keeps route changes quiet (tests can still spy on it).
const jsdomScroll = globalThis as unknown as { scrollTo?: unknown };
Object.defineProperty(jsdomScroll, 'scrollTo', { writable: true, configurable: true, value: () => undefined });

beforeEach(() => {
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
});
