import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import fetchMock from 'jest-fetch-mock';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

jest.mock('./src/utils/Env', () => ({
  getEnv: () => ({
    API_BASE_URL: 'other',
    MEDIA_BASE_URL: 'development',
  }),
}));

fetchMock.enableMocks();
