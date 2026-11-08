import React from 'react';
import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../../context/AuthProvider';
import { authService } from '../../services/authService';

jest.mock('../../services/authService');

describe('useAuth', () => {
  beforeEach(() => {
    (authService.getToken as jest.Mock).mockReturnValue(null);
  });

  it('throws error when used outside AuthProvider', () => {
    // Suppress console.error thrown by react during expected error boundary
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleError.mockRestore();
  });

  it('returns auth context when used inside AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current).toBeDefined();
    expect(result.current.isAuthenticated).toBe(false);
    expect(typeof result.current.login).toBe('function');
  });
});
