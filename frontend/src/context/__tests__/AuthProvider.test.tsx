import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

jest.mock('../../services/authService');

const mockedAuthService = authService as jest.Mocked<typeof authService>;

describe('AuthProvider', () => {
  const dummyUser = {
    id: 1,
    username: 'bob',
    email: 'bob@example.com',
    displayName: 'Bob B',
    avatarUrl: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with no user when no token is stored', async () => {
    mockedAuthService.getToken.mockReturnValue(null);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('restores authenticated session when valid token is stored', async () => {
    mockedAuthService.getToken.mockReturnValue('stored-jwt');
    mockedAuthService.getMe.mockResolvedValueOnce(dummyUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(dummyUser);
    expect(result.current.token).toBe('stored-jwt');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('clears token and resets user when stored token fails verification', async () => {
    mockedAuthService.getToken.mockReturnValue('invalid-jwt');
    mockedAuthService.getMe.mockRejectedValueOnce(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedAuthService.removeToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles login flow successfully', async () => {
    mockedAuthService.getToken.mockReturnValue(null);
    mockedAuthService.login.mockResolvedValueOnce({
      token: 'new-token',
      user: dummyUser,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const res = await result.current.login({ email: 'bob@example.com', password: 'password123' });
      expect(res.token).toBe('new-token');
    });

    expect(mockedAuthService.setToken).toHaveBeenCalledWith('new-token');
    expect(result.current.token).toBe('new-token');
    expect(result.current.user).toEqual(dummyUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles register flow successfully', async () => {
    mockedAuthService.getToken.mockReturnValue(null);
    mockedAuthService.register.mockResolvedValueOnce({
      token: 'reg-token',
      user: dummyUser,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const res = await result.current.register({
        username: 'bob',
        email: 'bob@example.com',
        password: 'password123',
      });
      expect(res.token).toBe('reg-token');
    });

    expect(mockedAuthService.setToken).toHaveBeenCalledWith('reg-token');
    expect(result.current.token).toBe('reg-token');
    expect(result.current.user).toEqual(dummyUser);
  });

  it('handles logout flow and removes token even on service rejection', async () => {
    mockedAuthService.getToken.mockReturnValue('active-token');
    mockedAuthService.getMe.mockResolvedValueOnce(dummyUser);
    mockedAuthService.logout.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockedAuthService.removeToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('updates current user via updateUser callback', async () => {
    mockedAuthService.getToken.mockReturnValue(null);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateUser(dummyUser);
    });

    expect(result.current.user).toEqual(dummyUser);
  });
});
