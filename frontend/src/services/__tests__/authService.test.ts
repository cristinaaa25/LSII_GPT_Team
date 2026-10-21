import axios from 'axios';
import { authService } from '../authService';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedAxios = axios as unknown as { get: jest.Mock; post: jest.Mock };

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
  });

  it('stores, retrieves, and removes token from localStorage', () => {
    expect(authService.getToken()).toBeNull();

    authService.setToken('test-token-123');
    expect(authService.getToken()).toBe('test-token-123');

    authService.removeToken();
    expect(authService.getToken()).toBeNull();
  });

  it('registers a user via POST /auth/register', async () => {
    const payload = { username: 'alice', email: 'alice@example.com', password: 'password123' };
    const authResponse = { token: 'token-xyz', user: { id: 1, username: 'alice', email: 'alice@example.com' } };
    mockedAxios.post.mockResolvedValueOnce({ data: authResponse });

    const result = await authService.register(payload);

    expect(result).toEqual(authResponse);
    expect(mockedAxios.post).toHaveBeenCalledWith('other/auth/register', payload);
  });

  it('logs in a user via POST /auth/login', async () => {
    const payload = { email: 'alice@example.com', password: 'password123' };
    const authResponse = { token: 'token-xyz', user: { id: 1, username: 'alice', email: 'alice@example.com' } };
    mockedAxios.post.mockResolvedValueOnce({ data: authResponse });

    const result = await authService.login(payload);

    expect(result).toEqual(authResponse);
    expect(mockedAxios.post).toHaveBeenCalledWith('other/auth/login', payload);
  });

  it('logs out and removes token', async () => {
    authService.setToken('stored-token');
    mockedAxios.post.mockResolvedValueOnce({});

    await authService.logout();

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'other/auth/logout',
      {},
      { headers: { Authorization: 'Bearer stored-token' } }
    );
    expect(authService.getToken()).toBeNull();
  });

  it('fetches current user via GET /auth/me with active token', async () => {
    const user = { id: 1, username: 'alice', email: 'alice@example.com' };
    mockedAxios.get.mockResolvedValueOnce({ data: user });

    const result = await authService.getMe('passed-token');

    expect(result).toEqual(user);
    expect(mockedAxios.get).toHaveBeenCalledWith('other/auth/me', {
      headers: { Authorization: 'Bearer passed-token' },
    });
  });
});
